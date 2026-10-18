// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — Bug class
// ---------------------------------------------------------------------------
// An autonomous agent that crawls the wall, reads visual features beneath it,
// and triggers sounds based on what it finds.
// ---------------------------------------------------------------------------

import { W, H, LEGS_PER_BUG, SOUND_COOLDOWN, EDGE_GRAD, EDGE_RELEASE, RIDGE_DEPTH, PULSE_LATENCY } from '../config.js';
import { grad, lumAt, ridgeAt, colourAt } from '../wall/analysis.js';
import { noteFreq } from '../wall/tuning.js';

export class Bug {
  /**
   * @param {number} id — unique bug index
   * @param {() => number} rng — seeded random source in [0, 1)
   */
  constructor(id, rng = Math.random) {
    this.id    = id;
    this.rng   = rng;
    this.x     = this.r(60, W - 60);
    this.y     = this.r(60, H - 60);
    this.a     = this.r(0, Math.PI * 2);   // heading angle
    this.next  = { note: 0, crack: 0 }; // earliest simulation time for the next sound of each kind (ms)
    this.hue   = (id * 70) % 360;
    this.flash = 0;                    // visual flash on sound trigger
    this.flashAt = Infinity;           // simulation time (ms) when the scheduled sound is heard
    this.l     = 0;                    // luminance under bug
    this.g     = 0;                    // gradient under bug
    this.edgeArmed  = true;
    this.crackArmed = true;

    // Legs — 6 endpoints that follow the body with IK-like stepping
    this.legs = Array.from({ length: LEGS_PER_BUG }, (_, i) => ({
      o: (i / LEGS_PER_BUG) * Math.PI * 2,
      x: this.x,
      y: this.y,
    }));
  }

  r(a, b) { return a + this.rng() * (b - a); }

  /**
   * One fixed simulation step (1/60 s): move, sample the wall, maybe sound.
   *
   * @param {number} t       — simulation time (ms)
   * @param {number} energy  — overall FFT energy 0-1 (0 when feedback is off)
   * @param {number} low     — bass energy 0-1 (0 when feedback is off)
   * @param {{ d: number, x: number, y: number }} ptr — pointer state
   * @param {{ play, click, next, time, mark, started, external }} audio — audio interface
   * @param {{ edo, base, scale, tempo, pulse, voice }} T — current tuning
   * @param {function} emit  — event emitter
   */
  step(t, energy, low, ptr, audio, T, emit) {
    // Sample at most ~1px apart so thin cracks and edges are never stepped over.
    const n = Math.max(1, Math.ceil(0.8 + energy * 3.5));
    for (let s = 0; s < n; s++) {
      this.move(t, energy, low, ptr, 1 / n);
      this.sense(t, audio, T, emit);
    }

    // Leg IK
    for (const l of this.legs) {
      const r  = 22 + energy * 30;
      const tx = this.x + Math.cos(l.o + this.a) * r;
      const ty = this.y + Math.sin(l.o + this.a) * r;
      if (Math.hypot(tx - l.x, ty - l.y) > r * 0.9) {
        l.x += (tx - l.x) * 0.5;
        l.y += (ty - l.y) * 0.5;
      }
    }

    if (t >= this.flashAt) {
      this.flash = 1;
      this.flashAt = Infinity;
    }
    this.flash *= 0.9;
  }

  move(t, energy, low, ptr, dt) {
    const sp = 0.8 + energy * 3.5;
    this.speed = sp;
    this.a += (Math.sin(t * 0.001 * (this.id + 1) + this.id) * 0.05) * dt + this.r(-0.06, 0.06) * Math.sqrt(dt);

    // Pointer attraction
    if (ptr.d) {
      const want = Math.atan2(ptr.y - this.y, ptr.x - this.x);
      this.a += Math.sin(want - this.a) * 0.08 * dt;
    }

    this.x += Math.cos(this.a) * sp * dt;
    this.y += (Math.sin(this.a) * sp + low * 0.8) * dt;

    // Boundary bounce
    if (this.x < 10 || this.x > W - 10) {
      this.a = Math.PI - this.a;
      this.x = Math.max(10, Math.min(W - 10, this.x));
    }
    if (this.y < 10 || this.y > H - 10) {
      this.a = -this.a;
      this.y = Math.max(10, Math.min(H - 10, this.y));
    }
  }

  // Sounds fire on entering an edge or crack, then re-arm once the bug leaves it.
  sense(t, audio, T, emit) {
    this.l = lumAt(this.x, this.y);
    this.g = grad(this.x, this.y);
    const depth = ridgeAt(this.x, this.y);
    if (this.g < EDGE_RELEASE) this.edgeArmed = true;
    if (depth < RIDGE_DEPTH * 0.5) this.crackArmed = true;

    if (!(audio.started || audio.external)) return;

    const pan = (this.x / W) * 2 - 1;
    if (depth > RIDGE_DEPTH && this.crackArmed && t >= this.next.crack) {
      this.crackArmed = false;
      this.trigger(t, audio, T, emit, 'crack', 0, depth, (when) => audio.click(when, depth, T, pan));
    } else if (this.g > EDGE_GRAD && this.edgeArmed && t >= this.next.note) {
      this.edgeArmed = false;
      const f = noteFreq(this.l, T);
      const local = { g: this.g, l: this.l, ...colourAt(this.x, this.y) };
      this.trigger(t, audio, T, emit, 'note', f, this.g, (when) => audio.play(this, f, local, when, T));
    }
  }

  // An encounter with no free active step nearby rests: no sound, no event.
  trigger(t, audio, T, emit, kind, freq, strength, sound) {
    const at = audio.next(T, t / 1000);
    if (at === null) return;
    const heardMs = (at + PULSE_LATENCY) * 1000;
    this.next[kind] = at * 1000 + SOUND_COOLDOWN;
    this.flashAt = Math.min(this.flashAt, heardMs);
    if (audio.started) sound(audio.time(at));
    audio.mark(kind, this.x, this.y, heardMs / 1000, strength);
    emit(this, kind, freq);
  }

  /**
   * Draw the bug (body + legs) onto a 2d context.
   */
  draw(ctx) {
    const color = ['#d6edff', '#f0e4c9', '#b7d4ec', '#dae0b3'][this.id % 4];
    ctx.save();
    ctx.strokeStyle = ctx.fillStyle = color;
    ctx.lineWidth = .85;
    ctx.shadowColor = '#182630';
    ctx.shadowBlur = 3;

    for (const l of this.legs) {
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      const bend = (this.id % 2 ? 1 : -1) * 5;
      ctx.quadraticCurveTo((this.x + l.x) / 2 + bend, (this.y + l.y) / 2 - bend, l.x, l.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(l.x, l.y, 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.translate(this.x, this.y);
    ctx.rotate(this.a);
    ctx.beginPath();
    ctx.ellipse(0, 0, 5 + this.flash * 3, 2.5 + this.flash, 0, 0, Math.PI * 2);
    ctx.fill();
    if (this.flash > .08) {
      ctx.globalAlpha = this.flash * .6;
      ctx.beginPath();
      ctx.ellipse(0, 0, 12 + (1 - this.flash) * 21, 10 + (1 - this.flash) * 21, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}
