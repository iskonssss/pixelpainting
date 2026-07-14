// app.js — grid editor UI for PixelPainting
import { PRINTERS, DEFAULT_CFG, generateGcode } from './gcode.js';
import { TEMPLATES } from './templates.js';

const $ = id => document.getElementById(id);

// ---------- State ----------
const state = {
  cols: 28,
  rows: 40,
  cells: new Uint8Array(28 * 40), // 0 = empty, else palette index + 1
  palette: [
    { name: 'Red', hex: '#c62828' },
    { name: 'Yellow', hex: '#f2c230' },
    { name: 'Green', hex: '#5aa73c' },
  ],
  baseColor: { name: 'Cream', hex: '#f1e8d0' },
  selected: 0,      // palette index
  tool: 'paint',
  zoom: 16,
};
const undoStack = [];
const redoStack = [];
let lastResult = null; // {gcode, segs, stats, layers}

// ---------- Config from inputs ----------
const cfgIds = ['pitch', 'lineWidth', 'firstLayerHeight', 'layerHeight', 'meshLayers',
  'stitchLayers', 'stitchFlow', 'brimLoops', 'nozzleTemp', 'bedTemp',
  'speedFirst', 'speedMesh', 'speedStitch'];

function readCfg() {
  const cfg = { ...DEFAULT_CFG };
  cfg.printerId = $('printer').value;
  for (const id of cfgIds) cfg[id] = parseFloat($(id).value) || DEFAULT_CFG[id];
  cfg.bedLevel = $('bedLevel').checked;
  return cfg;
}

// ---------- Canvas rendering ----------
const canvas = $('grid');
const ctx = canvas.getContext('2d');

function render() {
  const px = state.zoom;
  const w = state.cols * px, h = state.rows * px;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // canvas-fabric background
  ctx.fillStyle = '#fdfcf7';
  ctx.fillRect(0, 0, w, h);

  // mesh lattice in the base color
  ctx.strokeStyle = state.baseColor.hex;
  ctx.lineWidth = Math.max(1, px * 0.18);
  ctx.beginPath();
  for (let c = 0; c <= state.cols; c++) {
    ctx.moveTo(c * px, 0); ctx.lineTo(c * px, h);
  }
  for (let r = 0; r <= state.rows; r++) {
    ctx.moveTo(0, r * px); ctx.lineTo(w, r * px);
  }
  ctx.stroke();

  // stitches
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.5, px * 0.26);
  const inset = px * 0.08;
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const v = state.cells[r * state.cols + c];
      if (!v) continue;
      const col = state.palette[v - 1];
      if (!col) continue;
      const x = c * px, y = r * px;
      ctx.strokeStyle = col.hex;
      ctx.beginPath();
      ctx.moveTo(x + inset, y + inset);
      ctx.lineTo(x + px - inset, y + px - inset);
      ctx.moveTo(x + px - inset, y + inset);
      ctx.lineTo(x + inset, y + px - inset);
      ctx.stroke();
    }
  }
  updateHud();
}

function updateHud() {
  const cfg = readCfg();
  const W = (state.cols * cfg.pitch).toFixed(1);
  const H = (state.rows * cfg.pitch).toFixed(1);
  let n = 0;
  for (const v of state.cells) if (v) n++;
  $('hud').textContent =
    `grid ${state.cols} × ${state.rows}  ·  ${W} × ${H} mm  ·  stitches ${n}  ·  ${PRINTERS[cfg.printerId].name}`;
  renderPaletteCounts();
}

// ---------- Palette UI ----------
function renderPalette() {
  const list = $('paletteList');
  list.innerHTML = '';
  state.palette.forEach((col, i) => {
    const row = document.createElement('div');
    row.className = 'palette-row' + (state.selected === i ? ' selected' : '');
    const swatch = document.createElement('input');
    swatch.type = 'color';
    swatch.value = col.hex;
    swatch.oninput = () => { col.hex = swatch.value; render(); scheduleSave(); };
    const name = document.createElement('input');
    name.type = 'text';
    name.value = col.name;
    name.oninput = () => { col.name = name.value; scheduleSave(); };
    const count = document.createElement('span');
    count.className = 'count';
    count.dataset.idx = i;
    const del = document.createElement('button');
    del.className = 'small del';
    del.textContent = '✕';
    del.title = 'Remove color (clears its stitches)';
    del.onclick = () => removeColor(i);
    row.onclick = (e) => {
      if (e.target === del) return;
      state.selected = i;
      renderPalette();
    };
    row.append(swatch, name, count, del);
    list.appendChild(row);
  });
  renderPaletteChips();
  renderPaletteCounts();
}

function renderPaletteChips() {
  const chips = $('paletteChips');
  if (!chips) return;
  chips.innerHTML = '';
  state.palette.forEach((col, i) => {
    const b = document.createElement('button');
    b.className = 'chip' + (i === state.selected ? ' selected' : '');
    b.style.background = col.hex;
    b.title = col.name;
    b.onclick = () => { state.selected = i; renderPalette(); };
    chips.appendChild(b);
  });
  const add = document.createElement('button');
  add.className = 'chip add';
  add.textContent = '+';
  add.title = 'Add color';
  add.onclick = () => $('addColor').click();
  chips.appendChild(add);
}

function renderPaletteCounts() {
  const counts = new Array(state.palette.length).fill(0);
  for (const v of state.cells) if (v) counts[v - 1]++;
  document.querySelectorAll('#paletteList .count').forEach(el => {
    el.textContent = counts[el.dataset.idx] ?? 0;
  });
}

function removeColor(i) {
  if (state.palette.length <= 1) return alert('Keep at least one color.');
  pushUndo();
  for (let k = 0; k < state.cells.length; k++) {
    const v = state.cells[k];
    if (v === i + 1) state.cells[k] = 0;
    else if (v > i + 1) state.cells[k] = v - 1;
  }
  state.palette.splice(i, 1);
  if (state.selected >= state.palette.length) state.selected = state.palette.length - 1;
  renderPalette();
  render();
  scheduleSave();
}

$('addColor').onclick = () => {
  if (state.palette.length >= 16) return alert('16 colors max.');
  state.palette.push({ name: `Color ${state.palette.length + 1}`, hex: '#7e57c2' });
  state.selected = state.palette.length - 1;
  renderPalette();
  scheduleSave();
};
$('baseColorHex').oninput = e => { state.baseColor.hex = e.target.value; render(); scheduleSave(); };
$('baseColorName').oninput = e => { state.baseColor.name = e.target.value; scheduleSave(); };

// ---------- Undo ----------
function pushUndo() {
  undoStack.push({ cells: state.cells.slice(), cols: state.cols, rows: state.rows });
  if (undoStack.length > 100) undoStack.shift();
  redoStack.length = 0;
}
function applySnapshot(s) {
  state.cells = s.cells.slice();
  state.cols = s.cols;
  state.rows = s.rows;
  $('cols').value = s.cols;
  $('rows').value = s.rows;
  render();
  scheduleSave();
}
$('undo').onclick = () => {
  if (!undoStack.length) return;
  redoStack.push({ cells: state.cells.slice(), cols: state.cols, rows: state.rows });
  applySnapshot(undoStack.pop());
};
$('redo').onclick = () => {
  if (!redoStack.length) return;
  undoStack.push({ cells: state.cells.slice(), cols: state.cols, rows: state.rows });
  applySnapshot(redoStack.pop());
};
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); $('undo').click(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); $('redo').click(); }
});

// ---------- Painting (mouse + touch; two-finger pinch zooms/pans) ----------
let painting = false;
let paintErase = false;
const pointers = new Map();
let pinch = null;
const wrap = $('canvasWrap');

function cellAt(e) {
  const rect = canvas.getBoundingClientRect();
  const c = Math.floor((e.clientX - rect.left) / state.zoom);
  const r = Math.floor((e.clientY - rect.top) / state.zoom);
  if (c < 0 || c >= state.cols || r < 0 || r >= state.rows) return null;
  return { r, c };
}

// A second finger landing mid-stroke means the user wanted to pinch, not paint:
// roll back the stroke that just started.
function cancelStroke() {
  if (!painting) return;
  painting = false;
  const snap = undoStack.pop();
  if (snap) { state.cells = snap.cells.slice(); render(); }
}

function paintCell(cell, erase) {
  const i = cell.r * state.cols + cell.c;
  const val = erase ? 0 : state.selected + 1;
  if (state.cells[i] === val) return;
  state.cells[i] = val;
  render();
}

function floodFill(cell) {
  const target = state.cells[cell.r * state.cols + cell.c];
  const repl = state.selected + 1;
  if (target === repl) return;
  const stack = [cell];
  while (stack.length) {
    const { r, c } = stack.pop();
    if (r < 0 || r >= state.rows || c < 0 || c >= state.cols) continue;
    const i = r * state.cols + c;
    if (state.cells[i] !== target) continue;
    state.cells[i] = repl;
    stack.push({ r: r + 1, c }, { r: r - 1, c }, { r, c: c + 1 }, { r, c: c - 1 });
  }
  render();
}

canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    cancelStroke();
    const [a, b] = [...pointers.values()];
    const rect = wrap.getBoundingClientRect();
    pinch = {
      d0: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      zoom0: state.zoom,
      cx: wrap.scrollLeft + (a.x + b.x) / 2 - rect.left,
      cy: wrap.scrollTop + (a.y + b.y) / 2 - rect.top,
    };
    return;
  }
  if (pointers.size > 1) return;
  const cell = cellAt(e);
  if (!cell) return;
  const erase = e.button === 2 || state.tool === 'erase';
  if (state.tool === 'pick') {
    const v = state.cells[cell.r * state.cols + cell.c];
    if (v) { state.selected = v - 1; renderPalette(); }
    return;
  }
  pushUndo();
  if (state.tool === 'fill' && !erase) { floodFill(cell); scheduleSave(); return; }
  painting = true;
  paintErase = erase;
  canvas.setPointerCapture(e.pointerId);
  paintCell(cell, erase);
});
canvas.addEventListener('pointermove', e => {
  const p = pointers.get(e.pointerId);
  if (p) { p.x = e.clientX; p.y = e.clientY; }
  if (pinch && pointers.size >= 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    const z = Math.max(6, Math.min(34, Math.round(pinch.zoom0 * d / pinch.d0)));
    if (z !== state.zoom) { state.zoom = z; $('zoom').value = z; render(); }
    const rect = wrap.getBoundingClientRect();
    const scale = state.zoom / pinch.zoom0;
    wrap.scrollLeft = pinch.cx * scale - ((a.x + b.x) / 2 - rect.left);
    wrap.scrollTop = pinch.cy * scale - ((a.y + b.y) / 2 - rect.top);
    return;
  }
  if (!painting) return;
  const cell = cellAt(e);
  if (cell) paintCell(cell, paintErase);
});
const endPointer = e => {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinch = null;
  if (painting && pointers.size === 0) { painting = false; scheduleSave(); }
};
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

document.querySelectorAll('.tool').forEach(btn => {
  btn.onclick = () => {
    state.tool = btn.dataset.tool;
    document.querySelectorAll('.tool').forEach(b =>
      b.classList.toggle('active', b.dataset.tool === state.tool));
  };
});
$('undoM').onclick = () => $('undo').click();
$('redoM').onclick = () => $('redo').click();

// ---------- Mobile settings sheet ----------
function openSheet(open) {
  $('panel').classList.toggle('open', open);
  $('sheetBackdrop').classList.toggle('open', open);
}
$('openSettings').onclick = () => openSheet(true);
$('closeSettings').onclick = () => openSheet(false);
$('sheetBackdrop').onclick = () => openSheet(false);
$('generateM').onclick = () => { openSheet(false); $('generate').click(); };

// ---------- Grid resize / zoom ----------
function resizeGrid(cols, rows) {
  cols = Math.max(4, Math.min(120, cols | 0));
  rows = Math.max(4, Math.min(200, rows | 0));
  if (cols === state.cols && rows === state.rows) return;
  pushUndo();
  const next = new Uint8Array(cols * rows);
  for (let r = 0; r < Math.min(rows, state.rows); r++) {
    for (let c = 0; c < Math.min(cols, state.cols); c++) {
      next[r * cols + c] = state.cells[r * state.cols + c];
    }
  }
  state.cols = cols;
  state.rows = rows;
  state.cells = next;
  render();
  scheduleSave();
}
$('cols').onchange = () => resizeGrid(parseInt($('cols').value), state.rows);
$('rows').onchange = () => resizeGrid(state.cols, parseInt($('rows').value));
$('zoom').oninput = () => { state.zoom = parseInt($('zoom').value); render(); };
$('pitch').oninput = updateHud;
$('printer').onchange = () => { updateHud(); scheduleSave(); };

$('clear').onclick = () => {
  pushUndo();
  state.cells.fill(0);
  render();
  scheduleSave();
};

// ---------- Templates ----------
function applyTemplate(tpl) {
  pushUndo();
  if (tpl.palette) {
    state.palette = tpl.palette.map(c => ({ ...c }));
    state.selected = 0;
  }
  state.cells = tpl.build(state.cols, state.rows);
  renderPalette();
  render();
  scheduleSave();
}

function drawTemplateThumb(cv, tpl) {
  const cols = 28, rows = 40, px = 4;
  cv.width = cols * px;
  cv.height = rows * px;
  const c2 = cv.getContext('2d');
  c2.fillStyle = '#faf7ef';
  c2.fillRect(0, 0, cv.width, cv.height);
  c2.strokeStyle = '#efe7d2';
  c2.lineWidth = 0.5;
  c2.beginPath();
  for (let c = 0; c <= cols; c += 2) { c2.moveTo(c * px, 0); c2.lineTo(c * px, rows * px); }
  for (let r = 0; r <= rows; r += 2) { c2.moveTo(0, r * px); c2.lineTo(cols * px, r * px); }
  c2.stroke();
  const cells = tpl.build(cols, rows);
  const pal = tpl.palette || state.palette;
  c2.lineCap = 'round';
  c2.lineWidth = 1.4;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = cells[r * cols + c];
      if (!v || !pal[v - 1]) continue;
      const x = c * px, y = r * px;
      c2.strokeStyle = pal[v - 1].hex;
      c2.beginPath();
      c2.moveTo(x + 0.5, y + 0.5);
      c2.lineTo(x + px - 0.5, y + px - 0.5);
      c2.moveTo(x + px - 0.5, y + 0.5);
      c2.lineTo(x + 0.5, y + px - 0.5);
      c2.stroke();
    }
  }
}

let galleryBuilt = false;
$('templates').onclick = () => {
  if (!galleryBuilt) {
    galleryBuilt = true;
    const grid = $('templateGrid');
    for (const tpl of TEMPLATES) {
      const card = document.createElement('button');
      card.className = 'tpl';
      const cv = document.createElement('canvas');
      drawTemplateThumb(cv, tpl);
      const label = document.createElement('span');
      label.textContent = tpl.name;
      card.append(cv, label);
      card.onclick = () => {
        applyTemplate(tpl);
        $('templatesDlg').close();
      };
      grid.appendChild(card);
    }
  }
  $('templatesDlg').showModal();
};
$('closeTemplates').onclick = () => $('templatesDlg').close();

// ---------- Save / load ----------
function designJSON() {
  return {
    version: 1,
    cols: state.cols,
    rows: state.rows,
    cells: Array.from(state.cells),
    palette: state.palette,
    baseColor: state.baseColor,
    printerId: $('printer').value,
    pitch: parseFloat($('pitch').value),
  };
}
function loadDesignObj(d) {
  if (!d || !d.cols || !d.rows || !Array.isArray(d.cells)) throw new Error('Invalid design file');
  state.cols = d.cols;
  state.rows = d.rows;
  state.cells = Uint8Array.from(d.cells);
  state.palette = d.palette || state.palette;
  state.baseColor = d.baseColor || state.baseColor;
  state.selected = 0;
  $('cols').value = d.cols;
  $('rows').value = d.rows;
  if (d.pitch) $('pitch').value = d.pitch;
  if (d.printerId && PRINTERS[d.printerId]) $('printer').value = d.printerId;
  $('baseColorHex').value = state.baseColor.hex;
  $('baseColorName').value = state.baseColor.name;
  renderPalette();
  render();
}
$('saveDesign').onclick = () => {
  const blob = new Blob([JSON.stringify(designJSON(), null, 1)], { type: 'application/json' });
  downloadBlob(blob, `design_${state.cols}x${state.rows}.json`);
};
$('loadDesign').onclick = () => $('loadFile').click();
$('loadFile').onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    loadDesignObj(JSON.parse(await file.text()));
    scheduleSave();
  } catch (err) {
    alert('Could not load design: ' + err.message);
  }
  e.target.value = '';
};

let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem('pixelpainting.design', JSON.stringify(designJSON())); } catch {}
  }, 400);
}

function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

// ---------- Generate + preview ----------
let previewLayers = [];

$('generate').onclick = () => {
  const cfg = readCfg();
  const design = {
    cols: state.cols,
    rows: state.rows,
    cells: state.cells,
    palette: state.palette,
    baseColor: state.baseColor,
  };
  try {
    lastResult = generateGcode(design, cfg);
  } catch (err) {
    alert(err.message);
    return;
  }
  // group preview segments by z; only extrusion moves define layers,
  // travel moves attach to the layer of the last extrusion before them
  const byZ = new Map();
  let lastKey = null;
  for (const s of lastResult.segs) {
    let key;
    if (s.t === 't') {
      if (lastKey === null) continue;
      key = lastKey;
    } else {
      key = s.z.toFixed(3);
      lastKey = key;
    }
    if (!byZ.has(key)) byZ.set(key, []);
    byZ.get(key).push(s);
  }
  previewLayers = [...byZ.entries()]
    .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
    .map(([z, segs]) => ({ z: parseFloat(z), segs }));
  $('layerSlider').max = previewLayers.length - 1;
  $('layerSlider').value = previewLayers.length - 1;
  const st = lastResult.stats;
  $('statsBox').textContent =
    `${st.printer}\n` +
    `${st.cols} × ${st.rows} cells  →  ${st.widthMM.toFixed(1)} × ${st.heightMM.toFixed(1)} mm\n` +
    `${st.stitchCount} stitches  ·  ${st.pauses} filament change${st.pauses === 1 ? '' : 's'}\n` +
    st.byColor.map(c => `  • ${c.name}: ${c.count} stitches`).join('\n') + '\n' +
    `filament ≈ ${(st.filamentMM / 1000).toFixed(2)} m (${st.filamentG.toFixed(1)} g)\n` +
    `print time ≈ ${Math.round(st.timeMin)} min (moves only; excludes heat-up, leveling, pauses)`;
  // native share sheet (mobile): lets you AirDrop / save / hand off the file
  try {
    const f = gcodeFile();
    $('share').hidden = !(navigator.canShare && navigator.canShare({ files: [f] }));
  } catch { $('share').hidden = true; }
  drawPreview();
  $('previewDlg').showModal();
};

function gcodeName() {
  return `bookmark_${state.cols}x${state.rows}_${$('printer').value}.gcode`;
}
function gcodeFile() {
  return new File([lastResult.gcode], gcodeName(), { type: 'text/plain' });
}

function drawPreview() {
  const cv = $('previewCanvas');
  const c2 = cv.getContext('2d');
  c2.fillStyle = '#14161a';
  c2.fillRect(0, 0, cv.width, cv.height);
  if (!previewLayers.length) return;
  const showTravel = $('showTravel').checked;
  const upTo = parseInt($('layerSlider').value);
  $('layerLabel').textContent = `${upTo + 1}/${previewLayers.length}  z=${previewLayers[upTo].z.toFixed(2)}`;

  // bounds across all extrusion segments
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const L of previewLayers) for (const s of L.segs) {
    if (s.t === 't') continue;
    minX = Math.min(minX, s.x1, s.x2); maxX = Math.max(maxX, s.x1, s.x2);
    minY = Math.min(minY, s.y1, s.y2); maxY = Math.max(maxY, s.y1, s.y2);
  }
  const pad = 20;
  const scale = Math.min((cv.width - 2 * pad) / (maxX - minX), (cv.height - 2 * pad) / (maxY - minY));
  const tx = x => pad + (x - minX) * scale;
  const ty = y => cv.height - pad - (y - minY) * scale; // printer Y up = canvas up

  for (let i = 0; i <= upTo; i++) {
    const isTop = i === upTo;
    for (const s of previewLayers[i].segs) {
      if (s.t === 't') {
        if (!showTravel || !isTop) continue;
        c2.strokeStyle = 'rgba(90,140,255,0.5)';
        c2.lineWidth = 0.6;
        c2.setLineDash([3, 3]);
      } else {
        const base = s.color || (s.t === 'purge' ? '#666' : '#c9b98a');
        c2.strokeStyle = base;
        c2.globalAlpha = isTop ? 1 : 0.35;
        c2.lineWidth = isTop ? 2 : 1.2;
        c2.setLineDash([]);
      }
      c2.beginPath();
      c2.moveTo(tx(s.x1), ty(s.y1));
      c2.lineTo(tx(s.x2), ty(s.y2));
      c2.stroke();
      c2.globalAlpha = 1;
    }
  }
}
$('layerSlider').oninput = drawPreview;
$('showTravel').onchange = drawPreview;
$('closePreview').onclick = () => $('previewDlg').close();

$('download').onclick = () => {
  if (!lastResult) return;
  downloadBlob(new Blob([lastResult.gcode], { type: 'text/plain' }), gcodeName());
};
$('share').onclick = async () => {
  if (!lastResult) return;
  try {
    await navigator.share({ files: [gcodeFile()], title: gcodeName() });
  } catch (err) {
    if (err.name !== 'AbortError') alert('Share failed: ' + err.message);
  }
};

// ---------- Init ----------
for (const [id, p] of Object.entries(PRINTERS)) {
  const opt = document.createElement('option');
  opt.value = id;
  opt.textContent = p.name;
  $('printer').appendChild(opt);
}
$('printer').value = 'p1s';

try {
  const saved = localStorage.getItem('pixelpainting.design');
  if (saved) loadDesignObj(JSON.parse(saved));
} catch {}

renderPalette();
render();
if (![...state.cells].some(v => v)) {
  applyTemplate(TEMPLATES.find(t => t.id === 'wildflowers'));
}

// PWA: offline app shell, installable on phones
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
