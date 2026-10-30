// Cyclohexane for the Conformations topic: a chair with one substituent on C1 (and optionally a second
// on C2, C3 or C4, cis or trans), the ring-flipped chair (every axial group now equatorial and back) and
// the boat, all from the rigid ring templates in geometry.js with the substituents embedded and
// torsion-relaxed as any R group. Energies are tabulated textbook values only (A_VALUES, DIAXIAL_PAIRS,
// RING_CONFORMER_ENERGIES in references/textbook.js): nothing is computed from the drawn geometry
// (docs/REVIEW_PROTOCOL.md §6). Pure and dependency-free.
import { ringTemplate, embed, relaxTorsions, stericContacts, rotateDirs, v, m3, DEG } from './geometry.js';
import { toFrame, prefixGroup } from './builder.js';
import { R_GROUPS } from './rGroups.js';
import { A_VALUES, DIAXIAL_PAIRS, RING_CONFORMER_ENERGIES } from './references/textbook.js';

const halo = (el) => ({ atoms: [{ id: 'X', el, lonePairs: 3 }], bonds: [], attach: 'X' });
/** Substituent fragments: the shared R groups where one exists, small local graphs otherwise. */
const GROUPS = {
  H: R_GROUPS.H, methyl: R_GROUPS.methyl, ethyl: R_GROUPS.ethyl, isopropyl: R_GROUPS.isopropyl, tBu: R_GROUPS.tBu, phenyl: R_GROUPS.phenyl, CF3: R_GROUPS.CF3,
  OH: { atoms: [{ id: 'O', el: 'O', lonePairs: 2 }, { id: 'H', el: 'H' }], bonds: [{ a: 'O', b: 'H', order: 1 }], attach: 'O' },
  F: halo('F'), Cl: halo('Cl'), Br: halo('Br'), I: halo('I'),
  CN: { atoms: [{ id: 'C', el: 'C' }, { id: 'N', el: 'N', lonePairs: 1 }], bonds: [{ a: 'C', b: 'N', order: 3 }], attach: 'C' },
};

/** Substituents offered, in menu order. Each has an A-value row of the same id. `prefix` is the IUPAC substituent prefix. */
export const CHAIR_SUBSTITUENTS = [
  { id: 'H', label: 'H (cyclohexane itself)', formula: 'H', name: 'Cyclohexane', prefix: null },
  { id: 'methyl', label: 'Methyl', formula: 'CH₃', name: 'Methylcyclohexane', prefix: 'methyl' },
  { id: 'ethyl', label: 'Ethyl', formula: 'CH₂CH₃', name: 'Ethylcyclohexane', prefix: 'ethyl' },
  { id: 'isopropyl', label: 'Isopropyl', formula: 'CH(CH₃)₂', name: 'Isopropylcyclohexane', prefix: 'isopropyl' },
  { id: 'tBu', label: 'tert-Butyl', formula: 'C(CH₃)₃', name: 'tert-Butylcyclohexane', prefix: 'tert-butyl' },
  { id: 'phenyl', label: 'Phenyl', formula: 'C₆H₅', name: 'Phenylcyclohexane', prefix: 'phenyl' },
  { id: 'CF3', label: 'Trifluoromethyl', formula: 'CF₃', name: '(Trifluoromethyl)cyclohexane', prefix: '(trifluoromethyl)' },
  { id: 'OH', label: 'Hydroxyl', formula: 'OH', name: 'Cyclohexanol', prefix: 'hydroxy' },
  { id: 'F', label: 'Fluoro', formula: 'F', name: 'Fluorocyclohexane', prefix: 'fluoro' },
  { id: 'Cl', label: 'Chloro', formula: 'Cl', name: 'Chlorocyclohexane', prefix: 'chloro' },
  { id: 'Br', label: 'Bromo', formula: 'Br', name: 'Bromocyclohexane', prefix: 'bromo' },
  { id: 'I', label: 'Iodo', formula: 'I', name: 'Iodocyclohexane', prefix: 'iodo' },
  { id: 'CN', label: 'Cyano', formula: 'CN', name: 'Cyclohexanecarbonitrile', prefix: 'cyano' },
];
export const substituentById = (id) => CHAIR_SUBSTITUENTS.find((s) => s.id === id) || null;

/** The three ring forms drawn. `flip` mirrors the chair through its mean plane: the C1 "up" site turns from axial to equatorial. */
export const RING_FORMS = [
  { id: 'axial', label: 'Chair, X axial', short: 'Chair A', shape: 'cyclohexaneChair', flip: false },
  { id: 'equatorial', label: 'Chair, X equatorial (ring flipped)', short: 'Chair B', shape: 'cyclohexaneChair', flip: true },
  { id: 'boat', label: 'Boat, X flagpole', short: 'Boat', shape: 'cyclohexaneBoat', flip: false },
];
export const formById = (id) => RING_FORMS.find((f) => f.id === id) || null;
/** Positions a second substituent Y can take relative to X on C1, and the two ways it can sit. */
export const POSITIONS = [{ id: 2, label: '1,2' }, { id: 3, label: '1,3' }, { id: 4, label: '1,4' }];
export const RELATIONS = ['cis', 'trans'];

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
    { title: 'Two substituents: cis/trans is fixed, axial/equatorial is not', detail: 'Cis means both groups on the same face of the ring, trans means opposite faces; a flip cannot change that. What the flip changes is which of them is axial. Each isomer therefore has two chairs, and the one with more (and bigger) groups equatorial wins.' },
    { title: 'Which isomer can put both groups equatorial', detail: 'trans-1,2, cis-1,3 and trans-1,4 have a diequatorial chair; cis-1,2, trans-1,3 and cis-1,4 are always one axial, one equatorial. So trans-1,2-dimethylcyclohexane is more stable than cis, but for 1,3 it is the cis isomer that wins.', audience: 'learn' },
    { title: 'Adding A-values is the textbook estimate', detail: 'The energy of a chair is taken as the sum of the A-values of its axial groups. Two axial groups 1,3 to each other also crowd one another, which is worse than the sum: for two methyls textbooks give 15.5 kJ/mol in place of 2 × 7.3.', audience: 'learn' },
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
const R_GAS = 8.314;
/** Fraction of molecules in the equatorial chair at temperature T from an A-value (kJ/mol): K = exp(A/RT). */
export function equatorialFraction(aKJ, T = 298.15) {
  const K = Math.exp((aKJ * 1000) / (R_GAS * T));
  return K / (1 + K);
}
/** Fraction in a chair whose rival lies `deltaKJ` above it (negative: below), at T. */
export const chairFraction = (deltaKJ, T = 298.15) => equatorialFraction(deltaKJ, T);

/**
 * Where a site sits on a chair, from the template alone: on the unflipped chair the odd carbons (C1, C3,
 * C5) are "up" carbons whose up site is axial; the even ones have their down site axial. The flip
 * reverses it. `key` is 'up' | 'down'.
 */
export function chairSiteRule(flip, carbon, key) {
  const upCarbon = (carbon % 2 === 1) !== !!flip;
  return (key === 'up') === upCarbon ? 'axial' : 'equatorial';
}
/** Y's site key: cis puts it on X's face (up), trans on the other. */
const relKey = (rel) => (rel === 'cis' ? 'up' : 'down');

/** Validate and normalise a second substituent { sub, position, rel }; null means none (or sub 'H'). */
export function normaliseSecond(second) {
  if (!second || !second.sub || second.sub === 'H') return null;
  const sub = substituentById(second.sub); const position = Number(second.position); const rel = second.rel;
  if (!sub) throw new Error(`cyclohexane: unknown substituent ${second.sub}`);
  if (!POSITIONS.some((p) => p.id === position)) throw new Error(`cyclohexane: position must be 2, 3 or 4, got ${second.position}`);
  if (!RELATIONS.includes(rel)) throw new Error(`cyclohexane: relation must be cis or trans, got ${rel}`);
  return { sub: sub.id, position, rel };
}

/**
 * The energy shown for a chair, always a table lookup: the sum of the A-values of the axial groups
 * (the textbook additive estimate), replaced by the tabulated 1,3-diaxial pair value where two
 * non-hydrogen groups are axial 1,3 to each other and the pair is tabulated; 0 when nothing is axial;
 * the parent cyclohexane boat value for the boat. Returns { value, kcal, unit, source, basis: 'table',
 * note, terms: [{ role, sub, site, kJ }], pair }.
 */
export function chairEnergy(subId, formId, second = null) {
  const a = A_VALUES.values[subId];
  if (!a) throw new Error(`chairEnergy(): no A-value for ${subId}`);
  const sec = normaliseSecond(second);
  const form = formById(formId);
  if (!form) throw new Error(`chairEnergy(): unknown form ${formId}`);
  if (formId === 'boat') {
    if (sec) throw new Error('chairEnergy(): the boat is drawn for one substituent only');
    const r = RING_CONFORMER_ENERGIES.cyclohexane;
    return { value: r.boat, kcal: Math.round((r.boat / KCAL) * 10) / 10, unit: r.unit, source: r.source, basis: 'table', note: 'cyclohexane itself: the boat above the chair (substituted boats are not tabulated)', terms: [], pair: null };
  }
  const terms = [{ role: 'X', sub: subId, site: chairSiteRule(form.flip, 1, 'up'), kJ: 0 }];
  if (sec) terms.push({ role: 'Y', sub: sec.sub, site: chairSiteRule(form.flip, sec.position, relKey(sec.rel)), kJ: 0 });
  for (const t of terms) if (t.site === 'axial' && t.sub !== 'H') t.kJ = A_VALUES.values[t.sub].kJ;
  const axial = terms.filter((t) => t.site === 'axial' && t.sub !== 'H');
  let value = axial.reduce((s, t) => s + t.kJ, 0), pair = null, note;
  if (axial.length === 2 && sec.position === 3) {
    const key = [axial[0].sub, axial[1].sub].sort().join('/');
    const row = DIAXIAL_PAIRS.values[key];
    if (row) { pair = { key, ...row }; value = row.kJ; note = `both groups axial and 1,3 to each other: the tabulated 1,3-diaxial ${key} value replaces the sum of A-values (${axial.map((t) => t.kJ).join(' + ')})`; }
    else note = `sum of the A-values of the axial groups (${axial.map((t) => `${t.sub} ${t.kJ}`).join(' + ')}); the two also crowd each other 1,3-diaxially, which is not tabulated for this pair, so this is a lower estimate`;
  } else if (axial.length === 2) note = `sum of the A-values of the two axial groups (${axial.map((t) => `${t.sub} ${t.kJ}`).join(' + ')}), the textbook additive estimate`;
  else if (axial.length === 1) note = sec ? `A-value of the one axial group (${axial[0].sub}); the equatorial group costs nothing in this estimate` : subId === 'H' ? 'the two chairs of cyclohexane are identical' : `A-value of ${subId}: the axial chair lies this far above the equatorial one${a.note ? ` (${a.note})` : ''}`;
  else note = sec ? 'both groups equatorial: the reference chair, 0 by the additive estimate' : subId === 'H' ? 'the two chairs of cyclohexane are identical' : 'the preferred chair: the reference for the A-value';
  const source = pair ? `${DIAXIAL_PAIRS.source}; ${A_VALUES.source}` : A_VALUES.source;
  return { value, kcal: Math.round((value / KCAL) * 100) / 100, unit: A_VALUES.unit, source, basis: 'table', note, terms, pair };
}

const prefixOf = (id) => substituentById(id).prefix;
const DI = { methyl: 'dimethyl', ethyl: 'diethyl', isopropyl: 'diisopropyl', tBu: 'di-tert-butyl', phenyl: 'diphenyl', CF3: 'bis(trifluoromethyl)', F: 'difluoro', Cl: 'dichloro', Br: 'dibromo', I: 'diiodo', CN: 'dicyano' };
const alphaKey = (p) => p.replace(/^\(|\)$/g, '').replace(/^tert-/, '');
/** IUPAC-style name of the drawn molecule: numbering from X on C1 (the ring is symmetric, so the locants are the lowest either way). */
export function cyclohexaneName(subId, second = null) {
  const sec = normaliseSecond(second);
  if (!sec) return substituentById(subId).name;
  const X = substituentById(subId), Y = substituentById(sec.sub), p = sec.position, rel = sec.rel;
  if (subId === 'H') return Y.name;
  if (X.id === Y.id) {
    if (X.id === 'OH') return `${rel}-Cyclohexane-1,${p}-diol`;
    if (X.id === 'CN') return `${rel}-Cyclohexane-1,${p}-dicarbonitrile`;
    return `${rel}-1,${p}-${DI[X.id]}cyclohexane`;
  }
  if (X.id === 'OH' || Y.id === 'OH') { const other = X.id === 'OH' ? Y : X; return `${rel}-${p}-${other.prefix}cyclohexan-1-ol`; }
  if (X.id === 'CN' || Y.id === 'CN') { const other = X.id === 'CN' ? Y : X; return `${rel}-${p}-${other.prefix}cyclohexane-1-carbonitrile`; }
  const [first, secondP] = [X, Y].sort((u, w) => alphaKey(u.prefix).localeCompare(alphaKey(w.prefix)));
  return `${rel}-1-${first.prefix}-${p}-${secondP.prefix}cyclohexane`;
}

// ---- frames --------------------------------------------------------------------------------------
const AXIAL_TILT = 35;                       // a C–X bond within this many degrees of the ring axis is axial (chair) / flagpole (boat)
const VIEW = m3.fromColumns([1, 0, 0], [0, 0, -1], [0, 1, 0]);   // template z (ring axis) → screen y (up); template y → −z
const cache = new Map();
const AXIS = [0, 1, 0];
const tiltOf = (d) => { const t = Math.acos(Math.max(-1, Math.min(1, v.dot(v.norm(d), AXIS)))) / DEG; return Math.min(t, 180 - t); };

/**
 * Frame of cyclohexane with substituent `subId` on C1 (and `second` = { sub, position, rel } on C2–C4)
 * in ring form `formId`. The ring is the rigid template (its own coordinates, axis vertical); the
 * substituents are embedded and torsion-relaxed. Returns { frame, sub, form, second, name, groups:
 * [{ role, sub, carbon, attach, atoms, site, tilt, partners, contact }], energy, other (the other
 * chair's energy, chairs only), fraction (share in this chair at 298 K, chairs only), crowding, ring }
 * plus X's fields at top level (site, tilt, attach, group, diaxial, contact) for the one-group case.
 */
export function cyclohexaneFrame(subId, formId, second = null) {
  const sec = normaliseSecond(second);
  const key = `${subId}/${formId}/${sec ? `${sec.sub}/${sec.position}/${sec.rel}` : '-'}`;
  if (cache.has(key)) return cache.get(key);
  const sub = substituentById(subId), form = formById(formId);
  if (!sub) throw new Error(`cyclohexaneFrame(): unknown substituent ${subId}`);
  if (!form) throw new Error(`cyclohexaneFrame(): unknown form ${formId}`);
  if (sec && formId === 'boat') throw new Error('cyclohexaneFrame(): the boat is drawn for one substituent only');
  // Template with C1's up site free for X and (for Y) the chosen site freed by a placeholder we remove.
  const ring = ringTemplate(form.shape, { prefix: 'ring.', attachAt: 'C1', attachSite: 'up', flip: form.flip, substituents: sec ? { [`C${sec.position}`]: { [relKey(sec.rel)]: { id: '_free', el: 'H' } } } : {} });
  const FREE = 'ring._free';
  const ringAtoms = ring.atoms.filter((a) => a.id !== FREE), ringBonds = ring.bonds.filter((b) => b.a !== FREE && b.b !== FREE);
  const coords = { ...ring.rigid.coords }; delete coords[FREE];
  const rigidRing = { ...ring.rigid, atoms: ring.rigid.atoms.filter((id) => id !== FREE), coords };
  const specs = [{ role: 'X', sub, carbon: 'ring.C1', g: prefixGroup(GROUPS[subId], 'X.') }];
  if (sec) specs.push({ role: 'Y', sub: substituentById(sec.sub), carbon: `ring.C${sec.position}`, g: prefixGroup(GROUPS[sec.sub], 'Y.') });
  const graph = {
    atoms: [...ringAtoms, ...specs.flatMap((s) => s.g.atoms)],
    bonds: [...ringBonds, ...specs.flatMap((s) => [...s.g.bonds, { a: s.carbon, b: s.g.attach, order: 1 }])],
    rigid: [rigidRing, ...specs.filter((s) => s.g.rigid).map((s) => s.g.rigid)],
  };
  const e = embed(graph, { root: 'ring.C1' });
  relaxTorsions(graph, e.positions, e.lonePairDirs, e.orbitals, e.frames);
  // Express everything in the template's own coordinates (the ring was placed rigidly: pos = t + R·local).
  const L = coords, P = e.positions;
  const basis = (c1, c2, c3) => { const a = v.norm(v.sub(c2, c1)); const b = v.norm(v.perp(v.sub(c3, c1), a)); return m3.fromColumns(a, b, v.cross(a, b)); };
  const Rl = basis(L['ring.C1'], L['ring.C2'], L['ring.C3']), Rw = basis(P.get('ring.C1'), P.get('ring.C2'), P.get('ring.C3'));
  const back = m3.mul(VIEW, m3.mul(Rl, m3.transpose(Rw)));          // world → template → view
  const origin = P.get('ring.C1'), originL = m3.apply(VIEW, L['ring.C1']);
  const positions = new Map();
  for (const [id, p] of P) positions.set(id, v.add(originL, m3.apply(back, v.sub(p, origin))));
  const lonePairDirs = rotateDirs(e.lonePairDirs, back), orbitals = rotateDirs(e.orbitals, back);
  const crowding = stericContacts(graph, positions);
  const frame = toFrame(graph, positions, lonePairDirs, orbitals, { crowding });
  const chair = form.shape === 'cyclohexaneChair';
  const carbonOf = new Map();
  for (const b of ringBonds) { if (b.a.startsWith('ring.C') && b.b.startsWith('ring.H')) carbonOf.set(b.b, b.a); if (b.b.startsWith('ring.C') && b.a.startsWith('ring.H')) carbonOf.set(b.a, b.b); }
  const ringIndex = (cid) => Number(cid.replace('ring.C', ''));
  const adjacent = (c1, c2) => { const d = Math.abs(ringIndex(c1) - ringIndex(c2)); return d === 1 || d === 5; };
  // Each group: its site from the drawn C–X direction, the ring hydrogens (and the other group) it faces.
  const groups = specs.map((s) => {
    const d = v.sub(positions.get(s.g.attach), positions.get(s.carbon));
    const tilt = tiltOf(d);
    const axialLike = tilt <= AXIAL_TILT;
    const site = axialLike ? (chair ? 'axial' : 'flagpole') : (chair ? 'equatorial' : 'bowsprit');
    const side = Math.sign(d[1]);
    const partners = [];
    if (axialLike) for (const [hId, c] of carbonOf) {
      if (c === s.carbon || adjacent(c, s.carbon)) continue;
      const dh = v.sub(positions.get(hId), positions.get(c));
      if (tiltOf(dh) <= AXIAL_TILT && Math.sign(dh[1]) === side) partners.push(hId);
    }
    return { role: s.role, sub: s.sub, carbon: s.carbon, attach: s.g.attach, atoms: s.g.atoms.map((a) => a.id), site, tilt, side, axialLike, partners, contact: null };
  });
  for (const g of groups) {
    const targets = [...g.partners];
    for (const o of groups) if (o !== g && g.axialLike && o.axialLike && o.side === g.side && !adjacent(o.carbon, g.carbon) && o.carbon !== g.carbon) targets.push(...o.atoms);
    for (const x of g.atoms) for (const t of targets) { const dd = v.dist(positions.get(x), positions.get(t)); if (!g.contact || dd < g.contact.d) g.contact = { a: x, b: t, d: dd }; }
    delete g.side; delete g.axialLike;
  }
  const X = groups[0];
  const energy = chairEnergy(subId, formId, sec);
  const other = chair ? chairEnergy(subId, form.flip ? 'axial' : 'equatorial', sec) : null;
  const fraction = other ? chairFraction(other.value - energy.value) : null;
  const out = {
    frame, sub, form, second: sec, name: cyclohexaneName(subId, sec), groups, energy, other, fraction, crowding, ring: ring.ring,
    site: X.site, tilt: X.tilt, attach: X.attach, group: X.atoms, diaxial: X.partners, contact: X.contact,
  };
  cache.set(key, out);
  return out;
}
