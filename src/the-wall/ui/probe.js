// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — surface probe
// ---------------------------------------------------------------------------
// Hovering the wall reads it the way a bug does: position, luminance,
// gradient (edge) and ridge depth (crack) of the live surface.
// ---------------------------------------------------------------------------

import { W, H, EDGE_GRAD, RIDGE_DEPTH } from '../config.js';
import { lumAt, grad, ridgeAt } from '../wall/analysis.js';

/**
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLElement} out — readout element (hidden while the pointer is away)
 */
export function initProbe(canvas, out) {
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const r = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(W - 1, ((e.clientX - r.left) / r.width) * W)) | 0;
    const y = Math.max(0, Math.min(H - 1, ((e.clientY - r.top) / r.height) * H)) | 0;
    const g = grad(x, y);
    const d = ridgeAt(x, y);
    const reads = d > RIDGE_DEPTH ? 'CRACK → click' : g > EDGE_GRAD ? 'EDGE → note' : 'flat · silent';
    out.textContent = `x${String(x).padStart(3, '0')} y${String(y).padStart(3, '0')}  L ${lumAt(x, y).toFixed(2)}  ∇ ${g.toFixed(3)}  ⌄ ${d.toFixed(3)}  ${reads}`;
    out.dataset.reads = d > RIDGE_DEPTH ? 'crack' : g > EDGE_GRAD ? 'edge' : 'flat';
    out.hidden = false;
  });
  canvas.addEventListener('pointerleave', () => { out.hidden = true; });
}
