// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — final output processor (AudioWorklet)
// ---------------------------------------------------------------------------
// Everything audible passes here: output gain -> stereo-linked lookahead
// sample-peak limiter -> destination. Output blocks are posted to the main
// thread for continuous measurement and capture. Self-contained (no imports)
// so it loads as a worklet module unchanged.
//
// Ceiling guarantee: a sample's required gain is held (minimum) over the
// lookahead window, released smoothly, then box-averaged over the same window.
// Every value in that average is at most the delayed sample's required gain.
// A final clamp catches only numerical overshoot and is counted.
// ---------------------------------------------------------------------------

export function createLimiter(rate, { ceiling, lookahead, release }) {
  const L = Math.max(1, Math.round(lookahead * rate));
  const req = new Float64Array(L).fill(1);
  const env = new Float64Array(L).fill(1);
  const dl = new Float64Array(L);
  const dr = new Float64Array(L);
  const rel = 1 - Math.exp(-1 / (release * rate));
  let pos = 0, e = 1, sum = L;
  const stats = { clamped: 0, nonFinite: 0, minGain: 1, inPeak: 0, outPeak: 0 };

  function process(inL, inR, outL, outR, gain) {
    const n = outL.length;
    for (let i = 0; i < n; i++) {
      const g = gain.length > 1 ? gain[i] : gain[0];
      let xl = (inL[i] ?? 0) * g;
      let xr = (inR[i] ?? 0) * g;
      if (!Number.isFinite(xl)) { xl = 0; stats.nonFinite++; }
      if (!Number.isFinite(xr)) { xr = 0; stats.nonFinite++; }
      const a = Math.max(Math.abs(xl), Math.abs(xr));
      if (a > stats.inPeak) stats.inPeak = a;

      req[pos] = a > ceiling ? ceiling / a : 1;
      let hold = 1;
      for (let k = 0; k < L; k++) if (req[k] < hold) hold = req[k];
      e = hold < e ? hold : e + (hold - e) * rel;
      sum += e - env[pos];
      env[pos] = e;
      dl[pos] = xl;
      dr[pos] = xr;
      pos = (pos + 1) % L;
      if (pos === 0) { sum = 0; for (let k = 0; k < L; k++) sum += env[k]; }

      const gl = Math.min(1, sum / L);
      if (gl < stats.minGain) stats.minGain = gl;
      let yl = dl[pos] * gl;
      let yr = dr[pos] * gl;
      const b = Math.max(Math.abs(yl), Math.abs(yr));
      if (b > ceiling) {
        if (b > ceiling * (1 + 1e-6)) stats.clamped++;
        yl = Math.max(-ceiling, Math.min(ceiling, yl));
        yr = Math.max(-ceiling, Math.min(ceiling, yr));
      }
      outL[i] = yl;
      outR[i] = yr;
      const o = Math.max(Math.abs(yl), Math.abs(yr));
      if (o > stats.outPeak) stats.outPeak = o;
    }
  }

  /** Read and reset per-block statistics (counts are cumulative). */
  function take() {
    const s = { ...stats };
    stats.minGain = 1;
    stats.inPeak = stats.outPeak = 0;
    return s;
  }

  return { process, take, latency: L - 1 };
}

if (typeof registerProcessor === 'function') {
  registerProcessor('bugsonic-output', class extends AudioWorkletProcessor {
    static get parameterDescriptors() {
      return [{ name: 'gain', defaultValue: 1, minValue: 0, maxValue: 4, automationRate: 'a-rate' }];
    }

    constructor(options) {
      super();
      const o = options.processorOptions;
      this.limiter = createLimiter(sampleRate, o);
      this.hop = o.hop;
      this.zero = new Float32Array(128);
      this.spare = new Float32Array(128);
      this.fresh();
    }

    fresh() {
      this.l = new Float32Array(this.hop);
      this.r = new Float32Array(this.hop);
      this.fill = 0;
    }

    process(inputs, outputs, params) {
      const input = inputs[0];
      const [outL, outR = this.spare] = outputs[0];
      if (this.zero.length !== outL.length) this.zero = new Float32Array(outL.length);
      const inL = input[0] ?? this.zero;
      this.limiter.process(inL, input[1] ?? inL, outL, outR, params.gain);

      for (let i = 0; i < outL.length; i++) {
        this.l[this.fill] = outL[i];
        this.r[this.fill] = outR[i];
        if (++this.fill === this.hop) {
          const s = this.limiter.take();
          this.port.postMessage({ l: this.l, r: this.r, frame: currentFrame + i + 1, ...s },
            [this.l.buffer, this.r.buffer]);
          this.fresh();
        }
      }
      return true;
    }
  });
}
