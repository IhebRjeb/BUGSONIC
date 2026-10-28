import test from 'node:test';
import assert from 'node:assert/strict';
import { PULSE_MAX_WAIT, PULSE_VOICES, SIM_MAX_STEPS } from '../src/the-wall/config.js';
import { nextStep, reset } from '../src/the-wall/audio/grid.js';
import * as clock from '../src/the-wall/sim/clock.js';

const T = (pulse) => ({ tempo: 120, pulse });
const TICK = 60 / 120 / 4;
const all = Array(16).fill(1);

test('a step holds at most PULSE_VOICES sounds, then the next active step is used', () => {
  reset();
  for (let i = 0; i < PULSE_VOICES; i++) assert.equal(nextStep(T(all), 0), TICK);
  assert.equal(nextStep(T(all), 0), 2 * TICK);
});

test('silent steps are skipped', () => {
  reset();
  const pulse = all.map((_, k) => (k === 3 ? 1 : 0));
  assert.equal(nextStep(T(pulse), 0), 3 * TICK);
});

test('with no free active step in reach, an encounter rests', () => {
  reset();
  const pulse = all.map((_, k) => (k === 0 ? 1 : 0));
  // Candidates are the next step plus PULSE_MAX_WAIT more: steps 2-6 here.
  assert.equal(nextStep(T(pulse), 0.2), null);
  assert.equal(PULSE_MAX_WAIT, 4);
});

test('the latest reachable step is PULSE_MAX_WAIT steps after the next one', () => {
  reset();
  const pulse = all.map((_, k) => (k === 6 ? 1 : 0));
  // From a step boundary the wait can reach PULSE_MAX_WAIT + 1 ticks (1.25 beats).
  assert.equal(nextStep(T(pulse), TICK), 6 * TICK);
  assert.equal(nextStep(T(pulse), TICK - 1e-4), null);
});

test('reset frees every step (wall change or restart)', () => {
  reset();
  for (let i = 0; i < PULSE_VOICES; i++) nextStep(T(all), 0);
  reset();
  assert.equal(nextStep(T(all), 0), TICK);
});

test('frame clock: fixed steps, and long gaps drop time instead of bursting', () => {
  clock.reset();
  assert.equal(clock.advance(0), 0);
  assert.equal(clock.advance(1000 / 30), 2);
  assert.equal(clock.advance(1000 / 30 + 5000), SIM_MAX_STEPS);
  assert.equal(clock.droppedCount(), 1);
  assert.equal(clock.advance(1000 / 30 + 5000 + 1000 / 60), 1);
});
