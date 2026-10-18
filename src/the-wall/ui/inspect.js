// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — inspection overlay
// ---------------------------------------------------------------------------
// Shows what the bugs sense: edges (blue) that play notes, cracks (red) that
// click, and the 16-step pulse read from the image's columns. Columns that
// the image left silent are veiled; the ruler shows the audible step.
// ---------------------------------------------------------------------------

import { W, H, EDGE_GRAD, RIDGE_DEPTH, PULSE_STEPS } from '../config.js';
import { grad, ridgeAt } from '../wall/analysis.js';
import { stepAt } from '../audio/grid.js';

let on = false;
let dirty = true;
let layer = null;

export function setInspect(value) {
  on = !!value;
  dirty = true;
}

/** Rebuild the edge/crack map on the next draw (wall changed or was scratched). */
export function invalidate() {
  dirty = true;
}

function build() {
  layer ??= Object.assign(document.createElement('canvas'), { width: W, height: H });
  const c = layer.getContext('2d');
  const img = c.createImageData(W, H);
  const d = img.data;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const k = (y * W + x) * 4;
      if (ridgeAt(x, y) > RIDGE_DEPTH) {
        d[k] = 138; d[k + 1] = 45; d[k + 2] = 29; d[k + 3] = 230;
      } else if (grad(x, y) > EDGE_GRAD) {
        d[k] = 28; d[k + 1] = 85; d[k + 2] = 125; d[k + 3] = 150;
      }
    }
  }
  c.putImageData(img, 0, 0);
  dirty = false;
}

export function drawInspect(ctx, T, simT) {
  if (!on || !T) return;
  if (dirty) build();
  const w = W / PULSE_STEPS;
  const cur = ((stepAt(T, simT) % PULSE_STEPS) + PULSE_STEPS) % PULSE_STEPS;

  ctx.save();
  ctx.fillStyle = 'rgba(236,234,225,.38)';
  T.pulse.forEach((p, k) => { if (!p) ctx.fillRect(k * w, 0, w, H); });
  ctx.drawImage(layer, 0, 0);

  ctx.strokeStyle = 'rgba(28,85,125,.55)';
  ctx.lineWidth = 1;
  ctx.strokeRect(cur * w + .5, .5, w - 1, H - 1);
  T.pulse.forEach((p, k) => {
    const h = k === cur ? 12 : 7;
    ctx.fillStyle = k === cur ? '#1c557d' : p ? '#1b1f1c' : 'rgba(27,31,28,.25)';
    ctx.fillRect(k * w + 1, H - h - 2, w - 2, h);
  });
  ctx.restore();
}
