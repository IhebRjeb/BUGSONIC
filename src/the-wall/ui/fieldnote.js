// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — field note (manifesto)
// ---------------------------------------------------------------------------
// The opening ritual: a notebook page over the live wall. Shown once on a
// first visit, then only when reopened. Waking the wall starts browser sound
// from the same click; entering silently (or Escape) leaves sound off.
// ---------------------------------------------------------------------------

import { reducedMotion } from './motion.js';

const SEEN_KEY = 'bugsonic.fieldNote.001';

const seen = () => {
  try { return localStorage.getItem(SEEN_KEY) === 'seen'; } catch { return false; }
};
const remember = () => {
  try { localStorage.setItem(SEEN_KEY, 'seen'); } catch { /* private mode: show again next time */ }
};

/**
 * @param {{ dialog: HTMLDialogElement, wake: HTMLButtonElement, silent: HTMLButtonElement,
 *           reopen: HTMLButtonElement, soundOn: () => boolean, startSound: () => void }} els
 */
export function initFieldNote({ dialog, wake, silent, reopen, soundOn, startSound }) {
  function open() {
    if (dialog.open) return;
    wake.querySelector('.note-wake-label').textContent = soundOn() ? 'Return to the wall' : 'Wake the wall';
    dialog.classList.remove('closing');
    dialog.showModal();
    const page = dialog.querySelector('.note-page');
    page.focus({ preventScroll: true });
    page.scrollTop = 0;
  }

  function close() {
    if (!dialog.open || dialog.classList.contains('closing')) return;
    remember();
    dialog.classList.add('closing');
    const folding = reducedMotion() ? [] : dialog.getAnimations({ subtree: true }).filter(a => a.animationName === 'fold');
    if (!folding.length) {
      dialog.close();
      return;
    }
    // Animations do not advance in hidden tabs: never let the fold block closing.
    const settle = new Promise(r => setTimeout(r, 700));
    Promise.race([Promise.allSettled(folding.map(a => a.finished)), settle]).then(() => dialog.close());
  }

  wake.onclick = () => {
    if (!soundOn()) startSound();
    close();
  };
  silent.onclick = close;
  reopen.onclick = open;
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });
  dialog.addEventListener('close', () => dialog.classList.remove('closing'));

  if (!seen()) open();
  return { open };
}
