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
const TULIP = [
  '1.1',
  '111',
  '.1.',
];
const SUNFLOWER = [
  '..111..',
  '.11111.',
  '1112111',
  '1122211',
  '1112111',
  '.11111.',
  '..111..',
];
const STRAWBERRY = [
  '.22.',
  '1111',
  '1111',
  '.11.',
];
const CACTUS = [
  '..1..',
  '..1..',
  '1.1.1',
  '1.111',
  '111..',
  '..1..',
  '..1..',
  '.222.',
  '.222.',
];
const SNOWFLAKE = [
  '1.1.1',
  '.111.',
  '11111',
  '.111.',
  '1.1.1',
];
const PUMPKIN = [
  '..2..',
  '.111.',
  '11111',
  '11111',
  '.111.',
];
const GHOST = [
  '.111.',
  '11111',
  '1.1.1',
  '11111',
  '1.1.1',
];
const BEE = [
  '.3.3.',
  '12121',
  '.121.',
];
const BUTTERFLY = [
  '11.11',
  '11211',
  '.121.',
  '11211',
  '11.11',
];
const MUSHROOM = [
  '.111.',
  '13131',
  '11111',
  '.222.',
  '.222.',
];
const CLOUD = [
  '.11.',
  '1111',
];
const PAW = [
  '1.1.1',
  '.111.',
  '11111',
  '.111.',
];
const ROCKET = [
  '..1..',
  '.111.',
  '.121.',
  '.111.',
  '11111',
  '1.1.1',
  '.3.3.',
  '..3..',
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
  {
    id: 'tulips',
    name: 'Tulips',
    palette: [
      { name: 'Red', hex: '#c62828' },
      { name: 'Pink', hex: '#e57fa4' },
      { name: 'Green', hex: '#5aa73c' },
    ],
    build(cols, rows) {
      const { cells, set, stamp } = make(cols, rows);
      let band = 0;
      for (let top = 2; top + 8 <= rows; top += 9, band++) {
        for (let left = 2, i = 0; left + 3 <= cols - 1; left += 6, i++) {
          stamp(TULIP, top, left, { 1: (band + i) % 2 ? 1 : 2 });
          const sc = left + 1;
          for (let k = 3; k <= 5; k++) set(top + k, sc, 3);
          set(top + 4, sc - 1, 3);
          set(top + 4, sc + 1, 3);
        }
      }
      return cells;
    },
  },
  {
    id: 'sunflower',
    name: 'Sunflower',
    palette: [
      { name: 'Yellow', hex: '#f2c230' },
      { name: 'Brown', hex: '#7a5230' },
      { name: 'Green', hex: '#5aa73c' },
    ],
    build(cols, rows) {
      const { cells, set, stamp } = make(cols, rows);
      const cx = Math.floor(cols / 2);
      stamp(SUNFLOWER, 2, cx - 3, { 1: 1, 2: 2 });
      for (let r = 9; r < rows - 3; r++) set(r, cx, 3);
      set(Math.floor(rows * 0.45), cx - 1, 3);
      set(Math.floor(rows * 0.45) - 1, cx - 2, 3);
      set(Math.floor(rows * 0.62), cx + 1, 3);
      set(Math.floor(rows * 0.62) - 1, cx + 2, 3);
      stamp(FLOWER, Math.floor(rows * 0.75), cx - 8, { 1: 1, 2: 2 });
      return cells;
    },
  },
  {
    id: 'strawberries',
    name: 'Strawberries',
    palette: [
      { name: 'Red', hex: '#c62828' },
      { name: 'Green', hex: '#5aa73c' },
    ],
    build(cols, rows) {
      const { cells, stamp } = make(cols, rows);
      const spots = [[0.12, 0.05], [0.6, 0.14], [0.28, 0.28], [0.68, 0.42], [0.15, 0.52], [0.55, 0.64], [0.25, 0.78], [0.62, 0.88]];
      spots.forEach(([fx, fy]) => stamp(STRAWBERRY, Math.round(fy * (rows - 4)), Math.round(fx * (cols - 4)), { 1: 1, 2: 2 }));
      return cells;
    },
  },
  {
    id: 'cactus',
    name: 'Cactus',
    palette: [
      { name: 'Green', hex: '#5aa73c' },
      { name: 'Terracotta', hex: '#c96f4a' },
      { name: 'Pink', hex: '#e57fa4' },
    ],
    build(cols, rows) {
      const { cells, set, stamp } = make(cols, rows);
      const spots = [[0.15, 0.08], [0.55, 0.35], [0.2, 0.62]];
      spots.forEach(([fx, fy], i) => {
        const top = Math.round(fy * (rows - 10));
        const left = Math.round(fx * (cols - 6));
        stamp(CACTUS, top, left, { 1: 1, 2: 2 });
        set(top - 1, left + 2, 3); // little flower on top
      });
      return cells;
    },
  },
  {
    id: 'xmastree',
    name: 'Christmas Tree',
    palette: [
      { name: 'Green', hex: '#2e6b34' },
      { name: 'Gold', hex: '#f2c230' },
      { name: 'Red', hex: '#c62828' },
      { name: 'Brown', hex: '#7a5230' },
    ],
    build(cols, rows) {
      const { cells, set, stamp } = make(cols, rows);
      const cx = Math.floor(cols / 2);
      const top = 5;
      const bottom = Math.min(rows - 8, top + Math.floor(rows * 0.6));
      for (let r = top; r <= bottom; r++) {
        const half = Math.min(Math.floor((r - top) * 0.45) + 1, Math.floor(cols / 2) - 2);
        for (let c = cx - half; c <= cx + half; c++) {
          set(r, c, (r + 2 * c) % 7 === 0 ? 3 : 1); // ornaments woven in
        }
      }
      for (let r = bottom + 1; r <= Math.min(bottom + 3, rows - 2); r++) {
        set(r, cx - 1, 4); set(r, cx, 4); set(r, cx + 1, 4);
      }
      stamp(STAR_SMALL, top - 4, cx - 1, { 1: 2 });
      return cells;
    },
  },
  {
    id: 'snowflakes',
    name: 'Snowflakes',
    palette: [
      { name: 'Ice Blue', hex: '#8fc7e8' },
      { name: 'White', hex: '#f4f2ec' },
    ],
    build(cols, rows) {
      const { cells, set, stamp } = make(cols, rows);
      const big = [[0.2, 0.08], [0.65, 0.25], [0.25, 0.45], [0.62, 0.62], [0.2, 0.82]];
      big.forEach(([fx, fy], i) =>
        stamp(SNOWFLAKE, Math.round(fy * (rows - 5)), Math.round(fx * (cols - 5)), { 1: i % 2 ? 2 : 1 }));
      const small = [[0.75, 0.06], [0.1, 0.25], [0.8, 0.45], [0.15, 0.62], [0.7, 0.82], [0.45, 0.93]];
      small.forEach(([fx, fy], i) =>
        stamp(STAR_SMALL, Math.round(fy * (rows - 3)), Math.round(fx * (cols - 3)), { 1: i % 2 ? 1 : 2 }));
      return cells;
    },
  },
  {
    id: 'candycane',
    name: 'Candy Cane',
    palette: [
      { name: 'Red', hex: '#c62828' },
      { name: 'White', hex: '#f4f2ec' },
    ],
    build(cols, rows) {
      const { cells, set } = make(cols, rows);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const m = (r + c) % 8;
          if (m < 3) set(r, c, 1);
          else if (m === 4 || m === 5) set(r, c, 2);
        }
      }
      return cells;
    },
  },
  {
    id: 'pumpkins',
    name: 'Pumpkins',
    palette: [
      { name: 'Orange', hex: '#ef7d1a' },
      { name: 'Green', hex: '#5aa73c' },
    ],
    build(cols, rows) {
      const { cells, stamp } = make(cols, rows);
      const spots = [[0.15, 0.08], [0.6, 0.22], [0.25, 0.42], [0.62, 0.58], [0.2, 0.75], [0.55, 0.88]];
      spots.forEach(([fx, fy]) =>
        stamp(PUMPKIN, Math.round(fy * (rows - 5)), Math.round(fx * (cols - 5)), { 1: 1, 2: 2 }));
      return cells;
    },
  },
  {
    id: 'ghosts',
    name: 'Ghosts',
    palette: [
      { name: 'Ghost White', hex: '#dfe4f0' },
      { name: 'Purple', hex: '#7e57c2' },
    ],
    build(cols, rows) {
      const { cells, set, stamp } = make(cols, rows);
      const spots = [[0.18, 0.08], [0.62, 0.24], [0.22, 0.46], [0.6, 0.65], [0.3, 0.84]];
      spots.forEach(([fx, fy]) =>
        stamp(GHOST, Math.round(fy * (rows - 5)), Math.round(fx * (cols - 5)), { 1: 1 }));
      const dots = [[0.8, 0.1], [0.1, 0.3], [0.85, 0.5], [0.12, 0.68], [0.75, 0.9]];
      dots.forEach(([fx, fy]) => set(Math.round(fy * (rows - 1)), Math.round(fx * (cols - 1)), 2));
      return cells;
    },
  },
  {
    id: 'bees',
    name: 'Bees',
    palette: [
      { name: 'Gold', hex: '#f2c230' },
      { name: 'Black', hex: '#2b2b2e' },
      { name: 'White', hex: '#f4f2ec' },
    ],
    build(cols, rows) {
      const { cells, set, stamp } = make(cols, rows);
      const spots = [[0.15, 0.1], [0.6, 0.22], [0.25, 0.4], [0.65, 0.55], [0.2, 0.7], [0.55, 0.85]];
      spots.forEach(([fx, fy]) => {
        const top = Math.round(fy * (rows - 4));
        const left = Math.round(fx * (cols - 5));
        stamp(BEE, top, left, { 1: 1, 2: 2, 3: 3 });
        set(top + 4, left - 1, 1); // dotted flight trail
        set(top + 5, left - 3, 1);
      });
      return cells;
    },
  },
  {
    id: 'butterflies',
    name: 'Butterflies',
    palette: [
      { name: 'Purple', hex: '#7e57c2' },
      { name: 'Magenta', hex: '#c2419b' },
      { name: 'Black', hex: '#2b2b2e' },
    ],
    build(cols, rows) {
      const { cells, stamp } = make(cols, rows);
      const spots = [[0.15, 0.06], [0.6, 0.2], [0.22, 0.4], [0.62, 0.55], [0.18, 0.72], [0.55, 0.86]];
      spots.forEach(([fx, fy], i) =>
        stamp(BUTTERFLY, Math.round(fy * (rows - 5)), Math.round(fx * (cols - 5)), { 1: i % 2 ? 2 : 1, 2: 3 }));
      return cells;
    },
  },
  {
    id: 'mushrooms',
    name: 'Mushrooms',
    palette: [
      { name: 'Red', hex: '#c62828' },
      { name: 'White', hex: '#f4f2ec' },
    ],
    build(cols, rows) {
      const { cells, stamp } = make(cols, rows);
      const spots = [[0.15, 0.1], [0.6, 0.25], [0.25, 0.45], [0.62, 0.62], [0.2, 0.8]];
      spots.forEach(([fx, fy]) =>
        stamp(MUSHROOM, Math.round(fy * (rows - 5)), Math.round(fx * (cols - 5)), { 1: 1, 2: 2, 3: 2 }));
      return cells;
    },
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    palette: [
      { name: 'Red', hex: '#c62828' },
      { name: 'Orange', hex: '#ef7d1a' },
      { name: 'Yellow', hex: '#f2c230' },
      { name: 'Green', hex: '#5aa73c' },
      { name: 'Blue', hex: '#3a6fd8' },
      { name: 'White', hex: '#f4f2ec' },
    ],
    build(cols, rows) {
      const { cells, set, stamp } = make(cols, rows);
      const cx = Math.floor(cols / 2);
      const r0 = Math.floor(rows * 0.45);
      const R = Math.min(cx - 2, r0 - 2);
      for (let r = 0; r <= r0; r++) {
        for (let c = 0; c < cols; c++) {
          const d = Math.hypot(r - r0, c - cx);
          const k = R - d;
          if (k >= 0 && k < 10) set(r, c, Math.floor(k / 2) + 1);
        }
      }
      stamp(CLOUD, r0, cx - R - 1, { 1: 6 });
      stamp(CLOUD, r0, cx + R - 3, { 1: 6 });
      stamp(STAR_SMALL, Math.floor(rows * 0.7), Math.floor(cols * 0.3), { 1: 3 });
      stamp(STAR_SMALL, Math.floor(rows * 0.85), Math.floor(cols * 0.6), { 1: 3 });
      return cells;
    },
  },
  {
    id: 'waves',
    name: 'Ocean Waves',
    palette: [
      { name: 'Blue', hex: '#3a6fd8' },
      { name: 'Cyan', hex: '#3ab5d0' },
    ],
    build(cols, rows) {
      const { cells, set } = make(cols, rows);
      const h = [2, 1, 0, 0, 1, 2];
      for (let band = 0, r0 = 2; r0 + 3 < rows; r0 += 5, band++) {
        for (let c = 1; c < cols - 1; c++) {
          set(r0 + h[c % 6], c, band % 2 ? 2 : 1);
        }
      }
      return cells;
    },
  },
  {
    id: 'mountains',
    name: 'Mountains',
    palette: [
      { name: 'Slate', hex: '#5b6a7a' },
      { name: 'Gray', hex: '#8a8f98' },
      { name: 'White', hex: '#f4f2ec' },
      { name: 'Gold', hex: '#f2c230' },
    ],
    build(cols, rows) {
      const { cells, set, stamp } = make(cols, rows);
      const base = rows - 4;
      const peak = (apexR, apexC, color) => {
        for (let r = apexR; r <= base; r++) {
          const half = r - apexR;
          for (let c = apexC - half; c <= apexC + half; c++) {
            if (cells[r * cols + c] === 0) set(r, c, r - apexR < 3 ? 3 : color);
          }
        }
      };
      peak(Math.floor(rows * 0.35), Math.floor(cols * 0.3), 1);
      peak(Math.floor(rows * 0.5), Math.floor(cols * 0.72), 2);
      stamp(STAR, 2, cols - 8, { 1: 4 }); // sun
      for (let c = 1; c < cols - 1; c++) set(base + 1, c, 1);
      return cells;
    },
  },
  {
    id: 'polkadots',
    name: 'Polka Dots',
    palette: [
      { name: 'Pink', hex: '#e57fa4' },
      { name: 'Teal', hex: '#2f8f83' },
      { name: 'Gold', hex: '#f2c230' },
    ],
    build(cols, rows) {
      const { cells, set } = make(cols, rows);
      for (let br = 2, j = 0; br + 2 <= rows - 1; br += 5, j++) {
        for (let bc = 2 + (j % 2 ? 3 : 0), i = 0; bc + 2 <= cols - 1; bc += 6, i++) {
          const v = (i + j) % 3 + 1;
          set(br, bc, v); set(br, bc + 1, v);
          set(br + 1, bc, v); set(br + 1, bc + 1, v);
        }
      }
      return cells;
    },
  },
  {
    id: 'gingham',
    name: 'Gingham',
    palette: [
      { name: 'Red', hex: '#c62828' },
      { name: 'Pink', hex: '#e57fa4' },
    ],
    build(cols, rows) {
      const { cells, set } = make(cols, rows);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const a = Math.floor(r / 2) % 2, b = Math.floor(c / 2) % 2;
          if (a && b) set(r, c, 1);
          else if (a !== b && (r + c) % 2 === 0) set(r, c, 2);
        }
      }
      return cells;
    },
  },
  {
    id: 'stripes',
    name: 'Stripes',
    palette: [
      { name: 'Red', hex: '#c62828' },
      { name: 'Gold', hex: '#f2c230' },
      { name: 'Teal', hex: '#2f8f83' },
    ],
    build(cols, rows) {
      const { cells, set } = make(cols, rows);
      for (let r = 0; r < rows; r++) {
        const m = r % 9;
        const v = m < 2 ? 1 : m >= 3 && m < 5 ? 2 : m >= 6 && m < 8 ? 3 : 0;
        if (v) for (let c = 0; c < cols; c++) set(r, c, v);
      }
      return cells;
    },
  },
  {
    id: 'zigzagborder',
    name: 'Zigzag Border',
    palette: [
      { name: 'Navy', hex: '#2b4a7a' },
      { name: 'Gold', hex: '#f2c230' },
    ],
    build(cols, rows) {
      const { cells, set } = make(cols, rows);
      const tri = [0, 1, 2, 1];
      for (let r = 0; r < rows; r++) {
        set(r, 1 + tri[r % 4], 1);
        set(r, cols - 2 - tri[r % 4], 1);
      }
      for (let c = 4; c < cols - 4; c++) {
        set(1 + tri[c % 4], c, 1);
        set(rows - 2 - tri[c % 4], c, 1);
      }
      [[5, 5], [5, cols - 6], [rows - 6, 5], [rows - 6, cols - 6]].forEach(([r, c]) => set(r, c, 2));
      return cells;
    },
  },
  {
    id: 'paws',
    name: 'Paw Prints',
    palette: [
      { name: 'Brown', hex: '#7a5230' },
      { name: 'Tan', hex: '#c9a87b' },
    ],
    build(cols, rows) {
      const { cells, stamp } = make(cols, rows);
      const spots = [[0.15, 0.05], [0.55, 0.17], [0.2, 0.3], [0.6, 0.42], [0.22, 0.55], [0.58, 0.67], [0.2, 0.8], [0.55, 0.9]];
      spots.forEach(([fx, fy], i) =>
        stamp(PAW, Math.round(fy * (rows - 4)), Math.round(fx * (cols - 5)), { 1: i % 2 ? 2 : 1 }));
      return cells;
    },
  },
  {
    id: 'rocket',
    name: 'Rocket',
    palette: [
      { name: 'Red', hex: '#c62828' },
      { name: 'Gray', hex: '#8a8f98' },
      { name: 'Gold', hex: '#f2c230' },
    ],
    build(cols, rows) {
      const { cells, set, stamp } = make(cols, rows);
      const cx = Math.floor(cols / 2);
      stamp(ROCKET, Math.floor(rows * 0.2), cx - 2, { 1: 1, 2: 2, 3: 3 });
      const stars = [[0.15, 0.08], [0.75, 0.15], [0.2, 0.5], [0.7, 0.6], [0.3, 0.75], [0.65, 0.88]];
      stars.forEach(([fx, fy], i) => {
        if (i % 2) stamp(STAR_SMALL, Math.round(fy * (rows - 3)), Math.round(fx * (cols - 3)), { 1: 3 });
        else set(Math.round(fy * (rows - 1)), Math.round(fx * (cols - 1)), 2);
      });
      return cells;
    },
  },
];
