// Predict → look → explain activities for the Atomic orbitals topic; reveal text reads the module's values.
import { buildItem, electronConfiguration, HYBRIDS } from '../../chem/atomicOrbitals.js';
import { HYDROGEN_ENERGY, AUFBAU_EXCEPTIONS } from '../../chem/references/textbook.js';

export const ACTIVITIES = [
  {
    id: 'nodes-3s', item: '3s', title: 'How many nodes does 3s have?',
    prompt: 'The 3s orbital is a sphere like 1s, but bigger. How many surfaces inside it have ψ = 0, and what kind are they?',
    options: [{ id: 'none', label: 'None: s orbitals have no nodes' }, { id: 'one', label: 'One spherical node' }, { id: 'two', label: 'Two spherical (radial) nodes', correct: true }],
    reveal: () => { const b = buildItem('3s'); return `Two, both spheres: n − l − 1 = 3 − 0 − 1 = 2 radial nodes, at ${b.rdf.nodes.map((x) => x.toFixed(2)).join(' and ')} a₀ (the roots of R₃₀), and no angular node because l = 0. Three regions of alternating phase; tighten the contour to see them. Every orbital has n − 1 nodes in all, so 3p has one radial plus one angular and 3d two angular and none radial.`; },
    show: { item: '3s', invariant: 'nodes' },
  },
  {
    id: 'k-4s', item: 'configurations', title: 'Potassium: 4s or 3d?',
    prompt: 'Argon ends at 3p⁶. Where does the 19th electron of potassium go?',
    options: [{ id: '3d', label: '3d: it is the next shell-3 subshell' }, { id: '4s', label: '4s: it fills before 3d', correct: true }, { id: '4p', label: '4p' }],
    reveal: () => { const k = electronConfiguration(19), sc = electronConfiguration(21); return `4s. The aufbau order goes by n + l (then n): 4s has n + l = 4, 3d has 5, so potassium is ${k.nobleGasString} and calcium fills 4s², and only scandium starts 3d (${sc.nobleGasString}). In a many-electron atom the 4s electron penetrates the core enough to sit below 3d, although hydrogen itself has them in the opposite order. The exceptions are tabulated: ${AUFBAU_EXCEPTIONS.values[24].note}.`; },
    show: { item: 'configurations', Z: 19, invariant: 'aufbau' },
  },
  {
    id: 'sp3-s', item: 'sp3', title: 'How much s character does an sp³ hybrid have?',
    prompt: 'An sp³ carbon mixes its 2s with three 2p orbitals. What fraction of each hybrid is s, and what angle do two hybrids make?',
    options: [{ id: 'half', label: '50 %, 90°' }, { id: 'quarter', label: '25 %, 109.5°', correct: true }, { id: 'third', label: '33 %, 120°' }],
    reveal: () => { const b = buildItem('sp3'); return `One quarter: each hybrid is (2s ± 2pₓ ± 2pᵧ ± 2p𝓏)/2, so the s coefficient squared is ¼ and the three p coefficients share the other ¾. The four lobes point to the corners of a tetrahedron, arccos(−1/3) = ${b.hybrid.angle}°; the main lobes found on the drawn functions make ${b.angle.toFixed(1)}°. sp² keeps a third s (120°), sp a half (180°). Hydrogen's E_n = −${HYDROGEN_ENERGY.rydbergEV}/n² eV makes 2s and 2p degenerate, which is why mixing them costs nothing in this picture.`; },
    show: { item: 'sp3', invariant: 'mix' },
  },
];

export const correctOption = (activity) => activity.options.find((o) => o.correct) || null;
export { HYBRIDS };
