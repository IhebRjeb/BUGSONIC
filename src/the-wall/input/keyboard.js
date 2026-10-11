// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — keyboard shortcuts
// ---------------------------------------------------------------------------

import { selectByIndex } from '../wall/archive.js';
import { addBug } from '../bug/colony.js';
import { newWall } from '../wall/archive.js';

/**
 * Set up keyboard event handlers.
 * @param {{ toggleSound: function }} actions
 */
export function initKeyboard(actions) {
  addEventListener('keydown', (e) => {
    const n = +e.key;
    if (n >= 1 && n <= 9) {
      selectByIndex(n - 1);
    } else if (e.key === 'b') {
      addBug();
    } else if (e.key === 'n') {
      newWall();
    } else if (e.key === ' ') {
      e.preventDefault();
      actions.toggleSound();
    }
  });
}
