// Molecular shapes (VSEPR) collection: the curated molecules of the Molecular shapes topic as graphs the
// embedder places, the electron bookkeeping a learner should see (bonds and the lone pairs as drawn,
// `atom.lonePairs`), and the status of every displayed angle: measured on this molecule, a class value
// borrowed from an exemplar, the model's fallback, or the ideal VSEPR value symmetry fixes. Pure and
// dependency-free so tests and the conformance suite can check it (docs/REVIEW_PROTOCOL.md).
import { embed, relaxTorsions, alignPrincipal, rotateDirs, stericContacts, v, DEG } from './geometry.js';
import { toFrame } from './builder.js';
import { MEASURED_ANGLES } from './references/measured.js';

const H = (id) => ({ id, el: 'H' });
const F = (id) => ({ id, el: 'F', lonePairs: 3 });
const Odbl = (id) => ({ id, el: 'O', hyb: 'sp2', lonePairs: 2 });   // double-bonded oxygen, two lone pairs
const bond = (a, b, order = 1) => ({ a, b, order });
const star = (centre, ids, order = 1) => ids.map((id) => bond(centre, id, order));

/** Shape families and their chip colour. */
export const SHAPE_FAMILIES = {
  linear: { label: 'two domains', color: '#6f8f7d' },
  trigonal: { label: 'three domains', color: '#879f68' },
  tetrahedral: { label: 'four domains', color: '#48725c' },
  tbp: { label: 'five domains', color: '#a98a4a' },
  octahedral: { label: 'six domains', color: '#7d80b0' },
};

/**
 * Curated shapes, in chip order. `audience: 'learn'` items are optional depth (five and six domains).
 * angles[].ideal is the VSEPR slot angle; angles[].classKey names the slot-class target for tbp / octahedral
 * centres; angles[].measuredRef cites a measured value the model does not reproduce (the carbonyl).
 */
export const SHAPES = [
  {
    id: 'methane', name: 'Methane', formula: 'CH₄', family: 'tetrahedral', centre: 'C', bonds: 4, lonePairs: 0,
    arrangement: 'tetrahedral', shape: 'tetrahedral',
    graph: { atoms: [{ id: 'C', el: 'C' }, H('H1'), H('H2'), H('H3'), H('H4')], bonds: star('C', ['H1', 'H2', 'H3', 'H4']) },
    angles: [{ id: 'hch', label: 'H–C–H', a: 'H1', b: 'H2', ideal: 109.47 }],
    invariants: [
      { id: 'domains', title: 'Four bonding domains, no lone pairs', detail: 'Four C–H bonds repel one another equally and spread to the corners of a tetrahedron. With nothing but bonds, the electron-domain arrangement and the molecular shape are the same thing.', visuals: [{ type: 'angle', center: 'C', a: 'H1', b: 'H2', text: '109.5°' }] },
      { id: 'ideal', title: 'Every angle is exactly 109.5°', detail: 'Symmetry fixes it: four identical domains leave nothing to push an angle off the tetrahedral value, arccos(−1/3) = 109.47°. This is the one angle on this page that is a theorem rather than a measurement.', audience: 'learn', visuals: [{ type: 'angle', center: 'C', a: 'H3', b: 'H4', text: '109.5°' }] },
      { id: 'sp3', title: 'The sp³ carbon of alkanes and alkyl halides', detail: 'The same tetrahedron sits at every saturated carbon. It is why an SN2 nucleophile has to come in from the back, opposite the leaving group, and why the three spectators flip like an umbrella.', links: [{ label: 'Watch SN2', href: '#mechanisms/sn2' }, { label: 'Alkyl halides', href: '#functional-groups/haloalkane' }], visuals: [{ type: 'atom', id: 'C' }] },
    ],
    related: [{ label: 'Alkyl halides', href: '#functional-groups/haloalkane' }, { label: 'SN2 inversion', href: '#mechanisms/sn2' }, { label: 'Hybridisation', href: '#glossary/hybridisation' }],
  },
  {
    id: 'ammonia', name: 'Ammonia', formula: 'NH₃', family: 'tetrahedral', centre: 'N', bonds: 3, lonePairs: 1,
    arrangement: 'tetrahedral', shape: 'trigonal pyramidal',
    graph: { atoms: [{ id: 'N', el: 'N', lonePairs: 1 }, H('H1'), H('H2'), H('H3')], bonds: star('N', ['H1', 'H2', 'H3']) },
    angles: [{ id: 'hnh', label: 'H–N–H', a: 'H1', b: 'H2', ideal: 109.47 }],
    invariants: [
      { id: 'domains', title: 'Four domains, one of them a lone pair', detail: 'Three N–H bonds and one lone pair still point to the corners of a tetrahedron. The shape is named after the atoms only, so the molecule is a trigonal pyramid with the lone pair at the apex.', visuals: [{ type: 'lonePairs', id: 'N' }] },
      { id: 'pyramid', title: 'Trigonal pyramidal, 106.7°', detail: 'A lone pair is held by one nucleus instead of two, so it spreads wider than a bond and pushes the three N–H bonds together: 106.7° measured, below the tetrahedral 109.5°.', visuals: [{ type: 'angle', center: 'N', a: 'H1', b: 'H2', text: '106.7°' }] },
      { id: 'base', title: 'The lone pair is the base and the nucleophile', detail: 'That apex lone pair is what accepts a proton and what attacks a carbonyl or an alkyl halide. Amines keep this pyramid, and their angles stay in the same range.', links: [{ label: 'Amines', href: '#functional-groups/amine/pyr' }, { label: 'Nucleophile', href: '#glossary/nucleophile' }], audience: 'learn', visuals: [{ type: 'lonePairs', id: 'N' }, { type: 'atom', id: 'N' }] },
    ],
    related: [{ label: 'Amines', href: '#functional-groups/amine' }, { label: 'Lone pair', href: '#glossary/lone-pair' }],
  },
  {
    id: 'water', name: 'Water', formula: 'H₂O', family: 'tetrahedral', centre: 'O', bonds: 2, lonePairs: 2,
    arrangement: 'tetrahedral', shape: 'bent',
    graph: { atoms: [{ id: 'O', el: 'O', lonePairs: 2 }, H('H1'), H('H2')], bonds: star('O', ['H1', 'H2']) },
    angles: [{ id: 'hoh', label: 'H–O–H', a: 'H1', b: 'H2', ideal: 109.47 }],
    invariants: [
      { id: 'domains', title: 'Four domains, two of them lone pairs', detail: 'Two O–H bonds and two lone pairs make a tetrahedral arrangement; seen through the atoms alone the molecule is bent.', visuals: [{ type: 'lonePairs', id: 'O' }] },
      { id: 'bent', title: 'Bent, 104.5°', detail: 'Two lone pairs push harder than one: 104.5° measured, five degrees below tetrahedral and two below ammonia. The lone pairs themselves are drawn spread apart to show why.', visuals: [{ type: 'angle', center: 'O', a: 'H1', b: 'H2', text: '104.5°' }, { type: 'lonePairs', id: 'O' }] },
      { id: 'carries', title: 'Alcohols and ethers keep the bend', detail: 'Replace one or both hydrogens with carbon and the oxygen stays bent at roughly the same angle: methanol C–O–H 108.9°, dimethyl ether C–O–C 111.2°. The two lone pairs are why every alcohol is a base and a hydrogen-bond acceptor.', links: [{ label: 'Alcohols', href: '#functional-groups/alcohol/oh' }, { label: 'Ethers', href: '#functional-groups/ether/bent' }], visuals: [{ type: 'lonePairs', id: 'O' }] },
    ],
    related: [{ label: 'Alcohols', href: '#functional-groups/alcohol' }, { label: 'Ethers', href: '#functional-groups/ether' }, { label: 'SN1 (water attacks)', href: '#mechanisms/sn1' }],
  },
  {
    id: 'hydrogen-sulfide', name: 'Hydrogen sulfide', formula: 'H₂S', family: 'tetrahedral', centre: 'S', bonds: 2, lonePairs: 2,
    arrangement: 'tetrahedral', shape: 'bent',
    graph: { atoms: [{ id: 'S', el: 'S', lonePairs: 2 }, H('H1'), H('H2')], bonds: star('S', ['H1', 'H2']) },
    angles: [{ id: 'hsh', label: 'H–S–H', a: 'H1', b: 'H2', ideal: 109.47 }],
    invariants: [
      { id: 'same-shape', title: 'The same shape as water', detail: 'Two bonds, two lone pairs, bent. Counting domains gives the right shape for sulfur exactly as it does for oxygen.', visuals: [{ type: 'lonePairs', id: 'S' }] },
      { id: 'angle', title: 'But 92.1°, not 104.5°', detail: 'Sulfur bonds with orbitals that are nearly pure p, which sit 90° apart, so its angle collapses toward 90°. "Tetrahedral minus a little" is a second-row habit; the same thing shows in thiols (C–S–H 96.5°) and in phosphine (93.3°).', audience: 'learn', visuals: [{ type: 'angle', center: 'S', a: 'H1', b: 'H2', text: '92.1°' }] },
    ],
    related: [{ label: 'Thiols', href: '#functional-groups/thiol/sh' }],
  },
  {
    id: 'carbon-dioxide', name: 'Carbon dioxide', formula: 'CO₂', family: 'linear', centre: 'C', bonds: 2, lonePairs: 0,
    arrangement: 'linear', shape: 'linear',
    graph: { atoms: [{ id: 'C', el: 'C', hyb: 'sp' }, Odbl('O1'), Odbl('O2')], bonds: star('C', ['O1', 'O2'], 2) },
    angles: [{ id: 'oco', label: 'O=C=O', a: 'O1', b: 'O2', ideal: 180 }],
    invariants: [
      { id: 'domains', title: 'Two domains: a double bond counts once', detail: 'All the electrons of a double (or triple) bond sit between the same two nuclei, so they form one domain. Carbon has two domains and nothing else: they point opposite ways.', visuals: [{ type: 'bond', a: 'C', b: 'O1' }, { type: 'bond', a: 'C', b: 'O2' }] },
      { id: 'linear', title: 'Linear, 180°', detail: 'Exactly linear by symmetry. The oxygens each keep two lone pairs, but lone pairs on the outer atoms do not bend the molecule: only the central atom\'s domains set the shape.', visuals: [{ type: 'angle', center: 'C', a: 'O1', b: 'O2', text: '180°' }] },
      { id: 'sp', title: 'The sp carbon of alkynes and nitriles', detail: 'Two domains is the geometry of every triple bond: R–C≡C–R and R–C≡N are rods.', links: [{ label: 'Alkynes', href: '#functional-groups/alkyne/linear' }, { label: 'Nitriles', href: '#functional-groups/nitrile/triple' }], audience: 'learn', visuals: [{ type: 'atom', id: 'C' }] },
    ],
    related: [{ label: 'Alkynes', href: '#functional-groups/alkyne' }, { label: 'Nitriles', href: '#functional-groups/nitrile' }],
  },
  {
    id: 'boron-trifluoride', name: 'Boron trifluoride', formula: 'BF₃', family: 'trigonal', centre: 'B', bonds: 3, lonePairs: 0,
    arrangement: 'trigonal planar', shape: 'trigonal planar',
    graph: { atoms: [{ id: 'B', el: 'B' }, F('F1'), F('F2'), F('F3')], bonds: star('B', ['F1', 'F2', 'F3']) },
    angles: [{ id: 'fbf', label: 'F–B–F', a: 'F1', b: 'F2', ideal: 120 }],
    invariants: [
      { id: 'domains', title: 'Three domains, no lone pair: flat', detail: 'Three bonds and nothing else spread into a plane at 120°. Boron has only six electrons around it.', visuals: [{ type: 'plane', atoms: ['B', 'F1', 'F2', 'F3'] }, { type: 'angle', center: 'B', a: 'F1', b: 'F2', text: '120°' }] },
      { id: 'lewis-acid', title: 'Electron-deficient: a Lewis acid', detail: 'The empty p orbital above and below the plane is where an ether or amine lone pair lands. Ethers coordinate BF₃ for exactly this reason.', links: [{ label: 'Ethers as Lewis bases', href: '#functional-groups/ether/lp' }], audience: 'learn', visuals: [{ type: 'atom', id: 'B' }] },
    ],
    related: [{ label: 'Ethers', href: '#functional-groups/ether' }],
  },
  {
    id: 'formaldehyde', name: 'Formaldehyde', formula: 'H₂C=O', family: 'trigonal', centre: 'C', bonds: 3, lonePairs: 0,
    arrangement: 'trigonal planar', shape: 'trigonal planar',
    graph: { atoms: [{ id: 'C', el: 'C', hyb: 'sp2' }, Odbl('O'), H('H1'), H('H2')], bonds: [bond('C', 'O', 2), bond('C', 'H1'), bond('C', 'H2')] },
    angles: [{ id: 'hch', label: 'H–C–H', a: 'H1', b: 'H2', ideal: 120, measuredRef: 'formaldehyde_HCH' }, { id: 'hco', label: 'H–C=O', a: 'H1', b: 'O', ideal: 120, measuredRef: 'formaldehyde_HCO' }],
    invariants: [
      { id: 'domains', title: 'Three domains around carbon: trigonal planar', detail: 'Two C–H bonds and one C=O double bond. The double bond is one domain, so carbon is flat, like boron in BF₃.', visuals: [{ type: 'plane', atoms: ['C', 'O', 'H1', 'H2'] }] },
      { id: 'not-equal', title: 'Near 120°, not exactly: domains are not all equal', detail: 'Measured H–C–H is 116.1° and H–C=O 121.9°: the double bond is a fatter domain and pushes the hydrogens together. This model draws the ideal 120° and says so; the carbonyl angle is an accepted idealisation.', audience: 'learn', visuals: [{ type: 'angle', center: 'C', a: 'H1', b: 'H2', text: '120° (116° meas.)' }] },
      { id: 'carbonyl', title: 'The carbonyl carbon and the carbocation', detail: 'Every aldehyde, ketone, acid and ester carbon is this flat triangle, and so is the planar carbocation of SN1: three domains, an empty or π p orbital above and below.', links: [{ label: 'Aldehydes', href: '#functional-groups/aldehyde' }, { label: 'SN1 carbocation', href: '#mechanisms/sn1' }], visuals: [{ type: 'atom', id: 'C' }] },
    ],
    related: [{ label: 'Aldehydes', href: '#functional-groups/aldehyde' }, { label: 'Ketones', href: '#functional-groups/ketone' }, { label: 'SN1', href: '#mechanisms/sn1' }],
  },
  {
    id: 'sulfur-dioxide', name: 'Sulfur dioxide', formula: 'SO₂', family: 'trigonal', centre: 'S', bonds: 2, lonePairs: 1,
    arrangement: 'trigonal planar', shape: 'bent',
    graph: { atoms: [{ id: 'S', el: 'S', lonePairs: 1 }, Odbl('O1'), Odbl('O2')], bonds: star('S', ['O1', 'O2'], 2) },
    angles: [{ id: 'oso', label: 'O–S–O', a: 'O1', b: 'O2', ideal: 120 }],
    invariants: [
      { id: 'domains', title: 'Three domains, one a lone pair: bent', detail: 'Two S=O bonds and one lone pair on sulfur. Three domains make a trigonal arrangement; name the shape by the atoms and it is bent, not linear like CO₂.', visuals: [{ type: 'lonePairs', id: 'S' }] },
      { id: 'angle', title: '119.5°: the lone pair barely closes the angle here', detail: 'Measured 119.5°, almost the ideal 120°. One lone pair against two fat double-bond domains is nearly a draw, unlike water where two lone pairs squeeze two thin single bonds.', audience: 'learn', visuals: [{ type: 'angle', center: 'S', a: 'O1', b: 'O2', text: '119.5°' }] },
    ],
    related: [{ label: 'VSEPR', href: '#glossary/vsepr' }],
  },
  {
    id: 'phosphorus-pentafluoride', name: 'Phosphorus pentafluoride', formula: 'PF₅', family: 'tbp', centre: 'P', bonds: 5, lonePairs: 0, audience: 'learn',
    arrangement: 'trigonal bipyramidal', shape: 'trigonal bipyramidal',
    graph: { atoms: [{ id: 'P', el: 'P' }, F('F1'), F('F2'), F('F3'), F('F4'), F('F5')], bonds: star('P', ['F1', 'F2', 'F3', 'F4', 'F5']) },
    angles: [{ id: 'axax', label: 'F(ax)–P–F(ax)', a: 'F1', b: 'F2', ideal: 180 }, { id: 'eqeq', label: 'F(eq)–P–F(eq)', a: 'F3', b: 'F4', ideal: 120 }, { id: 'axeq', label: 'F(ax)–P–F(eq)', a: 'F1', b: 'F3', ideal: 90 }],
    invariants: [
      { id: 'two-kinds', title: 'Five domains: two kinds of position', detail: 'A trigonal bipyramid has three equatorial positions 120° apart and two axial ones 90° from them. This is the first arrangement where not every position is equivalent.', visuals: [{ type: 'angle', center: 'P', a: 'F3', b: 'F4', text: '120°' }, { type: 'angle', center: 'P', a: 'F1', b: 'F3', text: '90°' }] },
      { id: 'no-hybrid', title: 'Count domains; do not reach for d orbitals', detail: 'VSEPR needs only the number of domains to give this shape. The old sp³d story is not needed and is not used here; the bonding in these molecules is a later topic.', audience: 'learn', visuals: [{ type: 'atom', id: 'P' }] },
    ],
    related: [{ label: 'VSEPR', href: '#glossary/vsepr' }],
  },
  {
    id: 'sulfur-tetrafluoride', name: 'Sulfur tetrafluoride', formula: 'SF₄', family: 'tbp', centre: 'S', bonds: 4, lonePairs: 1, audience: 'learn',
    arrangement: 'trigonal bipyramidal', shape: 'seesaw',
    graph: { atoms: [{ id: 'S', el: 'S', lonePairs: 1 }, F('F1'), F('F2'), F('F3'), F('F4')], bonds: star('S', ['F1', 'F2', 'F3', 'F4']) },
    angles: [{ id: 'axax', label: 'F(ax)–S–F(ax)', a: 'F1', b: 'F2', ideal: 180, classKey: 'axial-axial' }, { id: 'eqeq', label: 'F(eq)–S–F(eq)', a: 'F3', b: 'F4', ideal: 120, classKey: 'equatorial-equatorial' }],
    invariants: [
      { id: 'equatorial', title: 'The lone pair takes an equatorial position', detail: 'An equatorial lone pair has only two neighbours at 90°; an axial one would have three. Less repulsion wins, and the four fluorines are left in a seesaw.', visuals: [{ type: 'lonePairs', id: 'S' }] },
      { id: 'closed', title: 'Both angles close: 173.1° and 101.6°', detail: 'The lone pair pushes the axial fluorines off the straight line (180° → 173.1°) and the equatorial pair together (120° → 101.6°), both measured values.', visuals: [{ type: 'angle', center: 'S', a: 'F1', b: 'F2', text: '173.1°' }, { type: 'angle', center: 'S', a: 'F3', b: 'F4', text: '101.6°' }] },
    ],
    related: [{ label: 'VSEPR', href: '#glossary/vsepr' }],
  },
  {
    id: 'sulfur-hexafluoride', name: 'Sulfur hexafluoride', formula: 'SF₆', family: 'octahedral', centre: 'S', bonds: 6, lonePairs: 0, audience: 'learn',
    arrangement: 'octahedral', shape: 'octahedral',
    graph: { atoms: [{ id: 'S', el: 'S' }, F('F1'), F('F2'), F('F3'), F('F4'), F('F5'), F('F6')], bonds: star('S', ['F1', 'F2', 'F3', 'F4', 'F5', 'F6']) },
    angles: [{ id: 'cis', label: 'F–S–F (cis)', a: 'F1', b: 'F3', ideal: 90 }, { id: 'trans', label: 'F–S–F (trans)', a: 'F1', b: 'F2', ideal: 180 }],
    invariants: [
      { id: 'six', title: 'Six domains: every position equivalent again', detail: 'Six bonds at 90° to their neighbours and 180° to their opposite: the octahedron is as symmetric as the tetrahedron, so the angles are exact.', visuals: [{ type: 'angle', center: 'S', a: 'F1', b: 'F3', text: '90°' }] },
      { id: 'metals', title: 'The shape of most metal complexes', detail: 'Six ligands around a metal ion use the same octahedron; cis and trans isomers are the 90° and 180° pairs you see here.', audience: 'learn', visuals: [{ type: 'atom', id: 'S' }] },
    ],
    related: [{ label: 'VSEPR', href: '#glossary/vsepr' }],
  },
  {
    id: 'xenon-tetrafluoride', name: 'Xenon tetrafluoride', formula: 'XeF₄', family: 'octahedral', centre: 'Xe', bonds: 4, lonePairs: 2, audience: 'learn',
    arrangement: 'octahedral', shape: 'square planar',
    graph: { atoms: [{ id: 'Xe', el: 'Xe', lonePairs: 2 }, F('F1'), F('F2'), F('F3'), F('F4')], bonds: star('Xe', ['F1', 'F2', 'F3', 'F4']) },
    angles: [{ id: 'cis', label: 'F–Xe–F (cis)', a: 'F1', b: 'F3', ideal: 90 }, { id: 'trans', label: 'F–Xe–F (trans)', a: 'F1', b: 'F2', ideal: 180 }],
    invariants: [
      { id: 'trans', title: 'Two lone pairs go opposite each other', detail: 'Six domains, two of them lone pairs. Lone pairs repel most, so they take the two positions 180° apart, and the four fluorines are left in a square.', visuals: [{ type: 'lonePairs', id: 'Xe' }, { type: 'plane', atoms: ['Xe', 'F1', 'F2', 'F3', 'F4'] }] },
      { id: 'exact', title: 'Square planar, exactly 90°', detail: 'With the lone pairs opposite each other their pushes cancel, so nothing bends the square: measured XeF₄ is planar with 90° angles.', visuals: [{ type: 'angle', center: 'Xe', a: 'F1', b: 'F3', text: '90°' }] },
    ],
    related: [{ label: 'VSEPR', href: '#glossary/vsepr' }],
  },
];
export const SHAPE_ORDER = SHAPES.map((s) => s.id);
export const shapeById = (id) => SHAPES.find((s) => s.id === id) || null;

const angleDeg = (a, c, b) => Math.acos(Math.max(-1, Math.min(1, v.dot(v.norm(v.sub(a, c)), v.norm(v.sub(b, c)))))) / DEG;

/** Status vocabulary for a displayed angle. */
export const ANGLE_STATUS = {
  measured: 'measured on this molecule',
  class: 'class value borrowed from an exemplar',
  fallback: 'model default (2.5° per lone pair)',
  ideal: 'ideal VSEPR value (fixed by symmetry)',
  derived: 'follows from the measured pair',
};

function angleStatus(spec, compression) {
  if (compression && compression.targets) {
    const ref = spec.classKey ? compression.ref?.[spec.classKey] : (compression.targets['bond-bond'] !== undefined ? compression.ref : null);
    if (!ref) return { status: 'derived', exemplar: compression.exemplar, source: null, ref: null };
    const m = MEASURED_ANGLES[ref];
    return { status: compression.basis === 'class' ? 'class' : 'measured', exemplar: compression.exemplar, source: m?.source || null, ref, listed: m?.listed ?? null };
  }
  if (compression && compression.basis === 'fallback') return { status: 'fallback', exemplar: null, source: null, ref: null };
  const m = spec.measuredRef ? MEASURED_ANGLES[spec.measuredRef] : null;
  return { status: 'ideal', exemplar: null, source: m?.source || null, ref: spec.measuredRef || null, measured: m ? m.value : null };
}

const cache = new Map();
/**
 * Embed a shape and describe it: { item, frame, title, bonds, lonePairs, domains, compression,
 * angles: [{ id, label, a, b, ideal, value, status, exemplar, source, ref, measured? }] }.
 * `lonePairs` is the central atom's lone-pair count as drawn (`atom.lonePairs`), never the number of
 * display slots. Results are cached: the geometry is deterministic.
 */
export function buildShape(id) {
  if (cache.has(id)) return cache.get(id);
  const item = shapeById(id);
  if (!item) throw new Error(`buildShape(): unknown shape ${id}`);
  const graph = item.graph;
  const { positions, lonePairDirs, orbitals, frames } = embed(graph, { root: item.centre });
  relaxTorsions(graph, positions, lonePairDirs, orbitals, frames);
  const aligned = alignPrincipal(positions);
  const frame = toFrame(graph, aligned.positions, rotateDirs(lonePairDirs, aligned.rotation), rotateDirs(orbitals, aligned.rotation), { crowding: stericContacts(graph, positions) });
  const compression = frames.get(item.centre)?.compression || null;
  const pos = (aid) => aligned.positions.get(aid);
  const angles = item.angles.map((spec) => ({ ...spec, value: angleDeg(pos(spec.a), pos(item.centre), pos(spec.b)), ...angleStatus(spec, compression) }));
  const centre = graph.atoms.find((a) => a.id === item.centre);
  const lonePairs = centre.lonePairs || 0;
  const built = { item, frame, title: `${item.name} (${item.formula})`, bonds: item.bonds, lonePairs, domains: item.bonds + lonePairs, compression, angles };
  cache.set(id, built);
  return built;
}

/** The modelled value of one displayed angle, e.g. shapeAngle('water', 'hoh') → 104.5. */
export const shapeAngle = (id, angleId) => buildShape(id).angles.find((a) => a.id === angleId)?.value ?? null;
