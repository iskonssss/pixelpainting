// templates.js — starter patterns for the grid editor.
// Each template has its own palette and a build(cols, rows) that returns the
// cell array (0 = empty, else 1-based palette index). Builders are procedural
// so they adapt to any grid size; stamps clip safely at the edges.

function make(cols, rows) {
  const cells = new Uint8Array(cols * rows);
  const set = (r, c, v) => {
    if (r >= 0 && r < rows && c >= 0 && c < cols) cells[r * cols + c] = v;
  };
  const stamp = (pattern, top, left, map) => {
    pattern.forEach((row, dr) => [...row].forEach((ch, dc) => {
      if (ch !== '.') set(top + dr, left + dc, map[ch]);
    }));
  };
  return { cells, set, stamp };
}

const FLOWER = [
  '..1..',
  '.111.',
  '11211',
  '.111.',
  '..1..',
];
const SPRIG = [
  '.1.',
  '111',
  '.1.',
];
const HEART = [
  '.11.11.',
  '1111111',
  '1111111',
  '1111111',
  '.11111.',
  '..111..',
  '...1...',
];
const HEART_SMALL = [
  '.1.1.',
  '11111',
  '.111.',
  '..1..',
];
const BLOSSOM = [
  '.22.',
  '2332',
  '2332',
  '.22.',
];
const STAR = [
  '..1..',
  '..1..',
  '11111',
  '..1..',
  '..1..',
];
const STAR_SMALL = [
  '.1.',
  '111',
  '.1.',
];
const MOON = [
  '..111',
  '.11..',
  '11...',
  '11...',
  '11...',
  '.11..',
  '..111',
];

export const TEMPLATES = [
  {
    id: 'blank',
    name: 'Blank',
    palette: null, // keep the user's current palette
    build: (cols, rows) => new Uint8Array(cols * rows),
  },
  {
    id: 'wildflowers',
    name: 'Wildflowers',
    palette: [
      { name: 'Red', hex: '#c62828' },
      { name: 'Yellow', hex: '#f2c230' },
      { name: 'Green', hex: '#5aa73c' },
    ],
    build(cols, rows) {
      const { cells, set, stamp } = make(cols, rows);
      const red = 1, yellow = 2, green = 3;
      const cx = Math.floor(cols / 2);
      const stem = (r0, c0, r1, c1) => {
        let r = r0, c = c0;
        while (r !== r1 || c !== c1) {
          set(r, c, green);
          if (r !== r1) r += Math.sign(r1 - r);
          else c += Math.sign(c1 - c);
        }
        set(r1, c1, green);
      };
      stem(6, cx, rows - 4, cx);
      stem(Math.floor(rows * 0.3), cx, Math.floor(rows * 0.3), cx - 6);
      stem(Math.floor(rows * 0.5), cx, Math.floor(rows * 0.5), cx + 6);
      stem(Math.floor(rows * 0.7), cx, Math.floor(rows * 0.7), cx - 7);
      stamp(FLOWER, 2, cx - 2, { 1: red, 2: yellow });
      stamp(FLOWER, Math.floor(rows * 0.3) - 3, cx - 9, { 1: yellow, 2: red });
      stamp(FLOWER, Math.floor(rows * 0.5) - 3, cx + 4, { 1: red, 2: yellow });
      stamp(FLOWER, Math.floor(rows * 0.7) - 3, cx - 10, { 1: yellow, 2: red });
      stamp(SPRIG, Math.floor(rows * 0.85), cx - 4, { 1: red });
      stamp(SPRIG, 5, cx + 5, { 1: yellow });
      stamp(SPRIG, rows - 6, cx + 3, { 1: yellow });
      return cells;
    },
  },
  {
    id: 'hearts',
    name: 'Hearts',
    palette: [
      { name: 'Red', hex: '#c62828' },
      { name: 'Pink', hex: '#e57fa4' },
    ],
    build(cols, rows) {
      const { cells, stamp } = make(cols, rows);
      const mid = Math.floor(cols / 2);
      for (let i = 0, top = 2; top + 7 <= rows; i++, top += 12) {
        const left = i % 2 ? mid + 2 : mid - 9;
        stamp(HEART, top, left, { 1: i % 2 ? 2 : 1 });
        const sLeft = i % 2 ? mid - 8 : mid + 4;
        if (top + 12 <= rows) stamp(HEART_SMALL, top + 8, sLeft, { 1: i % 2 ? 1 : 2 });
      }
      return cells;
    },
  },
  {
    id: 'blossom',
    name: 'Cherry Blossom',
    palette: [
      { name: 'Brown', hex: '#7a5230' },
      { name: 'Pink', hex: '#f2a7c3' },
      { name: 'Rose', hex: '#d9578a' },
    ],
    build(cols, rows) {
      const { set, cells, stamp } = make(cols, rows);
      const mid = Math.floor(cols / 2);
      const amp = Math.max(3, Math.floor(cols * 0.2));
      const branchCol = r => mid + Math.round(amp * Math.sin(r * 0.28));
      for (let r = 0; r < rows; r++) {
        const c = branchCol(r);
        set(r, c, 1);
        if (r % 3 !== 0) set(r, c + 1, 1);
      }
      // twigs with blossoms
      for (let r = 3, i = 0; r + 4 < rows; r += 6, i++) {
        const c = branchCol(r);
        const dir = i % 2 ? 1 : -1;
        for (let k = 1; k <= 3; k++) set(r, c + dir * k, 1);
        stamp(BLOSSOM, r - 2, c + dir * 4 + (dir < 0 ? -3 : 0), { 2: 2, 3: 3 });
      }
      return cells;
    },
  },
  {
    id: 'fairisle',
    name: 'Fair Isle',
    palette: [
      { name: 'Navy', hex: '#2b4a7a' },
      { name: 'Red', hex: '#c62828' },
      { name: 'Gold', hex: '#f2c230' },
    ],
    build(cols, rows) {
      const { cells, set } = make(cols, rows);
      const motif = [
        '1.1.1.1.',
        '.1.1.1.1',
        '........',
        '3..3..3.',
        '........',
        '2.....2.',
        '.2...2..',
        '..2.2...',
        '...2....',
        '..2.2...',
        '.2...2..',
        '2.....2.',
        '........',
        '3..3..3.',
        '........',
      ];
      for (let r = 0; r < rows; r++) {
        const row = motif[r % motif.length];
        for (let c = 0; c < cols; c++) {
          const ch = row[c % 8];
          if (ch !== '.') set(r, c, parseInt(ch, 10));
        }
      }
      return cells;
    },
  },
  {
    id: 'nightsky',
    name: 'Night Sky',
    palette: [
      { name: 'Gold', hex: '#f2c230' },
      { name: 'White', hex: '#f4f2ec' },
    ],
    build(cols, rows) {
      const { cells, set, stamp } = make(cols, rows);
      stamp(MOON, 2, cols - 9, { 1: 1 });
      const bigStars = [[0.18, 0.15], [0.6, 0.3], [0.25, 0.45], [0.75, 0.6], [0.4, 0.75], [0.7, 0.9]];
      bigStars.forEach(([fx, fy], i) => {
        const p = i % 2 ? STAR : STAR_SMALL;
        stamp(p, Math.round(fy * (rows - 5)), Math.round(fx * (cols - 5)), { 1: i % 3 === 2 ? 2 : 1 });
      });
      const dots = [[0.1, 0.3], [0.45, 0.12], [0.85, 0.2], [0.15, 0.65], [0.55, 0.5], [0.9, 0.45], [0.3, 0.9], [0.6, 0.95], [0.05, 0.85], [0.8, 0.78]];
      dots.forEach(([fx, fy], i) => set(Math.round(fy * (rows - 1)), Math.round(fx * (cols - 1)), i % 2 ? 1 : 2));
      return cells;
    },
  },
  {
    id: 'chevron',
    name: 'Rainbow Chevron',
    palette: [
      { name: 'Red', hex: '#c62828' },
      { name: 'Orange', hex: '#ef7d1a' },
      { name: 'Yellow', hex: '#f2c230' },
      { name: 'Green', hex: '#5aa73c' },
      { name: 'Blue', hex: '#3a6fd8' },
    ],
    build(cols, rows) {
      const { cells, set } = make(cols, rows);
      const period = Math.max(6, Math.floor(cols / 2));
      const tri = c => Math.abs(((c % (2 * period)) + 2 * period) % (2 * period) - period);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const slot = (r + tri(c)) % 20;
          if (slot % 4 < 2) set(r, c, Math.floor(slot / 4) + 1);
        }
      }
      return cells;
    },
  },
  {
    id: 'argyle',
    name: 'Argyle Lattice',
    palette: [
      { name: 'Teal', hex: '#2f8f83' },
      { name: 'Pink', hex: '#e57fa4' },
    ],
    build(cols, rows) {
      const { cells, set } = make(cols, rows);
      const p = 8;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const a = (r + c) % p === 0;
          const b = ((r - c) % p + p) % p === 0;
          if (a || b) set(r, c, 1);
          if ((r + c) % p === p / 2 && ((r - c) % p + p) % p === p / 2) set(r, c, 2);
        }
      }
      return cells;
    },
  },
  {
    id: 'vine',
    name: 'Vine Border',
    palette: [
      { name: 'Green', hex: '#5aa73c' },
      { name: 'Red', hex: '#c62828' },
    ],
    build(cols, rows) {
      const { cells, set } = make(cols, rows);
      for (let r = 0; r < rows; r++) {
        const w = r % 8 < 4 ? 0 : 1;
        const left = 1 + w;
        const right = cols - 2 - w;
        set(r, left, 1);
        set(r, right, 1);
        if (r % 8 === 2) { set(r, left + 1, 1); set(r, right - 1, 1); }
        if (r % 8 === 6) { set(r, left - 1, 1); set(r, right + 1, 1); }
        if (r % 12 === 4) { set(r, left + 1, 2); set(r, right - 1, 2); }
      }
      return cells;
    },
  },
];
