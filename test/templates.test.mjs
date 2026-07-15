// Sanity tests for starter templates. Run: node test/templates.test.mjs
import { TEMPLATES } from '../templates.js';

let failures = 0;
function check(name, cond, detail = '') {
  if (cond) console.log(`  ok  ${name}`);
  else { console.error(`FAIL  ${name} ${detail}`); failures++; }
}

const ids = TEMPLATES.map(t => t.id);
check('38 templates total', TEMPLATES.length === 38, `got ${TEMPLATES.length}`);
check('unique ids', new Set(ids).size === ids.length);
check('has blank + wildflowers', ids.includes('blank') && ids.includes('wildflowers'));

for (const tpl of TEMPLATES) {
  for (const [cols, rows] of [[28, 40], [17, 23], [8, 8]]) {
    const cells = tpl.build(cols, rows);
    const label = `${tpl.id} @ ${cols}x${rows}`;
    check(`${label}: correct size`, cells.length === cols * rows);
    const maxPal = tpl.palette ? tpl.palette.length : 3;
    check(`${label}: values in palette range`, cells.every(v => v >= 0 && v <= maxPal),
      `max=${Math.max(...cells)} pal=${maxPal}`);
  }
  if (tpl.id !== 'blank') {
    const cells = tpl.build(28, 40);
    const n = cells.reduce((s, v) => s + (v ? 1 : 0), 0);
    check(`${tpl.id}: has stitches (28x40)`, n > 20, `got ${n}`);
    check(`${tpl.id}: not overly dense`, n < 28 * 40 * 0.7, `got ${n}`);
  }
}

console.log(failures ? `\n${failures} failures` : '\nall template tests pass');
process.exit(failures ? 1 : 0);
