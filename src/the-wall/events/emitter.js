// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — external link
// ---------------------------------------------------------------------------
// Sends protocol-v1 messages over one WebSocket (usually the local bridge,
// which fans them out to TouchDesigner, Hydra and OSC). Reconnects on loss.
// ---------------------------------------------------------------------------

import { getCurrent } from '../wall/archive.js';
import { getBugs } from '../bug/colony.js';
import { rgbAt } from '../wall/analysis.js';
import * as protocol from './protocol.js';

const STATE_INTERVAL_MS = 100;
const MAX_BUFFERED_BYTES = 64 * 1024;
const RETRY_MIN_MS = 1000;
const RETRY_MAX_MS = 8000;
const LOG_LENGTH = 6;

let sock = null;
let url = '';
let wanted = false;
let retryTimer = 0;
let retryDelay = RETRY_MIN_MS;
let streamState = false;
let lastStateAt = -Infinity;
let onStatus = () => {};

const stats = { events: 0, sent: 0, dropped: 0, listeners: null, osc: null, log: [] };

/**
 * @param {{ onStatus?: (state: 'off'|'connecting'|'live'|'retrying'|'error', detail?: string) => void }} opts
 */
export function init(opts = {}) {
  onStatus = opts.onStatus ?? onStatus;
}

function send(msg, droppable = false) {
  if (sock?.readyState !== WebSocket.OPEN) return false;
  if (droppable && sock.bufferedAmount > MAX_BUFFERED_BYTES) {
    stats.dropped++;
    return false;
  }
  sock.send(JSON.stringify(msg));
  stats.sent++;
  return true;
}

/**
 * Called by a bug on every encounter, whether or not browser sound is on.
 */
export function emit(bug, type, freq) {
  const hue = protocol.rgbToHue(...rgbAt(bug.x, bug.y));
  const e = protocol.soundEvent(getCurrent(), bug, type, freq, hue);
  stats.events++;
  stats.log.unshift(e);
  if (stats.log.length > LOG_LENGTH) stats.log.length = LOG_LENGTH;
  send(e);
}

export function emitWall(wall) {
  if (wall?.T) send(protocol.wallMessage(wall));
}

export function emitState(time, energy) {
  if (!streamState || time - lastStateAt < STATE_INTERVAL_MS) return;
  lastStateAt = time;
  send(protocol.stateMessage(getBugs(), energy), true);
}

export function ping() {
  return send(protocol.ping());
}

export function setStateStream(on) {
  streamState = !!on;
}

// --- Connection lifecycle ---

function readBridgeInfo(data) {
  if (typeof data !== 'string' || data.length > 4096) return;
  let msg;
  try { msg = JSON.parse(data); } catch { return; }
  if (msg?.kind !== 'bridge') return;
  stats.listeners = Number.isInteger(msg.clients) ? Math.max(0, msg.clients - 1) : null;
  stats.osc = typeof msg.osc === 'string' ? msg.osc.slice(0, 64) : null;
}

function open() {
  clearTimeout(retryTimer);
  let next;
  try {
    next = new WebSocket(url);
  } catch {
    wanted = false;
    onStatus('error', 'The browser blocked this address. HTTPS pages need wss://.');
    return;
  }
  sock = next;
  onStatus('connecting', url);

  next.onopen = () => {
    if (sock !== next) return;
    retryDelay = RETRY_MIN_MS;
    send(protocol.hello());
    emitWall(getCurrent());
    onStatus('live', url);
  };
  next.onmessage = (m) => {
    if (sock === next) readBridgeInfo(m.data);
  };
  next.onclose = () => {
    if (sock !== next) return;
    sock = null;
    stats.listeners = stats.osc = null;
    if (!wanted) {
      onStatus('off');
      return;
    }
    const wait = retryDelay;
    retryDelay = Math.min(RETRY_MAX_MS, retryDelay * 2);
    retryTimer = setTimeout(open, wait);
    onStatus('retrying', String(Math.round(wait / 1000)));
  };
}

function closeSilently() {
  const previous = sock;
  sock = null;
  previous?.close();
}

/**
 * Start (or restart) the link. Returns false if the address is invalid.
 */
export function connect(address) {
  const value = String(address).trim();
  if (!/^wss?:\/\/[^\s]+$/i.test(value)) {
    onStatus('error', 'Enter a ws:// or wss:// address.');
    return false;
  }
  closeSilently();
  url = value;
  wanted = true;
  retryDelay = RETRY_MIN_MS;
  open();
  return true;
}

export function disconnect() {
  wanted = false;
  clearTimeout(retryTimer);
  closeSilently();
  stats.listeners = stats.osc = null;
  onStatus('off');
}

export function isExternalActive() { return sock?.readyState === WebSocket.OPEN; }
export function isLinkWanted()     { return wanted; }
export function getStats()         { return stats; }
