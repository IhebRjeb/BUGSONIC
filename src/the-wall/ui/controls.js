// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — UI button handlers
// ---------------------------------------------------------------------------

import { toggle as toggleAudio, setLevel } from '../audio/engine.js';
import { setLayer } from '../audio/synth.js';
import { setFeedback } from '../feedback/loop.js';
import { setInspect } from './inspect.js';
import { addBug } from '../bug/colony.js';
import { newWall, loadPhoto } from '../wall/archive.js';
import { connect, disconnect, isLinkWanted, ping as sendPing, setStateStream } from '../events/emitter.js';

/**
 * Wire up all header buttons.
 * @param {{ go, more, newBtn, wsb, up }} els — button elements
 * @param {() => void} restart — replay the current wall from its seed
 */
export function initControls(els, restart) {
  const { go, more, newBtn, wsb, up, volume, volumeValue, focus, uploadStatus, wsUrl, ping, stream } = els;

  // Comparison: layers, feedback, inspection, restart
  els.noteLayer.onchange = () => setLayer('note', els.noteLayer.checked);
  els.crackLayer.onchange = () => setLayer('crack', els.crackLayer.checked);
  els.feedback.onchange = () => setFeedback(els.feedback.checked);
  els.inspect.onchange = () => setInspect(els.inspect.checked);
  els.restart.onclick = restart;
  for (const el of [els.noteLayer, els.crackLayer, els.feedback, els.inspect]) el.onchange();

  // Sound toggle
  go.onclick = async () => {
    go.disabled = true;
    try {
      await toggleAudio();
    } catch {
      uploadStatus.textContent = 'Browser sound could not start (it needs AudioWorklet for output protection). External out still works.';
    } finally {
      go.disabled = false;
    }
  };

  volume.oninput = () => {
    setLevel(Number(volume.value) / 100);
    volumeValue.textContent = `${volume.value}%`;
  };
  volume.oninput();

  const toggleFocus = () => {
    const active = document.body.classList.toggle('focus-mode');
    focus.setAttribute('aria-pressed', String(active));
    focus.textContent = active ? 'Return to instrument ↙' : 'Focus view ↗';
  };
  focus.onclick = toggleFocus;

  // Add bug
  more.onclick = () => addBug();

  // New generated wall
  newBtn.onclick = () => newWall();

  // External link
  wsb.onclick = () => {
    if (isLinkWanted()) {
      disconnect();
      return;
    }
    if (!connect(wsUrl.value)) wsUrl.focus();
  };
  wsUrl.onkeydown = (e) => {
    if (e.key === 'Enter' && !isLinkWanted()) wsb.click();
  };
  ping.onclick = () => sendPing();
  stream.onchange = () => setStateStream(stream.checked);
  setStateStream(stream.checked);

  // Photo upload
  up.onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    up.disabled = true;
    uploadStatus.textContent = 'Reading the surface…';
    try {
      await loadPhoto(f);
      uploadStatus.textContent = `${f.name} is now a playable surface. Saved for this session only.`;
    } catch {
      uploadStatus.textContent = 'This image could not be read. Try a JPG, PNG or WebP.';
    } finally {
      up.disabled = false;
      up.value = '';
    }
  };

  // Return a toggleSound function for keyboard binding
  return {
    toggleSound: () => go.click(),
    restart,
    exitFocus: () => {
      if (document.body.classList.contains('focus-mode')) toggleFocus();
    },
  };
}
