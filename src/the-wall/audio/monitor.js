// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — output monitor
// ---------------------------------------------------------------------------
// Consumes every output block from the audio thread, in order, so measurement
// does not depend on the display frame rate:
//   rms   — time-smoothed aggregate RMS of the output
//   peak  — highest sample, held for PEAK_HOLD seconds of audio (no missed peaks)
//   bands — low/mid/high power averaged over both channels (comparable to
//           rms^2), low band smoothed more slowly
//   flux  — positive spectral change; onsets counted above a floor,
//           with a refractory time
// Pure: no Web Audio, so it can be tested with synthetic blocks.
// ---------------------------------------------------------------------------

import {
  METER_WINDOW, METER_BANDS, RMS_ATTACK, RMS_RELEASE, LOW_ATTACK, LOW_RELEASE,
  ONSET_FLOOR, ONSET_REFRACTORY,
} from '../config.js';
import { measurePcm, follow, createSpectrum, bandPowers, positiveFlux } from './meter.js';

const PEAK_HOLD = 1;   // s

export function createMonitor(sampleRate, size = METER_WINDOW) {
  const spec = createSpectrum(size);
  const ringL = new Float64Array(size);
  const ringR = new Float64Array(size);
  const right = new Float64Array(size / 2 + 1);
  let cur = new Float64Array(size / 2 + 1);
  let prev = new Float64Array(size / 2 + 1);
  let s;

  function reset() {
    ringL.fill(0);
    ringR.fill(0);
    prev.fill(0);
    s = {
      time: 0, rms: 0, peak: 0, peakAt: 0, bands: METER_BANDS.map(() => 0), flux: 0,
      onsets: 0, lastOnset: -Infinity, minGain: 1, gainAt: 0, clamped: 0, nonFinite: 0,
    };
  }
  reset();

  /**
   * @param {{ l: Float32Array, r: Float32Array, minGain?: number, clamped?: number, nonFinite?: number }} block
   */
  function push(block) {
    const { l, r } = block;
    const n = l.length;
    const dt = n / sampleRate;
    s.time += dt;

    const m = measurePcm([l, r]);
    s.rms = follow(s.rms, m.rms, dt, RMS_ATTACK, RMS_RELEASE);
    if (m.peak >= s.peak || s.time - s.peakAt > PEAK_HOLD) { s.peak = m.peak; s.peakAt = s.time; }
    const g = block.minGain ?? 1;
    if (g <= s.minGain || s.time - s.gainAt > PEAK_HOLD) { s.minGain = g; s.gainAt = s.time; }
    s.clamped = block.clamped ?? s.clamped;
    s.nonFinite = block.nonFinite ?? s.nonFinite;

    ringL.copyWithin(0, n);
    ringR.copyWithin(0, n);
    ringL.set(l, size - n);
    ringR.set(r, size - n);
    spec.power(ringL, cur);
    spec.power(ringR, right);
    for (let k = 0; k < cur.length; k++) cur[k] = (cur[k] + right[k]) / 2;

    const bands = bandPowers(cur, sampleRate);
    bands.forEach((p, i) => {
      s.bands[i] = i === 0 ? follow(s.bands[i], p, dt, LOW_ATTACK, LOW_RELEASE) : follow(s.bands[i], p, dt, RMS_ATTACK, RMS_RELEASE);
    });

    s.flux = positiveFlux(prev, cur);
    if (s.flux > ONSET_FLOOR && s.time - s.lastOnset >= ONSET_REFRACTORY) {
      s.onsets++;
      s.lastOnset = s.time;
    }
    [prev, cur] = [cur, prev];
  }

  /** Current values (reading does not change them). */
  function snapshot() {
    return { ...s, bands: [...s.bands] };
  }

  return { push, snapshot, reset, sampleRate };
}
