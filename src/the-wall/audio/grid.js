// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — rhythm grid
// ---------------------------------------------------------------------------
// Quantises note start times to a grid of 1/8th notes at the wall's tempo.
// ---------------------------------------------------------------------------

import { getContext } from './engine.js';

/**
 * Return the next grid-aligned time (1/8th note).
 * @param {{ tempo: number }} T — current tuning
 * @returns {number} time in seconds
 */
export function grid(T) {
  const ac = getContext();
  if (!ac) return 0;
  const tick = 60 / T.tempo / 2;   // 1/8th note duration
  const now  = ac.currentTime;
  return Math.ceil((now + 0.01) / tick) * tick;
}
