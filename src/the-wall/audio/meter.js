// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — audio measurement
// ---------------------------------------------------------------------------
// Pure float-PCM measurements, independent of Web Audio and frame rate:
//   measurePcm()   — RMS and sample peak per channel and aggregated
//   follow()       — time-based attack/release envelope
//   createSpectrum — Blackman-windowed power spectrum (mean-square per bin)
//   bandPowers()   — power in Hz-defined bands
//   positiveFlux() — rise in spectral magnitude between frames (onsets)
// Values are linear full-scale amplitudes or dBFS, not acoustic loudness.
// ---------------------------------------------------------------------------

import { METER_WINDOW, METER_BANDS, DB_FLOOR } from '../config.js';

// A constant (DC) through the periodic Blackman window only reaches bins 0-2.
export const DC_BINS = 3;

export function dbfs(v, floor = DB_FLOOR) {
  return v > 0 ? Math.max(floor, 20 * Math.log10(v)) : floor;
}

/**
 * RMS and sample peak of equal-length channels. Channel power is aggregated
 * before the square root, so opposite-phase channels do not cancel.
 * Non-finite samples are counted and excluded.
 * @param {ArrayLike<number>[]} channels
 */
export function measurePcm(channels) {
  const channelRms = [];
  const channelPeak = [];
  let power = 0, count = 0, peak = 0, nonFinite = 0;
  for (const ch of channels) {
    let s = 0, p = 0, n = 0;
    for (let i = 0; i < ch.length; i++) {
      const v = ch[i];
      if (!Number.isFinite(v)) { nonFinite++; continue; }
      s += v * v;
      n++;
      const a = Math.abs(v);
      if (a > p) p = a;
    }
    channelRms.push(n ? Math.sqrt(s / n) : 0);
    channelPeak.push(p);
    power += s;
    count += n;
    if (p > peak) peak = p;
  }
  return { rms: count ? Math.sqrt(power / count) : 0, peak, channelRms, channelPeak, nonFinite };
}

/**
 * One-pole envelope: moves from prev toward target over dt seconds, with time
 * constant `attack` when rising and `release` when falling (0 = immediate).
 */
export function follow(prev, target, dt, attack, release) {
  const tau = target > prev ? attack : release;
  if (!(tau > 0)) return target;
  return target + (prev - target) * Math.exp(-dt / tau);
}

// In-place iterative radix-2 FFT.
function fft(re, im, cos, sin) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const stride = n / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < half; k++) {
        const wr = cos[k * stride], wi = sin[k * stride];
        const a = i + k, b = a + half;
        const xr = re[b] * wr - im[b] * wi;
        const xi = re[b] * wi + im[b] * wr;
        re[b] = re[a] - xr;
        im[b] = im[a] - xi;
        re[a] += xr;
        im[a] += xi;
      }
    }
  }
}

/**
 * Power spectrum analyser for frames of `size` samples (a power of two).
 * power(frame) returns size/2 + 1 one-sided bins whose sum approximates the
 * frame's mean-square: a sine of amplitude A contributes A^2 / 2.
 */
export function createSpectrum(size = METER_WINDOW) {
  if (size < 2 || (size & (size - 1))) throw new RangeError('spectrum size must be a power of two');
  const win = new Float64Array(size);
  let sumSq = 0;
  for (let i = 0; i < size; i++) {
    const x = (2 * Math.PI * i) / size;
    win[i] = 0.42 - 0.5 * Math.cos(x) + 0.08 * Math.cos(2 * x);
    sumSq += win[i] * win[i];
  }
  const cos = new Float64Array(size / 2);
  const sin = new Float64Array(size / 2);
  for (let k = 0; k < size / 2; k++) {
    cos[k] = Math.cos((-2 * Math.PI * k) / size);
    sin[k] = Math.sin((-2 * Math.PI * k) / size);
  }
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  const norm = 1 / (size * sumSq);
  const half = size / 2;

  return {
    size,
    /**
     * @param {ArrayLike<number>} frame — `size` samples; non-finite values count as 0
     * @param {Float64Array} [out]
     */
    power(frame, out = new Float64Array(half + 1)) {
      for (let i = 0; i < size; i++) {
        re[i] = Number.isFinite(frame[i]) ? frame[i] * win[i] : 0;
        im[i] = 0;
      }
      fft(re, im, cos, sin);
      for (let k = 0; k <= half; k++) {
        const p = (re[k] * re[k] + im[k] * im[k]) * norm;
        out[k] = k === 0 || k === half ? p : 2 * p;
      }
      return out;
    },
  };
}

/**
 * Sum of spectrum power in each [lo, hi) Hz band, clipped to Nyquist. Bins
 * below DC_BINS are skipped, so the lowest measured frequency is
 * DC_BINS * sampleRate / size (about 70 Hz for 2048 samples at 48 kHz).
 * @param {Float64Array} power — output of createSpectrum().power()
 * @param {number} sampleRate
 */
export function bandPowers(power, sampleRate, bands = METER_BANDS) {
  const binHz = sampleRate / ((power.length - 1) * 2);
  return bands.map(([lo, hi]) => {
    const top = Math.min(hi, sampleRate / 2);
    let s = 0;
    for (let k = Math.max(DC_BINS, Math.ceil(lo / binHz)); k * binHz < top; k++) s += power[k];
    return s;
  });
}

/** Summed rise in per-bin amplitude from prev to cur (DC bins excluded); falls count as 0. */
export function positiveFlux(prev, cur) {
  let f = 0;
  for (let k = DC_BINS; k < cur.length; k++) {
    const d = Math.sqrt(cur[k]) - Math.sqrt(prev[k]);
    if (d > 0) f += d;
  }
  return f;
}
