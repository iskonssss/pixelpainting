// gcode.js — G-code generation for cross-stitch style 3D-printed bookmarks
// Targets Bambu Lab printers (plain .gcode printed from SD/USB storage).
//
// The print has two phases:
//   1. A woven mesh lattice ("plastic canvas") printed in the base filament.
//   2. Colored X stitches printed on top, grouped by color, with a pause
//      (M400 U1) before each color group for a manual filament change.

export const PRINTERS = {
  a1mini: { name: 'Bambu Lab A1 mini', bedX: 180, bedY: 180, maxZ: 180 },
  p1s:    { name: 'Bambu Lab P1S',     bedX: 256, bedY: 256, maxZ: 256 },
  p2s:    { name: 'Bambu Lab P2S',     bedX: 256, bedY: 256, maxZ: 256 },
  x1c:    { name: 'Bambu Lab X1 Carbon', bedX: 256, bedY: 256, maxZ: 256 },
  h2d:    { name: 'Bambu Lab H2D',     bedX: 325, bedY: 320, maxZ: 325 },
};

export const DEFAULT_CFG = {
  printerId: 'p1s',
  pitch: 2.25,          // mm per grid cell
  lineWidth: 0.42,      // extrusion width (0.4 nozzle)
  firstLayerHeight: 0.25,
  layerHeight: 0.2,
  meshLayers: 4,        // total lattice layers incl. first layer
  stitchLayers: 2,      // passes per X stitch (relief)
  nozzleTemp: 220,
  bedTemp: 60,
  speedFirst: 30,       // mm/s
  speedMesh: 60,
  speedStitch: 30,
  speedTravel: 200,
  firstLayerFlow: 1.1,
  meshFlow: 1.0,
  stitchFlow: 1.15,
  brimLoops: 3,         // extra first-layer outlines for adhesion
  bedLevel: true,       // emit G29 auto bed leveling
  pauseMode: 'm600',    // 'm600': printer cuts + unloads + prompts; 'pause': M400 U1 plain pause
};

const FIL_AREA = Math.PI * 1.75 * 1.75 / 4; // 1.75 mm filament cross-section
const RETRACT = 0.8;
const RETRACT_F = 2100;
const F = mmps => Math.round(mmps * 60);
const fmt = n => (Math.round(n * 1000) / 1000).toString();

class Emitter {
  constructor() {
    this.lines = [];
    this.segs = [];          // preview segments {x1,y1,x2,y2,z,t,color}
    this.x = 0; this.y = 0; this.z = 0;
    this.retracted = false;
    this.filament = 0;       // total E, mm
    this.time = 0;           // seconds, moves only
    this.tag = 'base';       // current filament: 'base' or a color group key
    this.usage = {};         // tag -> {e: filament mm, t: seconds}
  }
  cmd(s) { this.lines.push(s); }
  comment(s) { this.lines.push('; ' + s); }
  ePerMM(h, w) { return (w * h) / FIL_AREA; }
  _u() { return this.usage[this.tag] || (this.usage[this.tag] = { e: 0, t: 0 }); }
  tick(dt) { this.time += dt; this._u().t += dt; }

  retract() {
    if (this.retracted) return;
    this.cmd(`G1 E-${RETRACT} F${RETRACT_F}`);
    this.retracted = true;
    this.tick(RETRACT / (RETRACT_F / 60));
  }
  unretract() {
    if (!this.retracted) return;
    this.cmd(`G1 E${RETRACT} F${RETRACT_F}`);
    this.retracted = false;
    this.tick(RETRACT / (RETRACT_F / 60));
  }
  setZ(z, speed = 20) {
    if (Math.abs(z - this.z) < 1e-6) return;
    this.cmd(`G1 Z${fmt(z)} F${F(speed)}`);
    this.tick(Math.abs(z - this.z) / speed);
    this.z = z;
  }
  travel(x, y, speed, preview = true) {
    const d = Math.hypot(x - this.x, y - this.y);
    if (d < 1e-6) return;
    this.cmd(`G1 X${fmt(x)} Y${fmt(y)} F${F(speed)}`);
    if (preview) this.segs.push({ x1: this.x, y1: this.y, x2: x, y2: y, z: this.z, t: 't', color: null });
    this.tick(d / speed);
    this.x = x; this.y = y;
  }
  extrude(x, y, h, w, flow, speed, color, kind) {
    const d = Math.hypot(x - this.x, y - this.y);
    if (d < 1e-6) return;
    const e = d * this.ePerMM(h, w) * flow;
    this.cmd(`G1 X${fmt(x)} Y${fmt(y)} E${fmt(e)} F${F(speed)}`);
    this.segs.push({ x1: this.x, y1: this.y, x2: x, y2: y, z: this.z, t: kind, color });
    this.filament += e;
    this._u().e += e;
    this.tick(d / speed);
    this.x = x; this.y = y;
  }
}

function rect(em, x0, y0, x1, y1, h, w, flow, speed, color, kind) {
  // travel to nearest corner, then extrude the loop
  const corners = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  let start = 0, best = Infinity;
  corners.forEach(([cx, cy], i) => {
    const d = Math.hypot(cx - em.x, cy - em.y);
    if (d < best) { best = d; start = i; }
  });
  if (best > 2) { em.retract(); }
  em.travel(corners[start][0], corners[start][1], 150);
  em.unretract();
  for (let i = 1; i <= 4; i++) {
    const [cx, cy] = corners[(start + i) % 4];
    em.extrude(cx, cy, h, w, flow, speed, color, kind);
  }
}

// Greedy nearest-neighbor ordering of stitch cells from a starting point.
function orderCells(cells, sx, sy, pitch, x0, y0) {
  const remaining = cells.slice();
  const out = [];
  let px = sx, py = sy;
  while (remaining.length) {
    let bi = 0, bd = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const cx = x0 + (remaining[i].c + 0.5) * pitch;
      const cy = y0 + (remaining[i].r + 0.5) * pitch;
      const d = (cx - px) * (cx - px) + (cy - py) * (cy - py);
      if (d < bd) { bd = d; bi = i; }
    }
    const cell = remaining.splice(bi, 1)[0];
    out.push(cell);
    px = x0 + (cell.c + 0.5) * pitch;
    py = y0 + (cell.r + 0.5) * pitch;
  }
  return out;
}

export function generateGcode(design, cfg) {
  const P = PRINTERS[cfg.printerId];
  if (!P) throw new Error('Unknown printer: ' + cfg.printerId);
  const { cols, rows, cells, palette, baseColor } = design;
  const pitch = cfg.pitch, lw = cfg.lineWidth;
  const W = cols * pitch, H = rows * pitch;
  const x0 = (P.bedX - W) / 2, y0 = (P.bedY - H) / 2;

  const margin = (cfg.brimLoops + 2) * lw + 5;
  if (W + 2 * margin > P.bedX || H + 2 * margin > P.bedY) {
    throw new Error(`Design ${W.toFixed(1)} x ${H.toFixed(1)} mm does not fit on the ${P.name} bed (${P.bedX} x ${P.bedY} mm).`);
  }

  // Collect stitches per palette color
  const groups = palette.map(() => []);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = cells[r * cols + c];
      if (v > 0) groups[v - 1].push({ r, c });
    }
  }
  const usedGroups = groups
    .map((g, i) => ({ cells: g, color: palette[i] }))
    .filter(g => g.cells.length > 0);
  const stitchCount = usedGroups.reduce((s, g) => s + g.cells.length, 0);

  const em = new Emitter();
  const fl = cfg.firstLayerHeight, lh = cfg.layerHeight;
  const meshTopZ = fl + (cfg.meshLayers - 1) * lh;
  const stitchTopZ = meshTopZ + cfg.stitchLayers * lh;
  const clearanceZ = stitchTopZ + 0.4;

  // ---- Header ----
  em.comment('FLAVOR:Marlin');
  em.comment('Generated by PixelPainting — cross-stitch bookmark G-code generator');
  em.comment(`Printer: ${P.name} (bed ${P.bedX} x ${P.bedY} mm)`);
  em.comment(`Design: ${cols} x ${rows} cells @ ${pitch} mm = ${W.toFixed(1)} x ${H.toFixed(1)} mm, ${stitchCount} stitches`);
  em.comment(`Mesh layers: ${cfg.meshLayers}  Stitch layers: ${cfg.stitchLayers}  Nozzle: ${cfg.nozzleTemp}C  Bed: ${cfg.bedTemp}C`);
  if (cfg.pauseMode === 'pause') {
    em.comment('Filament changes (M400 U1 pause — unload/load manually from the printer screen, then resume):');
  } else {
    em.comment('Filament changes (M600 — printer cuts and unloads, then prompts for the next color):');
  }
  em.comment(`  mesh base: ${baseColor?.name || 'base color'}`);
  usedGroups.forEach((g, i) => em.comment(`  pause ${i + 1}: ${g.color.name} (${g.color.hex}) — ${g.cells.length} stitches`));
  const summaryAt = em.lines.length; // per-color filament summary is spliced in here at the end
  em.cmd('');

  // ---- Start sequence ----
  // Note: homing/leveling comes BEFORE the final nozzle heat. Bambu's G29
  // internally drops the nozzle to ~140C for probing and does not restore
  // the print temperature, so waiting for full temp must happen after it.
  em.cmd('G90');
  em.cmd('M83');
  em.cmd(`M140 S${cfg.bedTemp}`);
  em.cmd('M104 S140 ; preheat nozzle for homing/leveling');
  em.cmd(`M190 S${cfg.bedTemp} ; wait for bed temp`);
  em.cmd('G28 ; home');
  if (cfg.bedLevel) em.cmd('G29 ; auto bed leveling (probes at reduced nozzle temp)');
  em.cmd(`M104 S${cfg.nozzleTemp}`);
  em.cmd(`M109 S${cfg.nozzleTemp} ; wait for full print temp before any extrusion`);
  em.cmd('M106 S0 ; part fan off for first layer');
  em.setZ(5);

  // Purge slot 0 (initial prime of the base filament)
  const purge = (slot) => {
    const px = 10, plen = 55, py = 3 + slot * 3;
    em.retract();
    em.setZ(Math.max(em.z, 2));
    em.travel(px, py, cfg.speedTravel);
    em.setZ(fl);
    em.unretract();
    em.extrude(px + plen, py, 0.3, 0.6, 1.0, 12, null, 'purge');
    em.extrude(px + plen, py + 0.8, 0.3, 0.6, 1.0, 12, null, 'purge');
    em.extrude(px, py + 0.8, 0.3, 0.6, 1.0, 12, null, 'purge');
    em.travel(px + 8, py + 0.8, 80); // wipe
    em.retract();
    em.setZ(fl + 0.6);
  };
  em.comment('--- prime line ---');
  purge(0);

  // ---- Phase 1: mesh lattice ----
  const meshHex = baseColor?.hex || '#e8dcc0';
  for (let layer = 0; layer < cfg.meshLayers; layer++) {
    const z = fl + layer * lh;
    const h = layer === 0 ? fl : lh;
    const flow = (layer === 0 ? cfg.firstLayerFlow : 1.0) * cfg.meshFlow;
    const speed = layer === 0 ? cfg.speedFirst : cfg.speedMesh;
    em.comment(`--- mesh layer ${layer + 1}/${cfg.meshLayers} z=${fmt(z)} ---`);
    em.setZ(z);
    if (layer === 1) em.cmd('M106 S255 ; part fan on');

    // brim (first layer only), outside-in
    if (layer === 0) {
      for (let b = cfg.brimLoops; b >= 1; b--) {
        const o = (b + 1) * lw;
        rect(em, x0 - o, y0 - o, x0 + W + o, y0 + H + o, h, lw, flow, speed, meshHex, 'brim');
      }
    }
    // frame: one outline just outside, one on the boundary
    rect(em, x0 - lw, y0 - lw, x0 + W + lw, y0 + H + lw, h, lw, flow, speed, meshHex, 'mesh');
    rect(em, x0, y0, x0 + W, y0 + H, h, lw, flow, speed, meshHex, 'mesh');

    // alternate weave order per layer
    const horizontals = () => {
      for (let r = 1; r < rows; r++) {
        const y = y0 + r * pitch;
        const leftToRight = r % 2 === 1;
        const xs = leftToRight ? x0 : x0 + W;
        const xe = leftToRight ? x0 + W : x0;
        if (Math.hypot(xs - em.x, y - em.y) > 5) em.retract();
        em.travel(xs, y, cfg.speedTravel);
        em.unretract();
        em.extrude(xe, y, h, lw, flow, speed, meshHex, 'mesh');
      }
    };
    const verticals = () => {
      for (let c = 1; c < cols; c++) {
        const x = x0 + c * pitch;
        const bottomToTop = c % 2 === 1;
        const ys = bottomToTop ? y0 : y0 + H;
        const ye = bottomToTop ? y0 + H : y0;
        if (Math.hypot(x - em.x, ys - em.y) > 5) em.retract();
        em.travel(x, ys, cfg.speedTravel);
        em.unretract();
        em.extrude(x, ye, h, lw, flow, speed, meshHex, 'mesh');
      }
    };
    if (layer % 2 === 0) { horizontals(); verticals(); }
    else { verticals(); horizontals(); }
  }

  // ---- Phase 2: stitches, grouped by color ----
  let pauseCount = 0;
  usedGroups.forEach((group, gi) => {
    pauseCount++;
    em.tag = `c${gi}`;
    em.comment(`--- filament change ${gi + 1}: ${group.color.name} ---`);
    em.retract();
    em.setZ(Math.min(clearanceZ + 20, P.maxZ - 1));
    em.cmd(`M117 Load ${group.color.name}`);
    if (cfg.pauseMode === 'pause') {
      em.travel(15, 15, cfg.speedTravel);
      em.cmd('M400 U1 ; pause for filament change');
    } else {
      em.cmd('M400 ; finish pending moves');
      em.cmd(`M600 ; filament change: cut + unload, then load ${group.color.name}`);
    }
    purge(gi + 1);

    const ordered = orderCells(group.cells, em.x, em.y, pitch, x0, y0);
    for (let layer = 0; layer < cfg.stitchLayers; layer++) {
      const z = meshTopZ + (layer + 1) * lh;
      em.comment(`--- ${group.color.name} stitches, pass ${layer + 1}/${cfg.stitchLayers} z=${fmt(z)} ---`);
      for (const cell of ordered) {
        const cx0 = x0 + cell.c * pitch, cy0 = y0 + cell.r * pitch;
        const cx1 = cx0 + pitch, cy1 = cy0 + pitch;
        // travel above everything, plunge, draw the two diagonals
        em.retract();
        em.setZ(clearanceZ);
        em.travel(cx0, cy0, cfg.speedTravel);
        em.setZ(z);
        em.unretract();
        em.extrude(cx1, cy1, lh, lw, cfg.stitchFlow, cfg.speedStitch, group.color.hex, 'stitch');
        em.travel(cx1, cy0, 80, false);
        em.extrude(cx0, cy1, lh, lw, cfg.stitchFlow, cfg.speedStitch, group.color.hex, 'stitch');
      }
    }
  });

  // ---- End sequence ----
  em.comment('--- end ---');
  em.retract();
  em.setZ(Math.min(em.z + 20, P.maxZ - 1));
  em.travel(10, P.bedY - 10, cfg.speedTravel);
  em.cmd('M104 S0');
  em.cmd('M140 S0');
  em.cmd('M106 S0');
  em.cmd('M84');
  em.cmd('M117 Print complete');

  const gramsOf = mm => mm * FIL_AREA * 1.24 / 1000; // PLA density 1.24 g/cm^3
  const minutesOf = s => s / 60 * 1.15;              // fudge for accel
  const baseUse = em.usage.base || { e: 0, t: 0 };
  const stats = {
    printer: P.name,
    cols, rows,
    widthMM: W, heightMM: H,
    stitchCount,
    base: {
      name: baseColor?.name || 'Base',
      hex: meshHex,
      filamentMM: baseUse.e,
      filamentG: gramsOf(baseUse.e),
      timeMin: minutesOf(baseUse.t),
    },
    byColor: usedGroups.map((g, gi) => {
      const u = em.usage[`c${gi}`] || { e: 0, t: 0 };
      return {
        name: g.color.name,
        hex: g.color.hex,
        count: g.cells.length,
        filamentMM: u.e,
        filamentG: gramsOf(u.e),
        timeMin: minutesOf(u.t),
      };
    }),
    pauses: pauseCount,
    filamentMM: em.filament,
    filamentG: gramsOf(em.filament),
    timeMin: minutesOf(em.time), // excludes heat-up/leveling/pauses
  };

  // splice the per-color filament summary into the file header
  const fmtLen = mm => mm >= 1000 ? `${(mm / 1000).toFixed(2)} m` : `${Math.round(mm)} mm`;
  const summary = [
    `; Filament needed (${stats.filamentG.toFixed(1)} g total, ~${Math.round(stats.timeMin)} min of moves):`,
    `;   ${stats.base.name} (mesh): ${fmtLen(stats.base.filamentMM)} (${stats.base.filamentG.toFixed(1)} g)`,
    ...stats.byColor.map(c => `;   ${c.name}: ${fmtLen(c.filamentMM)} (${c.filamentG.toFixed(1)} g)`),
  ];
  em.lines.splice(summaryAt, 0, ...summary);

  return { gcode: em.lines.join('\n') + '\n', segs: em.segs, stats };
}
