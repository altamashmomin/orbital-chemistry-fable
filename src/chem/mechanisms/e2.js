// E2: ethoxide + 2-bromobutane → (E)-but-2-ene + ethanol + bromide. Anti-periplanar, concerted.
// C2–C3 axis = x. Br on C2 points +y, the β-hydrogen on C3 points −y (dihedral 180°).
import { System, methylFrag, ethylFrag, sched, energyProfile, polar, antiDir, v, TETRAHEDRAL, DEG } from './frameUtils.js';

const UP = [0, 1, 0];

export function frame(t) {
  const s = new System();
  const dCC = sched(t, [[0, 1.54], [0.5, 1.45], [1, 1.34]]);
  const theta = sched(t, [[0, 70.53], [0.5, 66], [1, 60]]) * DEG;      // angle from the "away" axis = 180° − (109.5° → 120° from the C–C bond)
  const twist = sched(t, [[0, 0], [0.5, 0.5], [1, 1]]);                   // 0 = staggered sp3, 1 = planar sp2
  const dCH = sched(t, [[0, 1.09], [0.5, 1.35], [1, 2.3]]);              // C3···Hβ
  const dHO = sched(t, [[0, 3.3], [0.5, 1.45], [1, 0.96]]);              // Hβ···O
  const dCBr = sched(t, [[0, 1.94], [0.5, 2.3], [1, 3.9]]);
  const pCH = sched(t, [[0, 1], [0.5, 0.5], [0.95, 0]]);
  const pOH = sched(t, [[0.05, 0], [0.5, 0.5], [1, 1]]);
  const pCBr = sched(t, [[0, 1], [0.5, 0.5], [0.95, 0]]);
  const pPi = sched(t, [[0.1, 0], [0.5, 0.5], [1, 1]]);
  const qO = sched(t, [[0, -1], [0.5, -0.5], [1, 0]]);
  const qBr = sched(t, [[0, 0], [0.5, -0.5], [1, -1]]);

  const c2 = [-dCC / 2, 0, 0], c3 = [dCC / 2, 0, 0];
  const ax2 = [-1, 0, 0], ax3 = [1, 0, 0];
  const psi = (from, to) => (from + (to - from) * twist) * DEG;

  s.atom({ id: 'C2', el: 'C' }); s.pin('C2', c2);
  s.atom({ id: 'C3', el: 'C' }); s.pin('C3', c3);
  s.bond('C2', 'C3', 1);
  if (pPi >= 0.04) s.bonds.push({ a: 'C2', b: 'C3', order: 2, partial: pPi, piOnly: true });

  // C2 substituents: Br (ψ 0 → leaves), H (120 → 90), CH3 (240 → 270)
  s.atom({ id: 'Br', el: 'Br', autoLP: true, charge: qBr });
  s.pin('Br', v.add(c2, polar(ax2, theta, 0, dCBr, UP))).hint('Br', v.neg(polar(ax2, theta, 0, 1, UP)));
  s.bond('C2', 'Br', 1, pCBr);
  s.atom({ id: 'H2', el: 'H' });
  s.pin('H2', v.add(c2, polar(ax2, theta, psi(120, 90), 1.09, UP)));
  s.bond('C2', 'H2');
  const meA = s.frag(methylFrag('MeA.'));
  s.pin(meA, v.add(c2, polar(ax2, theta, psi(240, 270), 1.54, UP)));
  s.bond('C2', meA);

  // C3 substituents: Hβ (ψ 180, anti to Br), CH3 (300 → 270), H (60 → 90)
  const hbDir = polar(ax3, theta, 180 * DEG, 1, UP);
  const hbPos = v.add(c3, v.scale(hbDir, dCH));
  s.atom({ id: 'Hb', el: 'H', label: 'β-H' });
  s.pin('Hb', hbPos);
  s.bond('C3', 'Hb', 1, pCH);
  const meB = s.frag(methylFrag('MeB.'));
  s.pin(meB, v.add(c3, polar(ax3, theta, psi(300, 270), 1.54, UP)));
  s.bond('C3', meB);
  s.atom({ id: 'H3', el: 'H' });
  s.pin('H3', v.add(c3, polar(ax3, theta, psi(60, 90), 1.09, UP)));
  s.bond('C3', 'H3');

  // Ethoxide base approaching Hβ along the C3→Hβ line.
  const oPos = v.add(hbPos, v.scale(hbDir, dHO));
  s.atom({ id: 'B.O', el: 'O', autoLP: true, charge: qO });
  s.pin('B.O', oPos).hint('B.O', v.neg(hbDir));
  const et = s.frag(ethylFrag('B.'));
  const etC1 = v.add(oPos, polar(v.neg(hbDir), TETRAHEDRAL, 0, 1.43, [1, 0, 0]));
  s.pin(et, etC1);
  s.pin('B.C2', v.add(etC1, v.scale(antiDir(etC1, oPos, hbPos), 1.54)));
  s.bond('B.O', et).bond('B.O', 'Hb', 1, pOH);

  return s.frame({ focus: ['C2', 'C3', 'Br', 'Hb', 'B.O'] });
}

export const e2 = {
  id: 'e2', name: 'E2', fullName: 'Bimolecular elimination',
  substrate: '2-bromobutane (secondary alkyl bromide)', reagent: 'ethoxide, CH₃CH₂O⁻ (strong base)', solventNote: 'typically the conjugate alcohol (ethanol) as solvent, often with heat',
  products: '(E)-but-2-ene (major, Zaitsev) + ethanol + Br⁻',
  equation: 'EtO⁻ + CH₃CHBrCH₂CH₃ → CH₃CH=CHCH₃ + EtOH + Br⁻',
  rateLaw: 'rate = k [R–Br] [base]  (second order)',
  molecularity: 'Bimolecular, concerted, one step: three bonds change at once',
  stereochemistry: 'ANTI-periplanar requirement: the β-H and the leaving group must be 180° apart (same plane, opposite sides). This fixes the alkene geometry.',
  keyIdeas: [
    'The base removes a β-hydrogen (on the carbon NEXT to the C–Br carbon) while the C–Br bond breaks and the C=C forms, all in one transition state.',
    'Anti-periplanar geometry is required: the C–H σ bond donates into the C–Br σ* orbital, and they only line up when anti.',
    { text: 'Zaitsev′s rule: with small bases the more substituted (more stable) alkene is the major product. Bulky bases (tBuO⁻) give the less substituted Hofmann alkene.', audience: 'both' },
    { text: 'Strong base is essential; a tertiary substrate with a strong base does E2 (not SN2, which is blocked).', audience: 'both' },
  ],
  conditions: {
    favoredBy: ['strong bases: HO⁻, RO⁻, NH₂⁻, tBuO⁻, LDA', 'tertiary > secondary > primary substrates (more substituted alkene = more stable TS)', 'heat', 'bulky bases (they cannot do SN2 but can grab an exposed H)', 'high base concentration'],
    disfavoredBy: ['weak bases', 'no β-hydrogen on the substrate (e.g. neopentyl halides, methyl halides)', 'no accessible anti-periplanar H (locked rings)'],
  },
  view: { position: [5, 5, 9.5], target: [0, 0, 0] },
  related: [{ label: 'Alkyl halides', href: '#functional-groups/haloalkane' }, { label: 'Alkenes', href: '#functional-groups/alkene' }, { label: 'Anti-periplanar', href: '#glossary/anti-periplanar' }, { label: 'Zaitsev′s rule', href: '#glossary/zaitsev-rule' }],
  steps: [
    {
      id: 'anti', t: 0, cue: 'e2.antiPeriplanar', title: 'Anti-periplanar alignment',
      narration: 'Look at the H–C3–C2–Br dihedral: 180°. The β-H (on C3) and the bromine (on C2) lie in the same plane on opposite sides. Only in this conformation can the C–H electrons flow into the C–Br σ* orbital as the base pulls off the proton.',
      keyPoints: [{ text: 'Base must reach a β-hydrogen, not the α-hydrogen', audience: 'both' }, 'The molecule rotates about the C2–C3 bond until an anti H is available', 'The methyl groups end up anti to each other → the E (trans) alkene'],
      arrows: [
        { from: { type: 'lonePair', atom: 'B.O' }, to: { type: 'atom', atom: 'Hb' } },
        { from: { type: 'bond', a: 'C3', b: 'Hb' }, to: { type: 'bond', a: 'C2', b: 'C3' } },
        { from: { type: 'bond', a: 'C2', b: 'Br' }, to: { type: 'atom', atom: 'Br' } },
      ],
      highlights: [{ type: 'plane', atoms: ['Hb', 'C3', 'C2', 'Br'] }, { type: 'bond', a: 'C3', b: 'Hb' }, { type: 'bond', a: 'C2', b: 'Br' }],
    },
    {
      id: 'ts', t: 0.5, cue: 'e2.transitionState', title: 'Concerted transition state (‡)',
      narration: 'O···H forming, C···H breaking, C···C turning into a double bond, C···Br breaking: four partial bonds in one transition state. Both carbons are flattening toward sp².',
      keyPoints: [{ text: 'One step → rate depends on BOTH base and substrate', audience: 'both' }, 'The more alkene-like the TS, the more Zaitsev selectivity', 'Negative charge is spread over O and Br'],
      arrows: [],
      highlights: [{ type: 'charges', map: { 'B.O': 'δ−', Br: 'δ−' } }, { type: 'bond', a: 'C2', b: 'C3' }],
    },
    {
      id: 'alkene', t: 1, cue: 'e2.products', title: '(E)-but-2-ene + ethanol + bromide',
      narration: 'The new π bond is perpendicular to the plane where Br and H used to be. The two methyls are trans. The disubstituted but-2-ene forms faster than but-1-ene because its transition state is more stable (Zaitsev).',
      keyPoints: [{ text: 'Zaitsev: most substituted alkene is major (≈ 80 %)', audience: 'both' }, { text: 'E usually beats Z: the anti conformer with methyls anti is lower in energy', audience: 'both' }, 'Bulky base (tBuO⁻) would shift the product to but-1-ene (Hofmann)'],
      arrows: [],
      highlights: [{ type: 'bond', a: 'C2', b: 'C3' }, { type: 'plane', atoms: ['C2', 'C3', 'H2', 'MeA.C', 'H3', 'MeB.C'] }],
    },
  ],
  energy: { unit: 'kcal/mol (illustrative)', points: [{ t: 0, E: 0, label: 'reactants' }, { t: 0.5, E: 22, label: '‡' }, { t: 1, E: -8, label: 'alkene' }] },
  frame,
};
e2.energyAt = energyProfile(e2.energy.points);
