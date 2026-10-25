// E1: tert-butyl bromide → carbocation → 2-methylpropene (ethanol as the weak base).
// Reaction axis = x. Br leaves toward −x; the cation plane is yz; the β-H parallel to the p orbital is removed.
import { System, methylFrag, ethylFrag, sched, energyProfile, polar, antiDir, v, TETRAHEDRAL, DEG } from './frameUtils.js';

const AX = [1, 0, 0];
const UP = [0, 1, 0];

export function frame(t) {
  const s = new System();
  // Phase A (0–0.4) ionisation; Phase B (0.4–1) β-deprotonation.
  const dBr = sched(t, [[0, 1.94], [0.4, 4.2], [1, 4.6]]);
  const theta = sched(t, [[0, 70.53], [0.4, 90]]) * DEG;                // methyl angle from +x
  const pBr = sched(t, [[0, 1], [0.35, 0]]);
  const qC = sched(t, [[0.05, 0.3], [0.35, 1], [0.55, 1], [0.85, 0]]);
  const qBr = sched(t, [[0.05, 0], [0.35, -1]]);
  const dCC1 = sched(t, [[0.55, 1.54], [0.9, 1.34]]);                  // C–Me1 shortens to C=C
  const dCH = sched(t, [[0.55, 1.09], [0.75, 1.35], [1, 2.2]]);        // Me1.C···H(up)
  const dHO = sched(t, [[0.4, 3.4], [0.55, 2.6], [0.75, 1.45], [1, 0.96]]);
  const pCH = sched(t, [[0.55, 1], [0.75, 0.5], [0.97, 0]]);
  const pOH = sched(t, [[0.6, 0], [0.75, 0.5], [1, 1]]);
  const pPi = sched(t, [[0.6, 0], [0.75, 0.5], [1, 1]]);
  const flat = sched(t, [[0.55, 0], [1, 1]]);                           // CH2 flattening
  const qO = sched(t, [[0.75, 0], [1, 1]]);
  const cation = t > 0.32 && t < 0.8;

  s.atom({ id: 'C', el: 'C', charge: qC, hyb: cation ? 'sp2' : undefined, pOrbital: cation ? 'empty' : undefined });
  s.pin('C', [0, 0, 0]);
  s.atom({ id: 'Br', el: 'Br', autoLP: true, charge: qBr });
  s.pin('Br', [-dBr, 0, 0]).hint('Br', AX);
  s.bond('C', 'Br', 1, pBr);

  // Me2, Me3 are ordinary methyls.
  for (const [i, psi] of [[2, 120], [3, 240]]) {
    const root = s.frag(methylFrag(`Me${i}.`));
    s.pin(root, polar(AX, theta, psi * DEG, 1.54, UP));
    s.bond('C', root);
  }
  // Me1 (ψ = 0, mostly +y) has explicit hydrogens: Hu is parallel to the p orbital (x) and leaves.
  const me1Dir = v.norm(polar(AX, theta, 0, 1, UP));
  const c1 = v.scale(me1Dir, dCC1);
  s.atom({ id: 'Me1.C', el: 'C' });
  s.pin('Me1.C', c1);
  s.bond('C', 'Me1.C', 1);
  if (pPi >= 0.04) s.bonds.push({ a: 'C', b: 'Me1.C', order: 2, partial: pPi, piOnly: true });
  const huDir = polar(me1Dir, Math.PI - TETRAHEDRAL, 0, 1, AX);       // 109.5° from the C–C bond, tilted toward +x (parallel to the p orbital)
  const hTheta = (70.53 + (60 - 70.53) * flat) * DEG;                 // from the away axis: 109.5° → 120° from the bond
  const psiA = (120 + (90 - 120) * flat) * DEG, psiB = (240 + (270 - 240) * flat) * DEG;
  s.atom({ id: 'Me1.Hu', el: 'H', label: 'β-H' });
  const huPos = v.add(c1, v.scale(huDir, dCH));
  s.pin('Me1.Hu', huPos);
  s.bond('Me1.C', 'Me1.Hu', 1, pCH);
  s.atom({ id: 'Me1.Ha', el: 'H' }); s.pin('Me1.Ha', v.add(c1, polar(me1Dir, hTheta, psiA, 1.09, AX))); s.bond('Me1.C', 'Me1.Ha');
  s.atom({ id: 'Me1.Hb', el: 'H' }); s.pin('Me1.Hb', v.add(c1, polar(me1Dir, hTheta, psiB, 1.09, AX))); s.bond('Me1.C', 'Me1.Hb');

  // Ethanol base approaching Hu along the C–H line.
  const oPos = v.add(huPos, v.scale(huDir, dHO));
  s.atom({ id: 'B.O', el: 'O', autoLP: true, charge: qO });
  s.atom({ id: 'B.H', el: 'H' });
  s.pin('B.O', oPos).hint('B.O', v.neg(huDir));
  s.pin('B.H', v.add(oPos, polar(v.neg(huDir), TETRAHEDRAL, 0, 0.96, UP)));
  const et = s.frag(ethylFrag('B.'));
  const etC1 = v.add(oPos, polar(v.neg(huDir), TETRAHEDRAL, 120 * DEG, 1.43, UP));
  s.pin(et, etC1);
  s.pin('B.C2', v.add(etC1, v.scale(antiDir(etC1, oPos, huPos), 1.54)));
  s.bond('B.O', 'B.H').bond('B.O', et).bond('B.O', 'Me1.Hu', 1, pOH);

  return s.frame({ focus: ['C', 'Br', 'Me1.C', 'B.O'] });
}

export const e1 = {
  id: 'e1', name: 'E1', fullName: 'Unimolecular elimination',
  substrate: 'tert-butyl bromide, (CH₃)₃C–Br (tertiary)', reagent: 'ethanol, EtOH (weak base and solvent), with heat', solventNote: 'polar protic solvent + heat: the same conditions as SN1, but hotter',
  products: '2-methylpropene (isobutylene) + EtOH₂⁺ + Br⁻',
  equation: '(CH₃)₃C–Br + EtOH → (CH₃)₂C=CH₂ + EtOH₂⁺ + Br⁻',
  rateLaw: 'rate = k [R–Br]  (first order; base not in the rate law)',
  molecularity: 'Unimolecular rate-determining ionisation, then fast deprotonation; carbocation intermediate',
  stereochemistry: 'No anti-periplanar requirement: the cation rotates freely, so the most stable (Zaitsev, usually E) alkene forms. Rearrangements possible.',
  keyIdeas: [
    'Step 1 is identical to SN1: slow loss of Br⁻ to give the planar carbocation.',
    'Step 2: a weak base (the solvent) removes a β-hydrogen whose C–H bond is lined up with the empty p orbital; those electrons become the π bond.',
    'E1 and SN1 always compete because they share the intermediate. Heat favours E1 (more product molecules → entropy; higher activation energy).',
    'Product follows Zaitsev′s rule (thermodynamic alkene) and rearrangements can occur before elimination.',
  ],
  conditions: {
    favoredBy: ['tertiary (or allylic/benzylic) substrates', 'weak bases / no strong nucleophile', 'polar protic solvents', 'HEAT', 'good leaving groups (also alcohols + H₂SO₄: acid-catalysed dehydration is E1)'],
    disfavoredBy: ['primary substrates', 'strong bases (E2 takes over)', 'low temperature (SN1 wins)'],
  },
  view: { position: [8.5, 3.5, 7], target: [0, 0.5, 0] },
  steps: [
    {
      id: 'ionisation', t: 0, cue: 'e1.ionisation', title: 'Step 1: ionisation (slow, rate-determining)',
      narration: 'Exactly as in SN1: the C–Br bond breaks heterolytically and the tertiary carbocation forms. Because this slow step involves only the substrate, the base does not appear in the rate law.',
      keyPoints: ['Same intermediate as SN1', 'Rate = k[R–Br]', 'Needs a stable (3°, allylic, benzylic) cation'],
      arrows: [{ from: { type: 'bond', a: 'C', b: 'Br' }, to: { type: 'atom', atom: 'Br' } }],
      highlights: [{ type: 'bond', a: 'C', b: 'Br' }],
    },
    {
      id: 'cation', t: 0.4, cue: 'e1.carbocation', title: 'Carbocation: two possible fates',
      narration: 'The planar cation can be attacked by a nucleophile (SN1) or lose a β-proton (E1). Notice the β C–H bond on the top methyl group lined up parallel to the empty p orbital: that overlap (hyperconjugation) is what stabilises the cation, and that is the hydrogen that leaves.',
      keyPoints: ['Nine β-hydrogens are available; any one aligned with the p orbital can go', 'Heat tips the balance toward elimination', 'Free rotation means no fixed anti-periplanar requirement'],
      arrows: [],
      highlights: [{ type: 'orbital', id: 'C' }, { type: 'bond', a: 'Me1.C', b: 'Me1.Hu' }],
    },
    {
      id: 'deprot', t: 0.6, cue: 'e1.deprotonation', title: 'Step 2: β-deprotonation by the weak base (fast)',
      narration: 'Ethanol′s lone pair takes the β-proton. The C–H bonding electrons swing into the empty p orbital and become the new π bond. The CH₃ becomes a planar CH₂.',
      keyPoints: ['Even a weak base suffices: the cation is a strong acid', 'The electrons move from a σ bond to a π bond, not to the base', 'Both carbons end up sp²'],
      arrows: [{ from: { type: 'lonePair', atom: 'B.O' }, to: { type: 'atom', atom: 'Me1.Hu' } }, { from: { type: 'bond', a: 'Me1.C', b: 'Me1.Hu' }, to: { type: 'bond', a: 'C', b: 'Me1.C' } }],
      highlights: [{ type: 'lonePairs', id: 'B.O' }, { type: 'bond', a: 'Me1.C', b: 'Me1.Hu' }, { type: 'orbital', id: 'C' }],
    },
    {
      id: 'alkene', t: 1, cue: 'e1.products', title: '2-Methylpropene + protonated ethanol + bromide',
      narration: 'A trisubstituted-like C=C (actually 1,1-disubstituted here) with a planar C=CH₂ unit. With a bigger substrate the most substituted alkene would dominate (Zaitsev), and E/Z mixtures form because nothing fixed the geometry.',
      keyPoints: ['Zaitsev product under thermodynamic control', 'Competes with SN1 from the same cation; heat and weak nucleophile favour E1', 'Acid-catalysed dehydration of alcohols is the same mechanism (OH₂⁺ leaves instead of Br⁻)'],
      arrows: [],
      highlights: [{ type: 'bond', a: 'C', b: 'Me1.C' }, { type: 'plane', atoms: ['C', 'Me1.C', 'Me2.C', 'Me3.C', 'Me1.Ha', 'Me1.Hb'] }],
    },
  ],
  energy: { unit: 'kcal/mol (illustrative)', points: [{ t: 0, E: 0, label: 'R–Br' }, { t: 0.2, E: 22, label: '‡₁ (rds)' }, { t: 0.4, E: 15, label: 'R⁺' }, { t: 0.72, E: 18, label: '‡₂' }, { t: 1, E: -3, label: 'alkene' }] },
  frame,
};
e1.energyAt = energyProfile(e1.energy.points);
