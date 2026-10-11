// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — UI button handlers
// ---------------------------------------------------------------------------

import { toggle as toggleAudio } from '../audio/engine.js';
import { addBug } from '../bug/colony.js';
import { newWall, loadPhoto } from '../wall/archive.js';
import { connectWS, disconnectWS, isWSConnected } from '../events/emitter.js';

/**
 * Wire up all header buttons.
 * @param {{ go, more, newBtn, wsb, up }} els — button elements
 */
export function initControls(els) {
  const { go, more, newBtn, wsb, up } = els;

  // Sound toggle
  go.onclick = () => {
    const state = toggleAudio();
    go.classList.toggle('on', state === 'on');
    go.textContent = state === 'on' ? 'Sound on' : 'Start sound';
  };

  // Add bug
  more.onclick = () => addBug();

  // New generated wall
  newBtn.onclick = () => newWall();

  // WebSocket toggle
  wsb.onclick = () => {
    if (isWSConnected()) {
      disconnectWS();
      wsb.classList.remove('on');
      return;
    }
    const url = prompt('WebSocket URL (works when this file runs locally)', 'ws://localhost:9980');
    if (!url) return;
    const ok = connectWS(url);
    wsb.classList.toggle('on', ok);
  };

  // Photo upload
  up.onchange = (e) => {
    const f = e.target.files[0];
    if (f) loadPhoto(f);
  };

  // Return a toggleSound function for keyboard binding
  return {
    toggleSound: () => go.click(),
  };
}
