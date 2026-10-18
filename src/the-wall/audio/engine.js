// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — audio engine
// ---------------------------------------------------------------------------
// Sets up the AudioContext and wires the effects chain.
// Exposes the analyser for FFT reads and nodes for synth routing.
// ---------------------------------------------------------------------------

import { FFT_SIZE, MASTER_GAIN } from '../config.js';
import { buildEffectsChain } from './effects.js';

let ac       = null;
let master   = null;   // master gain -> effects chain input
let send     = null;   // delay send, scaled by the same output level
let analyser = null;
let fdata    = null;
let started  = false;
let level = MASTER_GAIN;

/**
 * Create the AudioContext and wire the master chain.
 * Must be called from a user gesture.
 */
export function initAudio() {
  ac = new (window.AudioContext || window.webkitAudioContext)();

  // Master gain sits before the effects chain
  master = ac.createGain();
  master.gain.value = level;

  // Build the full effects chain and get its entry point
  const chain = buildEffectsChain(ac);
  master.connect(chain.input);

  send = ac.createGain();
  send.gain.value = level;
  send.connect(chain.delaySend);

  analyser = chain.analyser;
  fdata    = new Uint8Array(analyser.frequencyBinCount);

  started = true;
}

/**
 * Toggle audio on/off. Returns the new state string.
 */
export async function toggle() {
  if (!started) {
    initAudio();
    await ac.resume();
    return ac.state === 'running' ? 'on' : 'off';
  } else if (ac.state === 'running') {
    await ac.suspend();
    return 'off';
  }
  await ac.resume();
  return ac.state === 'running' ? 'on' : 'off';
}

export function setLevel(value) {
  if (!Number.isFinite(value)) return;
  level = Math.max(0, Math.min(.7, value));
  if (master) {
    master.gain.setTargetAtTime(level, ac.currentTime, .03);
    send.gain.setTargetAtTime(level, ac.currentTime, .03);
  }
}

/**
 * Read FFT frequency data into the shared buffer.
 * Returns { energy, low, bands }.
 */
export function readFFT() {
  if (!started || ac.state !== 'running') {
    return { energy: 0, low: 0, bands: null };
  }
  analyser.getByteFrequencyData(fdata);

  let s = 0;
  for (let i = 0; i < fdata.length; i++) s += fdata[i];
  const energy = s / fdata.length / 255;

  let lo = 0;
  for (let i = 0; i < 6; i++) lo += fdata[i];
  const low = lo / 6 / 255;

  return { energy, low, bands: fdata };
}

// Accessors
export function getContext()   { return ac; }
export function getMaster()    { return master; }
export function getDelay()     { return send; }
export function isStarted()    { return started && ac.state === 'running'; }
