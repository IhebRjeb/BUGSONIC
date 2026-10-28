// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — sound-source marks
// ---------------------------------------------------------------------------
// Each encounter leaves a short mark where the bug read the wall, shown when
// its sound is due (not when the bug found it). Shape tells the layers apart:
// a ring for an edge note, a small cross for a crack click. Encounters that
// make no browser sound (layer muted, sound off, external only) leave a thin
// dashed mark instead. With reduced motion, rings do not expand.
// ---------------------------------------------------------------------------

import { MARK_LIFE } from '../config.js';
import { reducedMotion } from './motion.js';

const MAX_MARKS = 64;
const HALO = 'rgba(236,234,225,.9)';
const INK = { note: '#1c557d', crack: '#8a2d1d' };

let marks = [];

/**
 * @param {'note'|'crack'} kind
 * @param {number} at — simulation time (s) when the sound is due
 * @param {number} strength — edge gradient or crack depth
 * @param {boolean} [audible] — the browser plays this sound
 */
export function addMark(kind, x, y, at, strength, audible = true) {
  marks.push({ kind, x, y, at, s: strength, audible });
  if (marks.length > MAX_MARKS) marks.shift();
}

/** Audible sounds due in (t0, t1] — where the wall should react. */
export function heardBetween(t0, t1) {
  return marks.filter(m => m.audible && m.at > t0 && m.at <= t1).map(m => ({ y: m.y, strength: m.s }));
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
  const still = reducedMotion();
  for (const m of marks) {
    const age = (t - m.at) / MARK_LIFE;
    if (age < 0) continue;
    ctx.save();
    ctx.globalAlpha = (1 - age) * (m.audible ? 1 : 0.6);
    ctx.translate(m.x, m.y);
    ctx.lineCap = 'round';
    if (!m.audible) ctx.setLineDash([2, 2]);
    const strokes = m.audible ? [[HALO, 3], [INK[m.kind], 1.2]] : [[INK[m.kind], 0.8]];
    for (const [style, width] of strokes) {
      ctx.strokeStyle = style;
      ctx.lineWidth = width;
      ctx.beginPath();
      if (m.kind === 'note') {
        const grow = still ? 0.5 : age;
        ctx.arc(0, 0, 3 + grow * (8 + Math.min(1, m.s / 0.3) * 14), 0, Math.PI * 2);
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
