// Cyclohexane for the Conformations topic: a chair with one substituent on C1, the ring-flipped chair
// (the same substituent now equatorial) and the boat, all from the rigid ring templates in geometry.js
// with the substituent embedded and torsion-relaxed as any R group is. Energies are tabulated textbook
// values only (A_VALUES, RING_CONFORMER_ENERGIES in references/textbook.js): nothing is computed from
// the drawn geometry (docs/REVIEW_PROTOCOL.md §6). Pure and dependency-free.
import { ringTemplate, embed, relaxTorsions, stericContacts, rotateDirs, v, m3, DEG } from './geometry.js';
import { toFrame, prefixGroup } from './builder.js';
import { R_GROUPS } from './rGroups.js';
import { A_VALUES, RING_CONFORMER_ENERGIES } from './references/textbook.js';

const halo = (el) => ({ atoms: [{ id: 'X', el, lonePairs: 3 }], bonds: [], attach: 'X' });
/** Substituent fragments: the shared R groups where one exists, small local graphs otherwise. */
const GROUPS = {
  H: R_GROUPS.H, methyl: R_GROUPS.methyl, ethyl: R_GROUPS.ethyl, isopropyl: R_GROUPS.isopropyl, tBu: R_GROUPS.tBu, phenyl: R_GROUPS.phenyl, CF3: R_GROUPS.CF3,
  OH: { atoms: [{ id: 'O', el: 'O', lonePairs: 2 }, { id: 'H', el: 'H' }], bonds: [{ a: 'O', b: 'H', order: 1 }], attach: 'O' },
  F: halo('F'), Cl: halo('Cl'), Br: halo('Br'), I: halo('I'),
  CN: { atoms: [{ id: 'C', el: 'C' }, { id: 'N', el: 'N', lonePairs: 1 }], bonds: [{ a: 'C', b: 'N', order: 3 }], attach: 'C' },
};

/** Substituents offered on C1, in menu order. Each has an A-value row of the same id. */
export const CHAIR_SUBSTITUENTS = [
  { id: 'H', label: 'H (cyclohexane itself)', formula: 'H', name: 'Cyclohexane' },
  { id: 'methyl', label: 'Methyl', formula: 'CH₃', name: 'Methylcyclohexane' },
  { id: 'ethyl', label: 'Ethyl', formula: 'CH₂CH₃', name: 'Ethylcyclohexane' },
  { id: 'isopropyl', label: 'Isopropyl', formula: 'CH(CH₃)₂', name: 'Isopropylcyclohexane' },
  { id: 'tBu', label: 'tert-Butyl', formula: 'C(CH₃)₃', name: 'tert-Butylcyclohexane' },
  { id: 'phenyl', label: 'Phenyl', formula: 'C₆H₅', name: 'Phenylcyclohexane' },
  { id: 'CF3', label: 'Trifluoromethyl', formula: 'CF₃', name: '(Trifluoromethyl)cyclohexane' },
  { id: 'OH', label: 'Hydroxyl', formula: 'OH', name: 'Cyclohexanol' },
  { id: 'F', label: 'Fluoro', formula: 'F', name: 'Fluorocyclohexane' },
  { id: 'Cl', label: 'Chloro', formula: 'Cl', name: 'Chlorocyclohexane' },
  { id: 'Br', label: 'Bromo', formula: 'Br', name: 'Bromocyclohexane' },
  { id: 'I', label: 'Iodo', formula: 'I', name: 'Iodocyclohexane' },
  { id: 'CN', label: 'Cyano', formula: 'CN', name: 'Cyclohexanecarbonitrile' },
];
export const substituentById = (id) => CHAIR_SUBSTITUENTS.find((s) => s.id === id) || null;

/** The three ring forms drawn. `flip` mirrors the chair through its mean plane: the C1 "up" site turns from axial to equatorial. */
export const RING_FORMS = [
  { id: 'axial', label: 'Chair, X axial', short: 'Chair A', shape: 'cyclohexaneChair', flip: false },
  { id: 'equatorial', label: 'Chair, X equatorial (ring flipped)', short: 'Chair B', shape: 'cyclohexaneChair', flip: true },
  { id: 'boat', label: 'Boat, X flagpole', short: 'Boat', shape: 'cyclohexaneBoat', flip: false },
];
export const formById = (id) => RING_FORMS.find((f) => f.id === id) || null;

/** The lesson item the Conformations panel lists beside the rotors. */
export const CHAIR = {
  id: 'cyclohexane', name: 'Cyclohexane', formula: 'C₆H₁₂',
  landmarks: RING_FORMS.map((f) => ({ id: f.id, label: f.label })),
  facts: [
    { title: 'The chair has no eclipsed bonds', detail: 'Every C–C bond of the chair is staggered and every C–C–C angle is close to tetrahedral (measured 111.3°), so cyclohexane is almost strain-free: the reference point for every other ring.' },
    { title: 'Two kinds of position: six axial, six equatorial', detail: 'Axial bonds run parallel to the ring axis, alternating up and down around the ring; equatorial bonds point outward, roughly along the ring\'s rim. Every carbon has one of each.' },
    { title: 'A ring flip swaps them without breaking a bond', detail: 'Rotating about the ring bonds turns one chair into the other through a half-chair (≈ 45 kJ/mol) and a twist-boat (≈ 23 kJ/mol). Every axial substituent becomes equatorial and vice versa; up stays up.' },
    { title: 'Axial substituents meet the 1,3-diaxial hydrogens', detail: 'An axial group on C1 sits parallel to the axial hydrogens on C3 and C5 and crowds them: each contact is a gauche-butane interaction (3.8 kJ/mol), so a methyl pays about twice that, 7.3 kJ/mol, for being axial.', audience: 'learn' },
    { title: 'The A-value is that preference, as a number', detail: 'A = ΔG° by which the equatorial chair lies below the axial one. Methyl 7.3, isopropyl 9.0, tert-butyl ≈ 20 kJ/mol: a tert-butyl group is so costly axial that the ring is effectively locked in the chair that keeps it equatorial.', audience: 'learn' },
    { title: 'The boat is not the alternative, it is the hill', detail: 'The boat (≈ 29 kJ/mol above the chair) eclipses two pairs of ring bonds and points its two flagpole hydrogens at each other; it relaxes to the twist-boat, which is still the pass between the chairs, never a resting place.', audience: 'learn' },
  ],
  links: [
    { label: 'Gauche butane (the same clash)', href: '#conformations/butane/gauche' },
    { label: 'Torsional vs steric strain', href: '#glossary/torsional-strain' },
    { label: 'Axial and equatorial', href: '#glossary/axial-equatorial' },
    { label: 'Methane in Molecular shapes', href: '#molecular-shapes/methane' },
  ],
};

/** kJ/mol per kcal/mol. */
export const KCAL = 4.184;
/** Fraction of molecules in the equatorial chair at temperature T from an A-value (kJ/mol): K = exp(A/RT). */
export function equatorialFraction(aKJ, T = 298.15) {
  const K = Math.exp((aKJ * 1000) / (8.314 * T));
  return K / (1 + K);
}

/**
 * The energy shown for a (substituent, form), always a table lookup: the A-value for the axial chair,
 * 0 for the equatorial chair, the parent cyclohexane boat value for the boat.
 * Returns { value (kJ/mol), kcal, unit, source, basis: 'table', note }.
 */
export function chairEnergy(subId, formId) {
  const a = A_VALUES.values[subId];
  if (!a) throw new Error(`chairEnergy(): no A-value for ${subId}`);
  if (formId === 'axial') return { value: a.kJ, kcal: a.kcal, unit: A_VALUES.unit, source: A_VALUES.source, basis: 'table', note: subId === 'H' ? 'the two chairs of cyclohexane are identical' : `A-value of ${subId}: the axial chair lies this far above the equatorial one${a.note ? ` (${a.note})` : ''}` };
  if (formId === 'equatorial') return { value: 0, kcal: 0, unit: A_VALUES.unit, source: A_VALUES.source, basis: 'table', note: subId === 'H' ? 'the two chairs of cyclohexane are identical' : 'the preferred chair: the reference for the A-value' };
  if (formId === 'boat') { const r = RING_CONFORMER_ENERGIES.cyclohexane; return { value: r.boat, kcal: Math.round((r.boat / KCAL) * 10) / 10, unit: r.unit, source: r.source, basis: 'table', note: 'cyclohexane itself: the boat above the chair (substituted boats are not tabulated)' }; }
  throw new Error(`chairEnergy(): unknown form ${formId}`);
}

// ---- frames --------------------------------------------------------------------------------------
const AXIAL_TILT = 35;                       // a C–X bond within this many degrees of the ring axis is axial (chair) / flagpole (boat)
const VIEW = m3.fromColumns([1, 0, 0], [0, 0, -1], [0, 1, 0]);   // template z (ring axis) → screen y (up); template y → −z
const cache = new Map();

/**
 * Frame of cyclohexane with substituent `subId` on C1 in ring form `formId`. The ring is the rigid
 * template (its own coordinates, axis vertical); the substituent is embedded and torsion-relaxed.
 * Returns { frame, sub, form, site ('axial' | 'equatorial' | 'flagpole' | 'bowsprit'), tilt (° of C1–X
 * from the ring axis, in the drawn frame), attach, group (atom ids of X), diaxial (ids of the ring H's
 * X faces), contact ({ a, b, d } closest X···H among them, or null), energy, crowding, ring }.
 */
export function cyclohexaneFrame(subId, formId) {
  const key = `${subId}/${formId}`;
  if (cache.has(key)) return cache.get(key);
  const sub = substituentById(subId), form = formById(formId);
  if (!sub) throw new Error(`cyclohexaneFrame(): unknown substituent ${subId}`);
  if (!form) throw new Error(`cyclohexaneFrame(): unknown form ${formId}`);
  const ring = ringTemplate(form.shape, { prefix: 'ring.', attachAt: 'C1', attachSite: 'up', flip: form.flip });
  const g = prefixGroup(GROUPS[subId], 'X.');
  const graph = {
    atoms: [...ring.atoms, ...g.atoms],
    bonds: [...ring.bonds, ...g.bonds, { a: 'ring.C1', b: g.attach, order: 1 }],
    rigid: [ring.rigid, ...(g.rigid ? [g.rigid] : [])],
  };
  const e = embed(graph, { root: 'ring.C1' });
  relaxTorsions(graph, e.positions, e.lonePairDirs, e.orbitals, e.frames);
  // Express everything in the template's own coordinates (the ring was placed rigidly: pos = t + R·local).
  const L = ring.rigid.coords, P = e.positions;
  const basis = (c1, c2, c3) => { const a = v.norm(v.sub(c2, c1)); const b = v.norm(v.perp(v.sub(c3, c1), a)); return m3.fromColumns(a, b, v.cross(a, b)); };
  const Rl = basis(L['ring.C1'], L['ring.C2'], L['ring.C3']), Rw = basis(P.get('ring.C1'), P.get('ring.C2'), P.get('ring.C3'));
  const back = m3.mul(VIEW, m3.mul(Rl, m3.transpose(Rw)));          // world → template → view
  const origin = P.get('ring.C1'), originL = m3.apply(VIEW, L['ring.C1']);
  const positions = new Map();
  for (const [id, p] of P) positions.set(id, v.add(originL, m3.apply(back, v.sub(p, origin))));
  const lonePairDirs = rotateDirs(e.lonePairDirs, back), orbitals = rotateDirs(e.orbitals, back);
  const crowding = stericContacts(graph, positions);
  const frame = toFrame(graph, positions, lonePairDirs, orbitals, { crowding });
  // Site of X: angle between C1→X and the ring axis (screen y), in the drawn frame.
  const axis = [0, 1, 0];
  const dX = v.norm(v.sub(positions.get(g.attach), positions.get('ring.C1')));
  const tiltRaw = Math.acos(Math.max(-1, Math.min(1, v.dot(dX, axis)))) / DEG;
  const tilt = Math.min(tiltRaw, 180 - tiltRaw);
  const chair = form.shape === 'cyclohexaneChair';
  const site = tilt <= AXIAL_TILT ? (chair ? 'axial' : 'flagpole') : (chair ? 'equatorial' : 'bowsprit');
  // Ring hydrogens that X faces: on carbons other than C1 and its neighbours, pointing the same way along the axis.
  const sideX = Math.sign(dX[1]);
  const diaxial = [];
  if (tilt <= AXIAL_TILT) {
    for (const b of ring.bonds) {
      const [c, hId] = b.a.startsWith('ring.C') && b.b.startsWith('ring.H') ? [b.a, b.b] : b.b.startsWith('ring.C') && b.a.startsWith('ring.H') ? [b.b, b.a] : [null, null];
      if (!hId || ['ring.C1', 'ring.C2', 'ring.C6'].includes(c)) continue;
      const d = v.norm(v.sub(positions.get(hId), positions.get(c)));
      const t = Math.acos(Math.max(-1, Math.min(1, v.dot(d, axis)))) / DEG;
      if (Math.min(t, 180 - t) <= AXIAL_TILT && Math.sign(d[1]) === sideX) diaxial.push(hId);
    }
  }
  const group = g.atoms.map((a) => a.id);
  let contact = null;
  for (const x of group) for (const hId of diaxial) { const d = v.dist(positions.get(x), positions.get(hId)); if (!contact || d < contact.d) contact = { a: x, b: hId, d }; }
  const out = { frame, sub, form, site, tilt, attach: g.attach, group, diaxial, contact, energy: chairEnergy(subId, formId), crowding, ring: ring.ring };
  cache.set(key, out);
  return out;
}
