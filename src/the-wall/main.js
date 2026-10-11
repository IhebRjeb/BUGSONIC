// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — main entry point
// ---------------------------------------------------------------------------
// Wires all modules together: canvas setup, archive, bugs, audio, feedback,
// events, input, and UI controls.
// ---------------------------------------------------------------------------

import { W, H } from './config.js';
import { init as initArchive, newWall, getTuning } from './wall/archive.js';
import { mkCanvas } from './wall/Wall.js';
import { init as initColony } from './bug/colony.js';
import { isStarted } from './audio/engine.js';
import { play, click } from './audio/synth.js';
import { grid } from './audio/grid.js';
import { init as initEmitter, emit } from './events/emitter.js';
import { init as initLoop, frame } from './feedback/loop.js';
import { initPointer } from './input/pointer.js';
import { initKeyboard } from './input/keyboard.js';
import { initControls } from './ui/controls.js';

// --- DOM ---
const $ = (id) => document.getElementById(id);

const cv  = $('c');
const ctx = cv.getContext('2d');

// Off-screen canvases: original wall and live (sheared) wall
const wallCv  = mkCanvas();
const wallCtx = wallCv.getContext('2d');
const liveCv  = mkCanvas();
const liveCtx = liveCv.getContext('2d', { willReadFrequently: true });

// Shared pointer state
const ptr = { d: 0, x: 0, y: 0 };

// --- Init modules ---

// Archive
initArchive({
  archEl:   $('arch'),
  infoEl:   $('info'),
  wallCtx,
  liveCtx,
  onSelect: null,   // no extra callback needed
});

// Bugs
initColony();

// Events
initEmitter({ evEl: $('ev') });

// Audio interface passed to bugs (avoids circular imports)
const audioAPI = {
  get started() { return isStarted(); },
  play,
  click,
  grid,
};

// Feedback loop
initLoop({
  displayCtx: ctx,
  liveCtx,
  liveCv,
  wallCv,
  ptr,
  audioAPI,
  emitFn: emit,
});

// Pointer input (scratch cracks)
initPointer(cv, ptr, wallCtx, liveCtx);

// UI controls
const actions = initControls({
  go:     $('go'),
  more:   $('more'),
  newBtn: $('new'),
  wsb:    $('wsb'),
  up:     $('up'),
});

// Keyboard
initKeyboard(actions);

// --- Start ---
newWall();
requestAnimationFrame(frame);
