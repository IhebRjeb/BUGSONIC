// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — synthesis voices
// ---------------------------------------------------------------------------
// Each bug has a distinct voice identity based on its id:
//   - Oscillator type (carrier)
//   - FM modulator ratio (from FM_RATIO_SET)
//   - Filter character
//   - Envelope shape
//
// play()  — pitched note triggered by an edge (FM synthesis)
// click() — filtered noise burst triggered by a crack
// ---------------------------------------------------------------------------

import {
  W,
  FM_INDEX_MIN, FM_INDEX_MAX, FM_RATIO_SET,
  NOTE_ATTACK, NOTE_DECAY_MIN, NOTE_DECAY_MAX,
  CLICK_DURATION, CLICK_GAIN,
} from '../config.js';
import { getContext, getMaster, getDelay } from './engine.js';

// Per-bug voice profiles — deterministic from bug id
const CARRIER_TYPES = ['sine', 'triangle', 'sawtooth', 'square'];
const FILTER_TYPES  = ['lowpass', 'bandpass', 'lowpass', 'highpass'];

function voiceProfile(bugId) {
  return {
    carrier:  CARRIER_TYPES[bugId % CARRIER_TYPES.length],
    filter:   FILTER_TYPES[bugId % FILTER_TYPES.length],
    fmRatio:  FM_RATIO_SET[bugId % FM_RATIO_SET.length],
    detune:   (bugId % 3 - 1) * 4,          // -4, 0, or +4 cents
    filterQ:  3 + (bugId % 5) * 1.5,        // 3 to 9
    gainBase: 0.14 + (bugId % 3) * 0.02,    // slight volume variation
  };
}

/**
 * Play a pitched FM note.
 *
 * @param {import('../bug/Bug.js').Bug} bug
 * @param {number} freq     — Hz
 * @param {number} gradient — edge strength (0-1ish, affects decay + FM index)
 * @param {number} hue      — 0-1, mapped to filter cutoff
 * @param {number} time     — scheduled start time (seconds)
 */
export function play(bug, freq, gradient, hue, time) {
  const ac     = getContext();
  const master = getMaster();
  const delay  = getDelay();
  const v      = voiceProfile(bug.id);

  // --- FM modulator ---
  const mod     = ac.createOscillator();
  mod.type      = 'sine';
  mod.frequency.value = freq * v.fmRatio;

  const fmIndex = FM_INDEX_MIN + gradient * (FM_INDEX_MAX - FM_INDEX_MIN);
  const modGain = ac.createGain();
  modGain.gain.setValueAtTime(freq * fmIndex, time);
  // FM index decays with the note — brighter attack, darker sustain
  modGain.gain.exponentialRampToValueAtTime(
    freq * FM_INDEX_MIN * 0.5 + 0.01,
    time + NOTE_DECAY_MIN + gradient * (NOTE_DECAY_MAX - NOTE_DECAY_MIN) * 0.6
  );

  mod.connect(modGain);

  // --- Carrier ---
  const osc = ac.createOscillator();
  osc.type  = v.carrier;
  osc.frequency.value = freq;
  osc.detune.value    = v.detune;

  // FM: modulator modulates carrier frequency
  modGain.connect(osc.frequency);

  // --- Filter ---
  const flt = ac.createBiquadFilter();
  flt.type  = v.filter;
  // Hue controls cutoff: dark hues = low cutoff, bright hues = high cutoff
  flt.frequency.value = 200 + hue * 4000;
  flt.Q.value = v.filterQ;
  // Filter envelope: opens on attack, closes during decay
  flt.frequency.setValueAtTime(200 + hue * 4000, time);
  flt.frequency.linearRampToValueAtTime(
    Math.min(8000, 400 + hue * 6000),
    time + NOTE_ATTACK * 2
  );
  flt.frequency.exponentialRampToValueAtTime(
    Math.max(80, 150 + hue * 800),
    time + NOTE_DECAY_MIN + gradient * (NOTE_DECAY_MAX - NOTE_DECAY_MIN)
  );

  // --- Amplitude envelope ---
  const decayTime = NOTE_DECAY_MIN + gradient * (NOTE_DECAY_MAX - NOTE_DECAY_MIN);
  const gn = ac.createGain();
  gn.gain.setValueAtTime(0, time);
  gn.gain.linearRampToValueAtTime(v.gainBase, time + NOTE_ATTACK);
  gn.gain.exponentialRampToValueAtTime(0.001, time + decayTime);

  // --- Stereo panning from bug position ---
  const pan = ac.createStereoPanner();
  pan.pan.value = (bug.x / W) * 2 - 1;

  // --- Routing ---
  osc.connect(flt);
  flt.connect(gn);
  gn.connect(pan);
  pan.connect(master);
  if (delay) pan.connect(delay);

  // --- Schedule ---
  mod.start(time);
  osc.start(time);
  const stopTime = time + decayTime + 0.1;
  mod.stop(stopTime);
  osc.stop(stopTime);
}

/**
 * Play a filtered noise click (crack sound).
 * Richer than a plain white noise burst: bandpass filtered with pitch envelope.
 *
 * @param {number} time — scheduled start time (seconds)
 */
export function click(time) {
  const ac     = getContext();
  const master = getMaster();

  const rate = ac.sampleRate;
  const len  = rate * CLICK_DURATION;
  const buf  = ac.createBuffer(1, len, rate);
  const d    = buf.getChannelData(0);

  // Shaped noise: exponential decay with slight tonal character
  for (let i = 0; i < len; i++) {
    const env = Math.pow(1 - i / len, 2);   // quadratic decay (snappier)
    d[i] = (Math.random() * 2 - 1) * env;
  }

  const src = ac.createBufferSource();
  src.buffer = buf;

  // Bandpass filter gives the click a "material" quality
  const flt = ac.createBiquadFilter();
  flt.type = 'bandpass';
  flt.frequency.setValueAtTime(3000, time);
  flt.frequency.exponentialRampToValueAtTime(200, time + CLICK_DURATION);
  flt.Q.value = 2;

  const gn = ac.createGain();
  gn.gain.value = CLICK_GAIN;

  src.connect(flt);
  flt.connect(gn);
  gn.connect(master);
  src.start(time);
}
