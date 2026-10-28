// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — main animation loop
// ---------------------------------------------------------------------------
// Runs every frame via requestAnimationFrame. Orchestrates:
//   1. FFT read
//   2. Spectrum shearing + healing (shearing only while feedback is on)
//   3. Luminance re-measurement
//   4. Fixed simulation steps for the bugs
//   5. Drawing: wall, inspection overlay, sound marks, bugs
// ---------------------------------------------------------------------------

import { W, H, MEASURE_EVERY } from '../config.js';
import { readFFT } from '../audio/engine.js';
import { shearAndHeal } from './shear.js';
import { measure } from '../wall/analysis.js';
import { stepAll, drawAll } from '../bug/colony.js';
import { getTuning } from '../wall/archive.js';
import * as clock from '../sim/clock.js';
import { drawMarks } from '../ui/marks.js';
import { drawInspect } from '../ui/inspect.js';

let frameCount = 0;
let feedback = true;

// References set by init()
let displayCtx = null;
let liveCtx    = null;
let liveCv     = null;
let wallCv     = null;
let ptr        = null;
let audioAPI   = null;
let emitFn     = null;
let onFrame    = null;

/**
 * Initialise the loop with required references.
 */
export function init(opts) {
  displayCtx = opts.displayCtx;
  liveCtx    = opts.liveCtx;
  liveCv     = opts.liveCv;
  wallCv     = opts.wallCv;
  ptr        = opts.ptr;
  audioAPI   = opts.audioAPI;
  emitFn     = opts.emitFn;
  onFrame    = opts.onFrame;
}

/**
 * Feedback off: sound no longer shears the wall or drives the bugs, so a
 * seeded performance repeats its encounters.
 */
export function setFeedback(on) {
  feedback = !!on;
}

export function isFeedback() { return feedback; }

/**
 * Single frame tick — called by requestAnimationFrame.
 */
export function frame(t) {
  const { energy, low, bands } = readFFT();
  const T = getTuning();

  // Shear + heal (healing continues so a sheared wall recovers)
  shearAndHeal(liveCtx, liveCv, wallCv, feedback ? bands : null);

  // Re-measure luminance periodically
  if (frameCount++ % MEASURE_EVERY === 0) {
    measure(liveCtx);
  }

  // Draw the live wall to the display canvas
  displayCtx.drawImage(liveCv, 0, 0);

  // Darkness overlay (inversely proportional to energy)
  displayCtx.fillStyle = `rgba(0,0,0,${0.04 + (1 - energy) * 0.06})`;
  displayCtx.fillRect(0, 0, W, H);

  const steps = clock.advance(t);
  for (let i = 0; i < steps; i++) {
    clock.tick();
    if (T) stepAll(clock.now() * 1000, feedback ? energy : 0, feedback ? low : 0, ptr, audioAPI, T, emitFn);
  }
  const simT = clock.now();
  drawInspect(displayCtx, T, simT);
  drawMarks(displayCtx, simT);
  drawAll(displayCtx);
  onFrame?.(t, bands, energy);

  requestAnimationFrame(frame);
}
