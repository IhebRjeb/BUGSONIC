// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — event emitter
// ---------------------------------------------------------------------------
// Every sound a bug makes emits a JSON event, displayed in the footer
// and optionally sent via WebSocket.
// ---------------------------------------------------------------------------

import { getCurrent } from '../wall/archive.js';

let evEl = null;
let sock = null;

/**
 * Initialise with DOM reference.
 */
export function init(opts) {
  evEl = opts.evEl;
}

/**
 * Emit a sound event.
 * @param {import('../bug/Bug.js').Bug} bug
 * @param {'note'|'crack'} type
 * @param {number} freq
 */
export function emit(bug, type, freq) {
  const cur = getCurrent();
  const e = {
    wall:       cur?.id ?? '?',
    bug:        bug.id,
    type,
    freq:       +freq.toFixed(1),
    brightness: +bug.l.toFixed(2),
    edge:       +bug.g.toFixed(2),
    x:          bug.x | 0,
    y:          bug.y | 0,
  };

  if (sock && sock.readyState === 1) {
    sock.send(JSON.stringify(e));
  }

  if (evEl) {
    evEl.textContent = JSON.stringify(e);
  }
}

// --- WebSocket management ---

export function connectWS(url) {
  try {
    sock = new WebSocket(url);
    sock.onopen  = () => {};
    sock.onerror = () => {
      if (evEl) evEl.textContent = 'websocket blocked or unreachable';
      sock = null;
    };
    return true;
  } catch {
    if (evEl) evEl.textContent = 'websocket failed';
    sock = null;
    return false;
  }
}

export function disconnectWS() {
  if (sock) { sock.close(); sock = null; }
}

export function isWSConnected() {
  return sock && sock.readyState === 1;
}
