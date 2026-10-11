// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — pointer / touch input
// ---------------------------------------------------------------------------
// Handles scratch-crack drawing on the wall via pointer events.
// ---------------------------------------------------------------------------

import { W, H } from '../config.js';

/**
 * Set up pointer event handlers on the canvas.
 *
 * @param {HTMLCanvasElement} cv — display canvas
 * @param {{ d: number, x: number, y: number }} ptr — shared pointer state
 * @param {CanvasRenderingContext2D} wallCtx — original wall context
 * @param {CanvasRenderingContext2D} liveCtx — live wall context
 */
export function initPointer(cv, ptr, wallCtx, liveCtx) {
  const pos = (e) => {
    const r = cv.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width  * W,
      y: (e.clientY - r.top)  / r.height * H,
    };
  };

  cv.onpointerdown = (e) => {
    cv.setPointerCapture(e.pointerId);
    Object.assign(ptr, { d: 1, ...pos(e) });
  };

  cv.onpointermove = (e) => {
    if (!ptr.d) return;
    const p = pos(e);
    for (const c of [wallCtx, liveCtx]) {
      c.strokeStyle = 'rgba(0,0,0,.85)';
      c.lineWidth   = 2.5;
      c.lineCap     = 'round';
      c.beginPath();
      c.moveTo(ptr.x, ptr.y);
      c.lineTo(p.x, p.y);
      c.stroke();
    }
    Object.assign(ptr, { d: 1, ...p });
  };

  cv.onpointerup = cv.onpointercancel = () => {
    ptr.d = 0;
  };
}
