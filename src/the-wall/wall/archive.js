// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — wall archive
// ---------------------------------------------------------------------------
// Manages the collection of walls: add, select, switch.
// ---------------------------------------------------------------------------

import { W, H } from '../config.js';
import { Wall, mkCanvas } from './Wall.js';
import { paint } from './generator.js';
import { measure } from './analysis.js';

// State
let walls   = [];
let current = null;

// DOM references — set once via init()
let archEl  = null;   // #arch container
let infoEl  = null;   // #info display

// Canvas references — set once via init()
let wallCtx = null;   // original wall context
let liveCtx = null;   // live (sheared) wall context

// Callback fired after a wall is selected (so main can update tuning)
let onSelect = null;

/**
 * Initialise the archive module.
 * @param {{ archEl, infoEl, wallCtx, liveCtx, onSelect }} opts
 */
export function init(opts) {
  archEl  = opts.archEl;
  infoEl  = opts.infoEl;
  wallCtx = opts.wallCtx;
  liveCtx = opts.liveCtx;
  onSelect = opts.onSelect;
}

/**
 * Add a wall from a source canvas and select it.
 */
export function addWall(source, name) {
  const w = new Wall(source, name);
  w.th.onclick = () => select(w);
  archEl.appendChild(w.th);
  walls.push(w);
  select(w);
  return w;
}

/**
 * Select a wall: copy to original + live canvases, analyse, update UI.
 */
export function select(w) {
  current = w;
  wallCtx.drawImage(w.cv, 0, 0);
  liveCtx.drawImage(w.cv, 0, 0);
  w.analyse(liveCtx);

  walls.forEach(x => x.th.classList.toggle('s', x === w));

  const f = w.f;
  const T = w.T;
  infoEl.textContent =
    `${w.id} \u00b7 ${f.orientation} \u00b7 edges ${f.density} \u00b7 cracks ${f.cracks} \u00b7 hue ${f.hue}\u00b0` +
    ` -> ${T.edo}/oct, ${T.scale.length}-note scale [${T.scale}], root ${T.base} Hz, ${T.tempo} bpm`;

  if (onSelect) onSelect(w);
}

/**
 * Generate a new procedural wall and add it.
 */
export function newWall() {
  const c = mkCanvas();
  paint(c.getContext('2d'));
  addWall(c, 'generated');
}

/**
 * Load a photo file into the archive.
 */
export function loadPhoto(file) {
  const im = new Image();
  im.onload = () => {
    const c   = mkCanvas();
    const ctx = c.getContext('2d');
    const s   = Math.max(W / im.width, H / im.height);
    ctx.drawImage(im, (W - im.width * s) / 2, (H - im.height * s) / 2, im.width * s, im.height * s);
    addWall(c, file.name);
  };
  im.src = URL.createObjectURL(file);
}

/**
 * Select wall by 1-based index (keyboard shortcut).
 */
export function selectByIndex(n) {
  if (walls[n]) select(walls[n]);
}

export function getCurrent()  { return current; }
export function getWalls()    { return walls; }
export function getTuning()   { return current?.T ?? { edo: 12, base: 130, scale: [0], tempo: 100 }; }
