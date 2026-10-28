// Audio graph checks against a recording mock of Web Audio: every audible
// path must pass through the output processor (level + protection).
import test from 'node:test';
import assert from 'node:assert/strict';
import { MASTER_GAIN, MARK_LIFE } from '../src/the-wall/config.js';

class Param {
  constructor(v = 0) { this.value = v; this.calls = []; }
  setValueAtTime(v, t) { this.calls.push(['set', v, t]); return this; }
  linearRampToValueAtTime(v, t) { this.calls.push(['linear', v, t]); return this; }
  exponentialRampToValueAtTime(v, t) { this.calls.push(['exp', v, t]); return this; }
  setTargetAtTime(v, t, c) { this.calls.push(['target', v, t, c]); return this; }
  cancelScheduledValues() { return this; }
}

const PARAMS = ['gain', 'frequency', 'Q', 'detune', 'pan', 'delayTime', 'threshold', 'knee', 'ratio', 'attack', 'release'];

class Node {
  constructor(ctx, kind) {
    this.kind = kind;
    this.out = new Set();
    for (const p of PARAMS) this[p] = new Param();
    ctx.nodes.push(this);
  }
  connect(t) { this.out.add(t); return t; }
  disconnect() { this.out.clear(); }
  start() {}
  stop() {}
}

class MockContext {
  constructor() {
    this.nodes = [];
    this.sampleRate = 48000;
    this.currentTime = 0;
    this.state = 'running';
    this.destination = new Node(this, 'destination');
    this.audioWorklet = { addModule: async () => {} };
    for (const kind of ['Gain', 'BiquadFilter', 'Delay', 'Oscillator', 'StereoPanner', 'WaveShaper', 'Convolver', 'DynamicsCompressor', 'Analyser', 'BufferSource']) {
      this[`create${kind}`] = () => Object.assign(new Node(this, kind), { frequencyBinCount: 128, getByteFrequencyData() {} });
    }
  }
  createBuffer(channels, length, rate) {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return { sampleRate: rate, duration: length / rate, getChannelData: (c) => data[c] };
  }
}

globalThis.AudioWorkletNode = class extends Node {
  constructor(ctx, name, options) {
    super(ctx, 'output');
    this.options = options;
    this.parameters = new Map([['gain', new Param(1)]]);
    this.port = {};
  }
};

const engine = await import('../src/the-wall/audio/engine.js');
const synth = await import('../src/the-wall/audio/synth.js');
const marks = await import('../src/the-wall/ui/marks.js');

const ctx = new MockContext();
await engine.initAudio(ctx);
const out = ctx.nodes.find(n => n.kind === 'output');
const T = { voice: { carriers: ['sine', 'triangle'], ratios: [1, 2], index: 1, decay: 1, cutoff: 1200, crackTone: 2000 } };
const bug = { id: 1, x: 100 };
const local = { g: 0.2, l: 0.5, sat: 0.3 };

// Depth-first search over audio connections (AudioParam targets are modulation, not audible paths).
function reaches(from, target, stopAt) {
  const seen = new Set();
  const walk = (n) => {
    if (n === target) return true;
    if (n === stopAt || seen.has(n) || !(n instanceof Node)) return false;
    seen.add(n);
    return [...n.out].some(walk);
  };
  return walk(from);
}

const sources = () => ctx.nodes.filter(n => n.kind === 'Oscillator' || n.kind === 'BufferSource');

test('every voice reaches the speakers only through the output processor', () => {
  synth.play(bug, 220, local, 0, T);
  synth.click(0, 0.2, T, 0);
  assert.ok(sources().length >= 3);
  assert.ok(reaches(out, ctx.destination));
  for (const s of sources()) {
    assert.equal(reaches(s, ctx.destination, out), false, `${s.kind} bypasses the output`);
  }
  const voices = sources().filter(s => reaches(s, out));
  assert.equal(voices.length, 2, 'note carrier and click reach the output (FM modulator and LFO drive parameters)');
});

test('output level ramps the output gain to the exact target, including zero', () => {
  const g = out.parameters.get('gain');
  engine.setLevel(0);
  assert.deepEqual(g.calls.at(-1).slice(0, 2), ['linear', 0]);
  engine.setLevel(MASTER_GAIN);
  assert.deepEqual(g.calls.at(-1).slice(0, 2), ['linear', 1]);
  engine.setLevel(10);
  assert.ok(g.calls.at(-1)[1] <= 0.7 / MASTER_GAIN);
});

test('layer mute closes the layer bus', () => {
  synth.setLayer('note', false);
  const master = engine.getMaster();
  const bus = ctx.nodes.find(n => n.kind === 'Gain' && n.out.has(master) && n.out.has(engine.getDelay()));
  assert.equal(bus.gain.calls.at(-1)[1], 0);
  synth.setLayer('note', true);
});

test('voices scheduled in the future are cancelled; started ones keep playing', () => {
  ctx.currentTime = 10;
  synth.play(bug, 220, local, 9.99, T);
  const started = ctx.nodes.filter(n => n.kind === 'StereoPanner').at(-1);
  synth.play(bug, 220, local, 11, T);
  const future = ctx.nodes.filter(n => n.kind === 'StereoPanner').at(-1);
  synth.cancelPending();
  assert.equal(future.out.size, 0);
  assert.equal(started.out.size, 1);
});

test('resetting the effects drops old tails and routes new voices to the new chain', () => {
  const oldMaster = engine.getMaster();
  const oldBus = ctx.nodes.find(n => n.kind === 'Gain' && n.out.has(oldMaster) && n.out.has(engine.getDelay()));
  engine.resetEffects();
  assert.notEqual(engine.getMaster(), oldMaster);
  assert.equal(oldMaster.out.size, 0);
  synth.play(bug, 220, local, 11, T);
  assert.equal(oldBus.out.size, 0, 'old bus disconnected');
  const voice = sources().at(-1);
  assert.ok(reaches(voice, out));
  assert.equal(reaches(voice, oldMaster), false);
});

test('marks for sounds not yet heard are cancelled on a wall change', () => {
  let drawn = 0;
  const g = new Proxy({}, { get: (_, k) => (k === 'save' ? () => { drawn++; } : () => {}) });
  marks.clearMarks();
  marks.addMark('note', 10, 10, 1, 0.2);
  marks.addMark('crack', 20, 20, 2, 0.2);
  marks.cancelAfter(1.5);
  marks.drawMarks(g, 1.5);
  assert.equal(drawn, 1, 'the heard note mark stays');
  marks.drawMarks(g, 2 + MARK_LIFE / 2);
  assert.equal(drawn, 1, 'the cancelled crack mark is gone');
});
