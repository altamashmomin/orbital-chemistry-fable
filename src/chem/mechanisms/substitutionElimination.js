// The first mechanism family: SN2 / SN1 / E2 / E1 with the textbook environment predictor.
import { sn2 } from './sn2.js';
import { sn1 } from './sn1.js';
import { e2 } from './e2.js';
import { e1 } from './e1.js';
import { predict, SUBSTRATES, REAGENTS, SOLVENTS, TEMPERATURES, LEAVING_GROUPS } from './predictor.js';

export const substitutionEliminationMechanisms = { sn2, sn1, e2, e1 };

export const substitutionElimination = {
  id: 'substitution-elimination',
  title: 'Substitution & elimination',
  summary: 'SN2, SN1, E2 and E1 at an sp³ carbon bearing a leaving group: the four ways a nucleophile or base can react with an alkyl halide.',
  mechanisms: ['sn2', 'sn1', 'e2', 'e1'],
  predictor: {
    title: 'Which mechanism will my reaction follow?',
    hint: 'Set the conditions from your homework problem. The predictor applies the standard decision table and explains each factor.',
    options: [
      { key: 'substrate', label: 'Substrate', choices: SUBSTRATES, default: 'secondary' },
      { key: 'reagent', label: 'Nucleophile / base', choices: REAGENTS, default: 'strongNuStrongBase' },
      { key: 'solvent', label: 'Solvent', choices: SOLVENTS, default: 'polarProtic' },
      { key: 'temperature', label: 'Temperature', choices: TEMPERATURES, default: 'low' },
      { key: 'leavingGroup', label: 'Leaving group', choices: LEAVING_GROUPS, default: 'good' },
      { key: 'allylicBenzylic', label: 'Allylic or benzylic carbon', kind: 'toggle', default: false },
    ],
    predict,
    colors: { sn2: '#38bdf8', sn1: '#a78bfa', e2: '#34d399', e1: '#fbbf24' },
  },
};
