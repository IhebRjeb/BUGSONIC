// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — image analysis
// ---------------------------------------------------------------------------
// Reads pixel data from the live canvas and computes luminance, gradients,
// and aggregate visual features used for tuning.
// ---------------------------------------------------------------------------

import { W, H, CRACK_LUM } from '../config.js';

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

/**
 * Compute aggregate features for the current live wall.
 * Returns { density, brightness, cracks, hue, orientation }.
 */
export function features(liveCtx) {
  measure(liveCtx);

  let s = 0, m = 0, n = 0, dark = 0;
  let a = 0, bb = 0;
  let r = 0, g = 0, bl = 0;

  for (let y = 1; y < H - 1; y += 3) {
    for (let x = 1; x < W - 1; x += 3) {
      const i = y * W + x;
      const gx = lum[i + 1] - lum[i - 1];
      const gy = lum[i + W] - lum[i - W];
      s += Math.hypot(gx, gy);
      m += lum[i];
      n++;
      if (lum[i] < CRACK_LUM) dark++;
      a  += gx * gx - gy * gy;
      bb += 2 * gx * gy;
      r  += rgb[i * 4];
      g  += rgb[i * 4 + 1];
      bl += rgb[i * 4 + 2];
    }
  }

  const edge   = s / n;
  const bright = m / n;
  const crack  = dark / n;
  const ang    = 0.5 * Math.atan2(bb, a);

  const mx = Math.max(r, g, bl);
  const mn = Math.min(r, g, bl);
  const d  = mx - mn || 1;
  let h = mx === r
    ? ((g - bl) / d) % 6
    : mx === g
      ? (bl - r) / d + 2
      : (r - g) / d + 4;
  h = Math.round((h * 60 + 360) % 360);

  const orient = Math.abs(Math.cos(ang)) > 0.8
    ? 'horizontal'
    : Math.abs(Math.sin(ang)) > 0.8
      ? 'vertical'
      : 'diagonal';

  return {
    density:     +edge.toFixed(3),
    brightness:  +bright.toFixed(2),
    cracks:      +crack.toFixed(3),
    hue:         h,
    orientation: orient,
  };
}
