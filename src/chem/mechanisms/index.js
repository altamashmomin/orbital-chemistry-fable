// Mechanism directory. One import and one registerFamily(...) line per family, in tab order.
// Branch convention: a reaction branch adds its family module (mechanisms + predictor) and the
// two lines here, and touches nothing else in this file. MECHANISMS / MECHANISM_ORDER are the
// live, flattened registries the Reaction lab, the search index and the tests read.
import { registerFamily } from './families.js';
import { substitutionElimination, substitutionEliminationMechanisms } from './substitutionElimination.js';

registerFamily(substitutionElimination, substitutionEliminationMechanisms);

export { MECHANISMS, MECHANISM_ORDER, FAMILIES, FAMILY_ORDER, registerFamily, familyOf, listFamilies, validateFamily, defaultEnv, familyColor, createFamilyRegistry } from './families.js';

/** Index of the step currently "in progress" for a parameter t. */
export function stepIndexAt(mechanism, t) {
  let idx = 0;
  mechanism.steps.forEach((s, i) => { if (t >= s.t - 1e-6) idx = i; });
  return idx;
}

export { predict, SUBSTRATES, REAGENTS, SOLVENTS, TEMPERATURES, LEAVING_GROUPS } from './predictor.js';
