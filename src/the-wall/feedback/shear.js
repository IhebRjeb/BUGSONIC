// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — spectrum shearing + healing
// ---------------------------------------------------------------------------
// The FFT spectrum shifts horizontal strips of the live wall left/right.
// The wall slowly heals back toward the original.
// ---------------------------------------------------------------------------

import { W, H, SHEAR_BANDS, MAX_SHEAR_PX, HEAL_ALPHA } from '../config.js';

/**
 * Apply spectrum shearing to the live wall and heal toward the original.
 *
 * @param {CanvasRenderingContext2D} liveCtx — live wall context
 * @param {HTMLCanvasElement}        liveCv  — live wall canvas
 * @param {HTMLCanvasElement}        wallCv  — original wall canvas
 * @param {Uint8Array|null}          bands   — FFT frequency data
 */
export function shearAndHeal(liveCtx, liveCv, wallCv, bands) {
  const h = H / SHEAR_BANDS;

  // Shear: shift each horizontal strip based on its FFT bin
  if (bands) {
    for (let i = 0; i < SHEAR_BANDS; i++) {
      const bin = Math.min(bands.length - 1, i * 2);
      const v   = bands[bin] / 255;
      const sh  = v * MAX_SHEAR_PX * (i % 2 ? 1 : -1);
      if (Math.abs(sh) > 0.4) {
        liveCtx.drawImage(liveCv, 0, i * h, W, h, sh, i * h, W, h);
      }
    }
  }

  // Heal: blend the original wall back in
  liveCtx.globalAlpha = HEAL_ALPHA;
  liveCtx.drawImage(wallCv, 0, 0);
  liveCtx.globalAlpha = 1;
}
