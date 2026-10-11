// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — Bug class
// ---------------------------------------------------------------------------
// An autonomous agent that crawls the wall, reads visual features beneath it,
// and triggers sounds based on what it finds.
// ---------------------------------------------------------------------------

import { W, H, LEGS_PER_BUG, SOUND_COOLDOWN, CRACK_LUM, EDGE_GRAD } from '../config.js';
import { grad, lumAt, rgbAt } from '../wall/analysis.js';
import { noteFreq } from '../wall/tuning.js';

const R = (a, b) => a + Math.random() * (b - a);

export class Bug {
  /**
   * @param {number} id — unique bug index
   */
  constructor(id) {
    this.id    = id;
    this.x     = R(60, W - 60);
    this.y     = R(60, H - 60);
    this.a     = R(0, Math.PI * 2);   // heading angle
    this.last  = 0;                    // last sound timestamp
    this.hue   = (id * 70) % 360;
    this.flash = 0;                    // visual flash on sound trigger
    this.l     = 0;                    // luminance under bug
    this.g     = 0;                    // gradient under bug

    // Legs — 6 endpoints that follow the body with IK-like stepping
    this.legs = Array.from({ length: LEGS_PER_BUG }, (_, i) => ({
      o: (i / LEGS_PER_BUG) * Math.PI * 2,
      x: this.x,
      y: this.y,
    }));
  }

  /**
   * Move the bug, sample the wall, and decide whether to trigger a sound.
   *
   * @param {number} t       — current timestamp (ms)
   * @param {number} energy  — overall FFT energy 0-1
   * @param {number} low     — bass energy 0-1
   * @param {{ d: number, x: number, y: number }} ptr — pointer state
   * @param {{ play, click, grid }} audio — audio interface
   * @param {{ edo, base, scale, tempo }} T — current tuning
   * @param {function} emit  — event emitter
   */
  step(t, energy, low, ptr, audio, T, emit) {
    // Movement
    const sp = 0.8 + energy * 3.5;
    this.a += Math.sin(t * 0.001 * (this.id + 1) + this.id) * 0.05 + R(-0.06, 0.06);

    // Pointer attraction
    if (ptr.d) {
      const want = Math.atan2(ptr.y - this.y, ptr.x - this.x);
      this.a += Math.sin(want - this.a) * 0.08;
    }

    this.x += Math.cos(this.a) * sp;
    this.y += Math.sin(this.a) * sp + low * 0.8;

    // Boundary bounce
    if (this.x < 10 || this.x > W - 10) {
      this.a = Math.PI - this.a;
      this.x = Math.max(10, Math.min(W - 10, this.x));
    }
    if (this.y < 10 || this.y > H - 10) {
      this.a = -this.a;
      this.y = Math.max(10, Math.min(H - 10, this.y));
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

    // Sample the wall
    this.l = lumAt(this.x, this.y);
    this.g = grad(this.x, this.y);

    // Sound triggers
    if (audio.started && t - this.last > SOUND_COOLDOWN) {
      if (this.l < CRACK_LUM) {
        // Crack — noise click
        audio.click(audio.grid(T));
        emit(this, 'crack', 0);
        this.last  = t;
        this.flash = 1;
      } else if (this.g > EDGE_GRAD) {
        // Edge — pitched note
        const [r, , b] = rgbAt(this.x, this.y);
        const f   = noteFreq(this.l, T);
        const hue = (r - b + 255) / 510;
        audio.play(this, f, this.g, hue, audio.grid(T));
        emit(this, 'note', f);
        this.last  = t;
        this.flash = 1;
      }
    }

    this.flash *= 0.9;
  }

  /**
   * Draw the bug (body + legs) onto a 2d context.
   */
  draw(ctx) {
    ctx.strokeStyle = ctx.fillStyle = `hsl(${this.hue},90%,${60 + this.flash * 30}%)`;
    ctx.lineWidth = 1.2;

    for (const l of this.legs) {
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(l.x, l.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(l.x, l.y, 2.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, 4 + this.flash * 6, 0, Math.PI * 2);
    ctx.fill();
  }
}
