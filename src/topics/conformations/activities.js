// Predict → turn → explain activities for the Conformations topic; reveal text quotes the model's values.
import { torsionEnergy } from '../../chem/conformations.js';
import { equatorialFraction, cyclohexaneFrame, chairEnergy } from '../../chem/cyclohexane.js';
import { TORSION_ENERGIES, A_VALUES, RING_CONFORMER_ENERGIES, DIAXIAL_PAIRS } from '../../chem/references/textbook.js';

const kJ = (x) => `${x.toFixed(x % 1 ? 1 : 0)} kJ/mol`;

export const ACTIVITIES = [
  {
    id: 'ethane-low', rotor: 'ethane', title: 'Staggered or eclipsed?',
    prompt: 'Turn ethane about its C–C bond. Which arrangement of the hydrogens is lowest in energy, and by how much does the other one cost?',
    options: [{ id: 'eclipsed', label: 'Eclipsed is lowest' }, { id: 'same', label: 'They are equal' }, { id: 'staggered', label: 'Staggered, by about 12 kJ/mol', correct: true }],
    reveal: () => `Staggered, and the eclipsed form sits ${kJ(torsionEnergy('ethane', 0) - torsionEnergy('ethane', 60))} above it. The curve repeats every 120° because the three hydrogens on each carbon are identical. The barrier is small: at room temperature ethane spins through it billions of times a second, so "conformation" means a preference, not a fixed shape. (${TORSION_ENERGIES.ethane.source}.)`,
    show: { rotor: 'ethane', landmark: 'eclipsed' },
  },
  {
    id: 'butane-anti', rotor: 'butane', title: 'Anti or gauche?',
    prompt: 'Look down the C2–C3 bond of butane. The two methyl groups can be 180° apart (anti) or 60° apart (gauche). Both are staggered. Which is lower, and by roughly how much?',
    options: [{ id: 'gauche', label: 'Gauche, the methyls attract' }, { id: 'equal', label: 'Equal, both are staggered' }, { id: 'anti', label: 'Anti, by about 4 kJ/mol', correct: true }],
    reveal: () => `Anti, by ${kJ(torsionEnergy('butane', 60) - torsionEnergy('butane', 180))}. Both are staggered, so the difference is not eclipsing: in the gauche form the two methyl groups are close enough to crowd each other (a steric strain). The CH₃/CH₃-eclipsed form at 0° costs ${kJ(torsionEnergy('butane', 0))}, the CH₃/H-eclipsed forms at 120° and 240° ${kJ(torsionEnergy('butane', 120))}. (${TORSION_ENERGIES.butane.source}.)`,
    show: { rotor: 'butane', landmark: 'gauche' },
  },
  {
    id: 'e2-angle', rotor: 'bromobutane', title: 'Where can the base pull the hydrogen?',
    prompt: 'E2 removes a β-hydrogen as bromide leaves in the same step. At which Br–C–C–H dihedral does the reaction happen?',
    options: [{ id: '60', label: 'Any staggered position (60°)' }, { id: '0', label: 'Only when eclipsed (0°)' }, { id: '180', label: 'Anti-periplanar (180°)', correct: true }],
    reveal: () => 'Anti-periplanar, 180°. The electrons of the breaking C–H bond must flow into the empty σ* orbital of the C–Br bond, which points along the same line behind bromine: only the anti arrangement lines the two up without crowding. That is why E2 has a stereochemical outcome at all, and why the Reaction lab starts its E2 with this exact dihedral.',
    show: { rotor: 'bromobutane', landmark: 'anti' },
  },
  {
    id: 'chair-prefer', rotor: 'cyclohexane', title: 'Which chair does methylcyclohexane prefer?',
    prompt: 'Methylcyclohexane flips between two chairs: methyl axial and methyl equatorial. Which one dominates at room temperature, and by how much?',
    options: [{ id: 'axial', label: 'Axial: it is further from the ring' }, { id: 'equal', label: 'Equal: both are chairs' }, { id: 'equatorial', label: 'Equatorial, by about 7 kJ/mol', correct: true }],
    reveal: () => `Equatorial. The A-value of methyl is ${A_VALUES.values.methyl.kJ} kJ/mol (${A_VALUES.values.methyl.kcal} kcal/mol), which puts ${Math.round(equatorialFraction(A_VALUES.values.methyl.kJ) * 100)} % of the molecules in the equatorial chair at 25 °C. Flip the ring and watch the methyl move from parallel to the axis, over the C3 and C5 axial hydrogens, to the rim. (${A_VALUES.source}.)`,
    show: { rotor: 'cyclohexane', form: 'equatorial', substituent: 'methyl', second: null },
  },
  {
    id: 'diaxial-gauche', rotor: 'cyclohexane', title: 'Where does the methyl A-value come from?',
    prompt: 'An axial methyl costs about 7 kJ/mol. Which earlier number is it made of?',
    options: [{ id: 'eclipse', label: 'One eclipsed C–C bond (≈ 12 kJ/mol)' }, { id: 'gauche', label: 'Two gauche-butane interactions (2 × 3.8 kJ/mol)', correct: true }, { id: 'stretch', label: 'Stretched ring bonds' }],
    reveal: () => `Two gauche-butane interactions. Look down the C1–C2 bond of the axial chair: the methyl is gauche to C3, and down C1–C6 it is gauche to C5, exactly the arrangement that costs ${TORSION_ENERGIES.butane.gauche} kJ/mol in butane. Twice that is ${(2 * TORSION_ENERGIES.butane.gauche).toFixed(1)} kJ/mol, against the tabulated A-value ${A_VALUES.values.methyl.kJ} kJ/mol. In the model the closest 1,3-diaxial H···H contact is ${cyclohexaneFrame('methyl', 'axial').contact.d.toFixed(2)} Å; the ring is drawn with its template angles, so the clash is shown rather than relieved.`,
    show: { rotor: 'cyclohexane', form: 'axial', substituent: 'methyl', second: null },
  },
  {
    id: 'tbu-lock', rotor: 'cyclohexane', title: 'Why is tert-butyl said to "lock" the ring?',
    prompt: 'A tert-butyl group is often described as a conformational lock. What does that mean?',
    options: [{ id: 'nobond', label: 'The ring can no longer flip (bonds would break)' }, { id: 'axialpref', label: 'tert-Butyl prefers the axial position' }, { id: 'onechair', label: 'The axial chair is so high in energy that only the equatorial chair is populated', correct: true }],
    reveal: () => `The flip is still possible, it just never pays. The A-value of tert-butyl is about ${A_VALUES.values.tBu.kJ} kJ/mol (${A_VALUES.values.tBu.note}), so more than 99.9 % of the molecules sit in the chair that keeps it equatorial. Chemists use it to hold a ring in one chair when they want to study an axial or equatorial group elsewhere. The model cannot even draw the axial chair without overlap: it says so instead of bending the ring. (Chair ↔ twist-boat ↔ chair passes over the half-chair, ${RING_CONFORMER_ENERGIES.cyclohexane.halfChair} kJ/mol; ${RING_CONFORMER_ENERGIES.cyclohexane.source}.)`,
    show: { rotor: 'cyclohexane', form: 'axial', substituent: 'tBu', second: null },
  },
  {
    id: 'trans-12', rotor: 'cyclohexane', title: 'trans-1,2-Dimethylcyclohexane: which chair?',
    prompt: 'Put a second methyl on C2, trans to the first. One chair has both methyls axial, the other both equatorial. Which dominates, and what does the cis isomer do instead?',
    options: [{ id: 'diaxial', label: 'Diaxial: the methyls stay far apart' }, { id: 'same', label: 'No preference: cis and trans behave alike' }, { id: 'dieq', label: 'Diequatorial, by about 15 kJ/mol; cis is always one axial, one equatorial', correct: true }],
    reveal: () => { const ax = chairEnergy('methyl', 'axial', { sub: 'methyl', position: 2, rel: 'trans' }), eq = chairEnergy('methyl', 'equatorial', { sub: 'methyl', position: 2, rel: 'trans' }), cisA = chairEnergy('methyl', 'axial', { sub: 'methyl', position: 2, rel: 'cis' }); return `Diequatorial. By the additive estimate the diaxial chair costs ${ax.value} kJ/mol (two A-values) and the diequatorial chair 0, so ${Math.round(equatorialFraction(ax.value - eq.value) * 1000) / 10} % of trans-1,2-dimethylcyclohexane sits diequatorial at 25 °C. The flip cannot change cis into trans: cis-1,2 has one methyl axial in either chair (${cisA.value} kJ/mol both ways), so the trans isomer is the more stable one. (${A_VALUES.source}.)`; },
    show: { rotor: 'cyclohexane', form: 'equatorial', substituent: 'methyl', second: { sub: 'methyl', position: 2, rel: 'trans' } },
  },
  {
    id: 'cis-13', rotor: 'cyclohexane', title: '1,3-Dimethyl: is cis or trans more stable?',
    prompt: 'For 1,2 the trans isomer won. Move the second methyl to C3. Now which isomer can put both methyls equatorial?',
    options: [{ id: 'trans', label: 'trans, as for 1,2' }, { id: 'cis', label: 'cis: on a 1,3 pair, same face means both equatorial (or both axial)', correct: true }, { id: 'neither', label: 'Neither: 1,3 groups are always one of each' }],
    reveal: () => { const di = chairEnergy('methyl', 'axial', { sub: 'methyl', position: 3, rel: 'cis' }); return `cis. C1 and C3 are both "up" carbons, so two groups on the same face are both axial in one chair and both equatorial in the other; trans-1,3 is one of each in either chair. The diaxial cis chair is worse than two A-values: the methyls point straight at each other, a 1,3-diaxial CH₃/CH₃ interaction textbooks put at ${DIAXIAL_PAIRS.values['methyl/methyl'].kJ} kJ/mol (${DIAXIAL_PAIRS.values['methyl/methyl'].kcal} kcal/mol), which the card uses in place of ${A_VALUES.values.methyl.kJ} + ${A_VALUES.values.methyl.kJ}. In the model that chair overlaps (closest contact ${cyclohexaneFrame('methyl', 'axial', { sub: 'methyl', position: 3, rel: 'cis' }).crowding.worst.d.toFixed(2)} Å) and is flagged. The rule: trans-1,2, cis-1,3 and trans-1,4 have a diequatorial chair. (${di.source}.)`; },
    show: { rotor: 'cyclohexane', form: 'axial', substituent: 'methyl', second: { sub: 'methyl', position: 3, rel: 'cis' } },
  },
];

export const correctOption = (activity) => activity.options.find((o) => o.correct) || null;
