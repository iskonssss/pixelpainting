// Sanity tests for the G-code generator. Run: node test/gcode.test.mjs
import { PRINTERS, DEFAULT_CFG, generateGcode } from '../gcode.js';
import { writeFileSync } from 'node:fs';

let failures = 0;
function check(name, cond, detail = '') {
  if (cond) console.log(`  ok  ${name}`);
  else { console.error(`FAIL  ${name} ${detail}`); failures++; }
}

function makeDesign(cols, rows) {
  const cells = new Uint8Array(cols * rows);
  // a diagonal band of color 1, a block of color 2, one cell of color 3
  for (let i = 0; i < Math.min(cols, rows); i++) cells[i * cols + i] = 1;
  for (let r = 2; r < 6; r++) for (let c = 10; c < 14; c++) cells[r * cols + c] = 2;
  cells[(rows - 1) * cols + (cols - 1)] = 3;
  return {
    cols, rows, cells,
    palette: [
      { name: 'Red', hex: '#c62828' },
      { name: 'Yellow', hex: '#f2c230' },
      { name: 'Green', hex: '#5aa73c' },
    ],
    baseColor: { name: 'Cream', hex: '#f1e8d0' },
  };
}

for (const printerId of Object.keys(PRINTERS)) {
  console.log(`\n--- ${PRINTERS[printerId].name} ---`);
  const design = makeDesign(28, 40);
  const cfg = { ...DEFAULT_CFG, printerId };
  const { gcode, segs, stats } = generateGcode(design, cfg);

  check('no NaN/undefined in output', !/NaN|undefined|Infinity/.test(gcode));
  check('3 filament changes via M600', (gcode.match(/^M600/gm) || []).length === 3);
  check('no plain pause in M600 mode', !/^M400 U1/m.test(gcode));
  check('has heat + home + level', /M109 S220/.test(gcode) && /G28/.test(gcode) && /G29/.test(gcode));
  // Bambu's G29 drops nozzle temp for probing and never restores it, so the
  // full-temp wait must come after leveling and before the first extrusion
  check('waits for print temp AFTER leveling, before extruding',
    gcode.indexOf('G29') < gcode.indexOf('M109 S220') &&
    gcode.indexOf('M109 S220') < gcode.search(/^G1 .*E[\d.]/m));
  check('relative extrusion', /\nM83\n/.test(gcode));
  check('ends with motors off', /M84/.test(gcode));
  check('stitch count', stats.stitchCount === 28 + 16 + 1, `got ${stats.stitchCount}`);
  check('per-color counts', stats.byColor.map(c => c.count).join(',') === '28,16,1');
  check('filament positive', stats.filamentMM > 0 && stats.filamentG > 0);
  check('base filament tracked', stats.base.filamentMM > 0);
  check('per-color filament tracked', stats.byColor.every(c => c.filamentMM > 0 && c.filamentG > 0));
  const sumParts = stats.base.filamentMM + stats.byColor.reduce((s, c) => s + c.filamentMM, 0);
  check('per-color filament sums to total', Math.abs(sumParts - stats.filamentMM) < 0.01,
    `${sumParts} vs ${stats.filamentMM}`);
  check('header has filament summary', /; Filament needed/.test(gcode));
  check('preview has segments', segs.length > 500, `got ${segs.length}`);

  // all coordinates within bed
  const P = PRINTERS[printerId];
  let inBed = true;
  for (const m of gcode.matchAll(/G1 X([\d.]+) Y([\d.]+)/g)) {
    const x = parseFloat(m[1]), y = parseFloat(m[2]);
    if (x < 0 || x > P.bedX || y < 0 || y > P.bedY) { inBed = false; break; }
  }
  check('all moves within bed', inBed);

  // extrusion segments never lower than first layer
  check('no extrusion below first layer', segs.every(s => s.t === 't' || s.z >= cfg.firstLayerHeight - 1e-9));

  // stitches drawn above the mesh top
  const meshTop = cfg.firstLayerHeight + (cfg.meshLayers - 1) * cfg.layerHeight;
  check('stitches above mesh', segs.filter(s => s.t === 'stitch').every(s => s.z > meshTop + 1e-9));
}

// oversize design must throw
try {
  generateGcode(makeDesign(90, 90), { ...DEFAULT_CFG, printerId: 'a1mini' });
  check('oversize design rejected', false);
} catch {
  check('oversize design rejected', true);
}

// empty design (mesh only) works
{
  const d = makeDesign(10, 10);
  d.cells.fill(0);
  const { gcode, stats } = generateGcode(d, { ...DEFAULT_CFG, printerId: 'a1mini' });
  check('empty design: no pauses', !/^M600/m.test(gcode) && !/^M400 U1/m.test(gcode) && stats.stitchCount === 0);
}

// plain-pause fallback mode
{
  const { gcode } = generateGcode(makeDesign(28, 40), { ...DEFAULT_CFG, printerId: 'p1s', pauseMode: 'pause' });
  check('pause mode: 3x M400 U1, no M600', (gcode.match(/^M400 U1/gm) || []).length === 3 && !/^M600/m.test(gcode));
}

// write a sample file for manual inspection
const sample = generateGcode(makeDesign(28, 40), { ...DEFAULT_CFG, printerId: 'p1s' });
writeFileSync(new URL('./sample_p1s.gcode', import.meta.url), sample.gcode);
console.log(`\nSample written: test/sample_p1s.gcode (${sample.gcode.split('\n').length} lines, ~${Math.round(sample.stats.timeMin)} min, ${sample.stats.filamentG.toFixed(1)} g)`);

process.exit(failures ? 1 : 0);
