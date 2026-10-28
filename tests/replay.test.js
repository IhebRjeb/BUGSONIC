// Headless run of the real bugs, clock and grid with feedback off: the event
// sequence must depend only on pixels and seed, not on the frame rate.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SIM_HZ, PULSE_VOICES } from '../src/the-wall/config.js';
import { deriveTuning } from '../src/the-wall/wall/tuning.js';
import { init as initColony, stepAll } from '../src/the-wall/bug/colony.js';
import { nextStep, audioTime, reset as resetGrid } from '../src/the-wall/audio/grid.js';
import * as clock from '../src/the-wall/sim/clock.js';
import { wall, ridges, leftStripes, analyse } from './fixtures.js';

function run(shade, seed, fps, seconds = 20) {
  const a = analyse(wall(shade));
  const T = deriveTuning(a.summary, a.hist, a.pulse);
  const tick = 60 / T.tempo / 4;
  clock.reset();
  resetGrid();
  initColony(seed, 4);

  const events = [];
  const perStep = new Map();
  let rests = 0;
  const audio = {
    started: false,
    external: true,
    play() { throw new Error('browser sound is off'); },
    click() { throw new Error('browser sound is off'); },
    next(T, simT) {
      const at = nextStep(T, simT);
      if (at === null) { rests++; return null; }
      const k = Math.round(at / tick);
      perStep.set(k, (perStep.get(k) ?? 0) + 1);
      return at;
    },
    time: audioTime,
    mark() {},
    audible: () => false,
  };
  const emit = (bug, kind, freq) => events.push([clock.now(), bug.id, kind, bug.x, bug.y, freq]);
  const ptr = { d: 0, x: 0, y: 0 };

  const target = seconds * SIM_HZ;
  let steps = 0;
  for (let f = 0; steps < target; f++) {
    const n = clock.advance(f * 1000 / fps);
    for (let i = 0; i < n && steps < target; i++, steps++) {
      clock.tick();
      stepAll(clock.now() * 1000, 0, 0, ptr, audio, T, emit);
    }
  }
  return { events, perStep, rests, T };
}

test('same pixels and seed replay the same events at any frame rate', () => {
  const ref = run(ridges, 0xC0FFEE, 60);
  assert.ok(ref.events.length > 20, `only ${ref.events.length} events`);
  assert.ok(ref.events.some(e => e[2] === 'note') && ref.events.some(e => e[2] === 'crack'));
  assert.deepEqual(run(ridges, 0xC0FFEE, 60).events, ref.events);
  for (const fps of [30, 47.3, 120, 144]) {
    assert.deepEqual(run(ridges, 0xC0FFEE, fps).events, ref.events, `${fps} FPS`);
  }
});

test('a different seed gives a different performance', () => {
  assert.notDeepEqual(run(ridges, 1, 60).events, run(ridges, 2, 60).events);
});

test('sounds land only on active steps, within the per-step cap; sparse pulses rest', () => {
  const { perStep, rests, T, events } = run(leftStripes, 7, 60, 60);
  assert.ok(events.length > 0);
  assert.ok(rests > 0, 'a 4-of-16 pulse should make some encounters rest');
  for (const [k, n] of perStep) {
    assert.equal(T.pulse[k % T.pulse.length], 1, `step ${k} is silent`);
    assert.ok(n <= PULSE_VOICES, `step ${k} holds ${n}`);
  }
});
