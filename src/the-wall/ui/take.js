// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — comparison takes
// ---------------------------------------------------------------------------
// Records an isolated take of the current wall: fresh effects (no old tails),
// seeded restart, TAKE_SECONDS of performance, then TAKE_TAIL seconds with
// the layers closed. Progress follows captured audio samples, not the display.
// Downloads a 32-bit float WAV of the protected output and a JSON record of
// settings, measurements and whether the take met the comparison conditions.
// ---------------------------------------------------------------------------

import { SCORE_VERSION, TAKE_SECONDS, TAKE_TAIL } from '../config.js';
import { isStarted, onBlock, resetEffects, getContext, getLevel } from '../audio/engine.js';
import { setLayer } from '../audio/synth.js';
import { measurePcm, dbfs } from '../audio/meter.js';
import { encodeWav } from '../audio/wav.js';
import { getCurrent } from '../wall/archive.js';
import { getBugs } from '../bug/colony.js';
import { isFeedback } from '../feedback/loop.js';
import { getStats } from '../events/emitter.js';
import * as clock from '../sim/clock.js';

const REVISION = typeof __BUGSONIC_REV__ === 'undefined' ? 'unknown' : __BUGSONIC_REV__;

const concat = (parts, n) => {
  const out = new Float32Array(n);
  let o = 0;
  for (const p of parts) { out.set(p.subarray(0, Math.min(p.length, n - o)), o); o += p.length; if (o >= n) break; }
  return out;
};

function download(name, data, type) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * @param {{ button: HTMLButtonElement, status: HTMLElement, canvas: HTMLCanvasElement,
 *           noteLayer: HTMLInputElement, crackLayer: HTMLInputElement, restart: () => void }} els
 */
export function initTake({ button, status, canvas, noteLayer, crackLayer, restart }) {
  let active = null;

  canvas.addEventListener('pointerdown', () => { if (active) active.scratches++; });
  document.addEventListener('visibilitychange', () => { if (active && document.hidden) active.hidden = true; });

  function finish(take) {
    take.off();
    setLayer('note', noteLayer.checked);
    setLayer('crack', crackLayer.checked);
    noteLayer.disabled = crackLayer.disabled = false;
    button.disabled = false;
    active = null;

    const rate = take.rate;
    const perf = TAKE_SECONDS * rate;
    const total = perf + TAKE_TAIL * rate;
    const l = concat(take.l, total);
    const r = concat(take.r, total);
    const whole = measurePcm([l, r]);
    const performance = measurePcm([l.subarray(0, perf), r.subarray(0, perf)]);
    const tail = measurePcm([l.subarray(perf), r.subarray(perf)]);
    const w = take.wall;
    const reasons = [];
    if (take.feedback || isFeedback()) reasons.push('feedback on');
    if (getCurrent() !== w) reasons.push('wall changed');
    if (getBugs().length !== take.bugs) reasons.push('creature count changed');
    if (take.scratches) reasons.push(`${take.scratches} scratch(es)`);
    if (take.hidden) reasons.push('tab hidden');
    if (clock.droppedCount()) reasons.push('simulation dropped time');
    if (take.clamped) reasons.push('output clamp engaged');
    if (take.nonFinite) reasons.push('non-finite samples');

    const seed = w.seed.toString(16).padStart(8, '0');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const base = `bugsonic-${w.id}-${seed}-${stamp}`;
    const record = {
      app: 'bugsonic/the-wall',
      revision: REVISION,
      score: SCORE_VERSION,
      date: new Date().toISOString(),
      userAgent: navigator.userAgent,
      sampleRate: rate,
      wall: { id: w.id, name: w.name, seed, edo: w.T.edo, root: w.T.base, tempo: w.T.tempo, scale: w.T.scale, pulse: w.T.pulse },
      settings: { bugs: take.bugs, layers: take.layers, feedback: take.feedback, outputLevel: take.level },
      durations: { performance: TAKE_SECONDS, tail: TAKE_TAIL },
      measured: {
        performanceRms: performance.rms, performanceRmsDbfs: dbfs(performance.rms),
        tailRms: tail.rms, tailRmsDbfs: dbfs(tail.rms),
        peak: whole.peak, peakDbfs: dbfs(whole.peak),
      },
      protection: { clamped: take.clamped, nonFinite: take.nonFinite, maxReductionDb: -dbfs(take.minGain) },
      events: take.events,
      conditions: { scratches: take.scratches, hidden: take.hidden, droppedTime: clock.droppedCount() },
      valid: reasons.length === 0,
      reasons,
    };
    download(`${base}.wav`, encodeWav([l, r], rate), 'audio/wav');
    download(`${base}.json`, JSON.stringify(record, null, 2), 'application/json');
    status.textContent = record.valid
      ? `Take saved: ${w.id}, ${record.events} events, RMS ${record.measured.performanceRmsDbfs.toFixed(1)} dBFS.`
      : `Take saved but not comparable: ${reasons.join(', ')}.`;
  }

  button.onclick = () => {
    if (active) return;
    const wall = getCurrent();
    if (!isStarted() || !wall) {
      status.textContent = 'Wake the wall first: takes record the browser sound.';
      return;
    }
    const rate = getContext().sampleRate;
    const perf = TAKE_SECONDS * rate;
    const total = perf + TAKE_TAIL * rate;
    resetEffects();
    restart();
    const take = {
      rate, wall, l: [], r: [], n: 0, scratches: 0, hidden: false, closed: false,
      clamped: 0, nonFinite: 0, minGain: 1, base: null,
      feedback: isFeedback(), bugs: getBugs().length, level: getLevel(),
      layers: { note: noteLayer.checked, crack: crackLayer.checked },
      events: getStats().events,
    };
    take.off = onBlock((b) => {
      take.base ??= { clamped: b.clamped, nonFinite: b.nonFinite };
      take.l.push(b.l);
      take.r.push(b.r);
      take.n += b.l.length;
      take.clamped = b.clamped - take.base.clamped;
      take.nonFinite = b.nonFinite - take.base.nonFinite;
      take.minGain = Math.min(take.minGain, b.minGain);
      if (!take.closed && take.n >= perf) {
        take.closed = true;
        take.events = getStats().events - take.events;
        setLayer('note', false);
        setLayer('crack', false);
      }
      if (take.n >= total) finish(take);
      else status.textContent = `Recording ${secs(take.n / rate)} / ${TAKE_SECONDS + TAKE_TAIL} s${take.closed ? ' · tail' : ''}`;
    });
    active = take;
    button.disabled = true;
    noteLayer.disabled = crackLayer.disabled = true;
  };
}

const secs = (s) => Math.floor(s).toString().padStart(2, '0');
