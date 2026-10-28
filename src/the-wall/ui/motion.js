// Reduced motion is a presentation policy: simulation, score and sampling are unchanged.
const query = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

export const reducedMotion = () => !!query?.matches;
