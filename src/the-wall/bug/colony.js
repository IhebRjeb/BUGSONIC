// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — bug colony management
// ---------------------------------------------------------------------------

import { MAX_BUGS, INITIAL_BUGS } from '../config.js';
import { Bug } from './Bug.js';
import { rngFor } from '../sim/rng.js';

let bugs = [];
let seed = 1;

/**
 * Create the colony from a seed; the same seed places and steers bugs identically.
 */
export function init(s = seed, count = INITIAL_BUGS) {
  seed = s >>> 0;
  bugs = Array.from({ length: count }, (_, i) => new Bug(i, rngFor(seed, i)));
}

/** Recreate the current number of bugs from a seed. */
export function restart(s) {
  init(s, bugs.length || INITIAL_BUGS);
}

/**
 * Add a bug if under the limit. Returns the new bug or null.
 */
export function addBug() {
  if (bugs.length >= MAX_BUGS) return null;
  const b = new Bug(bugs.length, rngFor(seed, bugs.length));
  bugs.push(b);
  return b;
}

/**
 * Step all bugs.
 */
export function stepAll(t, energy, low, ptr, audio, T, emit) {
  for (const b of bugs) {
    b.step(t, energy, low, ptr, audio, T, emit);
  }
}

/**
 * Draw all bugs.
 */
export function drawAll(ctx) {
  for (const b of bugs) {
    b.draw(ctx);
  }
}

export function getBugs() { return bugs; }
