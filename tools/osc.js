// ---------------------------------------------------------------------------
// BUGSONIC bridge — protocol-v1 validation and OSC 1.0 encoding (pure)
// ---------------------------------------------------------------------------

export const MAX_PAYLOAD = 16 * 1024;
const KINDS = new Set(['hello', 'event', 'wall', 'state', 'ping']);

function oscString(s) {
  const b = Buffer.from(`${s}\0`);
  return Buffer.concat([b, Buffer.alloc((4 - (b.length % 4)) % 4)]);
}

/** OSC 1.0 message with int32 'i', float32 'f' and string 's' arguments. */
export function oscMessage(address, args) {
  const parts = [oscString(address), oscString(`,${args.map(a => a[0]).join('')}`)];
  for (const [type, value] of args) {
    if (type === 's') {
      parts.push(oscString(value));
      continue;
    }
    const b = Buffer.alloc(4);
    if (type === 'i') b.writeInt32BE(value | 0);
    else b.writeFloatBE(Number.isFinite(value) ? value : 0);
    parts.push(b);
  }
  return Buffer.concat(parts);
}

const f = (v) => ['f', Number(v) || 0];
const i = (v) => ['i', Number(v) | 0];
const s = (v) => ['s', String(v ?? '').slice(0, 32)];

/** OSC packets for one protocol message (see docs/EVENT_SPEC.md). */
export function toOsc(m) {
  switch (m.kind) {
    case 'event':
      return m.type === 'note'
        ? [oscMessage('/bugsonic/note', [i(m.bug), f(m.freq), f(m.midi), f(m.brightness), f(m.edge), f(m.hue), f(m.nx), f(m.ny), f(m.pan), f(m.velocity)])]
        : [oscMessage('/bugsonic/crack', [i(m.bug), f(m.brightness), f(m.edge), f(m.hue), f(m.nx), f(m.ny), f(m.pan), f(m.velocity)])];
    case 'wall':
      return [
        oscMessage('/bugsonic/wall', [s(m.wall), i(m.edo), f(m.root), f(m.tempo), i(m.scale.length)]),
        oscMessage('/bugsonic/scale', m.scale.map(i)),
      ];
    case 'state':
      return [
        oscMessage('/bugsonic/energy', [f(m.energy)]),
        ...m.bugs.map(b => oscMessage('/bugsonic/bug', [i(b.id), f(b.nx), f(b.ny), f(b.heading), f(b.flash)])),
      ];
    case 'ping':
      return [oscMessage('/bugsonic/ping', [f(m.t)])];
    case 'hello':
      return [oscMessage('/bugsonic/hello', [s(m.source)])];
    default:
      return [];
  }
}

/** Parse a text frame; returns the message, or null if it is not valid protocol v1. */
export function parse(data) {
  let m;
  try { m = JSON.parse(data); } catch { return null; }
  if (!m || typeof m !== 'object' || m.v !== 1 || !KINDS.has(m.kind)) return null;
  if (m.kind === 'event' && m.type !== 'note' && m.type !== 'crack') return null;
  if (m.kind === 'wall' && (!Array.isArray(m.scale) || m.scale.length > 64)) return null;
  if (m.kind === 'state' && (!Array.isArray(m.bugs) || m.bugs.length > 32 ||
      !m.bugs.every(b => b && typeof b === 'object'))) return null;
  return m;
}
