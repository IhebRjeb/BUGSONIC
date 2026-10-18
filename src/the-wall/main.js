// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — main entry point
// ---------------------------------------------------------------------------
// Wires all modules together: canvas setup, archive, bugs, audio, feedback,
// events, input, and UI controls.
// ---------------------------------------------------------------------------

import { init as initArchive, newWall, getCurrent } from './wall/archive.js';
import { mkCanvas } from './wall/Wall.js';
import { measure } from './wall/analysis.js';
import { init as initColony, restart as restartColony, getBugs } from './bug/colony.js';
import { isStarted } from './audio/engine.js';
import { play, click, cancelPending } from './audio/synth.js';
import { nextStep, audioTime, reset as resetGrid } from './audio/grid.js';
import { init as initEmitter, emit, emitWall, emitState, isExternalActive } from './events/emitter.js';
import { init as initLoop, frame } from './feedback/loop.js';
import * as clock from './sim/clock.js';
import { addMark, cancelAfter, clearMarks } from './ui/marks.js';
import { invalidate as invalidateInspect } from './ui/inspect.js';
import { initPointer } from './input/pointer.js';
import { initKeyboard } from './input/keyboard.js';
import { initControls } from './ui/controls.js';
import { createDashboard } from './ui/dashboard.js';

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
const dashboard = createDashboard();

// --- Init modules ---

// Sounds already placed on the pulse belong to the previous wall or run.
function cancelScheduled() {
  cancelPending();
  cancelAfter(clock.now());
  resetGrid();
  for (const b of getBugs()) b.flashAt = Infinity;
}

// Replay the current wall from its archived pixels with its own seed.
function restart() {
  const w = getCurrent();
  if (!w) return;
  cancelScheduled();
  wallCtx.drawImage(w.cv, 0, 0);
  liveCtx.drawImage(w.cv, 0, 0);
  measure(liveCtx);
  restartColony(w.seed);
  clock.reset();
  clearMarks();
  invalidateInspect();
}

// Archive
initArchive({
  archEl:   $('arch'),
  infoEl:   $('info'),
  wallCtx,
  liveCtx,
  onSelect: (wall) => {
    cancelScheduled();
    invalidateInspect();
    dashboard.select(wall);
    emitWall(wall);
  },
});

// Bugs
initColony();

// Events
initEmitter({ onStatus: dashboard.setLink });

// Audio interface passed to bugs (avoids circular imports)
const audioAPI = {
  get started() { return isStarted(); },
  get external() { return isExternalActive(); },
  play,
  click,
  next: nextStep,
  time: audioTime,
  mark: addMark,
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
  onFrame: (t, bands, energy) => {
    dashboard.update(t, bands);
    emitState(t, energy);
  },
});

// Pointer input (scratch cracks)
initPointer(cv, ptr, wallCtx, liveCtx, invalidateInspect);

// UI controls
const actions = initControls({
  go:     $('go'),
  more:   $('more'),
  newBtn: $('new'),
  wsb:    $('wsb'),
  up:     $('up'),
  volume: $('volume'),
  volumeValue: $('volume-value'),
  focus: $('focus'),
  uploadStatus: $('upload-status'),
  wsUrl: $('ws-url'),
  ping: $('ping'),
  stream: $('stream-state'),
  noteLayer: $('layer-note'),
  crackLayer: $('layer-crack'),
  feedback: $('feedback'),
  inspect: $('inspect'),
  restart: $('restart'),
}, restart);

// Keyboard
initKeyboard(actions);

// --- Start ---
newWall();
restart();
requestAnimationFrame(frame);
