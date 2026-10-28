import test from 'node:test';
import assert from 'node:assert/strict';
import { OUTPUT_CEILING, OUTPUT_LOOKAHEAD, OUTPUT_RELEASE, METER_HOP } from '../src/the-wall/config.js';
import { createLimiter } from '../src/the-wall/audio/output.worklet.js';
import { createMonitor } from '../src/the-wall/audio/monitor.js';
import { mulberry32 } from '../src/the-wall/sim/rng.js';

const RATES = [44100, 48000];
const OPTS = { ceiling: OUTPUT_CEILING, lookahead: OUTPUT_LOOKAHEAD, release: OUTPUT_RELEASE };
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b} (±${tol})`);
const sine = (n, freq, rate, amp) => Float32Array.from({ length: n }, (_, i) => amp * Math.sin(2 * Math.PI * freq * i / rate));

// Render through the limiter in 128-sample quanta, like the audio thread.
function limit(rate, l, r = l, gain = () => [1]) {
  const lim = createLimiter(rate, OPTS);
  const outL = new Float32Array(l.length);
  const outR = new Float32Array(l.length);
  for (let i = 0; i < l.length; i += 128) {
    const end = Math.min(l.length, i + 128);
    lim.process(l.subarray(i, end), r.subarray(i, end), outL.subarray(i, end), outR.subarray(i, end), gain(i, end - i));
  }
  return { outL, outR, stats: lim.take(), latency: lim.latency };
}

const peak = (...xs) => Math.max(...xs.map(x => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0)));

for (const rate of RATES) {
  test(`limiter at ${rate} Hz: quiet input passes unchanged, only delayed`, () => {
    const x = sine(rate, 440, rate, 0.5);
    const { outL, stats, latency } = limit(rate, x);
    assert.equal(stats.minGain, 1);
    for (let i = latency; i < x.length; i++) assert.equal(outL[i], x[i - latency]);
  });

  test(`limiter at ${rate} Hz: hot, impulsive and noisy input never exceeds the ceiling`, () => {
    const rng = mulberry32(rate);
    const loud = sine(rate, 97, rate, 4);
    const impulses = new Float32Array(rate);
    for (let k = 0; k < 200; k++) impulses[(rng() * rate) | 0] = (rng() * 2 - 1) * 10;
    const noise = Float32Array.from({ length: rate }, () => (rng() * 2 - 1) * 3);
    const bursts = Float32Array.from({ length: rate }, (_, i) => ((i / 300 | 0) % 3 === 0 ? 6 : 0.2) * Math.sin(i * 0.3));
    for (const x of [loud, impulses, noise, bursts]) {
      const { outL, outR, stats } = limit(rate, x, x.map(v => -v * 0.7));
      assert.ok(peak(outL, outR) <= OUTPUT_CEILING + 1e-7, `peak ${peak(outL, outR)}`);
      assert.equal(stats.clamped, 0, 'smooth gain path should hold the ceiling alone');
      assert.ok(stats.minGain < 1);
    }
  });

  test(`limiter at ${rate} Hz: recovers within the release time after a burst`, () => {
    const x = sine(rate, 220, rate, 0.5);
    x.subarray(0, rate / 10).forEach((_, i) => { x[i] *= 8; });
    const { outL, latency } = limit(rate, x);
    const after = Math.ceil(rate / 10 + latency + 6 * OUTPUT_RELEASE * rate);
    for (let i = after; i < x.length; i++) near(outL[i], x[i - latency], 0.5 * 0.01, `sample ${i}`);
  });
}

test('limiter is stereo-linked: both channels get the same gain', () => {
  const rate = 48000;
  const l = sine(rate, 100, rate, 4);
  const r = sine(rate, 1000, rate, 0.1);
  const { outL, outR, latency } = limit(rate, l, r);
  for (let i = latency; i < rate; i += 37) {
    if (Math.abs(l[i - latency]) > 0.05 && Math.abs(r[i - latency]) > 0.01) {
      near(outL[i] / l[i - latency], outR[i] / r[i - latency], 1e-4, `sample ${i}`);
    }
  }
});

test('limiter replaces non-finite input with silence and counts it', () => {
  const x = new Float32Array(512).fill(0.2);
  x[10] = NaN;
  x[20] = Infinity;
  const { outL, stats } = limit(48000, x);
  assert.ok(outL.every(Number.isFinite));
  assert.equal(stats.nonFinite, 4);
});

test('output gain 0 gives exact silence; a-rate gain is applied per sample', () => {
  const x = sine(4800, 440, 48000, 0.8);
  assert.ok(limit(48000, x, x, () => [0]).outL.every(v => v === 0));
  const half = limit(48000, x, x, (i, n) => new Float32Array(n).fill(0.5));
  const { latency } = half;
  for (let i = latency; i < x.length; i++) near(half.outL[i], x[i - latency] * 0.5, 1e-7);
});

const blocks = (l, r = l) => {
  const out = [];
  for (let i = 0; i + METER_HOP <= l.length; i += METER_HOP) out.push({ l: l.subarray(i, i + METER_HOP), r: r.subarray(i, i + METER_HOP) });
  return out;
};

for (const rate of RATES) {
  test(`monitor at ${rate} Hz: silence, then a steady tone with one onset`, () => {
    const m = createMonitor(rate);
    for (const b of blocks(new Float32Array(rate))) m.push(b);
    let s = m.snapshot();
    assert.equal(s.rms, 0);
    assert.equal(s.onsets, 0);
    assert.deepEqual(s.bands, [0, 0, 0]);

    for (const b of blocks(sine(rate * 2, 1000, rate, 0.1))) m.push(b);
    s = m.snapshot();
    near(20 * Math.log10(s.rms), -23.0103, 0.5, 'settled RMS dBFS');
    near(s.bands[1], 0.005, 0.005 * 0.05, 'mid band');
    assert.ok(s.bands[0] < 1e-6 && s.bands[2] < 1e-6);
    assert.equal(s.onsets, 1);
    near(s.peak, 0.1, 1e-6);
  });
}

test('monitor: onsets respect the refractory time; readings do not depend on read cadence', () => {
  const rate = 48000;
  const x = new Float32Array(rate);
  for (let i = 0; i < rate; i += 480) x[i] = 0.5;   // a click every 10 ms
  const a = createMonitor(rate);
  const b = createMonitor(rate);
  let peakA = 0;
  blocks(x).forEach((blk, k) => {
    a.push(blk);
    b.push(blk);
    peakA = Math.max(peakA, a.snapshot().peak);
    if (k % 7 === 0) b.snapshot();
  });
  const sa = a.snapshot(), sb = b.snapshot();
  assert.equal(sa.rms, sb.rms);
  assert.equal(sa.onsets, sb.onsets);
  assert.equal(peakA, 0.5);
  assert.ok(sa.onsets >= 1 && sa.onsets <= Math.ceil(1 / 0.06), `${sa.onsets} onsets`);
});
