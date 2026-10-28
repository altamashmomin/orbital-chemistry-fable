// Textbook reference values the model is checked against (see docs/REVIEW_PROTOCOL.md).
// Every entry carries a source tag; tolerances are what a sophomore textbook would accept.
// Sources: CRC = CRC Handbook of Chemistry and Physics; CGW = Clayden, Greeves & Warren 2e;
// KLEIN = Klein, Organic Chemistry 4e; BRUICE = Bruice 8e; ATKINS = Atkins' Physical Chemistry.

/** Bond lengths in Å: [value, tolerance]. Keys: A-B single, A=B double, A#B triple, A:B aromatic. */
export const BOND_LENGTHS = {
  'C-H': [1.09, 0.02], 'C-C': [1.54, 0.02], 'C=C': [1.34, 0.02], 'C#C': [1.20, 0.02], 'C:C': [1.39, 0.02],
  'C-O': [1.43, 0.02], 'C=O': [1.21, 0.02], 'O-H': [0.96, 0.02], 'C-N': [1.47, 0.02], 'C=N': [1.28, 0.03],
  'C#N': [1.16, 0.02], 'N-H': [1.01, 0.02], 'C-F': [1.35, 0.03], 'C-Cl': [1.77, 0.03], 'C-Br': [1.94, 0.03],
  'C-I': [2.14, 0.03], 'C-S': [1.82, 0.03], 'S-H': [1.34, 0.03], 'N-O': [1.40, 0.04], 'N=O': [1.21, 0.03],
}; // CRC Table 9 "Bond lengths in crystalline organic compounds"; CGW ch. 4

/** Idealised VSEPR angles (degrees) used by the embedder. */
export const IDEAL_ANGLES = { tetrahedral: 109.47, trigonal: 120, linear: 180, octahedral: 90, squarePlanar: 90 };

/**
 * Bond-angle targets at centres with lone pairs: what the embedder's lone-pair angle compression closes
 * the ideal slot angle to (geometry.js `compressLonePairSlots`, roadmap Phase 0e).
 *
 * Keys are `El/nBonds/nLonePairs[:hyb][/neighbours]`: the element, the number of bonded atoms, the
 * atom's lone-pair count as drawn (the physical count, `atom.lonePairs`), `:sp2` when the centre is a
 * planar sp² atom that keeps one lone pair in its p orbital (`hyb: 'sp2', pOrbital: 'lonePair'`: the
 * ester and carboxylic-acid oxygen), and optionally the sorted neighbour elements. The most specific
 * key wins. Each row carries one literal `angle` in degrees, the measured exemplar it was taken from
 * (`exemplar`, with `ref` naming the row of references/measured.js that holds the citation) and, when
 * the row stands in for a class of compounds, `appliesTo`. The embedder never reads measured.js; the
 * conformance suite checks that `angle` still agrees with the cited measurement.
 *
 * Trigonal-bipyramidal and octahedral centres name their slot classes instead: `axial-axial` and
 * `equatorial-equatorial` are the angles between the two bonds of that class, `basal-apical` the angle
 * between a basal bond and the apical one (the bond trans to the lone pair).
 *
 * Centres with no row are closed by LONE_PAIR_COMPRESSION_PER_PAIR degrees per lone pair (a documented
 * convention, not a measurement) and reported as such.
 */
export const LONE_PAIR_ANGLES = {
  'O/2/2/H,H': { angle: 104.5, ref: 'water_HOH', exemplar: 'H₂O' },
  'O/2/2/C,H': { angle: 108.9, ref: 'methanol_COH', exemplar: 'CH₃OH', appliesTo: 'alcohols' },
  'O/2/2/C,C': { angle: 111.2, ref: 'dimethylEther_COC', exemplar: '(CH₃)₂O', appliesTo: 'ethers' },
  'O/2/2': { angle: 108.9, ref: 'methanol_COH', exemplar: 'CH₃OH', appliesTo: 'other bent sp³ oxygen (class default)' },
  'O/2/2:sp2/C,H': { angle: 106.3, ref: 'formicAcid_COH', exemplar: 'HCOOH', appliesTo: 'carboxylic acids (acetic acid 107°)' },
  'O/2/2:sp2/C,C': { angle: 114.8, ref: 'methylFormate_COC', exemplar: 'HCOOCH₃', appliesTo: 'esters (methyl acetate 116.4°)' },
  'N/3/1/H,H,H': { angle: 106.7, ref: 'ammonia_HNH', exemplar: 'NH₃' },
  'N/3/1': { angle: 106.7, ref: 'ammonia_HNH', exemplar: 'NH₃', appliesTo: 'amines (class default; measured 105.8–112.2° by substitution)' },
  'P/3/1/H,H,H': { angle: 93.3, ref: 'phosphine_HPH', exemplar: 'PH₃' },
  'S/2/2/H,H': { angle: 92.1, ref: 'hydrogenSulfide_HSH', exemplar: 'H₂S' },
  'S/2/2/C,H': { angle: 96.5, ref: 'methanethiol_CSH', exemplar: 'CH₃SH', appliesTo: 'thiols' },
  'S/2/2/C,C': { angle: 98.9, ref: 'dimethylSulfide_CSC', exemplar: '(CH₃)₂S', appliesTo: 'sulfides' },
  'S/2/2': { angle: 96.5, ref: 'methanethiol_CSH', exemplar: 'CH₃SH', appliesTo: 'other bent sp³ sulfur (class default)' },
  'S/2/1/O,O': { angle: 119.5, ref: 'sulfurDioxide_OSO', exemplar: 'SO₂' },
  'Se/2/2/H,H': { angle: 90.9, ref: 'hydrogenSelenide_HSeH', exemplar: 'H₂Se' },
  'S/4/1': { exemplar: 'SF₄', classes: { 'axial-axial': { angle: 173.1, ref: 'SF4_axial_FSF' }, 'equatorial-equatorial': { angle: 101.6, ref: 'SF4_equatorial_FSF' } } },
  'Cl/3/2': { exemplar: 'ClF₃', classes: { 'axial-axial': { angle: 174.9, ref: 'ClF3_axial_FClF' } } },
  'Br/5/1': { exemplar: 'BrF₅', classes: { 'basal-apical': { angle: 84.8, ref: 'BrF5_basalApical_FBrF' } } },
};
/** Fallback for lone-pair centres not in LONE_PAIR_ANGLES: each bonded angle closes by this many degrees per lone pair (a convention, not a measurement). */
export const LONE_PAIR_COMPRESSION_PER_PAIR = 2.5;

/** Pauling electronegativities. */
export const ELECTRONEGATIVITY = { H: 2.20, C: 2.55, N: 3.04, O: 3.44, F: 3.98, S: 2.58, Cl: 3.16, Br: 2.96, I: 2.66, P: 2.19 }; // CRC

/** C–X bond dissociation energies, kcal/mol (rounded textbook values). */
export const BDE_CX = { F: 115, Cl: 84, Br: 72, I: 57 }; // KLEIN Table 7.1 (approx.)

/** pKa values quoted in the app (water, 25 °C). */
export const PKA = {
  water: 15.7, methanol: 15.5, ethanol: 16.0, tertButanol: 18.0, phenol: 10.0, aceticAcid: 4.76, formicAcid: 3.75,
  trifluoroaceticAcid: 0.23, chloroaceticAcid: 2.86, pivalicAcid: 5.03, thiophenol: 6.6, ethanethiol: 10.6, nitromethane: 10.2,
  acetylene: 25, ammonium: 9.25, ethylammonium: 10.7, anilinium: 4.6, acetamideH: -0.5, acetoneAlphaH: 19.3, acetaldehydeAlphaH: 16.7,
  acetonitrileAlphaH: 25, hydroniumIon: -1.7, protonatedAlcohol: -2.4,
}; // BRUICE Appendix pKa table; CGW ch. 8

/**
 * The substitution/elimination decision table a textbook teaches (polar protic solvent, good
 * leaving group unless stated). `expect` is the dominant pathway; 'none' = no useful reaction.
 */
export const MECHANISM_MATRIX = [
  // methyl: SN2 only
  { substrate: 'methyl', reagent: 'strongNuStrongBase', expect: 'sn2' }, { substrate: 'methyl', reagent: 'bulkyBase', expect: 'sn2' },
  { substrate: 'methyl', reagent: 'strongNuWeakBase', expect: 'sn2' }, { substrate: 'methyl', reagent: 'weakNuWeakBase', expect: 'none' },
  // primary
  { substrate: 'primary', reagent: 'strongNuStrongBase', expect: 'sn2' }, { substrate: 'primary', reagent: 'bulkyBase', expect: 'e2' },
  { substrate: 'primary', reagent: 'strongNuWeakBase', expect: 'sn2' }, { substrate: 'primary', reagent: 'weakNuWeakBase', expect: 'none' },
  { substrate: 'primary', reagent: 'weakNuWeakBase', allylicBenzylic: true, expect: 'sn1' },
  // secondary
  { substrate: 'secondary', reagent: 'strongNuStrongBase', expect: 'e2' }, { substrate: 'secondary', reagent: 'bulkyBase', expect: 'e2' },
  { substrate: 'secondary', reagent: 'strongNuWeakBase', expect: 'sn2' }, { substrate: 'secondary', reagent: 'strongNuWeakBase', solvent: 'polarAprotic', expect: 'sn2' },
  { substrate: 'secondary', reagent: 'weakNuWeakBase', expect: 'sn1' }, { substrate: 'secondary', reagent: 'weakNuWeakBase', temperature: 'high', expect: 'e1' },
  // tertiary
  { substrate: 'tertiary', reagent: 'strongNuStrongBase', expect: 'e2' }, { substrate: 'tertiary', reagent: 'bulkyBase', expect: 'e2' },
  { substrate: 'tertiary', reagent: 'strongNuWeakBase', expect: 'sn1' }, { substrate: 'tertiary', reagent: 'weakNuWeakBase', expect: 'sn1' },
  { substrate: 'tertiary', reagent: 'weakNuWeakBase', temperature: 'high', expect: 'e1' },
]; // KLEIN ch. 8 summary table; CGW ch. 15 & 17

/** Mechanism-level facts every animation must reproduce. */
export const MECHANISM_FACTS = {
  sn2: { steps: 1, maxima: 1, stereo: 'inversion', rateOrder: 2 },
  sn1: { steps: 3, maxima: 3, intermediates: ['carbocation', 'oxonium'], rateDeterminingIsFirst: true },
  e2: { steps: 1, maxima: 1, antiPeriplanarDihedral: 180, productAlkene: 'E' },
  e1: { steps: 2, maxima: 2, rateDeterminingIsFirst: true },
}; // CGW ch. 15, 17

/** Hydrogen-like orbital facts: nodes and symmetry. */
export const ORBITAL_FACTS = {
  radialNodes: { '1s': 0, '2s': 1, '2pz': 0, '3s': 2, '3pz': 1, '3dz2': 0 },
  angularNodes: { s: 0, p: 1, d: 2 },
}; // ATKINS ch. 8
