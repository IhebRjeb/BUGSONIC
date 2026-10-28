import test from 'node:test';
import assert from 'node:assert/strict';
import { EDO_MIN, EDO_MAX, ROOT_MIN, ROOT_MAX, TEMPO_MIN, TEMPO_MAX, PULSE_STEPS } from '../src/the-wall/config.js';
import { deriveTuning } from '../src/the-wall/wall/tuning.js';
import { wall, mirror, flat, stripes, shadowStep, ridges, leftStripes, analyse } from './fixtures.js';

const score = (shade) => {
  const a = analyse(wall(shade));
  return { ...a, T: deriveTuning(a.summary, a.hist, a.pulse) };
};

test('flat wall has no edges or cracks', () => {
  const { summary } = score(flat);
  assert.equal(summary.density, 0);
  assert.equal(summary.cracks, 0);
});

test('a shadow edge is not a crack; thin dark lines are', () => {
  const step = score(shadowStep).summary;
  assert.ok(step.density > 0);
  assert.equal(step.cracks, 0);
  assert.equal(score(stripes).summary.cracks, 0);
  assert.ok(score(ridges).summary.cracks > 0);
});

test('denser structure gives more divisions and a faster tempo', () => {
  const a = score(flat).T;
  const b = score(stripes).T;
  assert.ok(b.edo > a.edo);
  assert.ok(b.tempo > a.tempo);
});

test('mirrored image gives the mirrored pulse', () => {
  const left = score(leftStripes).pulse;
  const right = score(mirror(leftStripes)).pulse;
  assert.deepEqual(left, [1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(right, [...left].reverse());
});

test('same pixels give the same score and seed; different pixels a different seed', () => {
  const a = score(ridges);
  const b = score(ridges);
  assert.deepEqual(a.summary, b.summary);
  assert.deepEqual(a.T, b.T);
  assert.equal(a.seed, b.seed);
  assert.notEqual(a.seed, score(stripes).seed);
});

test('tuning stays within its declared ranges', () => {
  for (const shade of [flat, stripes, shadowStep, ridges, leftStripes]) {
    const { T } = score(shade);
    assert.ok(T.edo >= EDO_MIN && T.edo <= EDO_MAX);
    assert.ok(T.base >= ROOT_MIN && T.base <= ROOT_MAX);
    assert.ok(T.tempo >= TEMPO_MIN && T.tempo <= TEMPO_MAX);
    assert.equal(T.pulse.length, PULSE_STEPS);
    assert.ok(T.pulse.reduce((s, v) => s + v, 0) >= 3);
    assert.equal(T.scale[0], 0);
    assert.ok(T.scale.length >= 3 && T.scale.length <= Math.min(12, T.edo));
    assert.ok(T.scale.every((d, i) => d < T.edo && (i === 0 || d > T.scale[i - 1])));
  }
});
