// Transition metals topic: ML₆ / ML₄ complexes of the first row, the d-electron count, crystal-field
// splitting (octahedral, tetrahedral, square planar) with high- and low-spin fillings, the spectrochemical
// series, colour and magnetism, and cis / trans and fac / mer isomers. Everything here is counting on a
// stated filling, a template placement, or a tabulated textbook value (references/textbook.js): the model
// never decides a spin state, computes a Δ, or derives a colour (docs/REVIEW_PROTOCOL.md §6). Pure and
// dependency-free.
import { v, embed, relaxTorsions } from './geometry.js';
import { toFrame } from './builder.js';
import { bondLength } from './elements.js';
import { orbital, A0_ANGSTROM, ORBITAL_LABELS } from './orbitals.js';
import { CRYSTAL_FIELD, DELTA_O, SPECTROCHEMICAL_SERIES, COMPLEX_MAGNETISM, COMPLEX_COLOURS, D_ORBITAL_ZEFF, METAL_GROUPS } from './references/textbook.js';

/** cm⁻¹ → kJ/mol: 1 cm⁻¹ = hcN_A = 0.011963 kJ/mol (CODATA). */
export const KJ_PER_WAVENUMBER = 0.011963;

// ---- ligands ------------------------------------------------------------------------------------------
/** Monodentate ligand library. `series` is the symbol used in SPECTROCHEMICAL_SERIES; atoms/bonds build the ligand graph for a prefix. */
export const LIGANDS = {
  aqua: { id: 'aqua', formula: 'H₂O', name: 'aqua', series: 'H₂O', charge: 0, donor: 'O', atoms: (p) => [{ id: `${p}.O`, el: 'O', lonePairs: 1 }, { id: `${p}.H1`, el: 'H' }, { id: `${p}.H2`, el: 'H' }], bonds: (p) => [[`${p}.O`, `${p}.H1`, 1], [`${p}.O`, `${p}.H2`, 1]] },
  ammine: { id: 'ammine', formula: 'NH₃', name: 'ammine', series: 'NH₃', charge: 0, donor: 'N', atoms: (p) => [{ id: `${p}.N`, el: 'N' }, { id: `${p}.H1`, el: 'H' }, { id: `${p}.H2`, el: 'H' }, { id: `${p}.H3`, el: 'H' }], bonds: (p) => [[`${p}.N`, `${p}.H1`, 1], [`${p}.N`, `${p}.H2`, 1], [`${p}.N`, `${p}.H3`, 1]] },
  fluoro: { id: 'fluoro', formula: 'F⁻', name: 'fluorido', series: 'F⁻', charge: -1, donor: 'F', atoms: (p) => [{ id: `${p}.F`, el: 'F', lonePairs: 3 }], bonds: () => [] },
  chloro: { id: 'chloro', formula: 'Cl⁻', name: 'chlorido', series: 'Cl⁻', charge: -1, donor: 'Cl', atoms: (p) => [{ id: `${p}.Cl`, el: 'Cl', lonePairs: 3 }], bonds: () => [] },
  cyano: { id: 'cyano', formula: 'CN⁻', name: 'cyanido', series: 'CN⁻', charge: -1, donor: 'C', atoms: (p) => [{ id: `${p}.C`, el: 'C', hyb: 'sp' }, { id: `${p}.N`, el: 'N', lonePairs: 1 }], bonds: (p) => [[`${p}.C`, `${p}.N`, 3]] },
};
/** Position of a ligand in the spectrochemical series (0 = weakest field). */
export const seriesRank = (ligId) => SPECTROCHEMICAL_SERIES.order.indexOf(LIGANDS[ligId].series);

// ---- coordination templates (crystal-field axes) -------------------------------------------------------
// Octahedral slots 0/1 = ±z, 2/3 = ±x, 4/5 = ±y (trans pairs are (0,1), (2,3), (4,5)); square planar in the xy
// plane so d(x²−y²) points at the ligands; tetrahedral on alternate cube corners so the axes pass between them.
export const SLOTS = {
  octahedral: [[0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]],
  squarePlanar: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]],
  tetrahedral: [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map((d) => v.norm(d)),
};
const GEOMETRY_LABEL = { octahedral: 'octahedral', squarePlanar: 'square planar', tetrahedral: 'tetrahedral' };
const METAL_HYB = { octahedral: 'oct', squarePlanar: 'sqp', tetrahedral: null };
/** Isomer arrangements: which slots the second (minority) ligand set occupies. */
export const ISOMERS = {
  octahedral: { cis: [0, 2], trans: [0, 1], fac: [0, 2, 4], mer: [0, 1, 2] },
  squarePlanar: { cis: [0, 2], trans: [0, 1] },
};

// ---- the complexes ------------------------------------------------------------------------------------
export const FAMILIES = {
  aqua: { label: 'hexaaqua ions, d¹ to d¹⁰', color: '#6b8f71' },
  field: { label: 'same metal, stronger or weaker ligands', color: '#7f8bb3' },
  four: { label: 'four-coordinate: square planar or tetrahedral', color: '#a3853f' },
  isomers: { label: 'geometric isomers', color: '#b07a9a' },
};
/**
 * Each complex: metal, oxidation state (a stated fact; checked against the charge and the ligand charges),
 * geometry, ligand sets in slot order, optional isomers (names of ISOMERS[geometry] for the second set).
 */
export const COMPLEXES = [
  { id: 'tiAqua', formula: '[Ti(H₂O)₆]³⁺', name: 'hexaaquatitanium(III)', metal: 'Ti', oxidation: 3, charge: 3, geometry: 'octahedral', ligands: [{ lig: 'aqua', n: 6 }], family: 'aqua' },
  { id: 'crAqua', formula: '[Cr(H₂O)₆]³⁺', name: 'hexaaquachromium(III)', metal: 'Cr', oxidation: 3, charge: 3, geometry: 'octahedral', ligands: [{ lig: 'aqua', n: 6 }], family: 'aqua' },
  { id: 'mnAqua', formula: '[Mn(H₂O)₆]²⁺', name: 'hexaaquamanganese(II)', metal: 'Mn', oxidation: 2, charge: 2, geometry: 'octahedral', ligands: [{ lig: 'aqua', n: 6 }], family: 'aqua' },
  { id: 'feAqua', formula: '[Fe(H₂O)₆]²⁺', name: 'hexaaquairon(II)', metal: 'Fe', oxidation: 2, charge: 2, geometry: 'octahedral', ligands: [{ lig: 'aqua', n: 6 }], family: 'aqua' },
  { id: 'coAqua', formula: '[Co(H₂O)₆]²⁺', name: 'hexaaquacobalt(II)', metal: 'Co', oxidation: 2, charge: 2, geometry: 'octahedral', ligands: [{ lig: 'aqua', n: 6 }], family: 'aqua' },
  { id: 'niAqua', formula: '[Ni(H₂O)₆]²⁺', name: 'hexaaquanickel(II)', metal: 'Ni', oxidation: 2, charge: 2, geometry: 'octahedral', ligands: [{ lig: 'aqua', n: 6 }], family: 'aqua' },
  { id: 'cuAqua', formula: '[Cu(H₂O)₆]²⁺', name: 'hexaaquacopper(II)', metal: 'Cu', oxidation: 2, charge: 2, geometry: 'octahedral', ligands: [{ lig: 'aqua', n: 6 }], family: 'aqua' },
  { id: 'znAqua', formula: '[Zn(H₂O)₆]²⁺', name: 'hexaaquazinc(II)', metal: 'Zn', oxidation: 2, charge: 2, geometry: 'octahedral', ligands: [{ lig: 'aqua', n: 6 }], family: 'aqua' },
  { id: 'crAmmine', formula: '[Cr(NH₃)₆]³⁺', name: 'hexaamminechromium(III)', metal: 'Cr', oxidation: 3, charge: 3, geometry: 'octahedral', ligands: [{ lig: 'ammine', n: 6 }], family: 'field' },
  { id: 'crCyano', formula: '[Cr(CN)₆]³⁻', name: 'hexacyanidochromate(III)', metal: 'Cr', oxidation: 3, charge: -3, geometry: 'octahedral', ligands: [{ lig: 'cyano', n: 6 }], family: 'field' },
  { id: 'feCyano', formula: '[Fe(CN)₆]⁴⁻', name: 'hexacyanidoferrate(II)', metal: 'Fe', oxidation: 2, charge: -4, geometry: 'octahedral', ligands: [{ lig: 'cyano', n: 6 }], family: 'field' },
  { id: 'ferriCyano', formula: '[Fe(CN)₆]³⁻', name: 'hexacyanidoferrate(III)', metal: 'Fe', oxidation: 3, charge: -3, geometry: 'octahedral', ligands: [{ lig: 'cyano', n: 6 }], family: 'field' },
  { id: 'coFluoro', formula: '[CoF₆]³⁻', name: 'hexafluoridocobaltate(III)', metal: 'Co', oxidation: 3, charge: -3, geometry: 'octahedral', ligands: [{ lig: 'fluoro', n: 6 }], family: 'field' },
  { id: 'coAmmine', formula: '[Co(NH₃)₆]³⁺', name: 'hexaamminecobalt(III)', metal: 'Co', oxidation: 3, charge: 3, geometry: 'octahedral', ligands: [{ lig: 'ammine', n: 6 }], family: 'field' },
  { id: 'coCyano', formula: '[Co(CN)₆]³⁻', name: 'hexacyanidocobaltate(III)', metal: 'Co', oxidation: 3, charge: -3, geometry: 'octahedral', ligands: [{ lig: 'cyano', n: 6 }], family: 'field' },
  { id: 'niAmmine', formula: '[Ni(NH₃)₆]²⁺', name: 'hexaamminenickel(II)', metal: 'Ni', oxidation: 2, charge: 2, geometry: 'octahedral', ligands: [{ lig: 'ammine', n: 6 }], family: 'field' },
  { id: 'niCyano', formula: '[Ni(CN)₄]²⁻', name: 'tetracyanidonickelate(II)', metal: 'Ni', oxidation: 2, charge: -2, geometry: 'squarePlanar', ligands: [{ lig: 'cyano', n: 4 }], family: 'four' },
  { id: 'niChloro', formula: '[NiCl₄]²⁻', name: 'tetrachloridonickelate(II)', metal: 'Ni', oxidation: 2, charge: -2, geometry: 'tetrahedral', ligands: [{ lig: 'chloro', n: 4 }], family: 'four' },
  { id: 'cisplatin', formula: '[Pt(NH₃)₂Cl₂]', name: 'diamminedichloridoplatinum(II)', metal: 'Pt', oxidation: 2, charge: 0, geometry: 'squarePlanar', ligands: [{ lig: 'ammine', n: 2 }, { lig: 'chloro', n: 2 }], isomers: ['cis', 'trans'], family: 'four' },
  { id: 'coAmmineChloro', formula: '[Co(NH₃)₄Cl₂]⁺', name: 'tetraamminedichloridocobalt(III)', metal: 'Co', oxidation: 3, charge: 1, geometry: 'octahedral', ligands: [{ lig: 'ammine', n: 4 }, { lig: 'chloro', n: 2 }], isomers: ['cis', 'trans'], family: 'isomers' },
  { id: 'coAmmineTrichloro', formula: '[Co(NH₃)₃Cl₃]', name: 'triamminetrichloridocobalt(III)', metal: 'Co', oxidation: 3, charge: 0, geometry: 'octahedral', ligands: [{ lig: 'ammine', n: 3 }, { lig: 'chloro', n: 3 }], isomers: ['fac', 'mer'], family: 'isomers' },
];
export const complexById = (id) => COMPLEXES.find((c) => c.id === id) || null;

/** Oxidation state from the complex charge and the ligand charges (counting), and the d count = group − oxidation. */
export function dCount(c) {
  const ligandCharge = c.ligands.reduce((s, { lig, n }) => s + LIGANDS[lig].charge * n, 0);
  const oxidation = c.charge - ligandCharge;
  const group = METAL_GROUPS.values[c.metal];
  return { oxidation, group, d: group - oxidation, text: `group ${group} − ${oxidation} = d${SUP[group - oxidation] || group - oxidation}` };
}
const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', 10: '¹⁰' };
export const sup = (n) => SUP[n] ?? String(n);
const ROMAN = { 0: '0', 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };

// ---- crystal-field filling -----------------------------------------------------------------------------
const D_LABEL = { dxy: 'dₓᵧ', dxz: 'dₓ𝓏', dyz: 'dᵧ𝓏', dz2: 'd𝓏²', dx2y2: 'dₓ²₋ᵧ²' };
export const D_ORBITALS = ['dxy', 'dxz', 'dyz', 'dz2', 'dx2y2'];
export const dLabel = (id) => D_LABEL[id] || id;

/** The level pattern of a geometry: [{ id, set, E (units of Δ) }] lowest first. Square-planar heights are schematic. */
export function levelPattern(geometry) {
  const CF = CRYSTAL_FIELD;
  if (geometry === 'octahedral') return [...CF.octahedral.orbitals.t2g.map((id) => ({ id, set: 't2g', E: CF.octahedral.t2g })), ...CF.octahedral.orbitals.eg.map((id) => ({ id, set: 'eg', E: CF.octahedral.eg }))];
  if (geometry === 'tetrahedral') return [...CF.tetrahedral.orbitals.e.map((id) => ({ id, set: 'e', E: CF.tetrahedral.e })), ...CF.tetrahedral.orbitals.t2.map((id) => ({ id, set: 't2', E: CF.tetrahedral.t2 }))];
  if (geometry === 'squarePlanar') { const E = { dx2y2: 1.2, dxy: 0.2, dz2: -0.4, dxz: -0.5, dyz: -0.5 }; return [...CF.squarePlanar.order].reverse().map((id) => ({ id, set: id === 'dxz' || id === 'dyz' ? 'dxz,dyz' : id, E: E[id], schematic: true })); }
  throw new Error(`levelPattern(): unknown geometry ${geometry}`);
}

/**
 * Fill n d electrons into the pattern. High spin: one electron per orbital across every level before any
 * pairing (Δ < P); low spin: the lowest levels fill completely first, singly within a degenerate set (Δ > P).
 * Tetrahedral complexes are always high spin and square-planar ones always low spin (textbook rule).
 * Returns { levels: [{ id, set, E, electrons }], unpaired, pairs, extraPairs, cfse: { delta, pairing, text } }.
 */
export function fillD(n, geometry, spin = 'high') {
  if (!(n >= 0 && n <= 10)) throw new Error(`fillD(): d count ${n} out of range`);
  const mode = geometry === 'tetrahedral' ? 'high' : geometry === 'squarePlanar' ? 'low' : spin;
  const levels = levelPattern(geometry).map((l) => ({ ...l, electrons: 0 }));
  for (let k = 0; k < n; k++) {
    let target = mode === 'high' ? levels.find((l) => l.electrons === 0) || levels.find((l) => l.electrons === 1) : null;
    if (mode === 'low') { for (const l of levels) { const sameE = levels.filter((m) => Math.abs(m.E - l.E) < 1e-9); const empty = sameE.find((m) => m.electrons === 0); if (empty) { target = empty; break; } const half = sameE.find((m) => m.electrons === 1); if (half) { target = half; break; } } }
    target.electrons++;
  }
  const unpaired = levels.filter((l) => l.electrons === 1).length;
  const pairs = levels.filter((l) => l.electrons === 2).length;
  const extraPairs = pairs - Math.max(0, n - 5);
  const delta = levels.reduce((s, l) => s + l.E * l.electrons, 0);
  const sym = geometry === 'tetrahedral' ? 'Δt' : 'Δo';
  const text = geometry === 'squarePlanar' ? 'not written as multiples of one Δ (four gaps)' : `${fmtDelta(delta)} ${sym}${extraPairs > 0 ? ` + ${extraPairs === 1 ? '' : extraPairs}P` : ''}`;
  return { levels, mode, unpaired, pairs, extraPairs, cfse: { delta, pairing: extraPairs, text } };
}
const fmtDelta = (x) => (Math.abs(x) < 1e-9 ? '0' : `${x < 0 ? '−' : '+'}${Math.abs(x).toFixed(1).replace(/\.0$/, '')}`);

/** Free-ion filling (Hund): n ≤ 5 singly, then pairs. */
export const freeIonFilling = (n) => D_ORBITALS.map((id, i) => ({ id, electrons: (n > i ? 1 : 0) + (n > 5 + i ? 1 : 0) }));
/** Spin-only magnetic moment √(n(n+2)) in Bohr magnetons. */
export const spinOnlyMoment = (n) => Math.sqrt(n * (n + 2));
/** Does the complex have a high / low spin choice (d⁴–d⁷ octahedral)? */
export const hasSpinChoice = (c, d) => c.geometry === 'octahedral' && d >= 4 && d <= 7;

/** LevelDiagram spec: free-ion d orbitals on the left, the split set on the right; level ids are the orbital names. */
export function splittingSpec(c, filling, d, { selected = null } = {}) {
  const free = freeIonFilling(d);
  const fieldLabel = `${GEOMETRY_LABEL[c.geometry]} field`;
  const setLabel = { t2g: 't₂g', eg: 'e_g', e: 'e', t2: 't₂', 'dxz,dyz': 'dₓ𝓏, dᵧ𝓏', dz2: 'd𝓏²', dxy: 'dₓᵧ', dx2y2: 'dₓ²₋ᵧ²' };
  const seen = new Set();
  const levels = [
    ...free.map((l, i) => ({ id: `free-${l.id}`, column: 'ion', E: 0, electrons: l.electrons, label: i === 2 ? 'd (five, equal)' : undefined })),
    ...filling.levels.map((l) => { const first = !seen.has(l.set); seen.add(l.set); const n = filling.levels.filter((m) => m.set === l.set).length; const mid = filling.levels.filter((m) => m.set === l.set)[Math.floor((n - 1) / 2)]; return { id: l.id, column: 'field', E: l.E, electrons: l.electrons, label: mid === l ? setLabel[l.set] : undefined, style: l.id === selected ? 'solid' : 'solid' }; }),
  ];
  const connections = filling.levels.map((l) => ({ from: `free-${l.id}`, to: l.id }));
  const range = c.geometry === 'squarePlanar' ? [-0.9, 1.6] : [-0.9, 0.9];
  return { columns: [{ id: 'ion', label: 'free ion' }, { id: 'field', label: fieldLabel }], levels, connections, yLabel: c.geometry === 'squarePlanar' ? 'energy (schematic) →' : `energy (units of ${c.geometry === 'tetrahedral' ? 'Δt' : 'Δo'}) →`, range };
}

// ---- frames ---------------------------------------------------------------------------------------------
const cache = new Map();
/** Slot index of every ligand of a complex for the chosen isomer (minority set on ISOMERS slots, the rest in order). */
export function slotAssignment(c, isomer = null) {
  const n = SLOTS[c.geometry].length;
  const all = [...Array(n).keys()];
  if (c.ligands.length === 1) return c.ligands.flatMap(({ lig }, k) => all.map((slot) => ({ lig, slot, k })));
  const iso = isomer || c.isomers[0];
  const minority = ISOMERS[c.geometry][iso];
  if (!minority || minority.length !== c.ligands[1].n) throw new Error(`slotAssignment(): ${c.id} has no ${iso} arrangement`);
  const rest = all.filter((s) => !minority.includes(s));
  return [...rest.map((slot) => ({ lig: c.ligands[0].lig, slot, k: 0 })), ...minority.map((slot) => ({ lig: c.ligands[1].lig, slot, k: 1 }))];
}

/**
 * Render frame of a complex: the metal at the origin, donor atoms pinned on the template slots at the
 * element/order bond length, ligand hydrogens and the cyanide N placed by the embedder on ideal slots
 * (no lone-pair compression: ligand angles are the ideal templates), torsions relaxed. Returns { frame, donors, metalId }.
 */
export function complexFrame(id, isomer = null) {
  const c = complexById(id); if (!c) throw new Error(`complexFrame(): unknown complex ${id}`);
  const iso = c.isomers ? (isomer || c.isomers[0]) : null;
  const key = `${id}:${iso}`;
  if (!cache.has(key)) {
    const M = 'M';
    const atoms = [{ id: M, el: c.metal, label: `${c.metal}(${ROMAN[c.oxidation]})`, ...(METAL_HYB[c.geometry] ? { hyb: METAL_HYB[c.geometry] } : {}) }];
    const bonds = [];
    const pinned = { [M]: [0, 0, 0] };
    const donors = [];
    slotAssignment(c, iso).forEach(({ lig, slot }, i) => {
      const L = LIGANDS[lig], p = `L${i + 1}`;
      const la = L.atoms(p);
      atoms.push(...la);
      for (const [a, b, order] of L.bonds(p)) bonds.push({ a, b, order });
      const donor = la[0].id;
      bonds.push({ a: M, b: donor, order: 1 });
      pinned[donor] = v.scale(SLOTS[c.geometry][slot], bondLength(c.metal, L.donor, 1));
      donors.push({ id: donor, lig, slot, el: L.donor });
    });
    const mol = { atoms, bonds };
    const { positions, lonePairDirs, orbitals, frames } = embed(mol, { pinned, root: M, lonePairAngles: false });
    relaxTorsions(mol, positions, lonePairDirs, orbitals, frames);
    const frame = toFrame(mol, positions, lonePairDirs, orbitals);
    cache.set(key, { frame, donors, metalId: M, isomer: iso });
  }
  const hit = cache.get(key);
  return { frame: { ...hit.frame, atoms: hit.frame.atoms.map((a) => ({ ...a, pos: [...a.pos] })), bonds: hit.frame.bonds.map((b) => ({ ...b })) }, donors: hit.donors, metalId: hit.metalId, isomer: hit.isomer };
}

/** A metal 3d orbital centred on the metal, drawn with the tabulated Z_eff (size only). */
export function dOrbitalPsi(name, center = [0, 0, 0]) {
  return orbital(`3${name}`, { Z: D_ORBITAL_ZEFF.value, a0: A0_ANGSTROM, center });
}

// ---- build ----------------------------------------------------------------------------------------------
/**
 * Everything the card needs: buildComplex(id, { spin, isomer, orbital }).
 * `spin` overrides the tabulated state (a what-if; the card says which is tabulated); `orbital` is the d orbital drawn.
 */
export function buildComplex(id, { spin = null, isomer = null, orbital: orb = null } = {}) {
  const c = complexById(id); if (!c) throw new Error(`buildComplex(): unknown complex ${id}`);
  const count = dCount(c);
  const mag = COMPLEX_MAGNETISM.values[id] || {};
  const tabulatedSpin = mag.spin || null;
  const spinChoice = hasSpinChoice(c, count.d);
  const effSpin = spinChoice ? (spin || tabulatedSpin || 'high') : (c.geometry === 'squarePlanar' ? 'low' : 'high');
  const filling = fillD(count.d, c.geometry, effSpin);
  const { frame, donors, metalId, isomer: iso } = complexFrame(id, isomer);
  const deltaO = c.geometry === 'octahedral' ? (DELTA_O.values[id] ?? null) : null;
  const colourEntry = COMPLEX_COLOURS.values[id];
  const colour = colourEntry && typeof colourEntry === 'object' ? colourEntry[iso] : colourEntry;
  const ligandList = c.ligands.map(({ lig, n }) => ({ ...LIGANDS[lig], n, rank: seriesRank(lig) }));
  const prefix = iso ? `${iso}-` : '';
  const orbitalId = orb && D_ORBITALS.includes(orb) ? orb : null;
  const metalPos = frame.atoms.find((a) => a.id === metalId).pos;
  return {
    id, complex: c, formula: c.formula, title: `${prefix}${c.formula}`, name: `${prefix}${c.name}`, metal: c.metal, oxidation: count.oxidation, oxidationText: `${c.metal}(${ROMAN[count.oxidation]})`,
    d: count.d, dText: count.text, geometry: c.geometry, geometryLabel: GEOMETRY_LABEL[c.geometry],
    spin: effSpin, tabulatedSpin, spinChoice, isWhatIf: spinChoice && !!tabulatedSpin && effSpin !== tabulatedSpin,
    filling, unpaired: filling.unpaired, tabulatedUnpaired: mag.unpaired ?? null, moment: spinOnlyMoment(filling.unpaired), cfse: filling.cfse,
    deltaO, deltaKJ: deltaO != null ? deltaO * KJ_PER_WAVENUMBER : null, lambdaNm: deltaO != null ? 1e7 / deltaO : null,
    colour, ligands: ligandList, isomer: iso, isomers: c.isomers || null,
    frame, donors, metalId, metalPos,
    orbital: orbitalId, psi: orbitalId ? dOrbitalPsi(orbitalId, metalPos) : null, orbitalLabel: orbitalId ? dLabel(orbitalId) : null,
    diagram: splittingSpec(c, filling, count.d, { selected: orbitalId }),
    series: SPECTROCHEMICAL_SERIES.order,
  };
}

/** Facts the sweep reads: Δo values of same-metal, same-oxidation pairs must rise along the spectrochemical series. */
export function seriesComparisons() {
  const out = [];
  const withDelta = COMPLEXES.filter((c) => c.geometry === 'octahedral' && c.ligands.length === 1 && DELTA_O.values[c.id] != null);
  for (let i = 0; i < withDelta.length; i++) for (let j = 0; j < withDelta.length; j++) {
    const a = withDelta[i], b = withDelta[j];
    if (a.metal !== b.metal || a.oxidation !== b.oxidation || a.id === b.id) continue;
    const ra = seriesRank(a.ligands[0].lig), rb = seriesRank(b.ligands[0].lig);
    if (ra < rb) out.push({ weaker: a.id, stronger: b.id, deltaWeaker: DELTA_O.values[a.id], deltaStronger: DELTA_O.values[b.id], ok: DELTA_O.values[a.id] < DELTA_O.values[b.id] });
  }
  return out;
}

export { ORBITAL_LABELS };
