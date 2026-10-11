// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — feature-to-music mapping
// ---------------------------------------------------------------------------
// Converts visual features into musical parameters:
//   edge density  -> EDO (steps per octave)
//   hue + orient  -> scale degrees and rotation
//   brightness    -> root frequency and tempo
// ---------------------------------------------------------------------------

import { EDO_MIN, EDO_MAX, ROOT_MIN, ROOT_MAX, TEMPO_MIN, TEMPO_MAX } from '../config.js';

/**
 * Derive tuning parameters from wall features.
 * @param {{ density: number, brightness: number, cracks: number, hue: number, orientation: string }} f
 * @returns {{ edo: number, base: number, scale: number[], tempo: number }}
 */
export function deriveTuning(f) {
  const edo = Math.max(EDO_MIN, Math.min(EDO_MAX,
    Math.round(EDO_MIN + Math.min(1, f.density * 14) * (EDO_MAX - EDO_MIN))
  ));

  const ang = f.orientation === 'horizontal' ? 0
    : f.orientation === 'vertical' ? Math.PI / 2
    : Math.PI / 4;

  const k   = Math.min(edo, Math.max(3, Math.round(edo * (0.35 + f.hue / 360 * 0.25))));
  const rot = Math.floor((ang / Math.PI + 0.5) * edo);

  const scale = [...new Set(
    Array.from({ length: k }, (_, i) => (Math.round(i * edo / k) + rot) % edo)
  )].sort((a, b) => a - b);

  const base  = Math.round(ROOT_MIN + f.brightness * (ROOT_MAX - ROOT_MIN));
  const tempo = Math.round(TEMPO_MIN + f.brightness * (TEMPO_MAX - TEMPO_MIN));

  return { edo, base, scale, tempo };
}

/**
 * Convert a luminance value to a frequency using the current tuning.
 * @param {number} l — luminance 0-1
 * @param {{ edo: number, base: number, scale: number[] }} T
 * @returns {number} frequency in Hz
 */
export function noteFreq(l, T) {
  const n   = T.scale.length;
  const deg = Math.floor(l * n * 2.4);
  return T.base * Math.pow(2, (T.scale[deg % n] + T.edo * Math.floor(deg / n)) / T.edo);
}
