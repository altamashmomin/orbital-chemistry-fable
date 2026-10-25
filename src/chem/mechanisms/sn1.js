// SN1: tert-butyl bromide + water → tert-butanol (via a planar carbocation), then deprotonation.
// Reaction axis = x. Br leaves toward −x; water attacks from +x.
import { System, methylFrag, sched, energyProfile, polar, v, TETRAHEDRAL, DEG } from './frameUtils.js';

const AX = [1, 0, 0];
const UP = [0, 1, 0];

export function frame(t) {
  const s = new System();
  // Phase A (0–1/3): ionisation. Phase B (1/3–2/3): attack. Phase C (2/3–1): deprotonation.
  const dBr = sched(t, [[0, 1.94], [0.33, 4.2], [1, 4.6]]);
  const theta = sched(t, [[0, 70.53], [0.33, 90], [0.4, 90], [0.66, 109.47]]) * DEG; // methyl angle from +x
  const dO = sched(t, [[0, 4.2], [0.4, 4.2], [0.66, 1.5], [1, 1.45]]);
  const pBr = sched(t, [[0, 1], [0.3, 0]]);
  const pO = sched(t, [[0.42, 0], [0.66, 1]]);
  const qC = sched(t, [[0.05, 0.3], [0.3, 1], [0.45, 1], [0.66, 0]]);
  const qBr = sched(t, [[0.05, 0], [0.3, -1]]);
  const qO1 = sched(t, [[0.45, 0], [0.66, 1], [0.8, 1], [1, 0]]);
  const qO2 = sched(t, [[0.8, 0], [1, 1]]);
  const cation = t > 0.28 && t < 0.62;

  s.atom({ id: 'C', el: 'C', charge: qC, hyb: cation ? 'sp2' : undefined, pOrbital: cation ? 'empty' : undefined });
  s.pin('C', [0, 0, 0]);
  const mes = [0, 120, 240].map((psi, i) => {
    const root = s.frag(methylFrag(`Me${i + 1}.`));
    s.pin(root, polar(AX, theta, psi * DEG, 1.54, UP));
    s.bond('C', root);
    return root;
  });
  s.atom({ id: 'Br', el: 'Br', autoLP: true, charge: qBr });
  s.pin('Br', [-dBr, 0, 0]).hint('Br', AX);
  s.bond('C', 'Br', 1, pBr);

  // Attacking water: O on +x, two H's at tetrahedral angles from the O→C direction.
  const oPos = [dO, 0, 0];
  s.atom({ id: 'W.O', el: 'O', autoLP: true, charge: qO1 });
  s.atom({ id: 'W.Ha', el: 'H' });
  s.atom({ id: 'W.Hb', el: 'H' });
  s.pin('W.O', oPos).hint('W.O', [-1, 0, 0]);
  const haDir = polar([-1, 0, 0], TETRAHEDRAL, 0, 1, UP);        // unit direction O→Ha
  const hbDir = polar([-1, 0, 0], TETRAHEDRAL, 120 * DEG, 1, UP);
  s.pin('W.Hb', v.add(oPos, v.scale(hbDir, 0.96)));
  s.bond('W.O', 'W.Hb').bond('C', 'W.O', 1, pO);

  // Second water takes Ha in phase C.
  const dOO = sched(t, [[0.66, 4.6], [0.8, 2.6], [1, 3.1]]);       // W.O ··· W2.O distance along haDir
  const hFromO1 = sched(t, [[0.8, 0.96], [1, dOO - 0.96]]);        // Ha distance from W.O
  const pOH1 = sched(t, [[0.8, 1], [1, 0]]);
  const pOH2 = sched(t, [[0.8, 0], [1, 1]]);
  const haPos = v.add(oPos, v.scale(haDir, hFromO1));
  s.pin('W.Ha', haPos);
  s.bond('W.O', 'W.Ha', 1, pOH1);
  const o2Pos = v.add(oPos, v.scale(haDir, dOO));
  s.atom({ id: 'W2.O', el: 'O', autoLP: true, charge: qO2 });
  s.atom({ id: 'W2.Ha', el: 'H' });
  s.atom({ id: 'W2.Hb', el: 'H' });
  s.pin('W2.O', o2Pos).hint('W2.O', v.neg(haDir));
  const back = v.neg(haDir);
  s.pin('W2.Ha', v.add(o2Pos, polar(back, TETRAHEDRAL, 60 * DEG, 0.96, UP)));
  s.pin('W2.Hb', v.add(o2Pos, polar(back, TETRAHEDRAL, 180 * DEG, 0.96, UP)));
  s.bond('W2.O', 'W2.Ha').bond('W2.O', 'W2.Hb').bond('W2.O', 'W.Ha', 1, pOH2);

  // Ghost water on the opposite face while the cation exists: either face is equally likely.
  if (t > 0.3 && t < 0.6) {
    const g = [-4.2, 0, 0];
    s.atom({ id: 'G.O', el: 'O', lonePairs: 2, ghost: true, label: 'equally likely face' });
    s.atom({ id: 'G.Ha', el: 'H', ghost: true });
    s.atom({ id: 'G.Hb', el: 'H', ghost: true });
    s.pin('G.O', g).hint('G.O', AX);
    s.pin('G.Ha', v.add(g, polar(AX, TETRAHEDRAL, 0, 0.96, UP)));
    s.pin('G.Hb', v.add(g, polar(AX, TETRAHEDRAL, 120 * DEG, 0.96, UP)));
    s.bonds.push({ a: 'G.O', b: 'G.Ha', order: 1, ghost: true }, { a: 'G.O', b: 'G.Hb', order: 1, ghost: true });
  }

  return s.frame({ focus: ['C', 'Br', 'W.O'] });
}

export const sn1 = {
  id: 'sn1', name: 'SN1', fullName: 'Unimolecular nucleophilic substitution',
  substrate: 'tert-butyl bromide, (CH₃)₃C–Br (a tertiary alkyl bromide)', reagent: 'water, H₂O (weak nucleophile; also the solvent: "solvolysis")', solventNote: 'polar protic solvent stabilises both the carbocation and the leaving anion',
  products: 'tert-butanol, (CH₃)₃C–OH + H₃O⁺ + Br⁻',
  equation: '(CH₃)₃C–Br + 2 H₂O → (CH₃)₃C–OH + H₃O⁺ + Br⁻',
  rateLaw: 'rate = k [R–Br]  (first order: the nucleophile is NOT in the rate law)',
  molecularity: 'Unimolecular rate-determining step; three steps in total; one carbocation intermediate',
  stereochemistry: 'RACEMISATION if the carbon is a stereocentre: the planar cation is attacked from either face.',
  keyIdeas: [
    'Step 1 (slow): the C–Br bond breaks on its own. Nothing pushes it; the solvent pulls the ions apart.',
    { text: 'The carbocation is planar sp² with an empty p orbital. Three alkyl groups stabilise it by hyperconjugation and induction, so SN1 needs 3° (or allylic/benzylic, sometimes 2°) substrates.', audience: 'both' },
    'Step 2 (fast): any nucleophile, even weak water, attacks the empty p orbital from either face.',
    'Step 3 (fast): a proton is lost from the oxonium ion to give the neutral alcohol.',
    { text: 'Carbocations can rearrange (hydride/methyl shifts) to more stable cations: SN1 products sometimes have a moved skeleton.', audience: 'both' },
  ],
  conditions: {
    favoredBy: ['tertiary, allylic or benzylic substrates', 'weak nucleophiles (H₂O, ROH, RCOOH)', 'polar PROTIC solvents (water, alcohols, acetic acid)', 'good leaving groups', 'low concentrations of strong base'],
    disfavoredBy: ['methyl and primary substrates (cation far too unstable)', 'strong bases (they cause E2 instead)', 'nonpolar solvents (cannot stabilise ions)'],
  },
  view: { position: [2.5, 4.5, 10.5], target: [0, 0, 0] },
  related: [{ label: 'Alkyl halides', href: '#functional-groups/haloalkane' }, { label: 'Alcohols', href: '#functional-groups/alcohol' }, { label: 'Carbocation', href: '#glossary/carbocation' }, { label: 'Racemisation', href: '#glossary/racemisation' }, { label: 'Solvolysis', href: '#glossary/solvolysis' }],
  steps: [
    {
      id: 'ionisation', t: 0, cue: 'sn1.ionisation', title: 'Step 1: ionisation (slow, rate-determining)',
      narration: 'The C–Br bond breaks heterolytically: both electrons go to bromine. No nucleophile helps, which is why the rate depends only on [R–Br]. Polar protic solvent molecules surround the forming ions.',
      keyPoints: [{ text: 'Heterolysis: the leaving group takes the electron pair', audience: 'both' }, { text: 'Highest barrier of the whole mechanism', audience: 'both' }, 'Tertiary carbon → the resulting cation is stable enough to form'],
      arrows: [{ from: { type: 'bond', a: 'C', b: 'Br' }, to: { type: 'atom', atom: 'Br' } }],
      highlights: [{ type: 'bond', a: 'C', b: 'Br' }],
    },
    {
      id: 'cation', t: 0.33, cue: 'sn1.carbocation', title: 'Carbocation intermediate',
      narration: 'The three methyl groups have flattened into a plane around the sp² carbon. The empty p orbital (pink lobes) sticks out above and below. Three alkyl groups donate electron density into it; a primary cation would have only one.',
      keyPoints: [{ text: 'Planar, trigonal, 120° angles', audience: 'both' }, 'A real intermediate: it sits in an energy well', { text: 'Both faces are identical → racemisation at a stereocentre', audience: 'both' }, 'Could rearrange if a more stable cation were available'],
      arrows: [],
      highlights: [{ type: 'orbital', id: 'C' }, { type: 'plane', atoms: ['C', 'Me1.C', 'Me2.C', 'Me3.C'] }],
    },
    {
      id: 'attack', t: 0.42, cue: 'sn1.attack', title: 'Step 2: nucleophile attacks the empty p orbital (fast)',
      narration: 'A water lone pair donates into the empty p orbital. The ghost water on the other side shows the equally likely alternative. The carbon re-pyramidalises as the new C–O bond forms.',
      keyPoints: ['Even a weak nucleophile reacts: the cation is extremely electrophilic', { text: 'Attack from either face with equal probability', audience: 'both' }, 'The nucleophile does not appear in the rate law because it arrives after the slow step'],
      arrows: [{ from: { type: 'lonePair', atom: 'W.O' }, to: { type: 'atom', atom: 'C' } }],
      highlights: [{ type: 'lonePairs', id: 'W.O' }, { type: 'orbital', id: 'C' }],
    },
    {
      id: 'oxonium', t: 0.66, cue: 'sn1.oxonium', title: 'Step 3: deprotonation of the oxonium ion (fast)',
      narration: 'Oxygen now has three bonds and a positive charge: a strong acid (pKa ≈ −2). A second water molecule removes one of its protons.',
      keyPoints: ['Acid–base step: the proton goes to the solvent', { text: 'Gives H₃O⁺ as the by-product', audience: 'both' }, 'Overall the solvent is both nucleophile and base'],
      arrows: [{ from: { type: 'lonePair', atom: 'W2.O' }, to: { type: 'atom', atom: 'W.Ha' } }, { from: { type: 'bond', a: 'W.O', b: 'W.Ha' }, to: { type: 'atom', atom: 'W.O' } }],
      highlights: [{ type: 'charges', map: { 'W.O': '+' } }, { type: 'lonePairs', id: 'W2.O' }],
    },
    {
      id: 'products', t: 1, cue: 'sn1.products', title: 'Products: tert-butanol + H₃O⁺ + Br⁻',
      narration: 'A neutral tertiary alcohol. If the starting carbon had been a stereocentre you would now hold a racemic mixture, the signature of SN1.',
      keyPoints: [{ text: 'Substitution without inversion: racemisation', audience: 'both' }, 'The same cation could instead lose a β-H → E1 (see E1 tab); heat pushes it that way'],
      arrows: [],
      highlights: [{ type: 'bond', a: 'C', b: 'W.O' }],
    },
  ],
  energy: { unit: 'kcal/mol (illustrative)', points: [{ t: 0, E: 0, label: 'R–Br' }, { t: 0.16, E: 22, label: '‡₁ (rds)' }, { t: 0.33, E: 15, label: 'R⁺' }, { t: 0.5, E: 17, label: '‡₂' }, { t: 0.66, E: 5, label: 'R–OH₂⁺' }, { t: 0.83, E: 8, label: '‡₃' }, { t: 1, E: -5, label: 'R–OH' }] },
  frame,
};
sn1.energyAt = energyProfile(sn1.energy.points);
