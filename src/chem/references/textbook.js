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
 * Measured bond angles at centres with lone pairs (degrees): the targets of the embedder's lone-pair
 * angle compression (geometry.js `compressLonePairSlots`, roadmap Phase 0e). Keys are
 * `El/nBonds/nLonePairs` — lone pairs in directional slots, so a p-orbital lone pair on an sp² atom
 * (`pOrbital: 'lonePair'`) does not count and the ester / acid oxygen is O/2/1 — optionally followed by the sorted neighbour elements
 * (`/C,H`); the most specific key wins. A `[angle, source]` entry is the one bonded angle of a bent or
 * pyramidal centre. Trigonal-bipyramidal and octahedral centres name their slot classes instead:
 * `axial-axial` and `equatorial-equatorial` are the angles between the two bonds of that class,
 * `basal-apical` the angle between a basal bond and the apical one (the bond trans to the lone pair).
 * Centres not listed are compressed by LONE_PAIR_COMPRESSION_PER_PAIR degrees per lone pair.
 */
export const LONE_PAIR_ANGLES = {
  'O/2/2/H,H': [104.5, 'CRC'],      // water H–O–H
  'O/2/2/C,H': [108.5, 'CRC'],      // methanol C–O–H (alcohols)
  'O/2/2/C,C': [111.7, 'CRC'],      // dimethyl ether C–O–C (ethers)
  'O/2/2': [108.5, 'CRC'],          // any other bent sp³ oxygen: the alcohol value
  'O/2/1/C,H': [107.0, 'CRC'],      // acetic acid C–O–H: an sp² oxygen with its second lone pair in p (carboxylic acids; phenol 109°)
  'O/2/1/C,C': [116.4, 'CRC'],      // methyl acetate C–O–C (esters)
  'N/3/1/H,H,H': [107.3, 'CRC'],    // ammonia H–N–H
  'N/3/1': [107.3, 'CRC'],          // amines: measured angles vary with substitution (≈ 106–112°); the ammonia value is the teaching level (register)
  'S/2/2/H,H': [92.1, 'CRC'],       // hydrogen sulfide H–S–H
  'S/2/2/C,H': [96.5, 'CRC'],       // methanethiol C–S–H (thiols)
  'S/2/2/C,C': [98.9, 'CRC'],       // dimethyl sulfide C–S–C (sulfides)
  'S/2/2': [96.5, 'CRC'],           // any other bent sp³ sulfur: the thiol value
  'S/4/1': { 'axial-axial': [173.1, 'CRC'], 'equatorial-equatorial': [101.6, 'CRC'] },   // SF₄ seesaw
  'Cl/3/2': { 'axial-axial': [175.0, 'CRC'] },                                            // ClF₃ T-shape (F_ax–Cl–F_eq 87.5°)
  'Br/5/1': { 'basal-apical': [84.8, 'CRC'] },                                            // BrF₅ square pyramid
};
/** Fallback for lone-pair centres not in LONE_PAIR_ANGLES: each bonded angle closes by this many degrees per lone pair. */
export const LONE_PAIR_COMPRESSION_PER_PAIR = 2.5;

/**
 * Measured angles the conformance suite checks. The lone-pair ones are reproduced by the embedder
 * through LONE_PAIR_ANGLES; the carbonyl and cyclohexane values are idealised (register).
 */
export const REAL_ANGLES = {
  water_HOH: LONE_PAIR_ANGLES['O/2/2/H,H'], ammonia_HNH: LONE_PAIR_ANGLES['N/3/1/H,H,H'], methanol_COH: LONE_PAIR_ANGLES['O/2/2/C,H'], dimethylEther_COC: LONE_PAIR_ANGLES['O/2/2/C,C'],
  methanethiol_CSH: LONE_PAIR_ANGLES['S/2/2/C,H'], SF4_axial_FSF: LONE_PAIR_ANGLES['S/4/1']['axial-axial'], SF4_equatorial_FSF: LONE_PAIR_ANGLES['S/4/1']['equatorial-equatorial'],
  ClF3_axial_FClF: LONE_PAIR_ANGLES['Cl/3/2']['axial-axial'], BrF5_basal_apical_FBrF: LONE_PAIR_ANGLES['Br/5/1']['basal-apical'],
  acetone_CCC: [116.0, 'CRC'], cyclohexaneChair_CCC: [111.4, 'CGW ch. 16'],
};

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
