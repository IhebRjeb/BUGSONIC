// Synthetic walls with exact pixels, so assertions do not depend on an image decoder.
import { W, H } from '../src/the-wall/config.js';
import { features } from '../src/the-wall/wall/analysis.js';

/** Opaque grey RGBA wall; shade(x, y) returns 0-255. */
export function wall(shade) {
  const d = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = shade(x, y);
      d[i + 3] = 255;
    }
  }
  return d;
}

export const mirror = (shade) => (x, y) => shade(W - 1 - x, y);

export const flat = () => 180;
export const stripes = (x) => (x % 40 < 20 ? 60 : 200);
export const shadowStep = (x) => (x < W / 2 ? 60 : 200);
export const ridges = (x, y) => (y % 80 < 2 || x % 120 < 2 ? 40 : 200);
export const leftStripes = (x) => (x < W / 4 ? stripes(x) : 180);

/** Load pixels into the shared analysis buffers, as the live canvas does. */
export const analyse = (data) => features({ getImageData: () => ({ data }) });
