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
  const page = dialog.querySelector('.note-page');
  const read = dialog.querySelector('#note-read');
  const source = dialog.querySelector('#note-source');
  const typeset = dialog.querySelector('#note-typeset');
  const original = dialog.querySelector('#note-original');
  const zoom = dialog.querySelector('#note-zoom');
  const viewer = dialog.querySelector('#note-scan-view');
  const turn = dialog.querySelector('#note-turn');
  // Vite rewrites img.src in HTML, but not ordinary anchor href attributes.
  dialog.querySelector('#note-full-image').href = viewer.querySelector('img').src;

  function setZoom(enlarged) {
    viewer.classList.toggle('is-zoomed', enlarged);
    zoom.setAttribute('aria-pressed', String(enlarged));
    zoom.textContent = enlarged ? 'Fit whole page −' : 'Enlarge scan ＋';
    viewer.scrollTop = 0;
    viewer.scrollLeft = 0;
  }

  function showSource(show) {
    typeset.hidden = show;
    original.hidden = !show;
    // Load on explicit request, even if a hidden tab delays lazy-load observers.
    if (show) viewer.querySelector('img').loading = 'eager';
    read.setAttribute('aria-pressed', String(!show));
    source.setAttribute('aria-pressed', String(show));
    turn.textContent = show ? '← back to the manifesto' : 'turn the page →';
    turn.setAttribute('aria-label', show ? 'Turn the page back to the manifesto' : 'Turn the page to the original scan');
    setZoom(false);
    page.scrollTop = 0;
  }

  read.onclick = () => showSource(false);
  source.onclick = () => showSource(true);
  turn.onclick = () => showSource(original.hidden);
  zoom.onclick = () => setZoom(zoom.getAttribute('aria-pressed') !== 'true');

  function open() {
    if (dialog.open) return;
    showSource(false);
    wake.querySelector('.note-wake-label').textContent = soundOn() ? 'Return to the wall' : 'Wake the wall';
    dialog.classList.remove('closing');
    dialog.showModal();
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
