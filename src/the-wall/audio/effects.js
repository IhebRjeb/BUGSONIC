// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — effects chain
// ---------------------------------------------------------------------------
// Builds the effects chain:
//   voices -> [distortion] -> [chorus] -> [delay] -> [reverb] -> compressor -> output
//
// Each effect has a dry/wet mix. The engine connects the output to the final
// output processor and can rebuild the chain to drop all tails.
// ---------------------------------------------------------------------------

import {
  DELAY_TIME, DELAY_FEEDBACK, DELAY_WET, DELAY_FILTER_FREQ,
  REVERB_DECAY, REVERB_WET,
  DIST_AMOUNT, DIST_WET,
  CHORUS_RATE, CHORUS_DEPTH, CHORUS_WET,
  COMP_THRESHOLD, COMP_KNEE, COMP_RATIO, COMP_ATTACK, COMP_RELEASE,
} from '../config.js';
import { mulberry32 } from '../sim/rng.js';

const IMPULSE_SEED = 0x5EED0001;   // the same room every time the chain is built

// ---------------------------------------------------------------------------
// Waveshaper distortion
// ---------------------------------------------------------------------------

function makeDistortionCurve(amount, samples = 256) {
  const curve = new Float32Array(samples);
  const k = amount * 50;
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

function createDistortion(ac) {
  const dry = ac.createGain();
  const wet = ac.createGain();
  const out = ac.createGain();
  const ws  = ac.createWaveShaper();

  ws.curve = makeDistortionCurve(DIST_AMOUNT);
  ws.oversample = '2x';

  dry.gain.value = 1 - DIST_WET;
  wet.gain.value = DIST_WET;

  const input = ac.createGain();
  input.connect(dry);
  input.connect(ws);
  ws.connect(wet);
  dry.connect(out);
  wet.connect(out);

  return { input, output: out };
}

// ---------------------------------------------------------------------------
// Chorus (LFO-modulated delay)
// ---------------------------------------------------------------------------

function createChorus(ac) {
  const input = ac.createGain();
  const dry   = ac.createGain();
  const wet   = ac.createGain();
  const out   = ac.createGain();

  dry.gain.value = 1 - CHORUS_WET;
  wet.gain.value = CHORUS_WET;

  // Two detuned delay lines for stereo width
  const dl1 = ac.createDelay(0.05);
  const dl2 = ac.createDelay(0.05);
  dl1.delayTime.value = CHORUS_DEPTH;
  dl2.delayTime.value = CHORUS_DEPTH * 1.1;

  // LFO
  const lfo = ac.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = CHORUS_RATE;

  const lfoGain1 = ac.createGain();
  const lfoGain2 = ac.createGain();
  lfoGain1.gain.value = CHORUS_DEPTH * 0.5;
  lfoGain2.gain.value = CHORUS_DEPTH * 0.5;

  lfo.connect(lfoGain1);
  lfo.connect(lfoGain2);
  lfoGain1.connect(dl1.delayTime);
  lfoGain2.connect(dl2.delayTime);
  lfo.start();

  // Merge
  const merge = ac.createGain();
  dl1.connect(merge);
  dl2.connect(merge);
  merge.gain.value = 0.5;

  input.connect(dry);
  input.connect(dl1);
  input.connect(dl2);
  merge.connect(wet);
  dry.connect(out);
  wet.connect(out);

  return { input, output: out };
}

// ---------------------------------------------------------------------------
// Delay (with lowpass filter in feedback path)
// ---------------------------------------------------------------------------

function createDelay(ac) {
  const input = ac.createGain();
  const dry   = ac.createGain();
  const wet   = ac.createGain();
  const out   = ac.createGain();

  dry.gain.value = 1 - DELAY_WET;
  wet.gain.value = DELAY_WET;

  const dl = ac.createDelay(2);
  dl.delayTime.value = DELAY_TIME;

  // Feedback with lowpass filter (darkens repeats)
  const fb  = ac.createGain();
  fb.gain.value = DELAY_FEEDBACK;
  const flt = ac.createBiquadFilter();
  flt.type = 'lowpass';
  flt.frequency.value = DELAY_FILTER_FREQ;
  flt.Q.value = 0.7;

  dl.connect(fb);
  fb.connect(flt);
  flt.connect(dl);

  // Send input — voices connect here directly for delay send
  const send = ac.createGain();
  send.gain.value = 0.5;
  send.connect(dl);

  // Dry/wet
  input.connect(dry);
  dl.connect(wet);
  dry.connect(out);
  wet.connect(out);

  return { input, output: out, send, delayNode: dl };
}

// ---------------------------------------------------------------------------
// Reverb (convolution-based impulse response, generated algorithmically)
// ---------------------------------------------------------------------------

function generateImpulse(ac, decay, length = 2) {
  const rate    = ac.sampleRate;
  const samples = rate * length;
  const buf     = ac.createBuffer(2, samples, rate);
  const rng     = mulberry32(IMPULSE_SEED);

  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < samples; i++) {
      // Exponential decay with random noise
      data[i] = (rng() * 2 - 1) * Math.pow(1 - i / samples, decay);
    }
  }
  return buf;
}

function createReverb(ac) {
  const input = ac.createGain();
  const dry   = ac.createGain();
  const wet   = ac.createGain();
  const out   = ac.createGain();

  dry.gain.value = 1 - REVERB_WET;
  wet.gain.value = REVERB_WET;

  const conv = ac.createConvolver();
  conv.buffer = generateImpulse(ac, REVERB_DECAY);

  // Pre-delay (small) for clarity
  const preDl = ac.createDelay(0.1);
  preDl.delayTime.value = 0.02;

  input.connect(dry);
  input.connect(preDl);
  preDl.connect(conv);
  conv.connect(wet);
  dry.connect(out);
  wet.connect(out);

  return { input, output: out };
}

// ---------------------------------------------------------------------------
// Master compressor / limiter
// ---------------------------------------------------------------------------

function createCompressor(ac) {
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = COMP_THRESHOLD;
  comp.knee.value      = COMP_KNEE;
  comp.ratio.value     = COMP_RATIO;
  comp.attack.value    = COMP_ATTACK;
  comp.release.value   = COMP_RELEASE;
  return comp;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build the full effects chain. The caller connects `output` onward.
 * @param {BaseAudioContext} ac
 * @returns {{ input: GainNode, delaySend: GainNode, output: DynamicsCompressorNode }}
 */
export function buildEffectsChain(ac) {
  const dist    = createDistortion(ac);
  const chorus  = createChorus(ac);
  const delay   = createDelay(ac);
  const reverb  = createReverb(ac);
  const comp    = createCompressor(ac);

  dist.output.connect(chorus.input);
  chorus.output.connect(delay.input);
  delay.output.connect(reverb.input);
  reverb.output.connect(comp);

  return { input: dist.input, delaySend: delay.send, output: comp };
}
