// Redox topic, phase A: oxidation states from any molecular graph (the IUPAC ionic approximation: each bond's
// electrons to the more electronegative atom), the carbon oxidation ladder on the functional-group molecules,
// the app's own reactions classified as redox or not, and half-reactions balanced in acid or base by counting
// atoms and charge. Every number is counting on a Lewis structure or a cited table; no potential, energy or
// rate is computed (docs/REVIEW_PROTOCOL.md §6). Pure and dependency-free.
import { makeMolecule, embedMolecule, toFrame } from './builder.js';
import { embed, relaxTorsions, alignPrincipal, rotateDirs, v, DEG } from './geometry.js';
import { formulaFromAtoms } from './elements.js';
import { ELECTRONEGATIVITY, OXIDATION_STATE_RULES, REDOX_BOND_LENGTHS, DICHROMATE_BRIDGE_ANGLE } from './references/textbook.js';

/** Valence electrons for the Lewis check (main group: group number; metals: group number, i.e. s + d electrons). */
export const VALENCE_ELECTRONS = { H: 1, C: 4, N: 5, O: 6, F: 7, P: 5, S: 6, Cl: 7, Br: 7, I: 7, Mn: 7, Cr: 6, Fe: 8, Cu: 11, Zn: 12, Li: 1, Mg: 2, Al: 3, Ni: 10, Ag: 11, Pb: 4 };
const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻', '−': '⁻' };
const SUB = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
const sup = (s) => String(s).replace(/./g, (c) => SUP[c] || c);
/** '−1', '0', '+3' */
export const osText = (n) => (n === 0 ? '0' : n > 0 ? `+${n}` : `−${-n}`);
/** Charge as a formula superscript: 0 → '', 1 → '⁺', −2 → '²⁻'. */
export const chargeSup = (q) => (q === 0 ? '' : `${Math.abs(q) === 1 ? '' : sup(Math.abs(q))}${q > 0 ? '⁺' : '⁻'}`);

const sgn = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);

/**
 * Oxidation state of every atom of a graph by the rule in OXIDATION_STATE_RULES, plus the electron-count form
 * (valence − lone-pair electrons − bond electrons won) and a Lewis check (formal charge recomputed from
 * valence, lone pairs and bond orders equals the drawn charge). Bonds between atoms of equal
 * electronegativity contribute nothing. Returns Map<id, { el, charge, os, osByCount, lewisOk, toH, toHetero, toSame }>.
 */
export function oxidationStates(graph, en = ELECTRONEGATIVITY) {
  const byId = new Map(graph.atoms.map((a) => [a.id, a]));
  const out = new Map(graph.atoms.map((a) => [a.id, { el: a.el, charge: a.charge || 0, os: a.charge || 0, won: 0, orderSum: 0, toH: 0, toHetero: 0, toSame: 0 }]));
  for (const b of graph.bonds) {
    const A = byId.get(b.a), B = byId.get(b.b), order = b.order || 1;
    if (!A || !B) throw new Error(`oxidationStates(): bond ${b.a}–${b.b} names a missing atom`);
    const eA = en[A.el], eB = en[B.el];
    if (eA == null || eB == null) throw new Error(`oxidationStates(): no electronegativity for ${eA == null ? A.el : B.el}`);
    const s = A.el === B.el ? 0 : sgn(eB - eA);          // +1: B more electronegative, A loses the bond electrons
    const ra = out.get(A.id), rb = out.get(B.id);
    ra.os += order * s; rb.os -= order * s;
    ra.won += s < 0 ? 2 * order : s === 0 ? order : 0; rb.won += s > 0 ? 2 * order : s === 0 ? order : 0;
    ra.orderSum += order; rb.orderSum += order;
    const tag = (r, other) => { if (other.el === 'H') r.toH += order; else if (other.el === r.el) r.toSame += order; else if (en[other.el] > en[r.el]) r.toHetero += order; };
    tag(ra, B); tag(rb, A);
  }
  for (const [id, r] of out) {
    const a = byId.get(id), V = VALENCE_ELECTRONS[a.el], lp = a.lonePairs || 0;
    const bare = r.orderSum === 0;                        // an isolated ion: its oxidation state is its charge by definition
    r.osByCount = V == null ? null : bare ? r.os : V - 2 * lp - r.won;
    r.lewisOk = V == null ? null : bare ? true : V - 2 * lp - r.orderSum === (a.charge || 0);
    delete r.won; delete r.orderSum;
  }
  return out;
}

/** Atom ids whose drawn charge, lone pairs and bond orders do not make a consistent Lewis structure. */
export function lewisProblems(graph) { return [...oxidationStates(graph)].filter(([, r]) => r.lewisOk === false).map(([id]) => id); }

/** Element counts of a graph, e.g. { C: 2, H: 6, O: 1 }. */
export function composition(graph) { const c = {}; for (const a of graph.atoms) c[a.el] = (c[a.el] || 0) + 1; return c; }
/** Total charge of a graph. */
export const totalCharge = (graph) => graph.atoms.reduce((s, a) => s + (a.charge || 0), 0);

// ---- species -----------------------------------------------------------------------------------------------------
const H3 = (c, ...hs) => hs.map((h) => ({ a: c, b: h, order: 1 }));
const lp = (el, n) => ({ el, lonePairs: n });
const blen = (key) => ({ length: REDOX_BOND_LENGTHS[key].length, ref: REDOX_BOND_LENGTHS[key].ref });
const ion = (el, charge, lonePairs = 0) => ({ atoms: [{ id: el, el, charge, lonePairs }], bonds: [] });
/**
 * Every species a couple uses. `formula` is the display string; `build` is a functional-group recipe
 * (`fg`, `choice`), an explicit graph, or a bare ion. `highlight` (optional) names the atoms the card highlights
 * on this side of a couple; by default every atom of the couple's key element is highlighted.
 */
export const SPECIES = {
  methane: { formula: 'CH₄', name: 'methane', charge: 0, build: { graph: { atoms: [{ id: 'C', el: 'C' }, { id: 'H1', el: 'H' }, { id: 'H2', el: 'H' }, { id: 'H3', el: 'H' }, { id: 'H4', el: 'H' }], bonds: H3('C', 'H1', 'H2', 'H3', 'H4') } } },
  methanol: { formula: 'CH₃OH', name: 'methanol', charge: 0, build: { fg: 'alcohol', choice: { R: { R1: 'methyl' } } } },
  formaldehyde: { formula: 'H₂CO', name: 'formaldehyde (methanal)', charge: 0, build: { fg: 'aldehyde', choice: { R: { R1: 'H' } } } },
  formicAcid: { formula: 'HCOOH', name: 'formic acid (methanoic acid)', charge: 0, build: { fg: 'carboxylicAcid', choice: { R: { R1: 'H' } } } },
  carbonDioxide: { formula: 'CO₂', name: 'carbon dioxide', charge: 0, build: { graph: { atoms: [{ id: 'C', el: 'C', hyb: 'sp' }, { id: 'O1', el: 'O', hyb: 'sp2', lonePairs: 2 }, { id: 'O2', el: 'O', hyb: 'sp2', lonePairs: 2 }], bonds: [{ a: 'C', b: 'O1', order: 2 }, { a: 'C', b: 'O2', order: 2 }] } } },
  ethanol: { formula: 'CH₃CH₂OH', name: 'ethanol', charge: 0, build: { fg: 'alcohol', choice: { R: { R1: 'ethyl' } } }, highlight: ['R1.C1'] },
  acetaldehyde: { formula: 'CH₃CHO', name: 'acetaldehyde (ethanal)', charge: 0, build: { fg: 'aldehyde', choice: { R: { R1: 'methyl' } } }, highlight: ['C'] },
  aceticAcid: { formula: 'CH₃COOH', name: 'acetic acid (ethanoic acid)', charge: 0, build: { fg: 'carboxylicAcid', choice: { R: { R1: 'methyl' } } }, highlight: ['C'] },
  propan2ol: { formula: '(CH₃)₂CHOH', name: 'propan-2-ol (isopropyl alcohol)', charge: 0, build: { fg: 'alcohol', choice: { R: { R1: 'isopropyl' } } }, highlight: ['R1.C1'] },
  acetone: { formula: '(CH₃)₂CO', name: 'acetone (propanone)', charge: 0, build: { fg: 'ketone', choice: { R: { R1: 'methyl', R2: 'methyl' } } }, highlight: ['C'] },
  ethene: { formula: 'C₂H₄', name: 'ethene (ethylene)', charge: 0, build: { fg: 'alkene', choice: { R: { R1: 'H', R2: 'H', R3: 'H', R4: 'H' } } } },
  ethane: { formula: 'C₂H₆', name: 'ethane', charge: 0, build: { graph: { atoms: [{ id: 'C1', el: 'C' }, { id: 'C2', el: 'C' }, { id: 'H1', el: 'H' }, { id: 'H2', el: 'H' }, { id: 'H3', el: 'H' }, { id: 'H4', el: 'H' }, { id: 'H5', el: 'H' }, { id: 'H6', el: 'H' }], bonds: [{ a: 'C1', b: 'C2', order: 1 }, ...H3('C1', 'H1', 'H2', 'H3'), ...H3('C2', 'H4', 'H5', 'H6')] } } },
  bromoethane: { formula: 'CH₃CH₂Br', name: 'bromoethane (ethyl bromide)', charge: 0, build: { fg: 'haloalkane', choice: { variant: 'Br', R: { R1: 'ethyl' } } } },
  bromide: { formula: 'Br⁻', name: 'bromide ion', charge: -1, build: { graph: ion('Br', -1, 4) } },
  nitrobenzene: { formula: 'C₆H₅NO₂', name: 'nitrobenzene', charge: 0, build: { fg: 'nitro', choice: { R: { R1: 'phenyl' } } } },
  aniline: { formula: 'C₆H₅NH₂', name: 'aniline', charge: 0, build: { fg: 'amine', choice: { R: { R1: 'phenyl', R2: 'H', R3: 'H' } } } },
  ethanethiol: { formula: 'C₂H₅SH', name: 'ethanethiol', charge: 0, build: { fg: 'thiol', choice: { R: { R1: 'ethyl' } } } },
  diethylDisulfide: { formula: 'C₂H₅SSC₂H₅', name: 'diethyl disulfide', charge: 0, build: { graph: { atoms: [{ id: 'S1', ...lp('S', 2) }, { id: 'S2', ...lp('S', 2) }, { id: 'Ca1', el: 'C' }, { id: 'Ca2', el: 'C' }, { id: 'Cb1', el: 'C' }, { id: 'Cb2', el: 'C' }, ...['Ha1', 'Ha2', 'Ha3', 'Ha4', 'Ha5', 'Hb1', 'Hb2', 'Hb3', 'Hb4', 'Hb5'].map((id) => ({ id, el: 'H' }))], bonds: [{ a: 'S1', b: 'S2', order: 1 }, { a: 'S1', b: 'Ca1', order: 1 }, { a: 'S2', b: 'Cb1', order: 1 }, { a: 'Ca1', b: 'Ca2', order: 1 }, { a: 'Cb1', b: 'Cb2', order: 1 }, ...H3('Ca1', 'Ha1', 'Ha2'), ...H3('Ca2', 'Ha3', 'Ha4', 'Ha5'), ...H3('Cb1', 'Hb1', 'Hb2'), ...H3('Cb2', 'Hb3', 'Hb4', 'Hb5')] }, root: 'S1' } },
  water: { formula: 'H₂O', name: 'water', charge: 0, build: { graph: { atoms: [{ id: 'O', ...lp('O', 2) }, { id: 'H1', el: 'H' }, { id: 'H2', el: 'H' }], bonds: H3('O', 'H1', 'H2') } } },
  hydrogenPeroxide: { formula: 'H₂O₂', name: 'hydrogen peroxide', charge: 0, build: { graph: { atoms: [{ id: 'O1', ...lp('O', 2) }, { id: 'O2', ...lp('O', 2) }, { id: 'H1', el: 'H' }, { id: 'H2', el: 'H' }], bonds: [{ a: 'O1', b: 'O2', order: 1, ...blen('hydrogenPeroxide_OO') }, { a: 'O1', b: 'H1', order: 1, ...blen('hydrogenPeroxide_OH') }, { a: 'O2', b: 'H2', order: 1, ...blen('hydrogenPeroxide_OH') }] }, root: 'O1' } },
  dioxygen: { formula: 'O₂', name: 'dioxygen', charge: 0, build: { graph: { atoms: [{ id: 'O1', el: 'O', hyb: 'sp2', lonePairs: 2 }, { id: 'O2', el: 'O', hyb: 'sp2', lonePairs: 2 }], bonds: [{ a: 'O1', b: 'O2', order: 2 }] } } },
  dihydrogen: { formula: 'H₂', name: 'dihydrogen', charge: 0, build: { graph: { atoms: [{ id: 'H1', el: 'H' }, { id: 'H2', el: 'H' }], bonds: [{ a: 'H1', b: 'H2', order: 1 }] } } },
  proton: { formula: 'H⁺', name: 'hydrogen ion (hydrated in water)', charge: 1, build: { graph: ion('H', 1) } },
  chlorine: { formula: 'Cl₂', name: 'dichlorine', charge: 0, build: { graph: { atoms: [{ id: 'Cl1', ...lp('Cl', 3) }, { id: 'Cl2', ...lp('Cl', 3) }], bonds: [{ a: 'Cl1', b: 'Cl2', order: 1, ...blen('Cl2_ClCl') }] } } },
  fluorine: { formula: 'F₂', name: 'difluorine', charge: 0, build: { graph: { atoms: [{ id: 'F1', ...lp('F', 3) }, { id: 'F2', ...lp('F', 3) }], bonds: [{ a: 'F1', b: 'F2', order: 1, ...blen('F2_FF') }] } } },
  fluoride: { formula: 'F⁻', name: 'fluoride ion', charge: -1, build: { graph: ion('F', -1, 4) } },
  bromine: { formula: 'Br₂', name: 'dibromine', charge: 0, build: { graph: { atoms: [{ id: 'Br1', ...lp('Br', 3) }, { id: 'Br2', ...lp('Br', 3) }], bonds: [{ a: 'Br1', b: 'Br2', order: 1, ...blen('Br2_BrBr') }] } } },
  iodine: { formula: 'I₂', name: 'diiodine', charge: 0, build: { graph: { atoms: [{ id: 'I1', ...lp('I', 3) }, { id: 'I2', ...lp('I', 3) }], bonds: [{ a: 'I1', b: 'I2', order: 1, ...blen('I2_II') }] } } },
  iodide: { formula: 'I⁻', name: 'iodide ion', charge: -1, build: { graph: ion('I', -1, 4) } },
  lithium: { formula: 'Li', name: 'lithium metal', charge: 0, build: { graph: ion('Li', 0) } },
  lithium1: { formula: 'Li⁺', name: 'lithium ion (hydrated)', charge: 1, build: { graph: ion('Li', 1) } },
  magnesium: { formula: 'Mg', name: 'magnesium metal', charge: 0, build: { graph: ion('Mg', 0) } },
  magnesium2: { formula: 'Mg²⁺', name: 'magnesium ion (hydrated)', charge: 2, build: { graph: ion('Mg', 2) } },
  aluminium: { formula: 'Al', name: 'aluminium metal', charge: 0, build: { graph: ion('Al', 0) } },
  aluminium3: { formula: 'Al³⁺', name: 'aluminium ion (hydrated)', charge: 3, build: { graph: ion('Al', 3) } },
  iron0: { formula: 'Fe', name: 'iron metal', charge: 0, build: { graph: ion('Fe', 0) } },
  nickel: { formula: 'Ni', name: 'nickel metal', charge: 0, build: { graph: ion('Ni', 0) } },
  nickel2: { formula: 'Ni²⁺', name: 'nickel(II) ion (hydrated)', charge: 2, build: { graph: ion('Ni', 2) } },
  lead: { formula: 'Pb', name: 'lead metal', charge: 0, build: { graph: ion('Pb', 0) } },
  lead2: { formula: 'Pb²⁺', name: 'lead(II) ion (hydrated)', charge: 2, build: { graph: ion('Pb', 2) } },
  silver: { formula: 'Ag', name: 'silver metal', charge: 0, build: { graph: ion('Ag', 0) } },
  silver1: { formula: 'Ag⁺', name: 'silver ion (hydrated)', charge: 1, build: { graph: ion('Ag', 1) } },
  chloride: { formula: 'Cl⁻', name: 'chloride ion', charge: -1, build: { graph: ion('Cl', -1, 4) } },
  permanganate: { formula: 'MnO₄⁻', name: 'permanganate ion', charge: -1, build: { graph: { atoms: [{ id: 'Mn', el: 'Mn' }, { id: 'O1', el: 'O', hyb: 'sp2', lonePairs: 2 }, { id: 'O2', el: 'O', hyb: 'sp2', lonePairs: 2 }, { id: 'O3', el: 'O', hyb: 'sp2', lonePairs: 2 }, { id: 'O4', el: 'O', lonePairs: 3, charge: -1 }], bonds: [{ a: 'Mn', b: 'O1', order: 2, ...blen('permanganate_MnO') }, { a: 'Mn', b: 'O2', order: 2, ...blen('permanganate_MnO') }, { a: 'Mn', b: 'O3', order: 2, ...blen('permanganate_MnO') }, { a: 'Mn', b: 'O4', order: 1, ...blen('permanganate_MnO') }] }, root: 'Mn' }, highlight: ['Mn'] },
  manganese2: { formula: 'Mn²⁺', name: 'manganese(II) ion (hydrated)', charge: 2, build: { graph: ion('Mn', 2) } },
  dichromate: { formula: 'Cr₂O₇²⁻', name: 'dichromate ion', charge: -2, build: { graph: dichromateGraph(), pinned: dichromatePins(), root: 'Ob' }, highlight: ['Cr1', 'Cr2'] },
  chromium3: { formula: 'Cr³⁺', name: 'chromium(III) ion (hydrated)', charge: 3, build: { graph: ion('Cr', 3) } },
  iron3: { formula: 'Fe³⁺', name: 'iron(III) ion (hydrated)', charge: 3, build: { graph: ion('Fe', 3) } },
  iron2: { formula: 'Fe²⁺', name: 'iron(II) ion (hydrated)', charge: 2, build: { graph: ion('Fe', 2) } },
  copper2: { formula: 'Cu²⁺', name: 'copper(II) ion (hydrated)', charge: 2, build: { graph: ion('Cu', 2) } },
  copper: { formula: 'Cu', name: 'copper metal', charge: 0, build: { graph: ion('Cu', 0) } },
  zinc2: { formula: 'Zn²⁺', name: 'zinc ion (hydrated)', charge: 2, build: { graph: ion('Zn', 2) } },
  zinc: { formula: 'Zn', name: 'zinc metal', charge: 0, build: { graph: ion('Zn', 0) } },
};
function dichromateGraph() {
  const t = (id) => ({ id, el: 'O', hyb: 'sp2', lonePairs: 2 });
  const m = (id) => ({ id, el: 'O', lonePairs: 3, charge: -1 });
  return {
    atoms: [{ id: 'Cr1', el: 'Cr' }, { id: 'Cr2', el: 'Cr' }, { id: 'Ob', el: 'O', lonePairs: 2 }, t('O1a'), t('O1b'), m('O1c'), t('O2a'), t('O2b'), m('O2c')],
    bonds: [
      { a: 'Cr1', b: 'Ob', order: 1, ...blen('dichromate_CrO_bridge') }, { a: 'Cr2', b: 'Ob', order: 1, ...blen('dichromate_CrO_bridge') },
      { a: 'Cr1', b: 'O1a', order: 2, ...blen('dichromate_CrO_terminal') }, { a: 'Cr1', b: 'O1b', order: 2, ...blen('dichromate_CrO_terminal') }, { a: 'Cr1', b: 'O1c', order: 1, ...blen('dichromate_CrO_terminal') },
      { a: 'Cr2', b: 'O2a', order: 2, ...blen('dichromate_CrO_terminal') }, { a: 'Cr2', b: 'O2b', order: 2, ...blen('dichromate_CrO_terminal') }, { a: 'Cr2', b: 'O2c', order: 1, ...blen('dichromate_CrO_terminal') },
    ],
  };
}
/** The bridge pinned at the measured Cr–O–Cr angle and Cr–O(bridge) length; the terminal oxygens take the ideal tetrahedral slots. */
function dichromatePins() {
  const L = REDOX_BOND_LENGTHS.dichromate_CrO_bridge.length, half = (DICHROMATE_BRIDGE_ANGLE.angle / 2) * DEG;
  return { Ob: [0, 0, 0], Cr1: [L * Math.sin(half), L * Math.cos(half), 0], Cr2: [-L * Math.sin(half), L * Math.cos(half), 0] };
}
export const SPECIES_IDS = Object.keys(SPECIES);
export const speciesById = (id) => SPECIES[id] || null;

const graphCache = new Map(), frameCache = new Map();
/** The molecular graph of a species (atoms with el / charge / lonePairs, bonds with order), cached and never mutated by callers. */
export function speciesGraph(id) {
  const sp = SPECIES[id];
  if (!sp) throw new Error(`speciesGraph(): unknown species ${id}`);
  if (!graphCache.has(id)) {
    const g = sp.build.fg ? (() => { const { mol } = makeMolecule(sp.build.fg, sp.build.choice); return { atoms: mol.atoms, bonds: mol.bonds, aliases: mol.aliases }; })() : { atoms: sp.build.graph.atoms, bonds: sp.build.graph.bonds, aliases: {} };
    graphCache.set(id, g);
  }
  return graphCache.get(id);
}
/** The embedded frame of a species (unlabelled), cached. Functional-group species come from the builder; explicit graphs are embedded here, pinned where a measured geometry says so. */
export function speciesFrame(id) {
  const sp = SPECIES[id];
  if (!sp) throw new Error(`speciesFrame(): unknown species ${id}`);
  if (!frameCache.has(id)) {
    let frame;
    if (sp.build.fg) frame = makeMolecule(sp.build.fg, sp.build.choice).frame;
    else if (sp.build.pinned) {
      const g = sp.build.graph;
      const { positions, lonePairDirs, orbitals, frames } = embed(g, { pinned: sp.build.pinned, root: sp.build.root, lonePairAngles: false });
      relaxTorsions(g, positions, lonePairDirs, orbitals, frames);
      const aligned = alignPrincipal(positions);
      frame = toFrame(g, aligned.positions, rotateDirs(lonePairDirs, aligned.rotation), rotateDirs(orbitals, aligned.rotation), { crowding: null });
    } else frame = embedMolecule({ atoms: sp.build.graph.atoms, bonds: sp.build.graph.bonds, fg: sp.build.root ? { attachments: [{ atom: sp.build.root }] } : undefined });
    frameCache.set(id, frame);
  }
  return frameCache.get(id);
}
/** The species frame with every heavy atom (every atom, for molecules of three atoms or fewer) labelled with its oxidation state. */
export function labelledFrame(id) {
  const base = speciesFrame(id), os = oxidationStates(speciesGraph(id));
  const small = base.atoms.length <= 3;
  return { ...base, atoms: base.atoms.map((a) => ({ ...a, pos: [...a.pos], label: a.el !== 'H' || small ? osText(os.get(a.id).os) : a.label })), bonds: base.bonds.map((b) => ({ ...b })) };
}

// ---- couples --------------------------------------------------------------------------------------------------------
export const FAMILIES = {
  ladder: { label: 'The carbon oxidation ladder', color: '#a3853f' },
  organic: { label: 'Organic redox', color: '#b07a9a' },
  none: { label: 'Not redox: the Reaction lab reactions', color: '#7f8bb3' },
  inorganic: { label: 'Inorganic couples', color: '#5f8ea3' },
};
const S = (sp, n = 1) => ({ sp, n });
/**
 * Each couple is written from → to (the direction the card names); `key` lists the elements whose oxidation
 * states change (every atom of those elements is in the listed species, none in the H₂O / H⁺ / OH⁻ the balancer
 * adds), so Σ key oxidation states on each side gives the electron count independently of the balancer.
 */
export const COUPLES = [
  { id: 'methane', name: 'Methane to methanol', from: [S('methane')], to: [S('methanol')], key: ['C'], family: 'ladder' },
  { id: 'methanol', name: 'Methanol to formaldehyde', from: [S('methanol')], to: [S('formaldehyde')], key: ['C'], family: 'ladder' },
  { id: 'formaldehyde', name: 'Formaldehyde to formic acid', from: [S('formaldehyde')], to: [S('formicAcid')], key: ['C'], family: 'ladder' },
  { id: 'formicAcid', name: 'Formic acid to carbon dioxide', from: [S('formicAcid')], to: [S('carbonDioxide')], key: ['C'], family: 'ladder' },
  { id: 'ethanol', name: 'Ethanol to acetaldehyde', from: [S('ethanol')], to: [S('acetaldehyde')], key: ['C'], family: 'ladder', links: [{ label: 'Alcohol: oxidisable only with an α-H', href: '#functional-groups/alcohol/ox' }] },
  { id: 'acetaldehyde', name: 'Acetaldehyde to acetic acid', from: [S('acetaldehyde')], to: [S('aceticAcid')], key: ['C'], family: 'ladder', links: [{ label: 'Aldehyde: oxidised to the acid', href: '#functional-groups/aldehyde/ox' }] },
  { id: 'propan2ol', name: 'Propan-2-ol to acetone', from: [S('propan2ol')], to: [S('acetone')], key: ['C'], family: 'ladder' },
  { id: 'hydrogenation', name: 'Ethene to ethane (hydrogenation)', from: [S('ethene')], to: [S('ethane')], key: ['C'], family: 'organic', partner: 'hydrogen', links: [{ label: 'Alkene', href: '#functional-groups/alkene' }] },
  { id: 'nitrobenzene', name: 'Nitrobenzene to aniline', from: [S('nitrobenzene')], to: [S('aniline')], key: ['N'], family: 'organic', links: [{ label: 'Nitro group', href: '#functional-groups/nitro' }, { label: 'Amine', href: '#functional-groups/amine' }] },
  { id: 'thiol', name: 'Two thiols to a disulfide', from: [S('ethanethiol', 2)], to: [S('diethylDisulfide')], key: ['S'], family: 'organic', links: [{ label: 'Thiol', href: '#functional-groups/thiol' }] },
  { id: 'substitution', name: 'Bromoethane to ethanol (SN2)', from: [S('bromoethane'), S('water')], to: [S('ethanol'), S('bromide')], key: ['C'], family: 'none', links: [{ label: 'Watch SN2', href: '#mechanisms/sn2' }] },
  { id: 'elimination', name: 'Bromoethane to ethene (E2)', from: [S('bromoethane')], to: [S('ethene'), S('bromide')], key: ['C'], family: 'none', links: [{ label: 'Watch E2', href: '#mechanisms/e2' }] },
  { id: 'hydration', name: 'Ethene to ethanol (hydration)', from: [S('ethene'), S('water')], to: [S('ethanol')], key: ['C'], family: 'none' },
  { id: 'permanganate', name: 'Permanganate to Mn(II)', from: [S('permanganate')], to: [S('manganese2')], key: ['Mn'], family: 'inorganic' },
  { id: 'dichromate', name: 'Dichromate to Cr(III)', from: [S('dichromate')], to: [S('chromium3', 2)], key: ['Cr'], family: 'inorganic' },
  { id: 'iron', name: 'Fe(III) to Fe(II)', from: [S('iron3')], to: [S('iron2')], key: ['Fe'], family: 'inorganic', links: [{ label: '[Fe(H₂O)₆]²⁺ in the Transition metals tab', href: '#transition-metals/feAqua' }] },
  { id: 'copper', name: 'Cu(II) to copper metal', from: [S('copper2')], to: [S('copper')], key: ['Cu'], family: 'inorganic', links: [{ label: '[Cu(H₂O)₆]²⁺', href: '#transition-metals/cuAqua' }] },
  { id: 'zinc', name: 'Zinc metal to Zn(II)', from: [S('zinc')], to: [S('zinc2')], key: ['Zn'], family: 'inorganic', links: [{ label: '[Zn(H₂O)₆]²⁺', href: '#transition-metals/znAqua' }] },
  { id: 'hydrogen', name: 'Hydrogen ions to H₂', from: [S('proton', 2)], to: [S('dihydrogen')], key: ['H'], family: 'inorganic' },
  { id: 'oxygen', name: 'Oxygen to water', from: [S('dioxygen')], to: [S('water', 2)], key: ['O'], family: 'inorganic' },
  { id: 'peroxideReduced', name: 'Hydrogen peroxide to water', from: [S('hydrogenPeroxide')], to: [S('water', 2)], key: ['O'], family: 'inorganic', partner: 'peroxideOxidised' },
  { id: 'peroxideOxidised', name: 'Hydrogen peroxide to oxygen', from: [S('hydrogenPeroxide')], to: [S('dioxygen')], key: ['O'], family: 'inorganic', partner: 'peroxideReduced' },
  { id: 'chlorine', name: 'Chlorine to chloride', from: [S('chlorine')], to: [S('chloride', 2)], key: ['Cl'], family: 'inorganic' },
  // the rest of the electrochemical series (Electrochemistry topic); all written as reductions
  { id: 'fluorine', name: 'Fluorine to fluoride', from: [S('fluorine')], to: [S('fluoride', 2)], key: ['F'], family: 'inorganic' },
  { id: 'bromine', name: 'Bromine to bromide', from: [S('bromine')], to: [S('bromide', 2)], key: ['Br'], family: 'inorganic' },
  { id: 'iodine', name: 'Iodine to iodide', from: [S('iodine')], to: [S('iodide', 2)], key: ['I'], family: 'inorganic' },
  { id: 'silver', name: 'Ag(I) to silver metal', from: [S('silver1')], to: [S('silver')], key: ['Ag'], family: 'inorganic' },
  { id: 'lead', name: 'Pb(II) to lead metal', from: [S('lead2')], to: [S('lead')], key: ['Pb'], family: 'inorganic' },
  { id: 'nickel', name: 'Ni(II) to nickel metal', from: [S('nickel2')], to: [S('nickel')], key: ['Ni'], family: 'inorganic', links: [{ label: '[Ni(H₂O)₆]²⁺', href: '#transition-metals/niAqua' }] },
  { id: 'ironMetal', name: 'Fe(II) to iron metal', from: [S('iron2')], to: [S('iron0')], key: ['Fe'], family: 'inorganic' },
  { id: 'aluminium', name: 'Al(III) to aluminium metal', from: [S('aluminium3')], to: [S('aluminium')], key: ['Al'], family: 'inorganic' },
  { id: 'magnesium', name: 'Mg(II) to magnesium metal', from: [S('magnesium2')], to: [S('magnesium')], key: ['Mg'], family: 'inorganic' },
  { id: 'lithium', name: 'Li(I) to lithium metal', from: [S('lithium1')], to: [S('lithium')], key: ['Li'], family: 'inorganic' },
];
export const coupleById = (id) => COUPLES.find((c) => c.id === id) || null;

// ---- balancing --------------------------------------------------------------------------------------------------------
const AUX = {
  water: { formula: 'H₂O', comp: { H: 2, O: 1 }, charge: 0 },
  proton: { formula: 'H⁺', comp: { H: 1 }, charge: 1 },
  hydroxide: { formula: 'OH⁻', comp: { H: 1, O: 1 }, charge: -1 },
  electron: { formula: 'e⁻', comp: {}, charge: -1 },
};
const termOf = (id) => (AUX[id] && !SPECIES[id] ? { id, ...AUX[id] } : { id, formula: SPECIES[id].formula, comp: composition(speciesGraph(id)), charge: SPECIES[id].charge });
const addTerm = (side, id, n) => { if (n <= 0) return; const t = side.find((x) => x.id === id); if (t) t.n += n; else side.push({ ...termOf(id), n }); };
const count = (side, el) => side.reduce((s, t) => s + t.n * (t.comp[el] || 0), 0);
const charge = (side, extraId = null) => side.reduce((s, t) => s + t.n * t.charge, 0);
const cancel = (left, right, id) => { const l = left.find((x) => x.id === id), r = right.find((x) => x.id === id); if (!l || !r) return; const n = Math.min(l.n, r.n); l.n -= n; r.n -= n; };
const tidy = (side) => side.filter((t) => t.n > 0);
const sideText = (side) => side.map((t) => `${t.n === 1 ? '' : `${t.n} `}${t.formula}`).join(' + ');
const ORDER = ['species', 'water', 'proton', 'hydroxide', 'electron'];
const sortSide = (side) => side.sort((a, b) => (AUX[a.id] && !SPECIES[a.id] ? ORDER.indexOf(a.id) : 0) - (AUX[b.id] && !SPECIES[b.id] ? ORDER.indexOf(b.id) : 0));

/**
 * Balance a half-reaction (or any equation) written as species lists, in acid (H₂O for O, H⁺ for H, e⁻ for charge)
 * or base (then OH⁻ added to both sides to remove the H⁺). Every element other than H and O must already balance:
 * the couple states those counts. Returns { medium, left, right, electrons (signed: positive = lost, an oxidation;
 * negative = gained; 0 = not a redox equation), kind, text, reverseText }.
 */
export function balance({ from, to }, medium = 'acid') {
  const left = [], right = [];
  for (const { sp, n } of from) addTerm(left, sp, n);
  for (const { sp, n } of to) addTerm(right, sp, n);
  const els = new Set([...left, ...right].flatMap((t) => Object.keys(t.comp)));
  for (const el of els) if (el !== 'H' && el !== 'O' && count(left, el) !== count(right, el)) throw new Error(`balance(): ${el} does not balance (${count(left, el)} vs ${count(right, el)}); state the species counts`);
  const dO = count(left, 'O') - count(right, 'O');
  if (dO > 0) addTerm(right, 'water', dO); else addTerm(left, 'water', -dO);
  const dH = count(left, 'H') - count(right, 'H');
  if (dH > 0) addTerm(right, 'proton', dH); else addTerm(left, 'proton', -dH);
  const dq = charge(left) - charge(right);
  if (dq > 0) addTerm(left, 'electron', dq); else addTerm(right, 'electron', -dq);
  if (medium === 'base') {
    const side = left.find((t) => t.id === 'proton') ? left : right.find((t) => t.id === 'proton') ? right : null;
    if (side) {
      const other = side === left ? right : left;
      const n = side.find((t) => t.id === 'proton').n;
      side.find((t) => t.id === 'proton').n = 0;
      addTerm(side, 'water', n); addTerm(other, 'hydroxide', n);
      cancel(left, right, 'water');
    }
  }
  const L = sortSide(tidy(left)), R = sortSide(tidy(right));
  const eL = L.find((t) => t.id === 'electron')?.n || 0, eR = R.find((t) => t.id === 'electron')?.n || 0;
  const electrons = eR - eL;
  return { medium, left: L, right: R, electrons, kind: electrons > 0 ? 'oxidation' : electrons < 0 ? 'reduction' : 'none', text: `${sideText(L)} → ${sideText(R)}`, reverseText: `${sideText(R)} → ${sideText(L)}` };
}
/** Element and charge totals of both sides of a balanced equation (for the sweep): true when every element and the charge agree. */
export function isBalanced(eq) {
  const els = new Set([...eq.left, ...eq.right].flatMap((t) => Object.keys(t.comp)));
  for (const el of els) if (count(eq.left, el) !== count(eq.right, el)) return false;
  return charge(eq.left) === charge(eq.right);
}

/** Σ oxidation states of the key elements on each side of a couple (× species count): the electrons the atoms themselves lose. */
export function keyChange(couple) {
  const sum = (side) => side.reduce((s, { sp, n }) => { const os = oxidationStates(speciesGraph(sp)); let t = 0; for (const r of os.values()) if (couple.key.includes(r.el)) t += r.os; return s + n * t; }, 0);
  const before = sum(couple.from), after = sum(couple.to);
  return { before, after, lost: after - before };
}

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
/**
 * The overall equation from this couple and a partner: the two half-reactions scaled to the same electron count,
 * the partner reversed when both run the same way, added, and common species cancelled. In acid. Returns null
 * when either is not a redox couple.
 */
export function overall(coupleId, partnerId) {
  const A = coupleById(coupleId), B = coupleById(partnerId);
  if (!A || !B) throw new Error(`overall(): unknown couple ${!A ? coupleId : partnerId}`);
  const a = balance(A), b0 = balance(B);
  if (!a.electrons || !b0.electrons) return null;
  const flip = Math.sign(a.electrons) === Math.sign(b0.electrons);
  return combine(a, flip ? reversed(b0) : b0, coupleId, partnerId, false, flip);
}
const reversed = (eq) => ({ ...eq, left: eq.right, right: eq.left, electrons: -eq.electrons });
/**
 * The overall equation with the directions stated: `oxId` runs as an oxidation and `redId` as a reduction, whichever
 * way each couple is written (a cell: anode first, cathode second). Returns null when either is not a redox couple.
 */
export function orientedOverall(oxId, redId) {
  const A = coupleById(oxId), B = coupleById(redId);
  if (!A || !B) throw new Error(`orientedOverall(): unknown couple ${!A ? oxId : redId}`);
  const a0 = balance(A), b0 = balance(B);
  if (!a0.electrons || !b0.electrons) return null;
  const a = a0.electrons > 0 ? a0 : reversed(a0), b = b0.electrons < 0 ? b0 : reversed(b0);
  return combine(a, b, oxId, redId, a !== a0, b !== b0);
}
function combine(a, b, coupleId, partnerId, aReversed, flip) {
  const na = Math.abs(a.electrons), nb = Math.abs(b.electrons), l = (na * nb) / gcd(na, nb), ka = l / na, kb = l / nb;
  const left = [], right = [];
  const pour = (side, eq, k) => { for (const t of eq) { const x = side.find((y) => y.id === t.id); if (x) x.n += k * t.n; else side.push({ ...t, n: k * t.n }); } };
  pour(left, a.left, ka); pour(right, a.right, ka); pour(left, b.left, kb); pour(right, b.right, kb);
  for (const id of new Set(left.map((t) => t.id))) cancel(left, right, id);
  const L = sortSide(tidy(left)), R = sortSide(tidy(right));
  const eq = { left: L, right: R };
  return { ...eq, electrons: l, multipliers: { [coupleId]: ka, [partnerId]: kb }, partnerReversed: flip, firstReversed: aReversed, oxidation: a.electrons > 0 ? coupleId : partnerId, reduction: a.electrons > 0 ? partnerId : coupleId, text: `${sideText(L)} → ${sideText(R)}`, balanced: isBalanced(eq) };
}

/** Per-atom bookkeeping for the organic rule: bonds to H, bonds to more electronegative atoms, bonds to the same element. */
export function bookkeeping(speciesId, atomIds) {
  const os = oxidationStates(speciesGraph(speciesId));
  return atomIds.map((id) => { const r = os.get(id); return { id, el: r.el, os: r.os, toH: r.toH, toHetero: r.toHetero, toSame: r.toSame }; });
}

/** Atom ids of the key element in a species, or the species' own highlight list. */
export function keyAtoms(couple, speciesId) {
  const sp = SPECIES[speciesId];
  if (sp.highlight) return sp.highlight;
  return speciesGraph(speciesId).atoms.filter((a) => couple.key.includes(a.el)).map((a) => a.id);
}

const roman = (n) => ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][n] || String(n);
/**
 * Everything the card needs for a couple: the half-reaction both ways and in both media, the key-element change,
 * the shown species (state.side: 'from' | 'to', state.index within that side) with its labelled frame, the
 * per-atom oxidation states of every species, the overall equation with a partner (state.partner).
 */
export function buildCouple(id, state = {}) {
  const couple = coupleById(id);
  if (!couple) throw new Error(`buildCouple(): unknown couple ${id}`);
  const side = state.side === 'to' ? 'to' : 'from';
  const list = couple[side];
  const index = Math.min(Math.max(0, state.index || 0), list.length - 1);
  const shownId = list[index].sp, shown = SPECIES[shownId];
  const medium = state.medium === 'base' ? 'base' : 'acid';
  const acid = balance(couple, 'acid'), base = balance(couple, 'base');
  const half = medium === 'base' ? base : acid;
  const change = keyChange(couple);
  const atoms = (spId) => { const os = oxidationStates(speciesGraph(spId)); return [...os].filter(([, r]) => r.el !== 'H').map(([aid, r]) => ({ id: aid, ...r })); };
  const sides = { from: couple.from.map(({ sp, n }) => ({ sp, n, formula: SPECIES[sp].formula, name: SPECIES[sp].name, atoms: atoms(sp), key: keyAtoms(couple, sp) })), to: couple.to.map(({ sp, n }) => ({ sp, n, formula: SPECIES[sp].formula, name: SPECIES[sp].name, atoms: atoms(sp), key: keyAtoms(couple, sp) })) };
  const kind = acid.electrons > 0 ? 'oxidation' : acid.electrons < 0 ? 'reduction' : 'none';
  const n = Math.abs(acid.electrons);
  const partnerDefault = kind === 'none' ? null : couple.partner || (kind === 'oxidation' ? 'permanganate' : id === 'zinc' ? 'copper' : 'zinc');
  const partner = state.partner && coupleById(state.partner) && state.partner !== id ? state.partner : partnerDefault;
  const ov = partner && kind !== 'none' ? overall(id, partner) : null;
  const keyAtomsShown = keyAtoms(couple, shownId);
  const book = bookkeeping(shownId, keyAtomsShown);
  const keyLabel = couple.key.join(' / ');
  const changeText = kind === 'none' ? `${keyLabel}: ${osText(change.before)} → ${osText(change.after)} in total; no electrons move, so this is not a redox reaction` : `${keyLabel}: ${osText(change.before)} → ${osText(change.after)} in total: ${n} electron${n === 1 ? '' : 's'} ${kind === 'oxidation' ? 'lost' : 'gained'}`;
  return {
    couple, id, side, index, shownId, shown, frame: labelledFrame(shownId), keyAtoms: keyAtomsShown, book, sides, medium, half, acid, base, electrons: acid.electrons, n, kind, change, changeText,
    partner, partnerCouple: partner ? coupleById(partner) : null, overall: ov,
    title: `${couple.from.map(({ sp, n: k }) => `${k > 1 ? `${k} ` : ''}${SPECIES[sp].formula}`).join(' + ')} → ${couple.to.map(({ sp, n: k }) => `${k > 1 ? `${k} ` : ''}${SPECIES[sp].formula}`).join(' + ')}${kind === 'none' ? ' · not redox' : ` · ${n} e⁻ ${kind === 'oxidation' ? 'lost' : 'gained'}`}`,
    name: couple.name, family: FAMILIES[couple.family], rule: OXIDATION_STATE_RULES,
    roman: (k) => roman(k),
  };
}

// ---- the ladders --------------------------------------------------------------------------------------------------
/** The carbon oxidation ladders the cards draw: one atom per rung, two electrons per step. */
export const LADDERS = [
  { id: 'c1', label: 'One carbon', rungs: [{ sp: 'methane', atom: 'C' }, { sp: 'methanol', atom: 'R1.C' }, { sp: 'formaldehyde', atom: 'C' }, { sp: 'formicAcid', atom: 'C' }, { sp: 'carbonDioxide', atom: 'C' }] },
  { id: 'c2', label: 'Two carbons (the functional carbon)', rungs: [{ sp: 'ethane', atom: 'C1' }, { sp: 'ethanol', atom: 'R1.C1' }, { sp: 'acetaldehyde', atom: 'C' }, { sp: 'aceticAcid', atom: 'C' }] },
];
/** Every rung with its oxidation state read off the graph: [{ sp, atom, formula, os }]. */
export function ladderLevels(ladderId) {
  const l = LADDERS.find((x) => x.id === ladderId);
  if (!l) throw new Error(`ladderLevels(): unknown ladder ${ladderId}`);
  return l.rungs.map((r) => ({ ...r, formula: SPECIES[r.sp].formula, os: oxidationStates(speciesGraph(r.sp)).get(r.atom).os }));
}
