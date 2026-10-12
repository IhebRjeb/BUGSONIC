// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — procedural wall generator
// ---------------------------------------------------------------------------

import { W, H, GEN_RECT_COUNT, GEN_CRACK_MIN, GEN_CRACK_MAX } from '../config.js';

const R = (a, b) => a + Math.random() * (b - a);

// Grain is part of the score; keep it below the edge-density ceiling.
export function paint(c) {
  const hue = R(195, 230);
  c.fillStyle = '#222b2d';
  c.fillRect(0, 0, W, H);

  for (let i = 0; i < GEN_RECT_COUNT; i++) {
    c.fillStyle = `hsla(${hue},${R(5, 20)}%,${R(20, 60)}%,${R(.03, .15)})`;
    c.fillRect(R(-50, W), R(-50, H), R(20, 200), R(20, 160));
  }

  const glow = c.createRadialGradient(W * .4, H * .45, 10, W * .45, H * .5, W * .7);
  glow.addColorStop(0, `hsla(${hue},85%,58%,.85)`);
  glow.addColorStop(.5, `hsla(${hue},75%,42%,.45)`);
  glow.addColorStop(1, `hsla(${hue},70%,20%,0)`);
  c.fillStyle = glow;
  c.fillRect(0, 0, W, H);

  const phase = R(0, Math.PI * 2);
  c.save();
  c.translate(W * .53, H * .49);
  c.rotate(R(-.16, .16));
  for (let layer = 0; layer < 4; layer++) {
    c.beginPath();
    for (let y = -230; y <= 240; y += 5) {
      const x = -105 + Math.sin(y * .011 + phase) * 40 + R(-5, 5) - layer * 8;
      if (y === -230) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    for (let y = 240; y >= -230; y -= 5) {
      const x = 88 + Math.sin(y * .014 + phase + 2) * 45 + R(-6, 6) - layer * 8;
      c.lineTo(x, y);
    }
    c.closePath();
    c.fillStyle = ['#183846', '#7ca8ae', '#b5bcaa', '#e0d7bd'][layer];
    c.fill();
  }

  // Offset contour impressions suggest something worn into the plaster.
  for (let line = 0; line < 8; line++) {
    c.beginPath();
    for (let y = -205; y <= 215; y += 3) {
      const x = Math.sin(y * .014 + phase + line * .13) * (48 + line * 3)
        + Math.cos(y * .024 + line * .2) * 18 + line * 11 - 53;
      if (y === -205) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.strokeStyle = line % 3 === 0 ? 'rgba(29,46,47,.75)' : 'rgba(48,62,59,.38)';
    c.lineWidth = line % 3 === 0 ? 1.2 : .65;
    c.stroke();
  }
  c.restore();

  const crackCount = R(GEN_CRACK_MIN, GEN_CRACK_MAX);
  for (let i = 0; i < crackCount; i++) {
    c.strokeStyle = `rgba(7,15,17,${R(.25, .65)})`;
    c.lineWidth = R(.4, 1.3);
    c.beginPath();
    let x = R(0, W);
    let y = R(0, H);
    c.moveTo(x, y);
    const segs = R(8, 30);
    for (let s = 0; s < segs; s++) {
      x += R(-14, 14);
      y += R(2, 14);
      c.lineTo(x, y);
    }
    c.stroke();
  }

  const image = c.getImageData(0, 0, W, H);
  const grainAmount = R(5, 14);
  for (let i = 0; i < image.data.length; i += 4) {
    const grain = R(-grainAmount, grainAmount);
    image.data[i] += grain;
    image.data[i + 1] += grain;
    image.data[i + 2] += grain + R(-2, 2);
  }
  c.putImageData(image, 0, 0);
}
