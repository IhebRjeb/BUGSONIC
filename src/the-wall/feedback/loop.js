// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — main animation loop
// ---------------------------------------------------------------------------
// Runs every frame via requestAnimationFrame. Orchestrates:
//   1. FFT read
//   2. Spectrum shearing + healing
//   3. Luminance re-measurement
//   4. Bug stepping + drawing
// ---------------------------------------------------------------------------

import { W, H, MEASURE_EVERY } from '../config.js';
import { readFFT } from '../audio/engine.js';
import { shearAndHeal } from './shear.js';
import { measure } from '../wall/analysis.js';
import { stepAll, drawAll } from '../bug/colony.js';
import { getTuning } from '../wall/archive.js';

let frameCount = 0;

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
 * Single frame tick — called by requestAnimationFrame.
 */
export function frame(t) {
  const { energy, low, bands } = readFFT();
  const T = getTuning();

  // Shear + heal
  shearAndHeal(liveCtx, liveCv, wallCv, bands);

  // Re-measure luminance periodically
  if (frameCount++ % MEASURE_EVERY === 0) {
    measure(liveCtx);
  }

  // Draw the live wall to the display canvas
  displayCtx.drawImage(liveCv, 0, 0);

  // Darkness overlay (inversely proportional to energy)
  displayCtx.fillStyle = `rgba(0,0,0,${0.04 + (1 - energy) * 0.06})`;
  displayCtx.fillRect(0, 0, W, H);

  // Step and draw bugs
  stepAll(t, energy, low, ptr, audioAPI, T, emitFn);
  drawAll(displayCtx);
  onFrame?.(t, bands, energy);

  requestAnimationFrame(frame);
}
