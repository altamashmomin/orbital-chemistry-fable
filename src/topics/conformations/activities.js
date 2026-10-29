// Predict → turn → explain activities for the Conformations topic; reveal text quotes the model's values.
import { torsionEnergy } from '../../chem/conformations.js';
import { TORSION_ENERGIES } from '../../chem/references/textbook.js';

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
];

export const correctOption = (activity) => activity.options.find((o) => o.correct) || null;
