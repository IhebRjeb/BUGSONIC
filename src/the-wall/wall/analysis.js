// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — image analysis
// ---------------------------------------------------------------------------
// Reads pixel data from the live canvas and computes luminance, gradients,
// local ridges, and the spatial image score used for tuning.
// ---------------------------------------------------------------------------

import { W, H, RIDGE_RADIUS, RIDGE_DEPTH, PULSE_STEPS } from '../config.js';

const HIST_BINS = 48;
const STRIDE = 2;
const BLOCK = 4;
const DIRS = [[1, 0], [0, 1], [0.7071, 0.7071], [0.7071, -0.7071]];
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const round = (v, d = 3) => +v.toFixed(d);

// Shared buffers — written by measure(), read by grad() and features()
let lum = new Float32Array(W * H);
let rgb = new Uint8ClampedArray(W * H * 4);

/**
 * Read all pixels from a 2d context and update the luminance + rgb buffers.
 * @param {CanvasRenderingContext2D} liveCtx — the live wall context
 */
export function measure(liveCtx) {
  const d = liveCtx.getImageData(0, 0, W, H).data;
  rgb = d;
  for (let i = 0; i < W * H; i++) {
    lum[i] = (0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2]) / 255;
  }
}

/**
 * Gradient magnitude at (x, y) via finite differences on the luminance grid.
 */
export function grad(x, y) {
  x = Math.max(1, Math.min(W - 2, x | 0));
  y = Math.max(1, Math.min(H - 2, y | 0));
  const i = y * W + x;
  return Math.hypot(lum[i + 1] - lum[i - 1], lum[i + W] - lum[i - W]);
}

/**
 * Luminance at pixel index.
 */
export function lumAt(x, y) {
  const i = (y | 0) * W + (x | 0);
  return lum[i] ?? 0;
}

/**
 * RGB at pixel index (returns [r, g, b] scaled 0-255).
 */
export function rgbAt(x, y) {
  const i = ((y | 0) * W + (x | 0)) * 4;
  return [rgb[i] ?? 0, rgb[i + 1] ?? 0, rgb[i + 2] ?? 0];
}

export function rgbToHue(red, green, blue) {
  const mx = Math.max(red, green, blue);
  const mn = Math.min(red, green, blue);
  const d = mx - mn;
  if (!d) return 0;
  const h = mx === red ? ((green - blue) / d) % 6
    : mx === green ? (blue - red) / d + 2
    : (red - green) / d + 4;
  return Math.round((h * 60 + 360) % 360);
}

// A crack is a thin line darker than both sides; a shadow edge is dark on one side only.
function ridge(L, w, h, x, y) {
  x = Math.max(RIDGE_RADIUS, Math.min(w - 1 - RIDGE_RADIUS, x | 0));
  y = Math.max(RIDGE_RADIUS, Math.min(h - 1 - RIDGE_RADIUS, y | 0));
  const c = L[y * w + x];
  let depth = 0;
  for (const [dx, dy] of DIRS) {
    const ox = Math.round(dx * RIDGE_RADIUS), oy = Math.round(dy * RIDGE_RADIUS);
    depth = Math.max(depth, Math.min(L[(y + oy) * w + x + ox], L[(y - oy) * w + x - ox]) - c);
  }
  return depth;
}

/** How much darker the point is than both sides (0 = not a crack). */
export function ridgeAt(x, y) {
  return ridge(lum, W, H, x, y);
}

/** Local colour: saturation 0-1 and hue 0-360. */
export function colourAt(x, y) {
  const [r, g, b] = rgbAt(x, y);
  const mx = Math.max(r, g, b);
  return { sat: mx ? (mx - Math.min(r, g, b)) / mx : 0, hue: rgbToHue(r, g, b) };
}

// Repetition strength: highest autocorrelation peak after the profile first decorrelates.
function periodicity(profile) {
  const n = profile.length;
  const mean = profile.reduce((s, v) => s + v, 0) / n;
  const p = profile.map(v => v - mean);
  const energy = p.reduce((s, v) => s + v * v, 0);
  if (energy < 1e-6) return 0;
  let decorrelated = false;
  let best = 0;
  for (let lag = 2; lag < n / 2; lag++) {
    let s = 0;
    for (let i = 0; i + lag < n; i++) s += p[i] * p[i + lag];
    const ac = s / energy * n / (n - lag);
    if (ac < 0) decorrelated = true;
    else if (decorrelated) best = Math.max(best, ac);
  }
  return clamp01(best);
}

/** FNV-1a hash of the RGB pixels: the same image always gives the same seed. */
export function pixelSeed(C) {
  let h = 0x811C9DC5;
  for (let i = 0; i < C.length; i += 4) {
    h = Math.imul(h ^ C[i], 0x01000193);
    h = Math.imul(h ^ C[i + 1], 0x01000193);
    h = Math.imul(h ^ C[i + 2], 0x01000193);
  }
  return h >>> 0;
}

/**
 * Analyse luminance + RGBA buffers (pure, so it can be tested outside the browser).
 * @returns {{ summary: object, hist: Float32Array, pulse: number[], seed: number }}
 */
export function analyseImage(L, C, w, h) {
  const r0 = RIDGE_RADIUS;
  const hist = new Float32Array(HIST_BINS);
  const cols = new Float32Array(PULSE_STEPS);
  const colCount = new Float32Array(PULSE_STEPS);
  const colProfile = new Float32Array(Math.ceil((w - 2 * r0) / STRIDE));
  const rowProfile = new Float32Array(Math.ceil((h - 2 * r0) / STRIDE));
  let n = 0, sum = 0, sumSq = 0, edge = 0, ridges = 0;
  let txx = 0, tyy = 0, txy = 0, sat = 0, hx = 0, hy = 0;

  for (let y = r0; y < h - r0; y += STRIDE) {
    for (let x = r0; x < w - r0; x += STRIDE) {
      const i = y * w + x;
      const l = L[i];
      const gx = L[i + 1] - L[i - 1];
      const gy = L[i + w] - L[i - w];
      const g = Math.hypot(gx, gy);
      n++;
      sum += l;
      sumSq += l * l;
      edge += g;
      txx += gx * gx;
      tyy += gy * gy;
      txy += gx * gy;
      if (ridge(L, w, h, x, y) > RIDGE_DEPTH) ridges++;
      const step = Math.min(PULSE_STEPS - 1, (x * PULSE_STEPS / w) | 0);
      cols[step] += g;
      colCount[step]++;
      hist[Math.min(HIST_BINS - 1, (l * HIST_BINS) | 0)]++;
      colProfile[(x - r0) / STRIDE] += l;
      rowProfile[(y - r0) / STRIDE] += l;

      const red = C[i * 4], green = C[i * 4 + 1], blue = C[i * 4 + 2];
      const mx = Math.max(red, green, blue);
      const s = mx ? (mx - Math.min(red, green, blue)) / mx : 0;
      sat += s;
      if (s > 0) {
        const a = rgbToHue(red, green, blue) * Math.PI / 180;
        hx += Math.cos(a) * s;
        hy += Math.sin(a) * s;
      }
    }
  }

  // Coarse gradient on 4x4 block means separates fine texture from large shapes.
  const bw = (w / BLOCK) | 0, bh = (h / BLOCK) | 0;
  const blocks = new Float32Array(bw * bh);
  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      let s = 0;
      for (let y = 0; y < BLOCK; y++) {
        for (let x = 0; x < BLOCK; x++) s += L[(by * BLOCK + y) * w + bx * BLOCK + x];
      }
      blocks[by * bw + bx] = s / (BLOCK * BLOCK);
    }
  }
  let coarse = 0, cn = 0;
  for (let by = 1; by < bh - 1; by++) {
    for (let bx = 1; bx < bw - 1; bx++) {
      const i = by * bw + bx;
      coarse += Math.hypot(blocks[i + 1] - blocks[i - 1], blocks[i + bw] - blocks[i - bw]);
      cn++;
    }
  }

  const density = edge / n;
  const brightness = sum / n;
  const contrast = Math.sqrt(Math.max(0, sumSq / n - brightness * brightness));
  const textureRatio = density / (coarse / cn + 1e-4);
  const ang = 0.5 * Math.atan2(2 * txy, txx - tyy);
  const coherence = Math.sqrt((txx - tyy) ** 2 + 4 * txy * txy) / (txx + tyy + 1e-9);
  const saturation = sat / n;
  const hue = hx || hy ? Math.round((Math.atan2(hy, hx) * 180 / Math.PI + 360) % 360) : 0;

  const orientation = Math.abs(Math.cos(ang)) > 0.8 ? 'horizontal'
    : Math.abs(Math.sin(ang)) > 0.8 ? 'vertical'
    : 'diagonal';

  // Steps whose column holds at least average edge energy are active.
  cols.forEach((v, k) => { cols[k] = v / (colCount[k] || 1); });
  const mean = cols.reduce((s, v) => s + v, 0) / PULSE_STEPS;
  let pulse = Array.from(cols, v => (v >= mean * 0.95 ? 1 : 0));
  if (pulse.reduce((s, v) => s + v, 0) < 3) {
    const top = [...cols.keys()].sort((a, b) => cols[b] - cols[a]).slice(0, 3);
    pulse = pulse.map((_, k) => (top.includes(k) ? 1 : 0));
  }

  const total = hist.reduce((s, v) => s + v, 0) || 1;
  return {
    summary: {
      density: round(density),
      brightness: round(brightness, 2),
      cracks: round(ridges / n),
      hue,
      orientation,
      contrast: round(contrast),
      saturation: round(saturation),
      // 0 = only large shapes, 1 = fine grain
      texture: round(clamp01(Math.log2(textureRatio / 0.25) / 4)),
      coherence: round(coherence),
      periodicity: round(Math.max(periodicity(colProfile), periodicity(rowProfile))),
    },
    hist: hist.map(v => v / total),
    pulse,
    seed: pixelSeed(C),
  };
}

/**
 * Analyse the current live wall.
 */
export function features(liveCtx) {
  measure(liveCtx);
  return analyseImage(lum, rgb, W, H);
}
