// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — procedural wall generator
// ---------------------------------------------------------------------------

import { W, H, GEN_RECT_COUNT, GEN_POSTER_MIN, GEN_POSTER_MAX, GEN_CRACK_MIN, GEN_CRACK_MAX } from '../config.js';

const R = (a, b) => a + Math.random() * (b - a);

/**
 * Paint a synthetic wall texture onto a 2d context.
 * Layers: base colour, random rectangles, poster blocks, cracks.
 */
export function paint(c) {
  // Base
  c.fillStyle = `hsl(${R(15, 45)},${R(8, 22)}%,${R(30, 50)}%)`;
  c.fillRect(0, 0, W, H);

  // Random rectangles (texture)
  for (let i = 0; i < GEN_RECT_COUNT; i++) {
    c.fillStyle = `hsla(${R(0, 60)},${R(5, 30)}%,${R(15, 75)}%,${R(0.05, 0.25)})`;
    c.fillRect(R(-50, W), R(-50, H), R(20, 200), R(20, 160));
  }

  // Poster blocks
  const posterCount = R(GEN_POSTER_MIN, GEN_POSTER_MAX);
  for (let i = 0; i < posterCount; i++) {
    const x = R(0, W - 80);
    const y = R(0, H - 80);
    const w = R(60, 220);
    const h = R(50, 200);
    c.fillStyle = `hsl(${R(0, 360)},${R(20, 70)}%,${R(30, 80)}%)`;
    c.fillRect(x, y, w, h);
    const lines = R(2, 7);
    for (let k = 0; k < lines; k++) {
      c.fillStyle = `rgba(0,0,0,${R(0.3, 0.8)})`;
      c.fillRect(x + 6, y + 8 + k * R(10, 22), R(w * 0.2, w * 0.8), R(3, 8));
    }
  }

  // Cracks
  const crackCount = R(GEN_CRACK_MIN, GEN_CRACK_MAX);
  for (let i = 0; i < crackCount; i++) {
    c.strokeStyle = `rgba(0,0,0,${R(0.5, 0.9)})`;
    c.lineWidth = R(0.6, 2.2);
    c.beginPath();
    let x = R(0, W);
    let y = R(0, H);
    c.moveTo(x, y);
    const segs = R(8, 30);
    for (let s = 0; s < segs; s++) {
      x += R(-14, 14);
      y += R(2, 14);
      c.lineTo(x, y);
    }
    c.stroke();
  }
}
