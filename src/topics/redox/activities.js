// Predict → count → explain activities for the Redox topic; reveal text reads the module.
import { buildCouple, oxidationStates, speciesGraph, osText, overall } from '../../chem/redox.js';

const os = (sp, atom) => osText(oxidationStates(speciesGraph(sp)).get(atom).os);

export const ACTIVITIES = [
  {
    id: 'ethanol-which', item: 'ethanol', title: 'Ethanol to acetaldehyde: oxidation, reduction or neither?',
    prompt: 'CH₃CH₂OH becomes CH₃CHO. Nothing is added; two hydrogens leave.',
    options: [{ id: 'ox', label: 'Oxidation: the carbon loses two electrons', correct: true }, { id: 'red', label: 'Reduction: it lost hydrogens, so it gained electrons' }, { id: 'none', label: 'Neither: no oxygen was added' }],
    reveal: () => { const b = buildCouple('ethanol'); return `An oxidation. The carbinol carbon goes from ${os('ethanol', 'R1.C1')} to ${os('acetaldehyde', 'C')}: ${b.n} electrons lost, and the half-reaction reads ${b.acid.text}. Losing hydrogen from carbon is losing electrons, because carbon held the electrons of each C–H bond. "Adding oxygen" is only one of the ways to oxidise.`; },
    show: { item: 'ethanol', invariant: 'ladder' },
  },
  {
    id: 'sn2-electrons', item: 'substitution', title: 'How many electrons move when bromoethane becomes ethanol?',
    prompt: 'The SN2 reaction swaps Br for OH at the same carbon.',
    options: [{ id: 'zero', label: 'None: substitution is not redox', correct: true }, { id: 'two', label: 'Two: a C–Br bond broke' }, { id: 'one', label: 'One: bromide carries a charge' }],
    reveal: () => { const b = buildCouple('substitution'); return `None. The carbon has one bond to a more electronegative atom before (Br) and after (O): ${os('bromoethane', 'R1.C1')} both times, and the balanced equation ${b.acid.text} carries no e⁻ term. Charges on the nucleophile and leaving group are not oxidation states.`; },
    show: { item: 'substitution', invariant: 'none' },
  },
  {
    id: 'permanganate-count', item: 'permanganate', title: 'How many electrons does one MnO₄⁻ take on its way to Mn²⁺?',
    prompt: 'Purple permanganate in acid becomes the almost colourless Mn²⁺ ion.',
    options: [{ id: 'five', label: 'Five: +7 → +2', correct: true }, { id: 'seven', label: 'Seven: manganese is in group 7' }, { id: 'two', label: 'Two: the product has a 2+ charge' }],
    reveal: () => { const b = buildCouple('permanganate'); return `Five. Manganese is ${os('permanganate', 'Mn')} in MnO₄⁻ (four oxygens take every bond) and ${os('manganese2', 'Mn')} in Mn²⁺. The balanced half-reaction, ${b.acid.text}, needs eight protons to turn the four oxide ions into water; the electron count is the change in oxidation state, not the group number or the product charge.`; },
    show: { item: 'permanganate', invariant: 'five' },
  },
  {
    id: 'peroxide-both', item: 'peroxideOxidised', title: 'Why can hydrogen peroxide be both oxidised and reduced?',
    prompt: 'H₂O₂ bleaches (as an oxidant) and also reduces permanganate.',
    options: [{ id: 'middle', label: 'Its oxygen is at −1, between O₂ (0) and H₂O (−2)', correct: true }, { id: 'twoH', label: 'It has two hydrogens to give or take' }, { id: 'weak', label: 'The O–O bond is weak, so it reacts either way' }],
    reveal: () => { const up = buildCouple('peroxideOxidised'), down = buildCouple('peroxideReduced'); return `Oxygen at ${os('hydrogenPeroxide', 'O1')} can go up to 0 (${up.acid.text}) or down to −2 (${down.acid.text}). A species in the middle of its element\'s range can do both, and with itself: the two half-reactions add to ${overall('peroxideOxidised', 'peroxideReduced').text}, a disproportionation. Bond strength decides the rate, not the possibility.`; },
    show: { item: 'peroxideOxidised', invariant: 'dispro' },
  },
];

export const correctOption = (activity) => activity.options.find((o) => o.correct) || null;
