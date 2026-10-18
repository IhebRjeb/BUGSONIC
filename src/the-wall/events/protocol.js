// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — external message protocol (v1)
// ---------------------------------------------------------------------------
// See docs/EVENT_SPEC.md. Every message carries `v` and `kind`.
// ---------------------------------------------------------------------------

import { W, H, SCORE_VERSION } from '../config.js';

export { rgbToHue } from '../wall/analysis.js';

export const PROTOCOL_VERSION = 1;

const TAU = Math.PI * 2;
const r = (n, d = 3) => Math.round(n * 10 ** d) / 10 ** d;

export const now = () => r(performance.now() / 1000);

export function hello() {
  return { v: PROTOCOL_VERSION, kind: 'hello', t: now(), source: 'bugsonic/the-wall', canvas: { w: W, h: H } };
}

export function soundEvent(wall, bug, type, freq, hue) {
  return {
    v: PROTOCOL_VERSION,
    kind: 'event',
    t: now(),
    wall: wall?.id ?? null,
    bug: bug.id,
    type,
    freq: r(freq, 1),
    midi: freq > 0 ? r(69 + 12 * Math.log2(freq / 440), 2) : null,
    brightness: r(bug.l),
    edge: r(bug.g),
    hue,
    x: Math.round(bug.x),
    y: Math.round(bug.y),
    nx: r(bug.x / W),
    ny: r(bug.y / H),
    pan: r((bug.x / W) * 2 - 1),
    velocity: r(bug.speed ?? 0, 2),
  };
}

export function wallMessage(wall) {
  return {
    v: PROTOCOL_VERSION,
    kind: 'wall',
    t: now(),
    wall: wall.id,
    score: SCORE_VERSION,
    seed: wall.seed.toString(16).padStart(8, '0'),
    edo: wall.T.edo,
    root: wall.T.base,
    scale: wall.T.scale,
    tempo: wall.T.tempo,
    pulse: wall.T.pulse,
    features: wall.f,
  };
}

export function stateMessage(bugs, energy) {
  return {
    v: PROTOCOL_VERSION,
    kind: 'state',
    t: now(),
    energy: r(energy),
    bugs: bugs.map(b => ({
      id: b.id,
      nx: r(b.x / W),
      ny: r(b.y / H),
      heading: r(((b.a % TAU) + TAU) % TAU),
      flash: r(b.flash),
    })),
  };
}

export function ping() {
  return { v: PROTOCOL_VERSION, kind: 'ping', t: now() };
}
