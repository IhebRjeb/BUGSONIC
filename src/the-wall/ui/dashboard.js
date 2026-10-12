import { MAX_BUGS } from '../config.js';
import { getBugs } from '../bug/colony.js';
import { getWalls } from '../wall/archive.js';
import { isStarted } from '../audio/engine.js';
import { getStats, isLinkWanted } from '../events/emitter.js';
import { bridgeCommand, connectionHelp } from '../events/connection.js';

const UI_INTERVAL_MS = 80;
const SPECTRUM_BARS = 44;
const COLORS = { idle: '#a3a99d', low: '#1b1f1c', high: '#1c557d' };

const LINK_LABELS = { off: 'OFF', connecting: 'CONNECTING', live: 'LIVE', retrying: 'RETRYING', error: 'CHECK ADDRESS' };
const LINK_MESSAGES = {
  off: () => `Start the bridge on your computer with ${bridgeCommand()}, then connect.`,
  connecting: (d) => `Reaching ${d}…`,
  live: (d) => `Live on ${d}. Every encounter now leaves the browser.`,
  retrying: (d) => `Bridge unreachable. Trying again in ${d}s — disconnect to stop. ${connectionHelp()}`,
  error: (d) => d,
};

export function createDashboard() {
  const ids = ['wall-id', 'wall-count', 'tempo', 'edo', 'root', 'scale', 'bug-count', 'more',
    'colony-dots', 'surface-state', 'audio-state', 'go', 'sound-label', 'spectrum', 'fps', 'ev-rate',
    'link-state', 'connection-status', 'wsb', 'ws-url', 'ping', 'tx-count', 'listeners', 'osc-target', 'signal-log'];
  const els = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
  document.getElementById('bridge-command').textContent = bridgeCommand();
  els['connection-status'].textContent = LINK_MESSAGES.off();
  const spectrum = els.spectrum.getContext('2d');
  const dots = Array.from({ length: MAX_BUGS }, () => {
    const dot = document.createElement('span');
    dot.className = 'colony-dot';
    els['colony-dots'].appendChild(dot);
    return dot;
  });

  let lastUpdate = -Infinity;
  let lastCount = -1;
  let lastRunning = null;
  let linkState = 'off';
  let frames = 0;
  let fpsSince = 0;
  let rateSince = 0;
  let rateEvents = 0;
  let loggedEvents = 0;

  function select(wall) {
    els['wall-id'].textContent = wall.id;
    els['wall-count'].textContent = String(getWalls().length).padStart(2, '0');
    els.tempo.textContent = wall.T.tempo;
    els.edo.textContent = wall.T.edo;
    els.root.textContent = wall.T.base;
    els.scale.textContent = wall.T.scale.length;
  }

  function surfaceState() {
    const sound = isStarted() ? 'SOUND ON' : 'SILENT';
    const link = linkState === 'live' ? ' · LINK LIVE' : '';
    els['surface-state'].textContent = `WANDERING · ${sound}${link}`;
  }

  function setLink(state, detail = '') {
    linkState = state;
    const wanted = isLinkWanted();
    els['link-state'].textContent = LINK_LABELS[state];
    els['link-state'].dataset.state = state;
    els['connection-status'].textContent = LINK_MESSAGES[state](detail);
    els.wsb.textContent = wanted ? 'Disconnect' : 'Connect';
    els.wsb.setAttribute('aria-pressed', String(wanted));
    els['ws-url'].readOnly = wanted;
    els.ping.disabled = state !== 'live';
    surfaceState();
  }

  function renderLog(log) {
    const rows = log.map((e) => {
      const li = document.createElement('li');
      const cells = [
        e.t.toFixed(2),
        `B${e.bug}`,
        e.type.toUpperCase(),
        e.type === 'note' ? `${e.freq} Hz · m${e.midi}` : `hue ${e.hue}°`,
        `${e.nx.toFixed(2)} ${e.ny.toFixed(2)}`,
      ];
      for (const text of cells) {
        const span = document.createElement('span');
        span.textContent = text;
        li.appendChild(span);
      }
      li.dataset.type = e.type;
      return li;
    });
    els['signal-log'].replaceChildren(...rows);
  }

  function update(time, bands) {
    frames++;
    if (time - fpsSince >= 500) {
      els.fps.textContent = Math.round(frames * 1000 / (time - fpsSince));
      frames = 0;
      fpsSince = time;
    }
    if (time - lastUpdate < UI_INTERVAL_MS) return;
    lastUpdate = time;

    const stats = getStats();
    if (time - rateSince >= 1000) {
      els['ev-rate'].textContent = Math.round((stats.events - rateEvents) * 1000 / (time - rateSince));
      rateEvents = stats.events;
      rateSince = time;
    }
    if (stats.events !== loggedEvents) {
      loggedEvents = stats.events;
      renderLog(stats.log);
    }
    els['tx-count'].textContent = stats.sent;
    els.listeners.textContent = stats.listeners ?? '—';
    els['osc-target'].textContent = stats.osc ?? '—';

    const count = getBugs().length;
    if (count !== lastCount) {
      els['bug-count'].textContent = String(count).padStart(2, '0');
      els.more.disabled = count >= MAX_BUGS;
      dots.forEach((dot, i) => dot.classList.toggle('active', i < count));
      lastCount = count;
    }

    const running = isStarted();
    if (running !== lastRunning) {
      els.go.classList.toggle('on', running);
      els.go.setAttribute('aria-pressed', String(running));
      els['sound-label'].textContent = running ? 'Let it rest' : 'Wake the wall';
      els.go.querySelector('.play-icon').textContent = running ? 'Ⅱ' : '▶';
      els['audio-state'].textContent = running ? 'LISTENING' : 'STANDBY';
      lastRunning = running;
      surfaceState();
    }

    const { width, height } = els.spectrum;
    const step = width / SPECTRUM_BARS;
    spectrum.clearRect(0, 0, width, height);
    for (let i = 0; i < SPECTRUM_BARS; i++) {
      const value = bands ? bands[Math.floor(i * bands.length / SPECTRUM_BARS)] / 255 : 0;
      const h = Math.max(2, value * (height - 8));
      spectrum.fillStyle = value > .05 ? (i < SPECTRUM_BARS / 2 ? COLORS.low : COLORS.high) : COLORS.idle;
      spectrum.fillRect(i * step, height - h, step * .4, h);
    }
  }

  return { select, update, setLink };
}