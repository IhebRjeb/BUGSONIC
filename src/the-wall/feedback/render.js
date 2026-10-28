// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — live wall rendering
// ---------------------------------------------------------------------------
// Rebuilds the live wall from the working surface (original + scratches) with
// each horizontal strip shifted by its response offset. Uncovered margins
// show the working surface itself, so no black or accumulated smear appears.
// ---------------------------------------------------------------------------

import { W, H } from '../config.js';

/**
 * @param {CanvasRenderingContext2D} liveCtx — live wall context (what bugs read)
 * @param {HTMLCanvasElement}        wallCv  — working surface
 * @param {ArrayLike<number>}        offsets — whole-pixel shift per strip
 */
export function renderLive(liveCtx, wallCv, offsets) {
  const h = H / offsets.length;
  liveCtx.drawImage(wallCv, 0, 0);
  for (let i = 0; i < offsets.length; i++) {
    if (offsets[i]) liveCtx.drawImage(wallCv, 0, i * h, W, h, offsets[i], i * h, W, h);
  }
}
