import test from 'node:test';
import assert from 'node:assert/strict';
import { H, SHEAR_BANDS, MAX_SHEAR_PX, RESPONSE_RELEASE, METER_HOP } from '../src/the-wall/config.js';
import { createResponse, depthOf } from '../src/the-wall/feedback/response.js';
import { createMonitor } from '../src/the-wall/audio/monitor.js';
import { mulberry32 } from '../src/the-wall/sim/rng.js';

const strips = (k) => Array.from({ length: SHEAR_BANDS }, (_, i) => (i === k ? 1 : 0.25));
const input = { depth: 0.8, strips: strips(5), impulses: [] };

test('depth: fixed transfer from output RMS', () => {
  assert.equal(depthOf(0), 0);
  assert.equal(depthOf(10 ** (-60 / 20)), 0);
  assert.ok(Math.abs(depthOf(10 ** (-36 / 20)) - 0.5) < 1e-9);
  assert.equal(depthOf(1), 1);
});

test('displacement never exceeds the bound, whatever the input', () => {
  const rng = mulberry32(9);
  const r = createResponse();
  for (let k = 0; k < 2000; k++) {
    const impulses = Array.from({ length: (rng() * 6) | 0 }, () => ({ y: rng() * H, strength: rng() }));
    const offs = r.advance(rng() * 0.2, rng() < 0.1 ? null : { depth: rng() * 3, strips: strips((rng() * 32) | 0).map(v => v * rng() * 9), impulses });
    for (const o of offs) assert.ok(Math.abs(o) <= MAX_SHEAR_PX);
  }
});

test('the same excitation gives the same displacement at any update rate', () => {
  const at = (hz) => {
    const r = createResponse();
    let offs;
    for (let i = 0; i < hz; i++) offs = r.advance(1 / hz, input);
    return [...offs];
  };
  const ref = at(20);
  assert.ok(ref.some(o => o !== 0));
  assert.deepEqual(at(10), ref);
  assert.deepEqual(at(40), ref);
  assert.deepEqual(at(120), ref);
  assert.equal(Math.abs(ref[5]), MAX_SHEAR_PX - 1, 'loudest strip moves furthest');
});

test('without excitation the wall recovers fully within the release time', () => {
  const r = createResponse();
  r.advance(1, { ...input, impulses: [{ y: 100, strength: 0.3 }] });
  let offs;
  for (let i = 0; i < 20 * 6 * RESPONSE_RELEASE; i++) offs = r.advance(1 / 20, null);
  assert.ok(offs.every(o => o === 0));
});

test('an audible encounter kicks the strip where it was read, then fades', () => {
  const r = createResponse();
  const y = 300;
  const k = Math.floor(y / (H / SHEAR_BANDS));
  const first = [...r.advance(0.05, { depth: 0, strips: [], impulses: [{ y, strength: 0.3 }] })];
  assert.ok(Math.abs(first[k]) >= 2);
  assert.ok(first.every((o, i) => Math.abs(i - k) <= 1 || o === 0));
  let offs;
  for (let i = 0; i < 20; i++) offs = r.advance(0.05, { depth: 0, strips: [], impulses: [] });
  assert.equal(offs[k], 0);
});

test('monitor strips: low frequencies drive top strips, high frequencies lower ones', () => {
  const rate = 48000;
  const loudest = (freq) => {
    const m = createMonitor(rate);
    const x = Float32Array.from({ length: rate / 2 }, (_, i) => 0.1 * Math.sin(2 * Math.PI * freq * i / rate));
    for (let i = 0; i + METER_HOP <= x.length; i += METER_HOP) m.push({ l: x.subarray(i, i + METER_HOP), r: x.subarray(i, i + METER_HOP) });
    const s = m.snapshot().strips;
    return s.indexOf(Math.max(...s));
  };
  const [a, b, c] = [100, 1000, 5000].map(loudest);
  assert.ok(a < b && b < c, `${a} ${b} ${c}`);
});
