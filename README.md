# PixelPainting

A browser-based G-code generator for **3D-printed cross-stitch bookmarks**, targeting
Bambu Lab printers. Design pixel art on a grid — each filled cell becomes an embroidered-looking
"X" stitch — and export ready-to-print G-code. No slicer, no STL: the toolpaths are generated
directly from your design.

The print has two phases:

1. **Mesh lattice** — a woven "plastic canvas" base printed in your base filament color.
2. **X stitches** — two crossing diagonal lines per filled cell, printed on top of the mesh
   in 1–4 passes for a raised, thread-like relief. Stitches are grouped by color, and the
   printer pauses (`M400 U1`) before each color so you can swap filament.

## Supported printers

| Printer | Bed |
|---|---|
| Bambu Lab A1 mini | 180 × 180 mm |
| Bambu Lab P1S | 256 × 256 mm |
| Bambu Lab P2S | 256 × 256 mm |
| Bambu Lab X1 Carbon | 256 × 256 mm |
| Bambu Lab H2D | 325 × 320 mm |

## Running the app

It's a static page — no build step:

```sh
python3 -m http.server 8000   # or any static server
# open http://localhost:8000
```

(Opening `index.html` via `file://` won't work because the app uses ES modules.)

## Using it

1. Pick your **printer**, set grid size and cell size (default 28 × 40 cells @ 2.25 mm ≈ 63 × 90 mm — bookmark sized).
2. Paint with the **palette** — left-click paints, right-click erases, plus fill and color-pick tools.
   The base color row is the mesh (canvas) filament. Designs autosave to your browser and can be
   saved/loaded as JSON.
3. Click **Generate G-code** to see a layer-by-layer toolpath preview, filament/time estimates,
   and download the `.gcode` file.

## Printing on a Bambu printer

1. Copy the `.gcode` file to the printer's SD card / USB storage and start it from the printer
   screen (plain G-code prints don't carry plate/AMS metadata — that's expected).
2. The print starts with homing, bed leveling (G29, can be disabled), a prime line, then the mesh.
3. At each **pause**, the screen shows which color to load. Unload the current filament, load the
   next color, purge until the color runs clean, then **resume**. A short purge line is also
   printed at the front of the bed after each swap.
4. Colors always change via manual swap, so any number of colors works without an AMS.

### Notes & safety

- Defaults are tuned for **PLA** (220 °C / 60 °C bed). Adjust in Print settings.
- **H2D**: the file uses the currently active (left) nozzle; coordinates stay within the left
  nozzle's printable area.
- As with any hand-generated G-code, watch the first layer of your first print.
- The mesh is thin (≈0.85 mm) — use the brim (on by default) and a clean textured plate for adhesion.

## Development

```sh
node test/gcode.test.mjs   # generator sanity tests for all printers
```

- `gcode.js` — toolpath + G-code generation (pure, also runs under Node)
- `app.js` — grid editor UI
- `index.html`, `style.css` — static page
