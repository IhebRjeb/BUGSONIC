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

  walls.forEach(x => {
    x.th.classList.toggle('s', x === w);
    x.th.setAttribute('aria-pressed', String(x === w));
  });

  const f = w.f;
  const T = w.T;
  infoEl.textContent =
    `${w.id} \u00b7 edges ${f.density} \u00b7 texture ${f.texture} \u00b7 cracks ${f.cracks} \u00b7 repeat ${f.periodicity} \u00b7 hue ${f.hue}\u00b0` +
    ` -> ${T.edo}/oct, ${T.scale.length}-note scale [${T.scale}], root ${T.base} Hz, ${T.tempo} bpm, pulse ${T.pulse.map(p => (p ? 'x' : '.')).join('')}`;

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
  return new Promise((resolve, reject) => {
    const im = new Image();
    const url = URL.createObjectURL(file);
    im.onload = () => {
      try {
        const c = mkCanvas();
        const ctx = c.getContext('2d');
        // Transparent pixels would otherwise read as black cracks.
        ctx.fillStyle = '#c3c7bc';
        ctx.fillRect(0, 0, W, H);
        const s = Math.max(W / im.width, H / im.height);
        ctx.drawImage(im, (W - im.width * s) / 2, (H - im.height * s) / 2, im.width * s, im.height * s);
        resolve(addWall(c, file.name));
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    im.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This image could not be read. Try a JPG, PNG or WebP.'));
    };
    im.src = url;
  });
}

/**
 * Select wall by 1-based index (keyboard shortcut).
 */
export function selectByIndex(n) {
  if (walls[n]) select(walls[n]);
}

export function getCurrent()  { return current; }
export function getWalls()    { return walls; }
export function getTuning()   { return current?.T ?? null; }
