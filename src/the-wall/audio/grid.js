// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — rhythm grid
// ---------------------------------------------------------------------------
// Places sounds on the wall's pulse: 16th-note steps at the wall's tempo,
// skipping steps the image left silent. Decisions use simulation time, so a
// seeded performance chooses the same steps every time; audioTime() maps
// them onto the audio clock.
//
// Policy: an encounter takes the first active step within PULSE_MAX_WAIT
// steps that still has room (PULSE_VOICES). If none, it rests — no sound,
// no event — so sparse pulses produce silence instead of a late pile-up.
// ---------------------------------------------------------------------------

import { PULSE_LATENCY, PULSE_MAX_WAIT, PULSE_VOICES, OUTPUT_LOOKAHEAD } from '../config.js';

let origin = 0;            // audio-clock time at simulation time 0
const taken = new Map();   // step index -> sounds placed on it

export function anchor(audioAtSimZero) { origin = audioAtSimZero; }

export function reset() { taken.clear(); }

/**
 * Simulation time (s) of the next free active step, or null to rest.
 * @param {{ tempo: number, pulse: number[] }} T — current tuning
 * @param {number} simT — simulation time (s)
 */
export function nextStep(T, simT) {
  const tick = 60 / T.tempo / 4;
  const first = Math.floor(simT / tick) + 1;
  for (const k of taken.keys()) if (k < first) taken.delete(k);
  for (let s = first; s <= first + PULSE_MAX_WAIT; s++) {
    if (!T.pulse[s % T.pulse.length]) continue;
    const n = taken.get(s) ?? 0;
    if (n >= PULSE_VOICES) continue;
    taken.set(s, n + 1);
    return s * tick;
  }
  return null;
}

/** Current step index for display, aligned with what is audible. */
export function stepAt(T, simT) {
  return Math.floor((simT - PULSE_LATENCY - OUTPUT_LOOKAHEAD) / (60 / T.tempo / 4));
}

/** Audio-clock time (s) at which a step placed at simulation time `at` plays. */
export function audioTime(at) {
  return origin + at + PULSE_LATENCY;
}
