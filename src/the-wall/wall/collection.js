// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — the walls/ collection
// ---------------------------------------------------------------------------
// Photos in the repository's walls/ folder are bundled by Vite and loaded
// into the archive at start. walls/index.json sets their order and credits;
// photos missing from it are added after, by file name.
// ---------------------------------------------------------------------------

import catalogue from '../../../walls/index.json';
import { addWall, loadImage } from './archive.js';

const urls = import.meta.glob('../../../walls/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', { eager: true, import: 'default' });
const byFile = Object.fromEntries(Object.entries(urls).map(([path, url]) => [path.split('/').pop(), url]));

/**
 * Add every collection photo to the archive without selecting them.
 * @returns {Promise<{ walls: import('./Wall.js').Wall[], failed: string[] }>}
 */
export async function loadCollection() {
  const listed = catalogue.filter(e => byFile[e.file]);
  const known = new Set(listed.map(e => e.file));
  const entries = [...listed, ...Object.keys(byFile).sort().filter(f => !known.has(f)).map(file => ({ file }))];

  const images = await Promise.allSettled(entries.map(e => loadImage(byFile[e.file])));
  const walls = [];
  const failed = [];
  images.forEach((r, i) => {
    const e = entries[i];
    if (r.status !== 'fulfilled') { failed.push(e.file); return; }
    const title = [e.file, e.city, e.role, e.credit].filter(Boolean).join(' · ');
    walls.push(addWall(r.value, e.file, { select: false, title }));
  });
  return { walls, failed };
}
