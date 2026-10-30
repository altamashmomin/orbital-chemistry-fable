// Molecular orbitals topic: homonuclear diatomics (H₂, He₂, N₂, O₂) from the textbook level order, the
// π systems of ethene, butadiene and the carbonyl from a small Hückel solver, and the σ / σ* of a C–Cl bond,
// each drawn as a |ψ| isosurface on a frame at the measured bond lengths. Energies are never computed
// beyond the stated Hückel eigenvalues (in units of β) and the tabulated bond dissociation energies;
// diatomic ladders are schematic (docs/REVIEW_PROTOCOL.md §6). Pure and dependency-free.
import { orbital, radial, lcao, molecularOrbital, sampleGrid, A0_ANGSTROM } from './orbitals.js';
import { v, DEG } from './geometry.js';
import { toFrame } from './builder.js';
import { SLATER_ZEFF, DIATOMIC_MO, HUCKEL_PARAMETERS } from './references/textbook.js';
import { MEASURED_BONDS, MEASURED_ANGLES } from './references/measured.js';

const Zeff = SLATER_ZEFF.values;

// ---- Hückel -------------------------------------------------------------------------------------------
/** Eigen-decomposition of a real symmetric matrix by cyclic Jacobi rotations: { values, vectors (columns) }. */
export function symmetricEigen(A) {
  const n = A.length;
  const a = A.map((r) => [...r]);
  const V = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += a[i][j] * a[i][j];
    if (off < 1e-22) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(a[p][q]) < 1e-14) continue;
      const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { const akp = a[k][p], akq = a[k][q]; a[k][p] = c * akp - s * akq; a[k][q] = s * akp + c * akq; }
      for (let k = 0; k < n; k++) { const apk = a[p][k], aqk = a[q][k]; a[p][k] = c * apk - s * aqk; a[q][k] = s * apk + c * aqk; }
      for (let k = 0; k < n; k++) { const vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; }
    }
  }
  const values = a.map((r, i) => r[i]);
  return { values, vectors: V };
}

/**
 * Hückel π system: atoms 0…n−1 with Coulomb parameters h (α_i = α + h_i β, 0 for carbon) and bonds [i, j, k]
 * (β_ij = k β, k = 1 by default). Energies are returned as x with E = α + xβ; since β < 0 the largest x is the
 * lowest level. `electrons` fill from the bottom. Returns { levels: [{ id, x, coefficients, electrons, label }]
 * (lowest first), homo, lumo, piEnergy (Σ nᵢxᵢ, in β), occupied, n }.
 */
export function huckel({ n, bonds, h = {}, electrons = n }) {
  const H = Array.from({ length: n }, (_, i) => Array.from({ length: n }, () => 0));
  for (let i = 0; i < n; i++) H[i][i] = h[i] || 0;
  for (const [i, j, k = 1] of bonds) { H[i][j] = k; H[j][i] = k; }
  const { values, vectors } = symmetricEigen(H);
  const idx = values.map((x, i) => i).sort((p, q) => values[q] - values[p]);       // largest x first = lowest energy
  let left = electrons;
  const levels = idx.map((col, rank) => {
    const coefficients = vectors.map((row) => row[col]);
    // sign convention: make the largest-magnitude coefficient on the first atom positive
    const lead = coefficients.reduce((best, c, i) => (Math.abs(c) > Math.abs(coefficients[best]) + 1e-12 ? i : best), 0);
    if (coefficients[lead] < 0) for (let i = 0; i < n; i++) coefficients[i] = -coefficients[i];
    const e = Math.min(2, left); left -= e;
    return { id: `psi${rank + 1}`, label: `ψ${rank + 1}`, x: values[col], coefficients, electrons: e, nodes: countSignChanges(coefficients) };
  });
  const occupied = levels.filter((l) => l.electrons > 0);
  const homo = occupied.length ? occupied[occupied.length - 1] : null;
  const lumo = levels.find((l) => l.electrons === 0) || null;
  return { n, levels, homo, lumo, occupied: occupied.length, piEnergy: levels.reduce((s, l) => s + l.electrons * l.x, 0) };
}
const countSignChanges = (c) => { let k = 0; for (let i = 1; i < c.length; i++) if (Math.sign(c[i]) !== Math.sign(c[i - 1]) && c[i] !== 0 && c[i - 1] !== 0) k++; return k; };

// ---- diatomics ------------------------------------------------------------------------------------------
const MO_LABEL = { sigma1s: 'σ(1s)', 'sigma1s*': 'σ*(1s)', sigma2s: 'σ(2s)', 'sigma2s*': 'σ*(2s)', sigma2p: 'σ(2p)', 'sigma2p*': 'σ*(2p)', pi2p: 'π(2p)', 'pi2p*': 'π*(2p)' };
const DEGEN = (id) => (id.startsWith('pi') ? 2 : 1);
/** Ordinal heights for the schematic diatomic ladder (not energies). */
const LADDER = { sigma1s: 1, 'sigma1s*': 3, sigma2s: 1, 'sigma2s*': 2, sigma2p: 3, pi2p: 3.6, 'pi2p*': 4.8, 'sigma2p*': 5.6 };

/**
 * Fill the textbook level order of a diatomic with its valence electrons (Hund's rule in the π sets).
 * Returns { levels: [{ id, label, bonding, electrons: number[] per component, total }], bondOrder, unpaired, homo, lumo }.
 */
export function fillDiatomic(id, electrons = null) {
  const d = DIATOMIC_MO.values[id];
  if (!d) throw new Error(`fillDiatomic(): unknown diatomic ${id}`);
  if (electrons == null) electrons = d.electrons;
  let left = electrons;
  const levels = d.order.map((mo) => {
    const k = DEGEN(mo); const comps = Array.from({ length: k }, () => []);
    const take = Math.min(2 * k, left); left -= take;
    for (let i = 0; i < take; i++) comps[i % k].push(i < k ? 'up' : 'down');
    return { id: mo, label: MO_LABEL[mo], bonding: !mo.endsWith('*'), degeneracy: k, electrons: comps, total: take };
  });
  if (left > 0) throw new Error(`fillDiatomic(): ${electrons} electrons do not fit the ${id} ladder`);
  const bonding = levels.filter((l) => l.bonding).reduce((s, l) => s + l.total, 0), anti = levels.filter((l) => !l.bonding).reduce((s, l) => s + l.total, 0);
  const unpaired = levels.reduce((s, l) => s + l.electrons.filter((c) => c.length === 1).length, 0);
  const occ = levels.filter((l) => l.total > 0);
  return { levels, bondOrder: (bonding - anti) / 2, unpaired, homo: occ.length ? occ[occ.length - 1] : null, lumo: levels.find((l) => l.total === 0) || null, electrons };
}

// ---- frames at the measured geometry ---------------------------------------------------------------------
const atom = (id, el, pos, extra = {}) => ({ id, el, pos, ...extra });
const bondL = (a, b, ref, order = 1) => ({ a, b, order, length: MEASURED_BONDS[ref].value, ref });
function frameOf(atoms, bonds) {
  const graph = { atoms: atoms.map(({ pos, ...a }) => a), bonds };
  const positions = new Map(atoms.map((a) => [a.id, a.pos]));
  return toFrame(graph, positions, new Map(), new Map());
}
const diatomicFrame = (el, ref, lonePairs) => { const L = MEASURED_BONDS[ref].value; return frameOf([atom('A', el, [-L / 2, 0, 0], { lonePairs }), atom('B', el, [L / 2, 0, 0], { lonePairs })], [bondL('A', 'B', ref, el === 'N' ? 3 : el === 'O' ? 2 : 1)]); };
function etheneFrame() {
  const cc = MEASURED_BONDS.ethylene_CC.value, ch = MEASURED_BONDS.ethylene_CH.value, hcc = MEASURED_ANGLES.ethylene_HCC.value * DEG;
  const C1 = [-cc / 2, 0, 0], C2 = [cc / 2, 0, 0];
  const H = (c, sx, sy) => [c[0] + sx * ch * Math.cos(Math.PI - hcc), c[1] + sy * ch * Math.sin(Math.PI - hcc), 0];
  return frameOf([atom('C1', 'C', C1), atom('C2', 'C', C2), atom('H1', 'H', H(C1, -1, 1)), atom('H2', 'H', H(C1, -1, -1)), atom('H3', 'H', H(C2, 1, 1)), atom('H4', 'H', H(C2, 1, -1))],
    [bondL('C1', 'C2', 'ethylene_CC', 2), bondL('C1', 'H1', 'ethylene_CH'), bondL('C1', 'H2', 'ethylene_CH'), bondL('C2', 'H3', 'ethylene_CH'), bondL('C2', 'H4', 'ethylene_CH')]);
}
function butadieneFrame() {
  // planar s-trans zig-zag in the xy plane: C1=C2–C3=C4 with C=C–C = 122.9°
  const dbl = MEASURED_BONDS.butadiene_CdC.value, sgl = MEASURED_BONDS.butadiene_CC.value, ch = MEASURED_BONDS.ethylene_CH.value, ccc = MEASURED_ANGLES.butadiene_CCC.value * DEG;
  const half = (Math.PI - ccc) / 2;
  const C2 = [-sgl / 2, 0, 0], C3 = [sgl / 2, 0, 0];
  const C1 = [C2[0] - dbl * Math.cos(half), C2[1] + dbl * Math.sin(half), 0], C4 = [C3[0] + dbl * Math.cos(half), C3[1] - dbl * Math.sin(half), 0];
  const hAt = (c, ang) => [c[0] + ch * Math.cos(ang), c[1] + ch * Math.sin(ang), 0];
  const a12 = Math.atan2(C1[1] - C2[1], C1[0] - C2[0]), a21 = Math.atan2(C2[1] - C1[1], C2[0] - C1[0]), a34 = Math.atan2(C4[1] - C3[1], C4[0] - C3[0]), a43 = Math.atan2(C3[1] - C4[1], C3[0] - C4[0]);
  const atoms = [atom('C1', 'C', C1), atom('C2', 'C', C2), atom('C3', 'C', C3), atom('C4', 'C', C4),
    atom('H1a', 'H', hAt(C1, a21 + 2 * Math.PI / 3)), atom('H1b', 'H', hAt(C1, a21 - 2 * Math.PI / 3)), atom('H2', 'H', [0, 0, 0]),
    atom('H3', 'H', [0, 0, 0]), atom('H4a', 'H', hAt(C4, a43 + 2 * Math.PI / 3)), atom('H4b', 'H', hAt(C4, a43 - 2 * Math.PI / 3))];
  // terminal CH₂ hydrogens 120° from the C=C bond; the inner hydrogens point away from the bisector of C=C–C
  const bis = (c, p, q) => { const u = v.norm(v.sub(p, c)), w = v.norm(v.sub(q, c)); const b = v.norm(v.add(u, w)); return [c[0] - ch * b[0], c[1] - ch * b[1], 0]; };
  atoms[6].pos = bis(C2, C1, C3); atoms[7].pos = bis(C3, C2, C4);
  void a12; void a34;
  return frameOf(atoms, [bondL('C1', 'C2', 'butadiene_CdC', 2), bondL('C2', 'C3', 'butadiene_CC'), bondL('C3', 'C4', 'butadiene_CdC', 2),
    bondL('C1', 'H1a', 'ethylene_CH'), bondL('C1', 'H1b', 'ethylene_CH'), bondL('C2', 'H2', 'ethylene_CH'), bondL('C3', 'H3', 'ethylene_CH'), bondL('C4', 'H4a', 'ethylene_CH'), bondL('C4', 'H4b', 'ethylene_CH')]);
}
function formaldehydeFrame() {
  // planar in the xy plane: C at the origin, O along +x, the hydrogens at ±(H–C–H)/2 from −x
  const co = MEASURED_BONDS.formaldehyde_CO.value, ch = MEASURED_BONDS.formaldehyde_CH.value, hch = MEASURED_ANGLES.formaldehyde_HCH.value * DEG;
  const C = [0, 0, 0], O = [co, 0, 0];
  const H = (sy) => [-ch * Math.cos(hch / 2), sy * ch * Math.sin(hch / 2), 0];
  return frameOf([atom('C', 'C', C), atom('O', 'O', O, { lonePairs: 2 }), atom('H1', 'H', H(1)), atom('H2', 'H', H(-1))], [bondL('C', 'O', 'formaldehyde_CO', 2), bondL('C', 'H1', 'formaldehyde_CH'), bondL('C', 'H2', 'formaldehyde_CH')]);
}
function chloromethaneFrame() {
  const ccl = MEASURED_BONDS.chloromethane_CCl.value, ch = MEASURED_BONDS.chloromethane_CH.value, hccl = MEASURED_ANGLES.chloromethane_HCCl.value * DEG;
  const C = [0, 0, 0], Cl = [ccl, 0, 0];
  const hs = [0, 1, 2].map((k) => { const phi = k * 2 * Math.PI / 3; return [ch * Math.cos(hccl), ch * Math.sin(hccl) * Math.cos(phi), ch * Math.sin(hccl) * Math.sin(phi)]; });
  return frameOf([atom('C', 'C', C), atom('Cl', 'Cl', Cl, { lonePairs: 3 }), ...hs.map((p, i) => atom(`H${i + 1}`, 'H', p))], [bondL('C', 'Cl', 'chloromethane_CCl'), ...hs.map((_, i) => bondL('C', `H${i + 1}`, 'chloromethane_CH'))]);
}

// ---- ψ builders (Å units) -------------------------------------------------------------------------------------
const A0 = A0_ANGSTROM;
/** A hydrogen-like p orbital with the given Z whose positive lobe points along `dir`, centred at p0 (Å). */
export function pOrbitalAlong(p0, dir, { n = 2, Z = 1 } = {}) {
  const u = v.norm(dir);
  return (x, y, z) => { const dx = x - p0[0], dy = y - p0[1], dz = z - p0[2]; const r = Math.hypot(dx, dy, dz); if (r < 1e-12) return 0; return radial(n, 1, r, Z, A0) * Math.sqrt(3 / (4 * Math.PI)) * (dx * u[0] + dy * u[1] + dz * u[2]) / r; };
}
const psiObject = (psi, centers, extent, label) => ({ psi, center: v.centroid(centers), extent, label });

/** Build the MO ψ for one level of a Hückel system on a planar frame: Σ cᵢ p_z(i) with the given Z per atom. */
function huckelPsi(level, centers, normal, Zs, extent, label) {
  const parts = centers.map((c, i) => ({ psi: pOrbitalAlong(c, normal, { n: 2, Z: Zs[i] }), c: level.coefficients[i] }));
  return psiObject(lcao(parts), centers, extent, label);
}
const planeNormal = (a, b, c) => v.norm(v.cross(v.sub(b, a), v.sub(c, a)));

// ---- items --------------------------------------------------------------------------------------------------
export const MO_ITEMS = [
  { id: 'h2', kind: 'diatomic', name: 'Hydrogen H₂', formula: 'H₂', family: 'diatomic' },
  { id: 'n2', kind: 'diatomic', name: 'Nitrogen N₂', formula: 'N₂', family: 'diatomic' },
  { id: 'o2', kind: 'diatomic', name: 'Oxygen O₂', formula: 'O₂', family: 'diatomic' },
  { id: 'ethene', kind: 'huckel', name: 'Ethene π system', formula: 'C₂H₄', family: 'pi' },
  { id: 'butadiene', kind: 'huckel', name: 'Butadiene π system', formula: 'C₄H₆', family: 'pi', audience: 'learn' },
  { id: 'carbonyl', kind: 'huckel', name: 'Carbonyl π system', formula: 'H₂C=O', family: 'pi' },
  { id: 'chloromethane', kind: 'sigma', name: 'C–Cl σ and σ*', formula: 'CH₃Cl', family: 'sigma' },
];
export const moItemById = (id) => MO_ITEMS.find((x) => x.id === id) || null;
export const MO_FAMILIES = { diatomic: { label: 'homonuclear diatomics', color: '#6b8f71' }, pi: { label: 'π systems (Hückel)', color: '#7f8bb3' }, sigma: { label: 'σ bonds', color: '#a3853f' } };

const cache = new Map();
/**
 * Everything the card, diagram and 3D view need for an item. state: { electrons (h2: 2 or 4), mo (level id) }.
 * Returns { item, frame, title, mos: [{ id, label, bonding, x?, electrons, psi (ψ object or null), coefficients? }],
 *   selected (the mo to draw), diagram (LevelDiagram spec), fill? (diatomics), huckel? (π systems), facts: { bondOrder, unpaired, bde, bondLength, … } }.
 */
export function buildMO(id, state = {}) {
  const item = moItemById(id);
  if (!item) throw new Error(`buildMO(): unknown item ${id}`);
  const key = `${id}/${state.electrons ?? '-'}`;
  let base = cache.get(key);
  if (!base) { base = item.kind === 'diatomic' ? buildDiatomic(item, state) : item.kind === 'huckel' ? buildHuckel(item) : buildSigma(item); cache.set(key, base); }
  const wanted = state.mo && base.mos.some((m) => m.id === state.mo) ? state.mo : base.defaultMo;
  const selected = base.mos.find((m) => m.id === wanted);
  return { ...base, selected, title: `${base.titleBase} · ${selected.label}` };
}

function buildDiatomic(item, state) {
  const isHe = item.id === 'h2' && Number(state.electrons) === 4;
  const dId = isHe ? 'he2' : item.id;
  const d = DIATOMIC_MO.values[dId];
  const fill = fillDiatomic(dId);
  const el = { h2: 'H', he2: 'H', n2: 'N', o2: 'O' }[dId];
  const frame = diatomicFrame(el, d.bondRef || 'H2_HH', el === 'N' ? 1 : el === 'O' ? 2 : 0);
  if (isHe) for (const a of frame.atoms) a.el = 'He';
  const centers = frame.atoms.map((a) => a.pos);
  const Z = el === 'H' ? Zeff.H_1s : el === 'N' ? Zeff.N_2p : Zeff.O_2p;
  const mos = fill.levels.map((l) => {
    const basis = l.id.includes('1s') ? '1s' : l.id.includes('2s') ? '2s' : '2p';
    const type = l.id.startsWith('pi') ? (l.bonding ? 'pi' : 'pi*') : (l.bonding ? 'sigma' : 'sigma*');
    const Zb = basis === '1s' ? Z : basis === '2s' ? (el === 'N' ? Zeff.N_2p : Zeff.O_2p) : Z;   // 2s drawn with the 2p exponent (shape only)
    const mo = molecularOrbital({ type, basis, centers, Z: Zb, a0: A0, piDirection: [0, 1, 0] });
    return { id: l.id, label: l.label, bonding: l.bonding, degeneracy: l.degeneracy, electrons: l.electrons, total: l.total, psi: psiObject(mo.psi, centers, mo.extent, l.label), schematic: basis === '2s' };
  });
  const atomLevels = (col) => (dId === 'h2' || dId === 'he2' ? [{ id: `${col}1s`, column: col, E: 2, label: '1s', electrons: isHe ? 2 : 1 }] : [{ id: `${col}2s`, column: col, E: 1.5, label: '2s', electrons: 2 }, ...[0, 1, 2].map((k) => ({ id: `${col}2p${k}`, column: col, E: 4.2, label: k === 0 ? '2p' : '', electrons: el === 'N' ? 1 : k === 0 ? 2 : 1 }))]);
  const levels = [...atomLevels('A'), ...atomLevels('B'), ...fill.levels.flatMap((l) => l.electrons.map((e, k) => ({ id: k ? `${l.id}#${k}` : l.id, column: 'MO', E: LADDER[l.id], label: k === 0 ? l.label : '', electrons: e, style: l.bonding ? 'solid' : 'dashed' })))];
  const connections = [];
  for (const l of fill.levels) { const basis = l.id.includes('1s') ? '1s' : l.id.includes('2s') ? '2s' : '2p0'; connections.push({ from: `A${basis}`, to: l.id }, { from: `B${basis}`, to: l.id }); }
  const diagram = { columns: [{ id: 'A', label: el === 'H' ? (isHe ? 'He' : 'H') : el }, { id: 'MO', label: isHe ? 'He₂' : d.formula }, { id: 'B', label: el === 'H' ? (isHe ? 'He' : 'H') : el }], levels, connections, yLabel: 'energy (schematic) →', range: [0.3, 6.2] };
  const homo = fill.homo, lumo = fill.lumo;
  return {
    item, frame, mos, diagram, fill, defaultMo: isHe ? 'sigma1s*' : (homo ? homo.id : mos[0].id), titleBase: isHe ? 'He₂ (hypothetical)' : item.name, formula: isHe ? 'He₂' : d.formula,
    facts: { electrons: d.electrons, bondOrder: fill.bondOrder, unpaired: fill.unpaired, bde: d.bde, bdeUnit: DIATOMIC_MO.unit, bondLength: d.bondRef ? MEASURED_BONDS[d.bondRef] : null, note: d.note || null, homo: homo?.label || null, lumo: lumo?.label || null, source: DIATOMIC_MO.source, isHe },
  };
}

function buildHuckel(item) {
  let frame, centers, Zs, bonds, h = {}, electrons, labels;
  if (item.id === 'ethene') { frame = etheneFrame(); centers = ['C1', 'C2'].map((id) => frame.atoms.find((a) => a.id === id).pos); Zs = [Zeff.C_2p, Zeff.C_2p]; bonds = [[0, 1]]; electrons = 2; labels = ['C1', 'C2']; }
  else if (item.id === 'butadiene') { frame = butadieneFrame(); centers = ['C1', 'C2', 'C3', 'C4'].map((id) => frame.atoms.find((a) => a.id === id).pos); Zs = [Zeff.C_2p, Zeff.C_2p, Zeff.C_2p, Zeff.C_2p]; bonds = [[0, 1], [1, 2], [2, 3]]; electrons = 4; labels = ['C1', 'C2', 'C3', 'C4']; }
  else { frame = formaldehydeFrame(); centers = ['C', 'O'].map((id) => frame.atoms.find((a) => a.id === id).pos); Zs = [Zeff.C_2p, Zeff.O_2p]; const P = HUCKEL_PARAMETERS.values.O_carbonyl; bonds = [[0, 1, P.k]]; h = { 1: P.h }; electrons = 2; labels = ['C', 'O']; }
  const H = huckel({ n: centers.length, bonds, h, electrons });
  const normal = centers.length >= 3 ? planeNormal(centers[0], centers[1], centers[2]) : planeNormal(centers[0], centers[1], frame.atoms.find((a) => a.el === 'H').pos);
  const extent = v.dist(centers[0], centers[centers.length - 1]) / 2 + 2.2;
  const mos = H.levels.map((l) => ({ id: l.id, label: `${l.label}${l === H.homo ? ' (HOMO)' : l === H.lumo ? ' (LUMO)' : ''}`, short: l.label, bonding: l.x > 0, x: l.x, electrons: l.electrons, coefficients: l.coefficients, nodes: l.nodes, psi: huckelPsi(l, centers, normal, Zs, extent, l.label) }));
  const levels = [...centers.map((_, i) => ({ id: `p${i}`, column: 'atoms', E: -(h[i] || 0), label: `${labels[i]} 2p`, electrons: 1 })), ...H.levels.map((l) => ({ id: l.id, column: 'MO', E: -l.x, label: `${l.label}  x = ${l.x >= 0 ? '+' : '−'}${Math.abs(l.x).toFixed(3)}`, electrons: l.electrons, style: l.x > 0 ? 'solid' : 'dashed' }))];
  const connections = H.levels.flatMap((l) => centers.map((_, i) => ({ from: `p${i}`, to: l.id })));
  const diagram = { columns: [{ id: 'atoms', label: '2p (α)' }, { id: 'MO', label: 'π MOs: E = α + xβ' }], levels, connections, yLabel: 'energy → (units of β)' };
  const isolated = item.id === 'butadiene' ? 2 * 2 * 1 : null;   // two ethene π bonds: 2 × (2 electrons × x = 1)
  return {
    item, frame, mos, diagram, huckel: H, labels, defaultMo: H.homo.id, titleBase: item.name, formula: item.formula,
    facts: { electrons, homo: H.homo.label, lumo: H.lumo?.label || null, piEnergy: H.piEnergy, delocalisation: isolated != null ? H.piEnergy - isolated : null, parameters: item.id === 'carbonyl' ? HUCKEL_PARAMETERS.values.O_carbonyl : null, source: item.id === 'carbonyl' ? HUCKEL_PARAMETERS.source : 'Hückel theory (CGW ch. 4; ATKINS ch. 9)', bondLength: MEASURED_BONDS[item.id === 'ethene' ? 'ethylene_CC' : item.id === 'butadiene' ? 'butadiene_CC' : 'formaldehyde_CO'] || null },
  };
}

function buildSigma(item) {
  const frame = chloromethaneFrame();
  const C = frame.atoms.find((a) => a.id === 'C').pos, Cl = frame.atoms.find((a) => a.id === 'Cl').pos;
  const axis = v.norm(v.sub(Cl, C));
  // p on C points toward Cl (+axis), p on Cl points along +axis too: bonding = p_C − p_Cl (in phase between the nuclei), antibonding = p_C + p_Cl
  const pC = pOrbitalAlong(C, axis, { n: 2, Z: Zeff.C_2p }), pCl = pOrbitalAlong(Cl, axis, { n: 3, Z: Zeff.Cl_3p });
  const c = 1 / Math.SQRT2;
  const extent = v.dist(C, Cl) / 2 + 2.0;
  const mos = [
    { id: 'sigma', label: 'σ(C–Cl)', bonding: true, electrons: ['up', 'down'], total: 2, psi: psiObject(lcao([{ psi: pC, c }, { psi: pCl, c: -c }]), [C, Cl], extent, 'σ'), schematic: true },
    { id: 'sigma*', label: 'σ*(C–Cl) (LUMO)', bonding: false, electrons: [], total: 0, psi: psiObject(lcao([{ psi: pC, c }, { psi: pCl, c }]), [C, Cl], extent, 'σ*'), schematic: true },
  ];
  const diagram = { columns: [{ id: 'A', label: 'C sp³' }, { id: 'MO', label: 'C–Cl' }, { id: 'B', label: 'Cl 3p' }], levels: [{ id: 'Asp3', column: 'A', E: 3, label: 'sp³', electrons: 1 }, { id: 'B3p', column: 'B', E: 2.2, label: '3p', electrons: 1 }, { id: 'sigma', column: 'MO', E: 1, label: 'σ', electrons: 2 }, { id: 'sigma*', column: 'MO', E: 4.6, label: 'σ*', electrons: 0, style: 'dashed' }], connections: [{ from: 'Asp3', to: 'sigma' }, { from: 'B3p', to: 'sigma' }, { from: 'Asp3', to: 'sigma*' }, { from: 'B3p', to: 'sigma*' }], yLabel: 'energy (schematic) →', range: [0.3, 5.4] };
  return { item, frame, mos, diagram, defaultMo: 'sigma*', titleBase: item.name, formula: item.formula, facts: { electrons: 2, homo: 'σ(C–Cl)', lumo: 'σ*(C–Cl)', bondLength: MEASURED_BONDS.chloromethane_CCl, source: 'ATKINS ch. 9; CGW ch. 4 (σ* as the LUMO behind SN2)', schematic: 'equal weights on C and Cl: shapes and phases only' } };
}

/** Sanity values the sweep reads off the drawn functions: ψ at the bond midpoint and at the mirrored points. */
export function moProbe(id, moId, state = {}) {
  const b = buildMO(id, { ...state, mo: moId });
  const m = b.selected.psi;
  const centers = m.center;
  return { mid: m.psi(centers[0], centers[1], centers[2]), psi: m.psi, extent: m.extent, center: centers };
}

export { sampleGrid, orbital };
