// Atomic orbitals topic: the hydrogen-like orbital gallery (quantum numbers, nodes, radial distribution,
// hydrogen energies), the sp / sp² / sp³ hybrids as stated linear combinations, and ground-state
// electron configurations (aufbau order with the tabulated exceptions, Hund's rule box diagrams).
// Every number is exact for the hydrogen-like functions in orbitals.js, a stated combination of them, or
// a tabulated textbook / NIST value (references/textbook.js): nothing is fitted or computed from a model
// beyond the stated formulas (docs/REVIEW_PROTOCOL.md §6). Pure and dependency-free.
import { orbital, radial, lcao, sampleGrid, gridProbability, radialNodes, angularNodes, ORBITAL_LABELS } from './orbitals.js';
import { HYDROGEN_ENERGY, GROUND_STATE_CONFIGURATIONS, AUFBAU_EXCEPTIONS } from './references/textbook.js';
import { IDEAL_ANGLES } from './references/textbook.js';

const SUBSHELL = ['s', 'p', 'd', 'f'];
const L_OF = { s: 0, p: 1, d: 2, f: 3 };

/** Hydrogen energy level E_n = −R_H / n² (eV): the Rydberg energy is the cited constant. */
export const hydrogenLevel = (n) => -HYDROGEN_ENERGY.rydbergEV / (n * n);

// ---- gallery items ----------------------------------------------------------------------------------
/** The chips of the explorer: six hydrogen-like orbitals, three hybrids, and the configuration builder. */
export const ORBITAL_ITEMS = [
  { id: '1s', kind: 'atomic', orbital: '1s', name: '1s', family: 's' },
  { id: '2s', kind: 'atomic', orbital: '2s', name: '2s', family: 's' },
  { id: '2p', kind: 'atomic', orbital: '2pz', name: '2p', family: 'p' },
  { id: '3s', kind: 'atomic', orbital: '3s', name: '3s', family: 's' },
  { id: '3p', kind: 'atomic', orbital: '3pz', name: '3p', family: 'p' },
  { id: '3dz2', kind: 'atomic', orbital: '3dz2', name: '3d (z²)', family: 'd' },
  { id: '3dxy', kind: 'atomic', orbital: '3dxy', name: '3d (xy)', family: 'd' },
  { id: 'sp', kind: 'hybrid', hybrid: 'sp', name: 'sp hybrid', family: 'hybrid', audience: 'learn' },
  { id: 'sp2', kind: 'hybrid', hybrid: 'sp2', name: 'sp² hybrid', family: 'hybrid', audience: 'learn' },
  { id: 'sp3', kind: 'hybrid', hybrid: 'sp3', name: 'sp³ hybrid', family: 'hybrid', audience: 'learn' },
  { id: 'configurations', kind: 'configurations', name: 'Electron configurations', family: 'config' },
];
export const itemById = (id) => ORBITAL_ITEMS.find((x) => x.id === id) || null;
export const FAMILIES = {
  s: { label: 's orbitals', color: '#6b8f71' }, p: { label: 'p orbitals', color: '#7f8bb3' }, d: { label: 'd orbitals', color: '#b07a9a' },
  hybrid: { label: 'hybrid orbitals', color: '#a3853f' }, config: { label: 'electron configurations', color: '#8a6a1e' },
};

// ---- radial distribution ------------------------------------------------------------------------------
/**
 * Radial distribution function P(r) = r² R_nl(r)² of a hydrogen-like orbital (Z = 1, r in a₀), sampled on
 * [0, rMax], with the radial nodes (roots of R) and the most probable radius found on the sample.
 * Returns { r: number[], P: number[], rMax, nodes: number[] (a₀), rMostProbable (a₀), nodeCount }.
 */
export function radialDistribution(n, l, { points = 400, rMax = null } = {}) {
  const R = rMax ?? (n === 1 ? 6 : n === 2 ? 16 : 30);
  const r = [], P = [];
  let best = 0, rBest = 0;
  for (let i = 0; i <= points; i++) {
    const x = (R * i) / points; const val = radial(n, l, x); const p = x * x * val * val;
    r.push(x); P.push(p);
    if (p > best) { best = p; rBest = x; }
  }
  // refine the maximum by golden-section search around the best sample
  const f = (x) => { const val = radial(n, l, x); return -(x * x * val * val); };
  let a = Math.max(0, rBest - R / points), b = rBest + R / points;
  const phi = (Math.sqrt(5) - 1) / 2;
  for (let k = 0; k < 60; k++) { const c = b - phi * (b - a), d = a + phi * (b - a); if (f(c) < f(d)) b = d; else a = c; }
  const rMostProbable = (a + b) / 2;
  // radial nodes: sign changes of R between samples (bisected), or a sample that is exactly zero
  const nodes = [];
  let prev = radial(n, l, 1e-6), prevX = 1e-6;          // last non-zero sample
  for (let i = 1; i <= points; i++) {
    const x = (R * i) / points; const val = radial(n, l, x);
    if (val === 0) { nodes.push(x); continue; }
    if (Math.sign(val) !== Math.sign(prev)) {
      let lo = prevX, hi = x, flo = prev;
      for (let k = 0; k < 60; k++) { const mid = (lo + hi) / 2, fm = radial(n, l, mid); if (Math.sign(fm) === Math.sign(flo)) { lo = mid; flo = fm; } else hi = mid; }
      const node = (lo + hi) / 2;
      if (!nodes.length || Math.abs(nodes[nodes.length - 1] - node) > 1e-6) nodes.push(node);
    }
    prev = val; prevX = x;
  }
  return { r, P, rMax: R, nodes, rMostProbable, nodeCount: nodes.length };
}

// ---- hybrids -------------------------------------------------------------------------------------------
const S3 = Math.sqrt(3), S2 = Math.SQRT2, S6 = Math.sqrt(6);
/** The hybrid sets as coefficient tables over (2s, 2pₓ, 2pᵧ, 2p𝓏); the first row is the one drawn alone. */
export const HYBRIDS = {
  sp: { label: 'sp', sCharacter: 1 / 2, count: 2, angle: IDEAL_ANGLES.linear, geometry: 'linear', example: { label: 'Alkynes (C≡C)', href: '#functional-groups/alkyne/linear' }, shape: { label: 'CO₂ in Molecular shapes', href: '#molecular-shapes/carbon-dioxide' },
    rows: [[1 / S2, 0, 0, 1 / S2], [1 / S2, 0, 0, -1 / S2]], formula: ['(2s + 2p𝓏)/√2', '(2s − 2p𝓏)/√2'] },
  sp2: { label: 'sp²', sCharacter: 1 / 3, count: 3, angle: IDEAL_ANGLES.trigonal, geometry: 'trigonal planar', example: { label: 'Alkenes (C=C)', href: '#functional-groups/alkene/planar' }, shape: { label: 'BF₃ in Molecular shapes', href: '#molecular-shapes/boron-trifluoride' },
    rows: [[1 / S3, Math.sqrt(2 / 3), 0, 0], [1 / S3, -1 / S6, 1 / S2, 0], [1 / S3, -1 / S6, -1 / S2, 0]], formula: ['2s/√3 + 2pₓ·√(2/3)', '2s/√3 − 2pₓ/√6 + 2pᵧ/√2', '2s/√3 − 2pₓ/√6 − 2pᵧ/√2'] },
  sp3: { label: 'sp³', sCharacter: 1 / 4, count: 4, angle: IDEAL_ANGLES.tetrahedral, geometry: 'tetrahedral', example: { label: 'Alkanes and alkyl halides', href: '#functional-groups/haloalkane' }, shape: { label: 'Methane in Molecular shapes', href: '#molecular-shapes/methane' },
    rows: [[0.5, 0.5, 0.5, 0.5], [0.5, 0.5, -0.5, -0.5], [0.5, -0.5, 0.5, -0.5], [0.5, -0.5, -0.5, 0.5]], formula: ['(2s + 2pₓ + 2pᵧ + 2p𝓏)/2', '(2s + 2pₓ − 2pᵧ − 2p𝓏)/2', '(2s − 2pₓ + 2pᵧ − 2p𝓏)/2', '(2s − 2pₓ − 2pᵧ + 2p𝓏)/2'] },
};
/** One hybrid orbital as a ψ object (hydrogen-like 2s/2p with the given Z): { psi, extent, center, direction, coefficients }. */
export function hybridOrbital(kind, index = 0, { Z = 1 } = {}) {
  const H = HYBRIDS[kind];
  if (!H) throw new Error(`hybridOrbital(): unknown hybrid ${kind}`);
  const row = H.rows[index];
  if (!row) throw new Error(`hybridOrbital(): ${kind} has ${H.rows.length} hybrids, index ${index}`);
  const basis = ['2s', '2px', '2py', '2pz'].map((name) => orbital(name, { Z }));
  const psi = lcao(basis.map((b, i) => ({ psi: b.psi, c: row[i] })));
  const dir = [row[1], row[2], row[3]]; const L = Math.hypot(...dir) || 1;
  return { kind, index, label: `${H.label} hybrid ${index + 1}`, psi, extent: basis[0].extent, center: [0, 0, 0], direction: dir.map((x) => x / L), coefficients: row, formula: H.formula[index] };
}
/** Direction of a hybrid's main lobe found on the function itself: the unit vector where ψ(r·u) at r = 2 a₀ is largest. */
export function hybridLobeDirection(h, { samples = 4000, r = 3 } = {}) {
  const at = (u) => h.psi(r * u[0], r * u[1], r * u[2]);
  let best = -Infinity, dir = [0, 0, 1];
  for (let i = 0; i < samples; i++) {
    const z = 1 - (2 * (i + 0.5)) / samples, phi = i * 2.399963229728653; // Fibonacci sphere
    const s = Math.sqrt(1 - z * z); const u = [s * Math.cos(phi), s * Math.sin(phi), z];
    const val = at(u);
    if (val > best) { best = val; dir = u; }
  }
  // refine on the sphere: shrink a step along the two tangent directions until it stops improving
  const norm = (a) => { const L = Math.hypot(...a) || 1; return a.map((x) => x / L); };
  for (let step = 0.05; step > 1e-5; step *= 0.5) {
    let improved = true;
    while (improved) {
      improved = false;
      const t1 = norm(Math.abs(dir[2]) < 0.9 ? [-dir[1], dir[0], 0] : [0, -dir[2], dir[1]]);
      const t2 = [dir[1] * t1[2] - dir[2] * t1[1], dir[2] * t1[0] - dir[0] * t1[2], dir[0] * t1[1] - dir[1] * t1[0]];
      for (const t of [t1, t2]) for (const sgn of [1, -1]) {
        const cand = norm([dir[0] + sgn * step * t[0], dir[1] + sgn * step * t[1], dir[2] + sgn * step * t[2]]);
        const val = at(cand);
        if (val > best) { best = val; dir = cand; improved = true; }
      }
    }
  }
  return dir;
}
export const angleBetween = (a, b) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * 180 / Math.PI;

// ---- electron configurations ---------------------------------------------------------------------------
/** Elements 1–36 (symbol, name). */
export const PERIODIC = [
  ['H', 'Hydrogen'], ['He', 'Helium'], ['Li', 'Lithium'], ['Be', 'Beryllium'], ['B', 'Boron'], ['C', 'Carbon'], ['N', 'Nitrogen'], ['O', 'Oxygen'], ['F', 'Fluorine'], ['Ne', 'Neon'],
  ['Na', 'Sodium'], ['Mg', 'Magnesium'], ['Al', 'Aluminium'], ['Si', 'Silicon'], ['P', 'Phosphorus'], ['S', 'Sulfur'], ['Cl', 'Chlorine'], ['Ar', 'Argon'],
  ['K', 'Potassium'], ['Ca', 'Calcium'], ['Sc', 'Scandium'], ['Ti', 'Titanium'], ['V', 'Vanadium'], ['Cr', 'Chromium'], ['Mn', 'Manganese'], ['Fe', 'Iron'], ['Co', 'Cobalt'], ['Ni', 'Nickel'], ['Cu', 'Copper'], ['Zn', 'Zinc'],
  ['Ga', 'Gallium'], ['Ge', 'Germanium'], ['As', 'Arsenic'], ['Se', 'Selenium'], ['Br', 'Bromine'], ['Kr', 'Krypton'],
].map(([symbol, name], i) => ({ Z: i + 1, symbol, name }));
export const MAX_Z = PERIODIC.length;
export const elementByZ = (Z) => PERIODIC[Z - 1] || null;
/** Aufbau (Madelung) filling order up to 4p, with capacities. */
export const AUFBAU_ORDER = ['1s', '2s', '2p', '3s', '3p', '4s', '3d', '4p'].map((label) => ({ label, n: Number(label[0]), l: L_OF[label[1]], capacity: 2 * (2 * L_OF[label[1]] + 1) }));
const NOBLE = [2, 10, 18, 36];
const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (n) => String(n).split('').map((d) => SUP[d]).join('');

/** Ordinal "energy" of a subshell for the schematic ladder (not to scale, not an energy). */
const LADDER = { '1s': 1, '2s': 2, '2p': 2.6, '3s': 3.4, '3p': 4, '4s': 4.8, '3d': 5.1, '4p': 5.8 };

/**
 * Ground-state electron configuration of element Z (1–36) by the aufbau order, with the tabulated
 * exceptions applied (Cr, Cu: one 4s electron moves to 3d). Returns { Z, symbol, name, subshells:
 * [{ label, n, l, electrons, capacity }], string, core (noble-gas symbol or null), nobleGasString,
 * valence (electrons outside the core), exception (note or null), boxes: [{ label, orbitals: [['up','down'] …] }],
 * diagram (a LevelDiagram spec, schematic), highest (label of the highest occupied subshell) }.
 */
export function electronConfiguration(Z) {
  const el = elementByZ(Z);
  if (!el) throw new Error(`electronConfiguration(): Z must be 1–${MAX_Z}, got ${Z}`);
  const subshells = [];
  let left = Z;
  for (const s of AUFBAU_ORDER) { if (!left) break; const e = Math.min(s.capacity, left); subshells.push({ ...s, electrons: e }); left -= e; }
  const exc = AUFBAU_EXCEPTIONS.values[Z] || null;
  if (exc) { for (const [label, e] of Object.entries(exc.subshells)) { const s = subshells.find((x) => x.label === label); if (s) s.electrons = e; } }
  // sort for display by n then l (the conventional written order), keep the filling order for the ladder
  const written = [...subshells].sort((a, b) => a.n - b.n || a.l - b.l);
  const string = written.map((s) => `${s.label}${sup(s.electrons)}`).join(' ');
  const coreZ = [...NOBLE].reverse().find((z) => z < Z) || null;
  const core = coreZ ? elementByZ(coreZ).symbol : null;
  let rest = written;
  if (coreZ) { const coreCfg = electronConfiguration(coreZ); const coreMap = new Map(coreCfg.subshells.map((s) => [s.label, s.electrons])); rest = written.filter((s) => (coreMap.get(s.label) || 0) < s.electrons).map((s) => ({ ...s, electrons: s.electrons - (coreMap.get(s.label) || 0) })); }
  const nobleGasString = `${core ? `[${core}] ` : ''}${rest.map((s) => `${s.label}${sup(s.electrons)}`).join(' ')}`;
  const valence = rest.reduce((a, s) => a + s.electrons, 0);
  // Hund's rule boxes: one electron per orbital with parallel spins first, then pair
  const boxes = subshells.map((s) => { const k = 2 * s.l + 1; const orbitals = Array.from({ length: k }, () => []); for (let i = 0; i < s.electrons; i++) orbitals[i % k].push(i < k ? 'up' : 'down'); return { label: s.label, orbitals }; });
  const diagram = {
    columns: [{ id: 'atom', label: `${el.symbol} (Z = ${Z})` }],
    levels: boxes.flatMap((b) => b.orbitals.map((e, i) => ({ id: `${b.label}-${i}`, column: 'atom', E: LADDER[b.label], label: i === 0 ? b.label : '', electrons: e }))),
    yLabel: 'energy (schematic) →', range: [0.5, 6.3],
  };
  const highest = subshells[subshells.length - 1].label;
  return { Z, symbol: el.symbol, name: el.name, subshells, string, core, nobleGasString, valence, exception: exc ? exc.note : null, boxes, diagram, highest, unpaired: boxes.reduce((a, b) => a + b.orbitals.filter((o) => o.length === 1).length, 0) };
}
/** Configuration string in the plain ASCII form of the oracle table (e.g. '1s2 2s2 2p6 3s2 3p6 3d5 4s1'). */
export const configurationAscii = (cfg) => [...cfg.subshells].sort((a, b) => a.n - b.n || a.l - b.l).map((s) => `${s.label}${s.electrons}`).join(' ');

// ---- the explorer's build ------------------------------------------------------------------------------
const cache = new Map();
/**
 * Everything the card and the 3D view need for an item (state: { Z } for the configuration item).
 * Atomic: { item, orbital, n, l, label, radialNodes, angularNodes, totalNodes, degeneracy, maxElectrons,
 * energyEV (hydrogen), rdf, title }. Hybrid: { item, hybrid, set: [ψ…], directions, angle, sCharacter, … }.
 * Configurations: { item, config, orbital (highest occupied with n ≤ 3, or null), title }.
 */
export function buildItem(id, state = {}) {
  const item = itemById(id);
  if (!item) throw new Error(`buildItem(): unknown item ${id}`);
  if (item.kind === 'configurations') {
    const Z = Number(state.Z) || 6;
    const config = electronConfiguration(Z);
    const drawable = [...config.subshells].reverse().find((s) => s.n <= 3);
    const orbName = drawable ? (drawable.l === 0 ? `${drawable.n}s` : drawable.l === 1 ? `${drawable.n}pz` : '3dz2') : null;
    return { item, config, orbital: orbName ? orbital(orbName, { Z: 1 }) : null, orbitalName: orbName, drawn: drawable ? drawable.label : null, title: `${config.name} · ${config.nobleGasString}` };
  }
  const key = id;
  if (cache.has(key)) return cache.get(key);
  let out;
  if (item.kind === 'atomic') {
    const orb = orbital(item.orbital);
    const rdf = radialDistribution(orb.n, orb.l);
    out = { item, orbital: orb, n: orb.n, l: orb.l, subshell: SUBSHELL[orb.l], label: ORBITAL_LABELS[item.orbital], radialNodes: radialNodes(orb.n, orb.l), angularNodes: angularNodes(orb.l), totalNodes: orb.n - 1, degeneracy: 2 * orb.l + 1, maxElectrons: 2 * (2 * orb.l + 1), energyEV: hydrogenLevel(orb.n), rdf, title: `${ORBITAL_LABELS[item.orbital]} · n = ${orb.n}, l = ${orb.l}` };
  } else {
    const H = HYBRIDS[item.hybrid];
    const set = H.rows.map((_, i) => hybridOrbital(item.hybrid, i));
    const directions = set.map((h) => hybridLobeDirection(h));
    const angle = angleBetween(directions[0], directions[1]);
    out = { item, hybrid: H, set, orbital: set[0], directions, angle, sCharacter: H.sCharacter, pCharacter: 1 - H.sCharacter, count: H.count, title: `${H.label} hybrid · ${H.count} lobes at ${H.angle}°` };
  }
  cache.set(key, out);
  return out;
}

/** Checks the sweep runs over the hybrid sets: lobe angles and normalisation from the functions themselves. */
export function hybridChecks(kind, { size = 40 } = {}) {
  const b = buildItem(kind);
  const angles = [];
  for (let i = 0; i < b.directions.length; i++) for (let j = i + 1; j < b.directions.length; j++) angles.push(angleBetween(b.directions[i], b.directions[j]));
  const grid = sampleGrid(b.set[0].psi, { size, extent: b.set[0].extent });
  return { angles, expected: b.hybrid.angle, probability: gridProbability(grid) };
}

export { GROUND_STATE_CONFIGURATIONS };
