import test from 'node:test';
import assert from 'node:assert/strict';
import dgram from 'node:dgram';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';
import { SCORE_VERSION, MAX_BUGS } from '../src/the-wall/config.js';
import * as protocol from '../src/the-wall/events/protocol.js';
import { deriveTuning } from '../src/the-wall/wall/tuning.js';
import { MAX_PAYLOAD, parse, toOsc } from '../tools/osc.js';
import { wall, ridges, analyse } from './fixtures.js';

// Minimal OSC 1.0 reader for i/f/s arguments.
function readOsc(buf) {
  let o = 0;
  const str = () => {
    const end = buf.indexOf(0, o);
    const v = buf.toString('utf8', o, end);
    o = (end + 4) & ~3;
    return v;
  };
  const address = str();
  const types = str().slice(1);
  const args = [...types].map((t) => {
    if (t === 's') return str();
    const v = t === 'i' ? buf.readInt32BE(o) : buf.readFloatBE(o);
    o += 4;
    return v;
  });
  return { address, types, args };
}

const bug = { id: 2, x: 240, y: 318, l: 0.42, g: 0.11, speed: 1.4, a: 7, flash: 0.35 };
const fixtureWall = () => {
  const a = analyse(wall(ridges));
  return { id: 'W-007', seed: a.seed, f: a.summary, T: deriveTuning(a.summary, a.hist, a.pulse) };
};

test('note event matches the v1 spec and its OSC translation', () => {
  const e = protocol.soundEvent({ id: 'W-003' }, bug, 'note', 261.63, 212);
  assert.deepEqual(Object.keys(e), ['v', 'kind', 't', 'wall', 'bug', 'type', 'freq', 'midi', 'brightness', 'edge', 'hue', 'x', 'y', 'nx', 'ny', 'pan', 'velocity']);
  assert.equal(e.v, 1);
  assert.equal(e.midi, 60);
  assert.equal(e.nx, 0.5);
  assert.equal(e.pan, 0);
  assert.deepEqual(parse(JSON.stringify(e)), e);
  const [osc] = toOsc(e).map(readOsc);
  assert.equal(osc.address, '/bugsonic/note');
  assert.equal(osc.types, 'ifffffffff');
  assert.equal(osc.args[0], 2);
  assert.ok(Math.abs(osc.args[1] - 261.6) < 1e-3);
});

test('crack event has no pitch and its own OSC address', () => {
  const e = protocol.soundEvent(null, bug, 'crack', 0, 10);
  assert.equal(e.freq, 0);
  assert.equal(e.midi, null);
  const [osc] = toOsc(parse(JSON.stringify(e))).map(readOsc);
  assert.equal(osc.address, '/bugsonic/crack');
  assert.equal(osc.types, 'ifffffff');
});

test('wall message carries score version, seed and tuning, within the payload limit', () => {
  const w = fixtureWall();
  const m = protocol.wallMessage(w);
  assert.equal(m.score, SCORE_VERSION);
  assert.match(m.seed, /^[0-9a-f]{8}$/);
  assert.equal(m.pulse.length, 16);
  const text = JSON.stringify(m);
  assert.ok(text.length < MAX_PAYLOAD);
  const [head, scale] = toOsc(parse(text)).map(readOsc);
  assert.deepEqual(head.args, ['W-007', w.T.edo, w.T.base, w.T.tempo, w.T.scale.length]);
  assert.equal(scale.address, '/bugsonic/scale');
  assert.deepEqual(scale.args, w.T.scale);
});

test('state message for a full colony stays small; one OSC packet per bug', () => {
  const bugs = Array.from({ length: MAX_BUGS }, (_, id) => ({ ...bug, id }));
  const m = protocol.stateMessage(bugs, 0.31);
  const text = JSON.stringify(m);
  assert.ok(text.length < MAX_PAYLOAD);
  const packets = toOsc(parse(text)).map(readOsc);
  assert.equal(packets.length, 1 + MAX_BUGS);
  assert.equal(packets[0].address, '/bugsonic/energy');
  assert.ok(m.bugs.every(b => b.heading >= 0 && b.heading < 2 * Math.PI));
});

test('invalid messages are rejected', () => {
  for (const bad of [
    'not json', 'null', '{"v":2,"kind":"event","type":"note"}', '{"v":1,"kind":"bridge"}',
    '{"v":1,"kind":"event","type":"boom"}', JSON.stringify({ v: 1, kind: 'wall', scale: Array(65).fill(0) }),
    JSON.stringify({ v: 1, kind: 'state', bugs: [null] }),
  ]) assert.equal(parse(bad), null, bad);
});

const freePort = async () => {
  const srv = net.createServer().listen(0, '127.0.0.1');
  await once(srv, 'listening');
  const { port } = srv.address();
  srv.close();
  return port;
};

const nextMessage = (ws, kind) => new Promise((resolve) => {
  ws.on('message', function onMsg(data) {
    const m = JSON.parse(data.toString());
    if (m.kind === kind) { ws.off('message', onMsg); resolve(m); }
  });
});

test('bridge: rebroadcasts valid messages to other clients and forwards OSC', { timeout: 10000 }, async (t) => {
  const udp = dgram.createSocket('udp4');
  udp.bind(0, '127.0.0.1');
  await once(udp, 'listening');
  const port = await freePort();
  const bridge = spawn(process.execPath, [
    fileURLToPath(new URL('../tools/bridge.js', import.meta.url)),
    '--port', String(port), '--osc-port', String(udp.address().port),
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => { bridge.kill(); udp.close(); });
  await new Promise((resolve) => bridge.stdout.on('data', d => String(d).includes('BUGSONIC bridge') && resolve()));

  const url = `ws://127.0.0.1:${port}`;
  const browser = new WebSocket(url, { origin: 'http://localhost:5173' });
  const listener = new WebSocket(url);
  await Promise.all([once(browser, 'open'), once(listener, 'open')]);
  t.after(() => { browser.close(); listener.close(); });

  const evil = new WebSocket(url, { origin: 'https://evil.example' });
  const [err] = await once(evil, 'error');
  assert.match(err.message, /401/);

  const e = protocol.soundEvent({ id: 'W-001' }, bug, 'note', 261.63, 212);
  const relayed = nextMessage(listener, 'event');
  const packet = once(udp, 'message');
  browser.send('{"v":1,"kind":"event","type":"boom"}');
  browser.send(JSON.stringify(e));
  assert.deepEqual(await relayed, e);
  const [buf] = await packet;
  assert.equal(readOsc(buf).address, '/bugsonic/note');
});
