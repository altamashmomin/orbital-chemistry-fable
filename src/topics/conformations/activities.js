// Predict → turn → explain activities for the Conformations topic; reveal text quotes the model's values.
import { torsionEnergy } from '../../chem/conformations.js';
import { equatorialFraction, cyclohexaneFrame } from '../../chem/cyclohexane.js';
import { TORSION_ENERGIES, A_VALUES, RING_CONFORMER_ENERGIES } from '../../chem/references/textbook.js';

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
    show: { rotor: 'cyclohexane', form: 'equatorial', substituent: 'methyl' },
  },
  {
    id: 'diaxial-gauche', rotor: 'cyclohexane', title: 'Where does the methyl A-value come from?',
    prompt: 'An axial methyl costs about 7 kJ/mol. Which earlier number is it made of?',
    options: [{ id: 'eclipse', label: 'One eclipsed C–C bond (≈ 12 kJ/mol)' }, { id: 'gauche', label: 'Two gauche-butane interactions (2 × 3.8 kJ/mol)', correct: true }, { id: 'stretch', label: 'Stretched ring bonds' }],
    reveal: () => `Two gauche-butane interactions. Look down the C1–C2 bond of the axial chair: the methyl is gauche to C3, and down C1–C6 it is gauche to C5, exactly the arrangement that costs ${TORSION_ENERGIES.butane.gauche} kJ/mol in butane. Twice that is ${(2 * TORSION_ENERGIES.butane.gauche).toFixed(1)} kJ/mol, against the tabulated A-value ${A_VALUES.values.methyl.kJ} kJ/mol. In the model the closest 1,3-diaxial H···H contact is ${cyclohexaneFrame('methyl', 'axial').contact.d.toFixed(2)} Å; the ring is drawn with its template angles, so the clash is shown rather than relieved.`,
    show: { rotor: 'cyclohexane', form: 'axial', substituent: 'methyl' },
  },
  {
    id: 'tbu-lock', rotor: 'cyclohexane', title: 'Why is tert-butyl said to "lock" the ring?',
    prompt: 'A tert-butyl group is often described as a conformational lock. What does that mean?',
    options: [{ id: 'nobond', label: 'The ring can no longer flip (bonds would break)' }, { id: 'axialpref', label: 'tert-Butyl prefers the axial position' }, { id: 'onechair', label: 'The axial chair is so high in energy that only the equatorial chair is populated', correct: true }],
    reveal: () => `The flip is still possible, it just never pays. The A-value of tert-butyl is about ${A_VALUES.values.tBu.kJ} kJ/mol (${A_VALUES.values.tBu.note}), so more than 99.9 % of the molecules sit in the chair that keeps it equatorial. Chemists use it to hold a ring in one chair when they want to study an axial or equatorial group elsewhere. The model cannot even draw the axial chair without overlap: it says so instead of bending the ring. (Chair ↔ twist-boat ↔ chair passes over the half-chair, ${RING_CONFORMER_ENERGIES.cyclohexane.halfChair} kJ/mol; ${RING_CONFORMER_ENERGIES.cyclohexane.source}.)`,
    show: { rotor: 'cyclohexane', form: 'axial', substituent: 'tBu' },
  },
];

export const correctOption = (activity) => activity.options.find((o) => o.correct) || null;
