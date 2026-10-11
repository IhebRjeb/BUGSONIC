// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — bug colony management
// ---------------------------------------------------------------------------

import { MAX_BUGS, INITIAL_BUGS } from '../config.js';
import { Bug } from './Bug.js';

let bugs = [];

/**
 * Create the initial colony.
 */
export function init() {
  bugs = Array.from({ length: INITIAL_BUGS }, (_, i) => new Bug(i));
}

/**
 * Add a bug if under the limit. Returns the new bug or null.
 */
export function addBug() {
  if (bugs.length >= MAX_BUGS) return null;
  const b = new Bug(bugs.length);
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
