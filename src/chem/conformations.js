// Conformations: ethane and butane as dihedral-driven frames with a torsional energy profile, plus the
// anti-periplanar geometry E2 needs. Pure and dependency-free so tests and the conformance suite can
// check it. Energies are the textbook teaching values in TORSION_ENERGIES (references/textbook.js) and
// are labelled as such; the curve between the quoted points is an illustrative Fourier fit.
import { embed, relaxTorsions, dihedral, m3, v, DEG } from './geometry.js';
import { toFrame } from './builder.js';
import { TORSION_ENERGIES } from './references/textbook.js';

const H = (id) => ({ id, el: 'H' });
const bond = (a, b, order = 1) => ({ a, b, order });

/**
 * The three rotors. `axis` is the bond looked down (front first), `reference` the four atoms whose
 * dihedral the slider sets, `landmarks` the named conformations at that dihedral (degrees).
 */
export const ROTORS = [
  {
    id: 'ethane', name: 'Ethane', formula: 'CH₃–CH₃', axis: ['C1', 'C2'], reference: ['H1', 'C1', 'C2', 'H4'], period: 120,
    graph: { atoms: [{ id: 'C1', el: 'C' }, { id: 'C2', el: 'C' }, H('H1'), H('H2'), H('H3'), H('H4'), H('H5'), H('H6')], bonds: [bond('C1', 'C2'), bond('C1', 'H1'), bond('C1', 'H2'), bond('C1', 'H3'), bond('C2', 'H4'), bond('C2', 'H5'), bond('C2', 'H6')] },
    landmarks: [{ id: 'eclipsed', label: 'Eclipsed', phi: 0 }, { id: 'staggered', label: 'Staggered', phi: 60 }],
    energy: 'ethane',
    labels: {},
    facts: [
      { title: 'Rotation about a single bond is nearly free', detail: 'The σ bond is cylindrically symmetric, so turning it costs nothing by itself; only the hydrogens on the two carbons notice each other.' },
      { title: 'Staggered is lowest, eclipsed is the top of the hill', detail: 'The barrier is 12 kJ/mol (2.9 kcal/mol): tiny next to a bond (≈ 350 kJ/mol), so ethane spins freely at room temperature, but enough that the staggered form dominates.' },
      { title: 'Why eclipsing costs anything', detail: 'Textbooks give two reasons: the C–H bonding pairs on facing carbons repel, and the staggered form gains a little σ → σ* hyperconjugation. Either way, each H/H eclipse costs about 4 kJ/mol.', audience: 'learn' },
    ],
    links: [{ label: 'Alkyl halides (sp³ carbons)', href: '#functional-groups/haloalkane' }, { label: 'Methane in Molecular shapes', href: '#molecular-shapes/methane' }, { label: 'Hyperconjugation', href: '#glossary/hyperconjugation' }],
  },
  {
    id: 'butane', name: 'Butane', formula: 'CH₃–CH₂–CH₂–CH₃', axis: ['C2', 'C3'], reference: ['C1', 'C2', 'C3', 'C4'], period: 360,
    graph: {
      atoms: [{ id: 'C1', el: 'C' }, { id: 'C2', el: 'C' }, { id: 'C3', el: 'C' }, { id: 'C4', el: 'C' }, H('H1a'), H('H1b'), H('H1c'), H('H2a'), H('H2b'), H('H3a'), H('H3b'), H('H4a'), H('H4b'), H('H4c')],
      bonds: [bond('C1', 'C2'), bond('C2', 'C3'), bond('C3', 'C4'), bond('C1', 'H1a'), bond('C1', 'H1b'), bond('C1', 'H1c'), bond('C2', 'H2a'), bond('C2', 'H2b'), bond('C3', 'H3a'), bond('C3', 'H3b'), bond('C4', 'H4a'), bond('C4', 'H4b'), bond('C4', 'H4c')],
    },
    landmarks: [{ id: 'anti', label: 'Anti', phi: 180 }, { id: 'gauche', label: 'Gauche', phi: 60 }, { id: 'eclipsedCH3H', label: 'Eclipsed (CH₃ / H)', phi: 120 }, { id: 'eclipsedCH3CH3', label: 'Fully eclipsed (CH₃ / CH₃)', phi: 0 }],
    energy: 'butane',
    labels: { C1: 'CH₃', C4: 'CH₃' },
    facts: [
      { title: 'Two staggered forms that are not equal', detail: 'Anti (methyls 180° apart) is the lowest; gauche (60°) is staggered too but the methyls crowd each other, 3.8 kJ/mol higher. Most butane molecules are anti at any instant.' },
      { title: 'Two different eclipsed hills', detail: 'Eclipsing a methyl with a hydrogen (120°, 240°) costs 16 kJ/mol; eclipsing the two methyls (0°) about 20 kJ/mol, the highest point of the curve.' },
      { title: 'Steric strain is a separate idea from torsional strain', detail: 'Gauche butane is staggered, so its extra energy is not eclipsing: it is the two methyl groups being too close. The same clash is the 1,3-diaxial interaction in a cyclohexane chair.', audience: 'learn' },
    ],
    links: [{ label: 'E2 needs the anti arrangement', href: '#conformations/bromobutane/anti' }, { label: 'Zaitsev vs Hofmann (E2)', href: '#mechanisms/e2' }],
  },
  {
    id: 'bromobutane', name: '2-Bromobutane (E2 geometry)', formula: 'CH₃–CHBr–CH₂–CH₃', axis: ['C2', 'C3'], reference: ['Br', 'C2', 'C3', 'Hb'], period: 360,
    graph: {
      atoms: [{ id: 'C1', el: 'C' }, { id: 'C2', el: 'C' }, { id: 'C3', el: 'C' }, { id: 'C4', el: 'C' }, { id: 'Br', el: 'Br', lonePairs: 3 }, H('H1a'), H('H1b'), H('H1c'), H('H2'), H('Hb'), H('H3b'), H('H4a'), H('H4b'), H('H4c')],
      bonds: [bond('C1', 'C2'), bond('C2', 'C3'), bond('C3', 'C4'), bond('C2', 'Br'), bond('C1', 'H1a'), bond('C1', 'H1b'), bond('C1', 'H1c'), bond('C2', 'H2'), bond('C3', 'Hb'), bond('C3', 'H3b'), bond('C4', 'H4a'), bond('C4', 'H4b'), bond('C4', 'H4c')],
    },
    landmarks: [{ id: 'anti', label: 'Anti-periplanar (E2-ready)', phi: 180 }, { id: 'gauche', label: 'Gauche (no overlap)', phi: 60 }, { id: 'syn', label: 'Syn-periplanar (eclipsed)', phi: 0 }],
    energy: null,
    labels: { C1: 'CH₃', C4: 'CH₃', Hb: 'Hβ' },
    facts: [
      { title: 'E2 removes Hβ and Br in one step', detail: 'The base takes the β-hydrogen while bromide leaves; the electrons of the breaking C–H bond become the new π bond. For that they have to flow into the σ* orbital of the C–Br bond.' },
      { title: 'Anti-periplanar: 180° lines the orbitals up', detail: 'With Br–C–C–Hβ at 180° the C–H bond and the C–Br σ* orbital lie in one plane, pointing opposite ways, with nothing in between. At 60° they are out of plane; at 0° (syn) they are aligned but eclipsed and crowded.' },
      { title: 'This is why E2 has stereochemistry', detail: 'Only the hydrogen that can reach 180° from the leaving group is removed, which fixes which alkene (E or Z, Zaitsev or Hofmann) forms. The Reaction lab\'s E2 starts from exactly this dihedral.', audience: 'learn' },
    ],
    links: [{ label: 'Watch E2', href: '#mechanisms/e2' }, { label: 'Anti-periplanar', href: '#glossary/anti-periplanar' }, { label: 'Alkyl halides', href: '#functional-groups/haloalkane' }],
  },
];
export const rotorById = (id) => ROTORS.find((r) => r.id === id) || null;

// ---- torsional energy -------------------------------------------------------------------------
/**
 * Fit V1, V2, V3 of E(φ) = ½V1(1+cos φ) + ½V2(1−cos 2φ) + ½V3(1+cos 3φ) so the curve passes through the
 * textbook butane points (anti 0 at 180°, gauche at 60°, CH₃/H eclipsed at 120°, CH₃/CH₃ eclipsed at 0°).
 * Three unknowns, three points beyond the anti zero: solved in closed form.
 */
function fitButane({ gauche, eclipsedCH3H, eclipsedCH3CH3 }) {
  // gauche (60°): 0.75 V1 + 0.75 V2 = g ; CH3/H (120°): 0.25 V1 + 0.75 V2 + V3 = e ; CH3/CH3 (0°): V1 + V3 = f
  const g = gauche, e = eclipsedCH3H, f = eclipsedCH3CH3;
  const V1 = (f - e + 0.75 * (g / 0.75)) / 1.5;           // from f − V1 − 0.5 V1 = e − g  →  V1 = (f − e + g) / 1.5
  const V2 = g / 0.75 - V1;
  const V3 = f - V1;
  return { V1, V2, V3 };
}
const butaneFit = fitButane(TORSION_ENERGIES.butane);

/** Torsional energy (kJ/mol above the lowest conformer) of a rotor at dihedral phi (degrees). */
export function torsionEnergy(id, phi) {
  const p = phi * DEG;
  if (id === 'ethane') return (TORSION_ENERGIES.ethane.barrier / 2) * (1 + Math.cos(3 * p));
  if (id === 'butane') { const { V1, V2, V3 } = butaneFit; return 0.5 * V1 * (1 + Math.cos(p)) + 0.5 * V2 * (1 - Math.cos(2 * p)) + 0.5 * V3 * (1 + Math.cos(3 * p)); }
  return null;
}

/** Name of the conformation at phi for a rotor: the nearest landmark within 15°, else 'skew' / 'gauche-like'. */
export function conformationName(id, phi) {
  const r = rotorById(id);
  if (!r) return null;
  const d = (a, b) => { const x = Math.abs(((a - b) % 360) + 360) % 360; return Math.min(x, 360 - x); };
  for (const l of r.landmarks) {
    const period = r.period;
    const candidates = []; for (let k = -2; k <= 2; k++) candidates.push(l.phi + k * period);
    if (candidates.some((c) => d(c, phi) <= 15)) return l.label;
  }
  return 'Skew';
}

// ---- frames --------------------------------------------------------------------------------------
const base = new Map();
function baseFrame(r) {
  if (base.has(r.id)) return base.get(r.id);
  const e = embed(r.graph, { root: r.axis[0] });
  relaxTorsions(r.graph, e.positions, e.lonePairDirs, e.orbitals, e.frames);
  // Put the looked-down bond on x with the front carbon toward +x (toward the viewer of the Newman view).
  const a = e.positions.get(r.axis[0]), b = e.positions.get(r.axis[1]);
  const R = m3.fromTo(v.norm(v.sub(a, b)), [1, 0, 0]);
  const mid = v.mid(a, b);
  for (const [id, p] of e.positions) e.positions.set(id, m3.apply(R, v.sub(p, mid)));
  for (const [id, dirs] of e.lonePairDirs) e.lonePairDirs.set(id, dirs.map((d) => m3.apply(R, d)));
  const adj = new Map(r.graph.atoms.map((x) => [x.id, []]));
  for (const bd of r.graph.bonds) { adj.get(bd.a).push(bd.b); adj.get(bd.b).push(bd.a); }
  const back = new Set([r.axis[1]]); const q = [r.axis[1]];
  while (q.length) { const x = q.shift(); for (const n of adj.get(x)) if (n !== r.axis[0] && !back.has(n)) { back.add(n); q.push(n); } }
  const out = { positions: e.positions, lonePairDirs: e.lonePairDirs, orbitals: e.orbitals, back };
  base.set(r.id, out);
  return out;
}

/**
 * Frame of a rotor with its reference dihedral set to phi (degrees): the back side of the looked-down
 * bond is rotated rigidly about it, so every bond length and angle is the embedder's. Returns
 * { frame, phi, dihedral (as measured), conformation, energy (kJ/mol or null), front, back }.
 */
export function conformer(id, phi) {
  const r = rotorById(id);
  if (!r) throw new Error(`conformer(): unknown rotor ${id}`);
  const b = baseFrame(r);
  const [p1, p2, p3, p4] = r.reference;
  const current = dihedral(b.positions.get(p1), b.positions.get(p2), b.positions.get(p3), b.positions.get(p4)) / DEG;
  const axis = v.norm(v.sub(b.positions.get(r.axis[1]), b.positions.get(r.axis[0])));
  const origin = b.positions.get(r.axis[1]);
  const R = m3.axisAngle(axis, (current - phi) * DEG);   // a +θ turn of the back side about b→c lowers the dihedral by θ
  const positions = new Map();
  for (const [aid, p] of b.positions) positions.set(aid, b.back.has(aid) ? v.add(origin, m3.apply(R, v.sub(p, origin))) : p);
  const lonePairDirs = new Map();
  for (const [aid, dirs] of b.lonePairDirs) lonePairDirs.set(aid, b.back.has(aid) ? dirs.map((d) => m3.apply(R, d)) : dirs);
  const measured = dihedral(positions.get(p1), positions.get(p2), positions.get(p3), positions.get(p4)) / DEG;
  const frame = toFrame(r.graph, positions, lonePairDirs, b.orbitals);
  return { frame, phi, dihedral: measured, conformation: conformationName(id, phi), energy: torsionEnergy(id, phi), front: r.axis[0], back: r.axis[1], rotor: r };
}

/** For the E2 rotor: how well the C–Hβ bond lines up with the C–Br bond, 1 at anti-periplanar (180°) and syn (0°), 0 at 90°. A teaching cartoon of σ/σ* overlap, not a computed overlap integral. */
export const periplanarity = (phi) => Math.abs(Math.cos(phi * DEG));
