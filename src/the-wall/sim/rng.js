// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — seeded randomness
// ---------------------------------------------------------------------------

/** mulberry32: small, fast, repeatable 32-bit generator returning [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Each bug gets its own stream, so adding a bug never changes the others.
export const rngFor = (seed, id) => mulberry32(seed ^ Math.imul(id + 1, 0x9E3779B1));
