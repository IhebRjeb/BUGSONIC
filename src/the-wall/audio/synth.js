// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — synthesis voices
// ---------------------------------------------------------------------------
// The wall sets the voice (carriers, FM ratios, index, decay, filter); each
// bug picks within it, and the pixels under the bug shape every note:
//   edge strength -> FM brightness, decay, level
//   luminance     -> filter cutoff
//   saturation    -> filter resonance
//   crack depth   -> click pitch, length, level
//
// play()  — pitched note triggered by an edge (FM synthesis)
// click() — filtered noise burst triggered by a crack
// ---------------------------------------------------------------------------

import {
  W,
  FM_INDEX_MAX,
  NOTE_ATTACK, NOTE_DECAY_MIN, NOTE_DECAY_MAX,
  CLICK_DURATION, CLICK_GAIN,
} from '../config.js';
import { getContext, getMaster, getDelay } from './engine.js';
import { mulberry32 } from '../sim/rng.js';

const NOISE_SEED = 0x5EED0002;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let noise = null;
let offsets = mulberry32(NOISE_SEED);   // click read positions; restarts with the effects chain

// Each layer has its own bus, so muting a layer also silences its delay send.
// Buses follow the current drive node; a rebuilt effects chain gets new buses
// and the old ones (with any voices still on them) are disconnected.
const layers = { note: { on: true, bus: null, to: null }, crack: { on: true, bus: null, to: null } };
let pending = [];   // { at, end, out } for voices not yet finished

function layerBus(kind) {
  const layer = layers[kind];
  const master = getMaster();
  if (layer.to !== master) {
    layer.bus?.disconnect();
    const ac = getContext();
    layer.bus = ac.createGain();
    layer.bus.gain.value = layer.on ? 1 : 0;
    layer.bus.connect(master);
    if (kind === 'note') layer.bus.connect(getDelay());
    layer.to = master;
    if (kind === 'crack') offsets = mulberry32(NOISE_SEED);
  }
  return layer.bus;
}

export function setLayer(kind, on) {
  const layer = layers[kind];
  layer.on = !!on;
  if (layer.bus) layer.bus.gain.setTargetAtTime(layer.on ? 1 : 0, getContext().currentTime, 0.02);
}

function track(at, end, out) {
  const now = getContext().currentTime;
  pending = pending.filter(p => p.end > now);
  pending.push({ at, end, out });
}

/** Silence voices scheduled but not yet started (e.g. after a wall change). */
export function cancelPending() {
  const ac = getContext();
  if (!ac) return;
  const now = ac.currentTime;
  for (const p of pending) if (p.at > now) p.out.disconnect();
  pending = pending.filter(p => p.at <= now && p.end > now);
}

/**
 * Play a pitched FM note.
 *
 * @param {import('../bug/Bug.js').Bug} bug
 * @param {number} freq — Hz
 * @param {{ g: number, l: number, sat: number }} local — pixels under the bug
 * @param {number} time — scheduled start time (seconds)
 * @param {{ voice: object }} T — current tuning
 */
export function play(bug, freq, local, time, T) {
  const ac     = getContext();
  const v      = T.voice;
  const edge   = clamp(local.g / 0.3, 0, 1);
  const decayTime = (NOTE_DECAY_MIN + edge * (NOTE_DECAY_MAX - NOTE_DECAY_MIN)) * v.decay;

  // --- FM modulator ---
  const mod     = ac.createOscillator();
  mod.type      = 'sine';
  mod.frequency.value = freq * v.ratios[bug.id % v.ratios.length];

  const fmIndex = Math.min(FM_INDEX_MAX, v.index * (0.5 + edge * 4));
  const modGain = ac.createGain();
  modGain.gain.setValueAtTime(freq * fmIndex, time);
  modGain.gain.exponentialRampToValueAtTime(freq * 0.05 + 0.01, time + decayTime * 0.6);
  mod.connect(modGain);

  // --- Carrier ---
  const osc = ac.createOscillator();
  osc.type  = v.carriers[bug.id % v.carriers.length];
  osc.frequency.value = freq;
  osc.detune.value    = (bug.id % 3 - 1) * 4;
  modGain.connect(osc.frequency);

  // --- Filter: opens on attack, closes during decay ---
  const cutoff = clamp(v.cutoff * 2 ** ((local.l - 0.5) * 2), 120, 9000);
  const flt = ac.createBiquadFilter();
  flt.type  = 'lowpass';
  flt.Q.value = 0.7 + local.sat * 8;
  flt.frequency.setValueAtTime(cutoff, time);
  flt.frequency.linearRampToValueAtTime(Math.min(10000, cutoff * 1.8), time + NOTE_ATTACK * 2);
  flt.frequency.exponentialRampToValueAtTime(Math.max(80, cutoff * 0.25), time + decayTime);

  // --- Amplitude envelope ---
  const gn = ac.createGain();
  gn.gain.setValueAtTime(0, time);
  gn.gain.linearRampToValueAtTime(0.08 + edge * 0.1, time + NOTE_ATTACK);
  gn.gain.exponentialRampToValueAtTime(0.001, time + decayTime);

  const pan = ac.createStereoPanner();
  pan.pan.value = clamp((bug.x / W) * 2 - 1, -1, 1);

  osc.connect(flt);
  flt.connect(gn);
  gn.connect(pan);
  pan.connect(layerBus('note'));

  mod.start(time);
  osc.start(time);
  const stopTime = time + decayTime + 0.1;
  mod.stop(stopTime);
  osc.stop(stopTime);
  track(time, stopTime, pan);
}

function noiseBuffer(ac) {
  if (noise?.sampleRate === ac.sampleRate) return noise;
  const len = Math.ceil(ac.sampleRate * CLICK_DURATION * 3);
  noise = ac.createBuffer(1, len, ac.sampleRate);
  const d = noise.getChannelData(0);
  const rng = mulberry32(NOISE_SEED);
  for (let i = 0; i < len; i++) d[i] = rng() * 2 - 1;
  return noise;
}

/**
 * Play a filtered noise click (crack sound).
 *
 * @param {number} time   — scheduled start time (seconds)
 * @param {number} depth  — how much darker the crack is than both sides (0-1)
 * @param {{ voice: object }} T — current tuning
 * @param {number} panPos — -1 (left) to +1 (right)
 */
export function click(time, depth, T, panPos) {
  const ac     = getContext();
  const d      = clamp(depth / 0.4, 0, 1);
  const dur    = CLICK_DURATION * (0.6 + d * 2);

  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac);

  // Deeper cracks sound lower and longer
  const centre = T.voice.crackTone * (1.4 - d * 0.8);
  const flt = ac.createBiquadFilter();
  flt.type = 'bandpass';
  flt.frequency.setValueAtTime(centre, time);
  flt.frequency.exponentialRampToValueAtTime(Math.max(120, centre * 0.12), time + dur);
  flt.Q.value = 2;

  const gn = ac.createGain();
  gn.gain.setValueAtTime(CLICK_GAIN * (0.5 + d * 0.7), time);
  gn.gain.exponentialRampToValueAtTime(0.001, time + dur);

  const pan = ac.createStereoPanner();
  pan.pan.value = clamp(panPos, -1, 1);

  const bus = layerBus('crack');
  src.connect(flt);
  flt.connect(gn);
  gn.connect(pan);
  pan.connect(bus);
  src.start(time, offsets() * Math.max(0, src.buffer.duration - dur));
  src.stop(time + dur + 0.02);
  track(time, time + dur + 0.02, pan);
}
