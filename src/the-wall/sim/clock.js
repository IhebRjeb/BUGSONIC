// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — simulation clock
// ---------------------------------------------------------------------------
// Bugs move in fixed steps, so the same seed gives the same encounters at any
// frame rate. While sound runs the clock follows the audio clock, and grid.js
// maps simulation time onto it; otherwise it follows frame time.
// ---------------------------------------------------------------------------

import { SIM_HZ, SIM_MAX_STEPS } from '../config.js';
import { getContext, isStarted } from '../audio/engine.js';
import { anchor } from '../audio/grid.js';

const STEP = 1 / SIM_HZ;

let steps = 0;
let acc = 0;
let last = null;
let source = null;
let dropped = 0;    // times the clock fell behind and dropped time since reset

export function reset() {
  steps = 0;
  acc = 0;
  last = null;
  dropped = 0;
}

/** Simulation time in seconds. */
export function now() { return steps / SIM_HZ; }

/** How often time was dropped since reset (a replay is then no longer exact). */
export function droppedCount() { return dropped; }

/**
 * Accumulate elapsed time and return how many fixed steps to run this frame.
 * Call tick() once per step.
 */
export function advance(frameMs) {
  const audio = isStarted();
  const src = audio ? 'audio' : 'frame';
  const clockNow = audio ? getContext().currentTime : frameMs / 1000;
  if (last === null || src !== source) {
    last = clockNow;
    source = src;
    acc = 0;
    if (audio) anchor(clockNow - now());
  }
  acc += Math.max(0, clockNow - last);
  last = clockNow;

  let n = Math.floor(acc / STEP + 1e-6);
  if (n > SIM_MAX_STEPS) {
    // Too far behind (hidden tab, slow device): drop time rather than burst.
    n = SIM_MAX_STEPS;
    acc = 0;
    dropped++;
    if (audio) anchor(clockNow - (steps + n) / SIM_HZ);
  } else {
    acc = Math.max(0, acc - n * STEP);
  }
  return n;
}

export function tick() { steps++; }
