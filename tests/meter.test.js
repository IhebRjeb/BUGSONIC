import test from 'node:test';
import assert from 'node:assert/strict';
import { METER_WINDOW, DB_FLOOR } from '../src/the-wall/config.js';
import { dbfs, measurePcm, follow, createSpectrum, bandPowers, positiveFlux } from '../src/the-wall/audio/meter.js';

const RATES = [44100, 48000];
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b} (±${tol})`);
const sine = (n, freq, rate, amp = 0.1, phase = 0, start = 0) =>
  Float64Array.from({ length: n }, (_, i) => amp * Math.sin(2 * Math.PI * freq * (i + start) / rate + phase));

test('silence: zero RMS and peak, floor in dBFS, no NaN', () => {
  const m = measurePcm([new Float32Array(2048), new Float32Array(2048)]);
  assert.equal(m.rms, 0);
  assert.equal(m.peak, 0);
  assert.equal(dbfs(m.rms), DB_FLOOR);
  assert.deepEqual(measurePcm([]), { rms: 0, peak: 0, channelRms: [], channelPeak: [], nonFinite: 0 });
});

test('DC counts in RMS', () => {
  const m = measurePcm([new Float64Array(1000).fill(0.1)]);
  near(m.rms, 0.1, 1e-12);
  near(m.peak, 0.1, 1e-12);
});

for (const rate of RATES) {
  test(`1 kHz sine, amplitude 0.1, whole cycles at ${rate} Hz: RMS = A/sqrt(2)`, () => {
    const x = sine(rate / 10, 1000, rate);
    const m = measurePcm([x]);
    near(m.rms, 0.1 / Math.SQRT2, 1e-6);
    near(dbfs(m.rms), -23.0103, 1e-3);
    assert.ok(m.peak <= 0.1);
  });
}

test('opposite-polarity stereo keeps its power', () => {
  const l = sine(4800, 1000, 48000);
  const r = l.map(v => -v);
  const m = measurePcm([l, r]);
  near(m.rms, 0.1 / Math.SQRT2, 1e-6);
  assert.deepEqual(m.channelPeak, measurePcm([l, l]).channelPeak);
});

test('unit impulse in 2048 samples', () => {
  const x = new Float32Array(2048);
  x[100] = 1;
  const m = measurePcm([x]);
  near(m.rms, 1 / Math.sqrt(2048), 1e-12);
  assert.equal(m.peak, 1);
});

test('non-finite samples are counted, not propagated', () => {
  const m = measurePcm([[NaN, 0.5, Infinity, -0.5]]);
  assert.equal(m.nonFinite, 2);
  near(m.rms, 0.5, 1e-12);
  assert.equal(m.peak, 0.5);
});

test('envelope follows elapsed time, not how it is subdivided', () => {
  const tau = 0.03;
  for (const parts of [1, 10, 37]) {
    let v = 0;
    for (let i = 0; i < parts; i++) v = follow(v, 1, tau / parts, tau, 0.25);
    near(v, 1 - Math.exp(-1), 1e-9, `${parts} parts`);
  }
  near(follow(1, 0, 0.25, 0.03, 0.25), Math.exp(-1), 1e-12, 'release');
  assert.equal(follow(0, 1, 0.001, 0, 0.25), 1);
});

test('spectrum rejects sizes that are not powers of two', () => {
  assert.throws(() => createSpectrum(1000), RangeError);
});

const spec = createSpectrum(METER_WINDOW);

for (const rate of RATES) {
  test(`band powers at ${rate} Hz: a sine lands in its band with power A^2/2`, () => {
    for (const [freq, band] of [[100, 0], [1000, 1], [5000, 2]]) {
      const bands = bandPowers(spec.power(sine(METER_WINDOW, freq, rate)), rate);
      near(bands[band], 0.005, 0.005 * 0.02, `${freq} Hz`);
      bands.forEach((p, i) => { if (i !== band) assert.ok(p < 1e-8, `${freq} Hz leaks ${p} into band ${i}`); });
    }
  });
}

test('spectral bands exclude DC and silence', () => {
  for (const fill of [0, 0.1]) {
    const bands = bandPowers(spec.power(new Float64Array(METER_WINDOW).fill(fill)), 48000);
    bands.forEach(p => assert.ok(p < 1e-20));
  }
});

test('bands are clipped to Nyquist', () => {
  const power = spec.power(sine(METER_WINDOW, 9000, 22050));
  const [, , high] = bandPowers(power, 22050);
  near(high, 0.005, 0.005 * 0.02);
});

test('a DC offset does not change positive flux', () => {
  const a = spec.power(sine(METER_WINDOW, 1000, 48000));
  const b = spec.power(sine(METER_WINDOW, 1000, 48000).map(v => v + 0.3));
  near(positiveFlux(a, b), 0, 1e-9);
});

test('positive flux marks onsets, not decays or steady tones', () => {
  const rate = 48000;
  const silence = spec.power(new Float64Array(METER_WINDOW));
  const impulse = new Float64Array(METER_WINDOW);
  impulse[1500] = 1;
  const hit = spec.power(impulse);
  assert.equal(positiveFlux(silence, silence), 0);
  assert.ok(positiveFlux(silence, hit) > 0);
  assert.equal(positiveFlux(hit, silence), 0);

  const onset = positiveFlux(silence, spec.power(sine(METER_WINDOW, 1000, rate)));
  const a = spec.power(sine(METER_WINDOW, 1000, rate));
  const b = spec.power(sine(METER_WINDOW, 1000, rate, 0.1, 0, 256));
  assert.ok(positiveFlux(a, b) < onset * 0.01, `steady ${positiveFlux(a, b)} vs onset ${onset}`);
});
