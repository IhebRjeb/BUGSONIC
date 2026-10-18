// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — feature-to-music mapping
// ---------------------------------------------------------------------------
// Converts the image score into musical parameters:
//   edge density + texture -> EDO (steps per octave)
//   luminance distribution -> scale degrees; most common tone = tonic
//   colour + contrast      -> scale size
//   brightness             -> root frequency
//   edges + contrast       -> tempo
//   left-to-right edges    -> 16-step pulse
//   texture, repetition, contrast, coherence, colour -> wall voice
// ---------------------------------------------------------------------------

import { EDO_MIN, EDO_MAX, ROOT_MIN, ROOT_MAX, TEMPO_MIN, TEMPO_MAX, PULSE_STEPS } from '../config.js';

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const MAX_SCALE = 12;

const VOICES = [
  { carriers: ['sine', 'triangle'],     ratios: [1, 2, 0.5] },
  { carriers: ['triangle', 'sawtooth'], ratios: [1.5, 2, 3] },
  { carriers: ['sawtooth', 'square'],   ratios: [3.5, 5.04, 7.13] },
];

// Pick the k most common tones, softening neighbours so the scale spreads out.
function scaleFromHistogram(hist, edo, k) {
  const score = new Float32Array(edo);
  hist.forEach((v, i) => { score[Math.min(edo - 1, Math.floor(i * edo / hist.length))] += v; });
  const picks = [];
  for (let n = 0; n < k; n++) {
    let best = -1;
    for (let j = 0; j < edo; j++) if (score[j] >= 0 && (best < 0 || score[j] > score[best])) best = j;
    picks.push(best);
    score[best] = -1;
    for (const j of [(best + 1) % edo, (best + edo - 1) % edo]) if (score[j] > 0) score[j] *= 0.5;
  }
  const tonic = picks[0];
  return picks.map(j => (j - tonic + edo) % edo).sort((a, b) => a - b);
}

/**
 * Derive tuning and voice from the image score.
 * @param {{ density, brightness, contrast, saturation, texture, coherence, periodicity, hue }} f
 * @param {Float32Array} hist — normalised luminance histogram
 * @param {number[]} pulse — PULSE_STEPS flags
 */
export function deriveTuning(f, hist, pulse) {
  const edgeN = clamp01(Math.log2(Math.max(f.density, 1e-4) / 0.01) / Math.log2(25));
  const contrastN = clamp01(f.contrast / 0.3);
  const satN = clamp01(f.saturation / 0.5);

  const edo = Math.round(EDO_MIN + clamp01(0.75 * edgeN + 0.25 * f.texture) * (EDO_MAX - EDO_MIN));
  const k = Math.max(3, Math.min(edo, Math.round(3 + (0.5 * satN + 0.5 * contrastN) * (Math.min(MAX_SCALE, edo) - 3))));
  const scale = scaleFromHistogram(hist, edo, k);

  const base = Math.round(ROOT_MIN * (ROOT_MAX / ROOT_MIN) ** f.brightness);
  const tempo = Math.round(TEMPO_MIN + clamp01(0.5 * edgeN + 0.3 * contrastN + 0.2 * f.brightness) * (TEMPO_MAX - TEMPO_MIN));

  const v = VOICES[Math.min(VOICES.length - 1, Math.floor(f.texture * VOICES.length))];
  // Strong repetition keeps FM partials harmonic.
  const ratios = f.periodicity > 0.5 ? v.ratios.map(r => Math.max(1, Math.round(r))) : v.ratios;
  const coolness = (1 - Math.cos(f.hue * Math.PI / 180)) / 2;

  return {
    edo,
    base,
    scale,
    tempo,
    pulse: pulse.length === PULSE_STEPS ? pulse : Array(PULSE_STEPS).fill(1),
    voice: {
      carriers: v.carriers,
      ratios,
      index: 0.4 + contrastN * 1.2,
      decay: 0.7 + f.coherence * 0.8,
      cutoff: Math.round(600 * 2 ** (satN * 1.5 + coolness * 1.5)),
      crackTone: Math.round(900 + f.brightness * 2500),
    },
  };
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
