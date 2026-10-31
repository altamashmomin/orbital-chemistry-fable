// Predict → compute → explain activities for the Electrochemistry topic; reveal text reads the module.
import { cell, potentialOf, signed, sciText, minus } from '../../chem/electrochemistry.js';

export const ACTIVITIES = [
  {
    id: 'daniell-voltage', item: 'copper', title: 'What does the Daniell cell read?',
    prompt: 'Zinc in 1 M Zn²⁺, copper in 1 M Cu²⁺, a salt bridge and a voltmeter, 25 °C.',
    options: [{ id: 'sum', label: '−0.42 V: add the two potentials' }, { id: 'diff', label: '+1.10 V: cathode minus anode', correct: true }, { id: 'double', label: '+2.20 V: two electrons move' }],
    reveal: () => { const c = cell('zinc', 'copper'); return `+1.10 V. Copper (${signed(potentialOf('copper'))} V) is higher on the ladder, so it is reduced at the cathode and zinc (${signed(potentialOf('zinc'))} V) is oxidised at the anode: E° = ${signed(potentialOf('copper'))} − (${signed(potentialOf('zinc'))}) = ${signed(c.E0)} V. The two electrons appear in ΔG° = −nFE° = ${minus(c.dG0.toFixed(0))} kJ/mol and in K = ${sciText(c.log10K)}, not in the voltage.`; },
    show: { item: 'copper', invariant: 'daniell' },
  },
  {
    id: 'which-anode', item: 'nickel', title: 'A zinc strip and a copper strip each stand in a Ni²⁺ solution. Which one plates nickel?',
    prompt: 'Zn²⁺/Zn −0.76 V, Ni²⁺/Ni −0.23 V, Cu²⁺/Cu +0.34 V.',
    options: [{ id: 'zinc', label: 'Zinc: it lies below nickel, so it is the anode', correct: true }, { id: 'copper', label: 'Copper: it is the better conductor' }, { id: 'both', label: 'Both: any metal reduces a dissolved ion' }],
    reveal: () => { const z = cell('zinc', 'nickel'), c = cell('copper', 'nickel'); return `Zinc. Zn²⁺/Zn is below Ni²⁺/Ni, so zinc is oxidised and Ni²⁺ reduced: E° = ${signed(z.E0)} V, downhill. Copper is above nickel: the only cell copper and Ni²⁺ can make has copper as the cathode and Ni²⁺ cannot be reduced by it (as written the reverse would need ${signed(-c.E0)} V). A metal displaces only the ions of metals above it on the ladder.`; },
    show: { item: 'nickel', invariant: 'plating' },
  },
  {
    id: 'silver-coefficients', item: 'silver', title: 'Cu + 2 Ag⁺ → Cu²⁺ + 2 Ag uses two silver half-reactions. Is E° doubled?',
    prompt: 'E°(Ag⁺/Ag) = +0.80 V, E°(Cu²⁺/Cu) = +0.34 V.',
    options: [{ id: 'same', label: 'No: E° = 0.80 − 0.34 = 0.46 V whatever the coefficients', correct: true }, { id: 'double', label: 'Yes: 2 × 0.80 − 0.34 = 1.26 V' }, { id: 'half', label: 'It halves: the electrons are shared' }],
    reveal: () => { const c = cell('copper', 'silver'); return `No. A potential is an intensive quantity: ${c.notation} reads ${signed(c.E0)} V with one Ag⁺ or with two. What doubles is the extensive ΔG° = −nFE° = ${minus(c.dG0.toFixed(0))} kJ per mole of copper (n = ${c.n}), and ln K = nFE°/RT gives K = ${sciText(c.log10K)}.`; },
    show: { item: 'silver', invariant: 'coefficients' },
  },
  {
    id: 'dilution', item: 'zinc', title: 'Dilute the Cu²⁺ in a Daniell cell to 0.010 M. What happens to the voltage?',
    prompt: '[Zn²⁺] stays at 1 M; T = 298 K.',
    options: [{ id: 'drops', label: 'It drops by about 0.06 V', correct: true }, { id: 'same', label: 'Nothing: E° is a constant' }, { id: 'rises', label: 'It rises: less product means more driving force' }],
    reveal: () => { const c = cell('zinc', 'copper', { conc: { copper2: 0.01 } }); return `It drops to ${c.E.toFixed(2)} V. Cu²⁺ is a reactant of Zn + Cu²⁺ → Zn²⁺ + Cu, so Q = [Zn²⁺]/[Cu²⁺] = ${c.Q.toFixed(0)} and E = E° − (0.0592 / ${c.n}) log Q = ${signed(c.E0)} − ${(c.E0 - c.E).toFixed(3)} = ${signed(c.E)} V. E° is fixed; E follows the concentrations, and reaches zero when Q = K.`; },
    show: { item: 'zinc', invariant: 'nernst' },
  },
];

export const correctOption = (activity) => activity.options.find((o) => o.correct) || null;
