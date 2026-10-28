// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — WAV encoding (32-bit float) and decoding
// ---------------------------------------------------------------------------
// Pure: used by the browser for comparison takes and by tools/match-takes.js.
// ---------------------------------------------------------------------------

/** Interleave equal-length channels into a 32-bit float WAV file. */
export function encodeWav(channels, sampleRate) {
  const nch = channels.length;
  const frames = channels[0]?.length ?? 0;
  const dataBytes = frames * nch * 4;
  const buf = new ArrayBuffer(44 + dataBytes);
  const v = new DataView(buf);
  const tag = (o, s) => { for (let i = 0; i < 4; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  tag(0, 'RIFF');
  v.setUint32(4, 36 + dataBytes, true);
  tag(8, 'WAVE');
  tag(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 3, true);                  // IEEE float
  v.setUint16(22, nch, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * nch * 4, true);
  v.setUint16(32, nch * 4, true);
  v.setUint16(34, 32, true);
  tag(36, 'data');
  v.setUint32(40, dataBytes, true);
  let o = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < nch; c++, o += 4) v.setFloat32(o, channels[c][i], true);
  }
  return buf;
}

/** Decode a PCM (16/24/32-bit integer) or 32-bit float WAV into channels. */
export function decodeWav(bytes) {
  const v = new DataView(bytes.buffer ?? bytes, bytes.byteOffset ?? 0, bytes.byteLength);
  const str = (o) => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
  if (str(0) !== 'RIFF' || str(8) !== 'WAVE') throw new Error('not a WAV file');
  let fmt = null;
  for (let o = 12; o + 8 <= v.byteLength;) {
    const id = str(o);
    const size = v.getUint32(o + 4, true);
    const body = o + 8;
    if (id === 'fmt ') {
      fmt = { format: v.getUint16(body, true), channels: v.getUint16(body + 2, true), sampleRate: v.getUint32(body + 4, true), bits: v.getUint16(body + 14, true) };
      if (fmt.format === 0xFFFE) fmt.format = v.getUint16(body + 24, true);
    } else if (id === 'data') {
      if (!fmt) throw new Error('WAV data before format');
      const step = fmt.bits / 8;
      const frames = Math.floor(Math.min(size, v.byteLength - body) / (step * fmt.channels));
      const channels = Array.from({ length: fmt.channels }, () => new Float32Array(frames));
      const read = fmt.format === 3 && fmt.bits === 32 ? (p) => v.getFloat32(p, true)
        : fmt.format === 1 && fmt.bits === 16 ? (p) => v.getInt16(p, true) / 32768
        : fmt.format === 1 && fmt.bits === 24 ? (p) => ((v.getUint8(p) | (v.getUint8(p + 1) << 8) | (v.getInt8(p + 2) << 16))) / 8388608
        : fmt.format === 1 && fmt.bits === 32 ? (p) => v.getInt32(p, true) / 2147483648
        : null;
      if (!read) throw new Error(`unsupported WAV encoding (format ${fmt.format}, ${fmt.bits} bit)`);
      for (let i = 0, p = body; i < frames; i++) {
        for (let c = 0; c < fmt.channels; c++, p += step) channels[c][i] = read(p);
      }
      return { sampleRate: fmt.sampleRate, channels };
    }
    o = body + size + (size & 1);
  }
  throw new Error('WAV has no data chunk');
}
