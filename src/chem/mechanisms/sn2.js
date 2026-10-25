// SN2: hydroxide + (R)-2-bromobutane → (S)-butan-2-ol + bromide. Walden inversion.
// Reaction axis = x. Nucleophile approaches from +x, bromide leaves toward −x.
import { System, methylFrag, ethylFrag, sched, energyProfile, polar, sidewaysDir, v, TETRAHEDRAL, DEG } from './frameUtils.js';

const AX = [1, 0, 0];
const UP = [0, 1, 0];

export function frame(t) {
  const s = new System();
  const dNu = sched(t, [[0, 3.6], [0.5, 2.15], [1, 1.43]]);
  const dBr = sched(t, [[0, 1.94], [0.5, 2.35], [1, 3.9]]);
  const phi = sched(t, [[0, 70.53], [0.5, 90], [1, 109.47]]) * DEG; // substituent angle from +x
  const pNu = sched(t, [[0.05, 0], [0.5, 0.5], [1, 1]]);
  const pBr = sched(t, [[0, 1], [0.5, 0.5], [0.95, 0]]);
  const qO = sched(t, [[0, -1], [0.5, -0.5], [1, 0]]);
  const qBr = sched(t, [[0, 0], [0.5, -0.5], [1, -1]]);
  const qC = sched(t, [[0, 0.3], [0.5, 0], [1, 0]]);

  s.atom({ id: 'C', el: 'C', charge: qC, label: t < 0.5 ? '(R)' : t > 0.5 ? '(S)' : '‡' });
  s.pin('C', [0, 0, 0]);
  s.atom({ id: 'H', el: 'H' });
  const me = s.frag(methylFrag('Me.'));
  const et = s.frag(ethylFrag('Et.'));
  const mePos = polar(AX, phi, 120 * DEG, 1.54, UP);
  const etPos = polar(AX, phi, 240 * DEG, 1.54, UP);
  s.pin('H', polar(AX, phi, 0, 1.09, UP));
  s.pin(me, mePos);
  s.pin(et, etPos);
  // Keep the ethyl's CH3 pointing sideways (never into Nu or Br) while the umbrella inverts.
  s.pin('Et.C2', v.add(etPos, v.scale(sidewaysDir(etPos, [0, 0, 0], AX, mePos), 1.54)));
  s.bond('C', 'H').bond('C', me).bond('C', et);

  s.atom({ id: 'Br', el: 'Br', autoLP: true, charge: qBr });
  s.pin('Br', [-dBr, 0, 0]);
  s.hint('Br', AX);
  s.bond('C', 'Br', 1, pBr);

  s.atom({ id: 'Nu.O', el: 'O', autoLP: true, charge: qO });
  s.atom({ id: 'Nu.H', el: 'H' });
  const oPos = [dNu, 0, 0];
  s.pin('Nu.O', oPos);
  s.pin('Nu.H', v.add(oPos, polar([-1, 0, 0], TETRAHEDRAL, 0, 0.96, UP)));
  s.hint('Nu.O', [-1, 0, 0]);
  s.bond('Nu.O', 'Nu.H').bond('C', 'Nu.O', 1, pNu);

  return s.frame({ focus: ['C', 'Br', 'Nu.O'] });
}

export const sn2 = {
  id: 'sn2', name: 'SN2', fullName: 'Bimolecular nucleophilic substitution',
  substrate: '(R)-2-bromobutane (a secondary alkyl bromide)', reagent: 'hydroxide ion, HO⁻ (strong nucleophile)', solventNote: 'best in a polar aprotic solvent (DMSO, acetone) that leaves HO⁻ "naked"',
  products: '(S)-butan-2-ol + Br⁻',
  equation: 'HO⁻ + (R)-CH₃CHBrCH₂CH₃ → (S)-CH₃CH(OH)CH₂CH₃ + Br⁻',
  rateLaw: 'rate = k [R–Br] [HO⁻]  (second order: both partners in the one step)',
  molecularity: 'Bimolecular, concerted, one step, no intermediate',
  stereochemistry: 'Complete INVERSION of configuration at the carbon (Walden inversion): (R) → (S).',
  keyIdeas: [
    'The nucleophile attacks from the side opposite the leaving group (backside attack) because that is where the C–Br σ* antibonding orbital has its large lobe.',
    'Bond making and bond breaking happen in the same step: a single transition state, no carbocation.',
    { text: 'Sterics rule: methyl > 1° > 2° ≫ 3° (tertiary halides never do SN2).', audience: 'both' },
    { text: 'Polar aprotic solvents accelerate SN2 (they solvate the cation but leave the anion reactive); polar protic solvents slow it by hydrogen-bonding the nucleophile.', audience: 'both' },
  ],
  conditions: {
    favoredBy: ['methyl, primary or (slower) secondary substrates', 'strong, small nucleophiles: HO⁻, RO⁻, CN⁻, N₃⁻, RS⁻, I⁻', 'polar aprotic solvents: DMSO, DMF, acetone, MeCN', 'high nucleophile concentration', 'good leaving groups: I⁻ > Br⁻ > Cl⁻ > OTs⁻'],
    disfavoredBy: ['tertiary substrates (completely blocked)', 'bulky nucleophiles', 'polar protic solvents (H₂O, ROH)', 'weak nucleophiles (H₂O, ROH)'],
  },
  view: { position: [0.5, 3.2, 11], target: [0, 0, 0] },
  related: [{ label: 'Alkyl halides', href: '#functional-groups/haloalkane' }, { label: 'Alcohols', href: '#functional-groups/alcohol' }, { label: 'Nucleophile', href: '#glossary/nucleophile' }, { label: 'Leaving group', href: '#glossary/leaving-group' }, { label: 'Walden inversion', href: '#glossary/walden-inversion' }],
  steps: [
    {
      id: 'approach', t: 0, cue: 'sn2.approach', title: 'Backside approach',
      narration: 'The hydroxide lone pair points straight at the carbon from the side opposite bromine, into the C–Br σ* orbital. Carbon is δ+ because Br pulls electron density away.',
      keyPoints: [{ text: 'Nucleophile and leaving group are 180° apart', audience: 'both' }, 'The three other substituents point AWAY from the nucleophile, like an open umbrella', 'This is the only step, so both reactants appear in the rate law'],
      arrows: [{ from: { type: 'lonePair', atom: 'Nu.O' }, to: { type: 'atom', atom: 'C' } }, { from: { type: 'bond', a: 'C', b: 'Br' }, to: { type: 'atom', atom: 'Br' } }],
      highlights: [{ type: 'lonePairs', id: 'Nu.O' }, { type: 'bond', a: 'C', b: 'Br' }],
    },
    {
      id: 'ts', t: 0.5, cue: 'sn2.transitionState', title: 'Transition state (‡)',
      narration: 'Half-way: the O···C bond is half formed and the C···Br bond is half broken (dashed). The carbon is briefly trigonal bipyramidal: H, CH₃ and CH₂CH₃ lie in one plane, with O and Br on the axis. The negative charge is shared between O and Br.',
      keyPoints: [{ text: 'Highest-energy point: not an intermediate, it cannot be isolated', audience: 'both' }, 'sp² -like carbon with five partial attachments', 'Bulky groups in this plane raise the energy — that is the steric argument against SN2 at 3° carbons'],
      arrows: [],
      highlights: [{ type: 'plane', atoms: ['C', 'H', 'Me.C', 'Et.C1'] }, { type: 'charges', map: { 'Nu.O': 'δ−', Br: 'δ−' } }],
    },
    {
      id: 'products', t: 1, cue: 'sn2.products', title: 'Inversion complete',
      narration: 'Bromide has left with the bonding electrons and the three substituents have flipped through, like an umbrella in the wind. The carbon that was (R) is now (S).',
      keyPoints: [{ text: 'Walden inversion is the fingerprint of SN2', audience: 'both' }, 'Br⁻ is a weak base, so it is a happy leaving group', 'Product is butan-2-ol; the oxygen is now neutral with two lone pairs'],
      arrows: [],
      highlights: [{ type: 'bond', a: 'C', b: 'Nu.O' }, { type: 'lonePairs', id: 'Br' }],
    },
  ],
  energy: { unit: 'kcal/mol (illustrative)', points: [{ t: 0, E: 0, label: 'reactants' }, { t: 0.5, E: 20, label: '‡' }, { t: 1, E: -10, label: 'products' }] },
  frame,
};
sn2.energyAt = energyProfile(sn2.energy.points);
