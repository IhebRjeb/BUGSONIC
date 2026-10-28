// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — feedback response (pure)
// ---------------------------------------------------------------------------
// Horizontal strips of the wall move in response to the measured output:
//   depth (from RMS) scales how far strips move,
//   the spectrum shapes which strips move (low frequencies at the top),
//   each audible encounter kicks the strip where it was read.
// Displacements follow their targets with attack/release times in seconds
// and never exceed MAX_SHEAR_PX. With no excitation they return to zero, so
// the live wall is rebuilt from the working surface without accumulated loss.
// ---------------------------------------------------------------------------

import {
  H, SHEAR_BANDS, MAX_SHEAR_PX, RESPONSE_ATTACK, RESPONSE_RELEASE, IMPULSE_PX, IMPULSE_DECAY,
  DEPTH_FLOOR_DB, DEPTH_RANGE_DB,
} from '../config.js';
import { follow, dbfs } from '../audio/meter.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Fixed transfer from linear RMS to a 0-1 control (also protocol-v1 `energy`). */
export const depthOf = (rms) => clamp((dbfs(rms) - DEPTH_FLOOR_DB) / DEPTH_RANGE_DB, 0, 1);

export function createResponse(n = SHEAR_BANDS) {
  const shift = new Float64Array(n);
  const kick = new Float64Array(n);
  const offsets = new Int16Array(n);
  const sign = (i) => (i % 2 ? 1 : -1);

  function reset() {
    shift.fill(0);
    kick.fill(0);
    offsets.fill(0);
  }

  /**
   * Advance by dt seconds.
   * @param {number} dt
   * @param {{ depth: number, strips: ArrayLike<number>, impulses: { y: number, strength: number }[] } | null} input
   *   null when feedback is off: everything recovers.
   * @returns {Int16Array} whole-pixel offset per strip
   */
  function advance(dt, input) {
    let top = 0;
    if (input) for (let i = 0; i < n; i++) top = Math.max(top, input.strips[i] ?? 0);
    const decay = Math.exp(-dt / IMPULSE_DECAY);
    for (let i = 0; i < n; i++) {
      const shape = top > 0 ? Math.sqrt((input.strips[i] ?? 0) / top) : 0;
      const target = input ? sign(i) * MAX_SHEAR_PX * clamp(input.depth, 0, 1) * shape : 0;
      shift[i] = Math.abs(target) > Math.abs(shift[i])
        ? follow(shift[i], target, dt, RESPONSE_ATTACK, RESPONSE_ATTACK)
        : follow(shift[i], target, dt, RESPONSE_RELEASE, RESPONSE_RELEASE);
      kick[i] *= decay;
    }
    for (const { y, strength } of input?.impulses ?? []) {
      const k = clamp(Math.floor(y / (H / n)), 0, n - 1);
      const s = IMPULSE_PX * clamp(strength / 0.3, 0.3, 1);
      kick[k] += sign(k) * s;
      if (k > 0) kick[k - 1] += sign(k - 1) * s * 0.5;
      if (k < n - 1) kick[k + 1] += sign(k + 1) * s * 0.5;
    }
    for (let i = 0; i < n; i++) {
      kick[i] = clamp(kick[i], -MAX_SHEAR_PX, MAX_SHEAR_PX);
      offsets[i] = Math.round(clamp(shift[i] + kick[i], -MAX_SHEAR_PX, MAX_SHEAR_PX));
    }
    return offsets;
  }

  return { advance, reset, offsets };
}
