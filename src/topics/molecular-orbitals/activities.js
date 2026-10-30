// Predict → look → explain activities for the Molecular orbitals topic; reveal text reads the module's values.
import { buildMO, fillDiatomic } from '../../chem/molecularOrbitals.js';
import { DIATOMIC_MO } from '../../chem/references/textbook.js';

export const ACTIVITIES = [
  {
    id: 'o2-magnet', item: 'o2', title: 'Is O₂ attracted to a magnet?',
    prompt: 'The Lewis structure O=O shows every electron paired. Fill the MO ladder with the twelve valence electrons and decide.',
    options: [{ id: 'no', label: 'No: all electrons are paired' }, { id: 'yes', label: 'Yes: two unpaired electrons in π*', correct: true }, { id: 'one', label: 'Yes, but only one unpaired electron' }],
    reveal: () => { const f = fillDiatomic('o2'); return `Yes. After σ(2s)², σ*(2s)², σ(2p)² and π(2p)⁴, the last two electrons enter the two degenerate π*(2p) orbitals one each with parallel spins: ${f.unpaired} unpaired electrons, bond order ${f.bondOrder}. Liquid oxygen hangs between the poles of a magnet; the Lewis structure cannot show why, the ladder does. (${DIATOMIC_MO.source.split(';')[0]}.)`; },
    show: { item: 'o2', invariant: 'paramagnetic' },
  },
  {
    id: 'he2-exists', item: 'h2', title: 'Does He₂ exist?',
    prompt: 'Two helium atoms bring four 1s electrons. Put them into σ(1s) and σ*(1s). Is there a bond?',
    options: [{ id: 'single', label: 'Yes, a single bond like H₂' }, { id: 'double', label: 'Yes, a double bond: twice the electrons' }, { id: 'none', label: 'No: bond order 0', correct: true }],
    reveal: () => { const f = fillDiatomic('he2'); return `No. Two electrons go into σ(1s) and the other two must go into σ*(1s): bond order (2 − 2)/2 = ${f.bondOrder}. The antibonding pair cancels the bonding pair (in fact slightly more than cancels), so helium is a monatomic gas. Take one electron away and He₂⁺, bond order ½, does exist as a short-lived ion.`; },
    show: { item: 'h2', invariant: 'he2' },
  },
  {
    id: 'carbonyl-attack', item: 'carbonyl', title: 'Where does a nucleophile attack a carbonyl?',
    prompt: 'A nucleophile donates into the lowest empty orbital. Look at π* of H₂C=O: which atom carries the bigger lobe?',
    options: [{ id: 'oxygen', label: 'Oxygen: it is the electronegative atom' }, { id: 'carbon', label: 'Carbon: π* is larger on C', correct: true }, { id: 'equal', label: 'Either: π* is symmetric' }],
    reveal: () => { const b = buildMO('carbonyl', { mo: 'psi2' }); const c = b.selected.coefficients.map((x) => Math.abs(x).toFixed(3)); return `Carbon. Oxygen's lower-energy 2p (Hückel h = ${b.facts.parameters.h}) dominates the bonding π, so the antibonding π* is dominated by carbon: |c| = ${c[0]} on C against ${c[1]} on O (x = ${b.selected.x.toFixed(3)}). The nucleophile's electrons go where the LUMO is largest, from above or below the plane at the Bürgi–Dunitz angle, and the C=O π bond breaks as the new σ bond forms.`; },
    show: { item: 'carbonyl', invariant: 'lumo' },
  },
];

export const correctOption = (activity) => activity.options.find((o) => o.correct) || null;
