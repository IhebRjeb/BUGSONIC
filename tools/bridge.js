#!/usr/bin/env node
// ---------------------------------------------------------------------------
// BUGSONIC bridge — WebSocket hub + OSC/UDP forwarder
// ---------------------------------------------------------------------------
// The browser connects as a client and sends protocol-v1 JSON. Every valid
// message is rebroadcast to the other WebSocket clients (TouchDesigner,
// Hydra, …) and translated to OSC on UDP. See docs/EVENT_SPEC.md.
//
//   npm run bridge -- [--port 9980] [--osc-host 127.0.0.1] [--osc-port 7000]
//                     [--no-osc] [--allow-origin https://hydra.ojack.xyz] [--verbose]
// ---------------------------------------------------------------------------

import dgram from 'node:dgram';
import { parseArgs } from 'node:util';
import { WebSocketServer, WebSocket } from 'ws';

const { values: opts } = parseArgs({
  options: {
    host:           { type: 'string',  default: '127.0.0.1' },
    port:           { type: 'string',  default: '9980' },
    'osc-host':     { type: 'string',  default: '127.0.0.1' },
    'osc-port':     { type: 'string',  default: '7000' },
    'no-osc':       { type: 'boolean', default: false },
    'allow-origin': { type: 'string',  multiple: true, default: [] },
    verbose:        { type: 'boolean', default: false },
    help:           { type: 'boolean', short: 'h', default: false },
  },
});

if (opts.help) {
  console.log('Usage: npm run bridge -- [--port 9980] [--osc-host 127.0.0.1] [--osc-port 7000] [--no-osc] [--allow-origin <origin>] [--verbose]');
  process.exit(0);
}

function toPort(value, name) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    console.error(`Invalid ${name}: ${value}`);
    process.exit(1);
  }
  return n;
}

const WS_PORT  = toPort(opts.port, '--port');
const OSC_PORT = toPort(opts['osc-port'], '--osc-port');
const OSC_HOST = opts['osc-host'];
const OSC_ON   = !opts['no-osc'];
const OSC_LABEL = OSC_ON ? `${OSC_HOST}:${OSC_PORT}` : 'off';
const MAX_PAYLOAD = 16 * 1024;
const KINDS = new Set(['hello', 'event', 'wall', 'state', 'ping']);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
const allowedOrigins = new Set(opts['allow-origin']);

// --- OSC encoding (OSC 1.0: int32 'i', float32 'f', string 's') ---

function oscString(s) {
  const b = Buffer.from(`${s}\0`);
  return Buffer.concat([b, Buffer.alloc((4 - (b.length % 4)) % 4)]);
}

function oscMessage(address, args) {
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

function toOsc(m) {
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

// --- Validation ---

function parse(data) {
  let m;
  try { m = JSON.parse(data); } catch { return null; }
  if (!m || typeof m !== 'object' || m.v !== 1 || !KINDS.has(m.kind)) return null;
  if (m.kind === 'event' && m.type !== 'note' && m.type !== 'crack') return null;
  if (m.kind === 'wall' && (!Array.isArray(m.scale) || m.scale.length > 64)) return null;
  if (m.kind === 'state' && (!Array.isArray(m.bugs) || m.bugs.length > 32 ||
      !m.bugs.every(b => b && typeof b === 'object'))) return null;
  return m;
}

function originAllowed(origin) {
  if (!origin) return true;                        // native clients (TouchDesigner, Max, scripts)
  if (allowedOrigins.has(origin)) return true;
  try {
    return LOCAL_HOSTS.has(new URL(origin).hostname);
  } catch {
    return false;                                  // includes the opaque "null" origin
  }
}

// --- Servers ---

const udp = OSC_ON ? dgram.createSocket('udp4') : null;
udp?.on('error', (err) => console.error(`OSC error: ${err.message}`));

const wss = new WebSocketServer({
  host: opts.host,
  port: WS_PORT,
  maxPayload: MAX_PAYLOAD,
  verifyClient: ({ origin }) => {
    const ok = originAllowed(origin);
    if (!ok) console.warn(`✕ rejected origin ${origin} (use --allow-origin to permit it)`);
    return ok;
  },
});

const counters = { messages: 0, rejected: 0, lastReport: 0 };

function announce() {
  const info = JSON.stringify({ v: 1, kind: 'bridge', clients: wss.clients.size, osc: OSC_LABEL });
  for (const c of wss.clients) if (c.readyState === WebSocket.OPEN) c.send(info);
}

wss.on('connection', (ws, req) => {
  const who = req.headers.origin ?? `native ${req.socket.remoteAddress}`;
  console.log(`+ client (${who}) · ${wss.clients.size} connected`);
  announce();

  ws.on('message', (data, isBinary) => {
    const m = isBinary ? null : parse(data.toString());
    if (!m) {
      counters.rejected++;
      return;
    }
    counters.messages++;
    if (opts.verbose) console.log(m.kind, m.type ?? '', m.bug ?? '');

    const out = JSON.stringify(m);
    for (const c of wss.clients) {
      if (c !== ws && c.readyState === WebSocket.OPEN) c.send(out);
    }
    if (udp) for (const packet of toOsc(m)) udp.send(packet, OSC_PORT, OSC_HOST);
  });

  ws.on('close', () => {
    console.log(`− client (${who}) · ${wss.clients.size} connected`);
    announce();
  });
  ws.on('error', (err) => console.error(`client error: ${err.message}`));
});

wss.on('listening', () => {
  console.log('BUGSONIC bridge');
  console.log(`  websocket  ws://${opts.host}:${WS_PORT}`);
  console.log(`  osc out    ${OSC_ON ? `udp://${OSC_LABEL}` : 'off'}`);
  if (allowedOrigins.size) console.log(`  origins    localhost + ${[...allowedOrigins].join(', ')}`);
});

wss.on('error', (err) => {
  console.error(err.code === 'EADDRINUSE'
    ? `Port ${WS_PORT} is already in use. Try --port 9981.`
    : `Bridge error: ${err.message}`);
  process.exit(1);
});

const report = setInterval(() => {
  if (counters.messages === counters.lastReport) return;
  const rate = ((counters.messages - counters.lastReport) / 5).toFixed(1);
  counters.lastReport = counters.messages;
  console.log(`↗ ${counters.messages} msgs (${rate}/s) · ${wss.clients.size} clients · ${counters.rejected} rejected`);
}, 5000);

function shutdown() {
  clearInterval(report);
  for (const c of wss.clients) c.close(1001, 'bridge stopping');
  wss.close(() => {
    udp?.close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
