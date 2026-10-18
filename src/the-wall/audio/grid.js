// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — rhythm grid
// ---------------------------------------------------------------------------
// Quantises note start times to the wall's pulse: 16th-note steps at the
// wall's tempo, skipping steps that the image left silent.
// ---------------------------------------------------------------------------

import { getContext } from './engine.js';

/**
 * Return the next active pulse step (audio-clock seconds).
 * @param {{ tempo: number, pulse: number[] }} T — current tuning
 */
export function grid(T) {
  const ac = getContext();
  if (!ac) return 0;
  const tick = 60 / T.tempo / 4;
  let step = Math.ceil((ac.currentTime + 0.01) / tick);
  for (let k = 0; k < T.pulse.length && !T.pulse[step % T.pulse.length]; k++) step++;
  return step * tick;
}

export function audioNow() {
  return getContext()?.currentTime ?? 0;
}
