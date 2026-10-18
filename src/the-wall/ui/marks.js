// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — sound-source marks
// ---------------------------------------------------------------------------
// Each sound leaves a short mark where the bug read the wall, shown when the
// sound is heard (not when the bug found it). Shape tells the layers apart:
// a widening ring for an edge note, a small cross for a crack click.
// ---------------------------------------------------------------------------

import { MARK_LIFE } from '../config.js';

const MAX_MARKS = 64;
const HALO = 'rgba(236,234,225,.9)';
const INK = { note: '#1c557d', crack: '#8a2d1d' };

let marks = [];

/**
 * @param {'note'|'crack'} kind
 * @param {number} at — simulation time (s) when the sound is heard
 * @param {number} strength — edge gradient or crack depth
 */
export function addMark(kind, x, y, at, strength) {
  marks.push({ kind, x, y, at, s: strength });
  if (marks.length > MAX_MARKS) marks.shift();
}

/** Drop marks for sounds that have not been heard yet. */
export function cancelAfter(t) {
  marks = marks.filter(m => m.at <= t);
}

export function clearMarks() {
  marks = [];
}

export function drawMarks(ctx, t) {
  marks = marks.filter(m => t - m.at < MARK_LIFE);
  for (const m of marks) {
    const age = (t - m.at) / MARK_LIFE;
    if (age < 0) continue;
    ctx.save();
    ctx.globalAlpha = 1 - age;
    ctx.translate(m.x, m.y);
    ctx.lineCap = 'round';
    for (const [style, width] of [[HALO, 3], [INK[m.kind], 1.2]]) {
      ctx.strokeStyle = style;
      ctx.lineWidth = width;
      ctx.beginPath();
      if (m.kind === 'note') {
        ctx.arc(0, 0, 3 + age * (8 + Math.min(1, m.s / 0.3) * 14), 0, Math.PI * 2);
      } else {
        const r = 3 + Math.min(1, m.s / 0.4) * 6;
        ctx.moveTo(-r, -r); ctx.lineTo(r, r);
        ctx.moveTo(r, -r); ctx.lineTo(-r, r);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}
