import { sn2 } from './sn2.js';
import { sn1 } from './sn1.js';
import { e2 } from './e2.js';
import { e1 } from './e1.js';

export const MECHANISMS = { sn2, sn1, e2, e1 };
export const MECHANISM_ORDER = ['sn2', 'sn1', 'e2', 'e1'];

/** Index of the step currently "in progress" for a parameter t. */
export function stepIndexAt(mechanism, t) {
  let idx = 0;
  mechanism.steps.forEach((s, i) => { if (t >= s.t - 1e-6) idx = i; });
  return idx;
}

export { predict, SUBSTRATES, REAGENTS, SOLVENTS, TEMPERATURES, LEAVING_GROUPS } from './predictor.js';
