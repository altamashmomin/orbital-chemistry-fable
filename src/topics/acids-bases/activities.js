// Predict → check the ladder → explain activities for the Acids and bases topic; reveal text reads the module.
import { equilibrium, pkaOf } from '../../chem/acidsBases.js';
import { PKA } from '../../chem/references/textbook.js';

const pow = (x) => `10^${x.toFixed(1)}`;

export const ACTIVITIES = [
  {
    id: 'phenol-vs-ethanol', item: 'phenol', title: 'Phenol or ethanol: which is the stronger acid?',
    prompt: 'Both have an O–H. One is about a million times more acidic than the other. Which, and why?',
    options: [{ id: 'ethanol', label: 'Ethanol: the alkyl group donates' }, { id: 'same', label: 'About the same: both are O–H' }, { id: 'phenol', label: 'Phenol: the ring delocalises the charge', correct: true }],
    reveal: () => `Phenol, pKa ${pkaOf('phenol')} against ${pkaOf('ethanol')}: ${pow(pkaOf('ethanol') - pkaOf('phenol'))} times more acidic. Phenoxide spreads its negative charge onto the ortho and para carbons of the ring; ethoxide has nowhere to put it. Resonance in the conjugate base is the single biggest factor on the ladder, and it is why a carboxylic acid (${pkaOf('aceticAcid')}) is stronger still.`,
    show: { item: 'phenol', invariant: 'resonance' },
  },
  {
    id: 'hydroxide-acetylene', item: 'acetylene', title: 'Will hydroxide deprotonate acetylene?',
    prompt: 'You want the acetylide anion as a nucleophile. Is sodium hydroxide a strong enough base?',
    options: [{ id: 'yes', label: 'Yes: hydroxide is a strong base' }, { id: 'no', label: 'No: water (15.7) lies below acetylene (25) on the ladder', correct: true }, { id: 'partly', label: 'Half of it, at equilibrium' }],
    reveal: () => { const e = equilibrium('acetylene', 'water'); return `No. The equilibrium HC≡CH + HO⁻ ⇌ HC≡C⁻ + H₂O lies on the side of the weaker acid: water (${pkaOf('water')}) is the stronger acid, so K = ${pow(e.logK)} and essentially no acetylide forms. Sodium amide works because NH₃ has pKa ≈ 38, above 25: the rule is that the base's conjugate acid must sit higher on the ladder than the acid you want to deprotonate.`; },
    show: { item: 'acetylene', invariant: 'amide' },
  },
  {
    id: 'hi-vs-hf', item: 'hydrogenIodide', title: 'HI or HF: which is the stronger acid?',
    prompt: 'Fluorine is the most electronegative element. Does that make HF the strongest hydrogen halide?',
    options: [{ id: 'hf', label: 'HF: fluorine pulls hardest' }, { id: 'hi', label: 'HI: iodide is large and polarisable', correct: true }, { id: 'equal', label: 'They are equal' }],
    reveal: () => `HI, by about ${pow(pkaOf('hydrogenFluoride') - pkaOf('hydrogenIodide'))}: pKa ${PKA.hydrogenIodide} against ${PKA.hydrogenFluoride}. Down a column size wins over electronegativity: a big iodide spreads its charge over a large volume and the H–I bond is weak, while fluoride is small, its charge concentrated and the H–F bond very strong. Across a row (C, N, O, F) electronegativity does win: HF ${PKA.hydrogenFluoride} < H₂O ${PKA.water} < HC≡CH ${PKA.acetylene}.`,
    show: { item: 'hydrogenIodide', invariant: 'size' },
  },
];

export const correctOption = (activity) => activity.options.find((o) => o.correct) || null;
