// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — Wall class
// ---------------------------------------------------------------------------
// Each wall holds its own off-screen canvas, thumbnail, visual features,
// and derived tuning parameters.
// ---------------------------------------------------------------------------

import { W, H } from '../config.js';
import { features } from './analysis.js';
import { deriveTuning } from './tuning.js';

let counter = 0;

/**
 * Create an off-screen canvas at the standard wall size.
 */
export function mkCanvas() {
  const c = document.createElement('canvas');
  c.width  = W;
  c.height = H;
  return c;
}

export class Wall {
  /**
   * @param {HTMLCanvasElement | CanvasRenderingContext2D} source — drawn content
   * @param {string} name — display name
   */
  constructor(source, name) {
    counter++;
    this.id   = 'W-' + String(counter).padStart(3, '0');
    this.name = name;
    this.date = new Date().toISOString().slice(0, 10);

    // Full-size off-screen canvas
    this.cv = mkCanvas();
    this.cv.getContext('2d').drawImage(source, 0, 0);

    // Thumbnail (36x48)
    this.th       = document.createElement('canvas');
    this.th.width = 36;
    this.th.height = 48;
    this.th.className = 'th';
    this.th.title = this.id;
    this.th.getContext('2d').drawImage(this.cv, 0, 0, 36, 48);

    // Features and tuning — set when the wall is selected
    this.f = null;
    this.T = null;
  }

  /**
   * Analyse the wall and derive tuning.
   * @param {CanvasRenderingContext2D} liveCtx — the live canvas context
   */
  analyse(liveCtx) {
    this.f = features(liveCtx);
    this.T = deriveTuning(this.f);
  }
}
