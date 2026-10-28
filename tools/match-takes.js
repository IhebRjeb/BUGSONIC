#!/usr/bin/env node
// ---------------------------------------------------------------------------
// BUGSONIC — prepare comparison takes for blind listening
// ---------------------------------------------------------------------------
// Reads the WAV + JSON pairs recorded with "Record comparison take", applies
// one constant gain per file so the performance windows share the same RMS
// (the highest common level that keeps every peak under the ceiling), and
// writes them under random labels with a separate key. No compression or
// limiting: if a take cannot be matched with a plain gain, it is reported.
//
//   npm run match-takes -- <takes-dir> [--out <dir>] [--target-dbfs -23]
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { randomInt } from 'node:crypto';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { OUTPUT_CEILING } from '../src/the-wall/config.js';
import { measurePcm, dbfs } from '../src/the-wall/audio/meter.js';
import { encodeWav, decodeWav } from '../src/the-wall/audio/wav.js';

const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function shuffle(xs) {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * @param {string} dir — folder with bugsonic-*.wav and matching .json records
 * @param {{ out?: string, targetDbfs?: number }} [opts]
 */
export function matchTakes(dir, { out = path.join(dir, 'matched'), targetDbfs = -23 } = {}) {
  const takes = [];
  const skipped = [];
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.wav')).sort()) {
    const recordPath = path.join(dir, file.replace(/\.wav$/, '.json'));
    const record = fs.existsSync(recordPath) ? JSON.parse(fs.readFileSync(recordPath, 'utf8')) : null;
    const { sampleRate, channels } = decodeWav(fs.readFileSync(path.join(dir, file)));
    const perfSeconds = record?.durations?.performance;
    const perf = perfSeconds ? Math.min(channels[0].length, Math.round(perfSeconds * sampleRate)) : channels[0].length;
    const m = measurePcm(channels.map(c => c.subarray(0, perf)));
    const whole = measurePcm(channels);
    if (m.rms === 0) {
      skipped.push({ file, reason: 'silent performance window' });
      continue;
    }
    takes.push({ file, record, sampleRate, channels, rms: m.rms, peak: whole.peak });
  }
  if (!takes.length) return { target: null, takes: [], skipped };

  // Highest common RMS that a plain gain can reach without any peak passing the ceiling.
  const feasible = Math.min(...takes.map(t => t.rms * OUTPUT_CEILING / t.peak));
  const target = Math.min(10 ** (targetDbfs / 20), feasible);

  fs.mkdirSync(out, { recursive: true });
  const labels = shuffle(LABELS.slice(0, takes.length).split(''));
  const key = takes.map((t, i) => {
    const gain = target / t.rms;
    const label = labels[i];
    const channels = t.channels.map(c => c.map(v => v * gain));
    fs.writeFileSync(path.join(out, `${label}.wav`), Buffer.from(encodeWav(channels, t.sampleRate)));
    return {
      label, file: t.file, wall: t.record?.wall?.id ?? null, valid: t.record?.valid ?? null,
      gainDb: 20 * Math.log10(gain), rmsDbfs: dbfs(t.rms), matchedRmsDbfs: dbfs(target), matchedPeakDbfs: dbfs(t.peak * gain),
    };
  }).sort((a, b) => a.label.localeCompare(b.label));

  const result = { targetDbfs: dbfs(target), requestedDbfs: targetDbfs, ceilingDbfs: dbfs(OUTPUT_CEILING), method: 'RMS of the performance window, one constant gain per file', takes: key, skipped };
  fs.writeFileSync(path.join(out, 'key.json'), JSON.stringify(result, null, 2));
  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { out: { type: 'string' }, 'target-dbfs': { type: 'string', default: '-23' } },
  });
  if (!positionals[0]) {
    console.log('Usage: npm run match-takes -- <takes-dir> [--out <dir>] [--target-dbfs -23]');
    process.exit(1);
  }
  const r = matchTakes(positionals[0], { out: values.out, targetDbfs: Number(values['target-dbfs']) });
  if (!r.takes.length) {
    console.log('No usable takes found.');
    process.exit(1);
  }
  console.log(`Matched ${r.takes.length} takes at ${r.targetDbfs.toFixed(2)} dBFS RMS (requested ${r.requestedDbfs}).`);
  for (const t of r.takes) if (t.valid === false) console.log(`  note: ${t.file} was recorded outside the comparison conditions`);
  for (const s of r.skipped) console.log(`  skipped ${s.file}: ${s.reason}`);
  console.log('Labels are random; keep key.json away from listeners until answers are recorded.');
}
