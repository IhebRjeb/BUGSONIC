import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { OUTPUT_CEILING } from '../src/the-wall/config.js';
import { encodeWav, decodeWav } from '../src/the-wall/audio/wav.js';
import { measurePcm, dbfs } from '../src/the-wall/audio/meter.js';
import { matchTakes } from '../tools/match-takes.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b} (±${tol})`);
const sine = (n, freq, rate, amp) => Float32Array.from({ length: n }, (_, i) => amp * Math.sin(2 * Math.PI * freq * i / rate));

test('WAV float round trip is exact; 16-bit PCM decodes to full scale', () => {
  const l = sine(1000, 440, 48000, 0.5);
  const r = l.map(v => -v);
  const { sampleRate, channels } = decodeWav(new Uint8Array(encodeWav([l, r], 48000)));
  assert.equal(sampleRate, 48000);
  assert.deepEqual(channels, [l, r]);

  const pcm = Buffer.alloc(44 + 4);
  pcm.write('RIFF', 0); pcm.writeUInt32LE(40, 4); pcm.write('WAVE', 8); pcm.write('fmt ', 12);
  pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22); pcm.writeUInt32LE(44100, 24);
  pcm.writeUInt32LE(88200, 28); pcm.writeUInt16LE(2, 32); pcm.writeUInt16LE(16, 34); pcm.write('data', 36);
  pcm.writeUInt32LE(4, 40); pcm.writeInt16LE(-32768, 44); pcm.writeInt16LE(16384, 46);
  assert.deepEqual([...decodeWav(pcm).channels[0]], [-1, 0.5]);
});

test('takes are RMS-matched by a plain gain, peaks stay under the ceiling, labels hide the walls', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bugsonic-takes-'));
  const rate = 8000;
  const quiet = sine(rate * 3, 200, rate, 0.05);
  const spiky = sine(rate * 3, 300, rate, 0.1);
  spiky[100] = 0.85;                                   // crest factor limits the common level
  const silent = new Float32Array(rate * 3);
  const write = (name, x, wall) => {
    fs.writeFileSync(path.join(dir, `${name}.wav`), Buffer.from(encodeWav([x, x], rate)));
    fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify({ wall: { id: wall }, durations: { performance: 2, tail: 1 }, valid: true }));
  };
  write('bugsonic-W-001', quiet, 'W-001');
  write('bugsonic-W-002', spiky, 'W-002');
  write('bugsonic-W-003', silent, 'W-003');

  const r = matchTakes(dir, { targetDbfs: -10 });
  assert.equal(r.takes.length, 2);
  assert.deepEqual(r.skipped.map(s => s.file), ['bugsonic-W-003.wav']);
  assert.ok(r.targetDbfs < -10, 'the spiky take caps the common level');
  const out = path.join(dir, 'matched');
  assert.deepEqual(fs.readdirSync(out).sort(), ['A.wav', 'B.wav', 'key.json']);
  for (const t of r.takes) {
    const { channels } = decodeWav(fs.readFileSync(path.join(out, `${t.label}.wav`)));
    const perf = measurePcm(channels.map(c => c.subarray(0, rate * 2)));
    near(dbfs(perf.rms), r.targetDbfs, 0.01, t.file);
    assert.ok(measurePcm(channels).peak <= OUTPUT_CEILING + 1e-6);
  }
  fs.rmSync(dir, { recursive: true });
});
