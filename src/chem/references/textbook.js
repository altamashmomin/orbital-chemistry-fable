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

/**
 * Conjugated single bonds the element/order table gets wrong by 0.1 Å: the functional-group cores set
 * these as per-bond `length` (embed() honours `bond.length`), each naming the measured row in
 * references/measured.js that the conformance suite checks it against.
 */
export const CONJUGATED_BOND_LENGTHS = {
  amide_CN: { length: 1.35, ref: 'formamide_CN' },          // amide C(=O)–N
  acid_CO: { length: 1.36, ref: 'aceticAcid_CO' },           // carboxylic acid C(=O)–OH
  ester_CO: { length: 1.33, ref: 'methylFormate_CO' },       // ester C(=O)–OR
  nitro_NO: { length: 1.22, ref: 'nitromethane_NO' },        // both N–O of a nitro group (resonance average)
};

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
 * the row stands in for a class of compounds, `appliesTo`; `classDefault: true` marks an element-level row
 * that catches neighbours no other row lists (reported as basis 'class'). The embedder never reads measured.js; the
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
  'O/2/2': { angle: 108.9, ref: 'methanol_COH', exemplar: 'CH₃OH', appliesTo: 'other bent sp³ oxygen', classDefault: true },
  'O/2/2:sp2/C,H': { angle: 106.3, ref: 'formicAcid_COH', exemplar: 'HCOOH', appliesTo: 'carboxylic acids (acetic acid 107°)' },
  'O/2/2:sp2/C,C': { angle: 114.8, ref: 'methylFormate_COC', exemplar: 'HCOOCH₃', appliesTo: 'esters (methyl acetate 116.4°)' },
  'N/3/1/H,H,H': { angle: 106.7, ref: 'ammonia_HNH', exemplar: 'NH₃' },
  'N/3/1': { angle: 106.7, ref: 'ammonia_HNH', exemplar: 'NH₃', appliesTo: 'amines (measured 105.8–112.2° by substitution)', classDefault: true },
  'P/3/1/H,H,H': { angle: 93.3, ref: 'phosphine_HPH', exemplar: 'PH₃' },
  'S/2/2/H,H': { angle: 92.1, ref: 'hydrogenSulfide_HSH', exemplar: 'H₂S' },
  'S/2/2/C,H': { angle: 96.5, ref: 'methanethiol_CSH', exemplar: 'CH₃SH', appliesTo: 'thiols' },
  'S/2/2/C,C': { angle: 98.9, ref: 'dimethylSulfide_CSC', exemplar: '(CH₃)₂S', appliesTo: 'sulfides' },
  'S/2/2': { angle: 96.5, ref: 'methanethiol_CSH', exemplar: 'CH₃SH', appliesTo: 'other bent sp³ sulfur', classDefault: true },
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

/**
 * Torsional energies for the Conformations topic, kJ/mol above the lowest conformer. Textbook teaching
 * values: the ethane barrier is the measured 12 kJ/mol (2.9 kcal/mol); the butane figures are the ones
 * CGW ch. 16 and Klein ch. 4 teach (gauche 3.8, CH₃/H-eclipsed 16, CH₃/CH₃-eclipsed ≈ 20 kJ/mol; Klein
 * gives 19). The curve drawn between them is an illustrative fit, not a potential-energy surface.
 */
export const TORSION_ENERGIES = {
  ethane: { barrier: 12, unit: 'kJ/mol', source: 'CGW ch. 16; KLEIN ch. 4 (2.9 kcal/mol)' },
  butane: { gauche: 3.8, eclipsedCH3H: 16, eclipsedCH3CH3: 20, unit: 'kJ/mol', source: 'CGW ch. 16 (Klein ch. 4: 0.9, 3.8 and 4.5 kcal/mol)' },
};

/**
 * A-values for the Conformations topic: ΔG° (kJ/mol) by which the equatorial chair of a monosubstituted
 * cyclohexane lies below the axial one. `kcal` is the figure as the compilations tabulate it (Eliel &
 * Wilen 1994, Table 11.7, the source Klein ch. 4 and CGW ch. 16 teach from); `kJ` is that figure ×
 * 4.184 rounded to 0.1, the number the app shows. Compilations differ by 0.1–0.3 kcal/mol (solvent,
 * temperature, method); OH depends on the solvent. Table values only: never computed from the model.
 */
export const A_VALUES = {
  unit: 'kJ/mol', source: 'Eliel & Wilen, Stereochemistry of Organic Compounds (1994) Table 11.7; KLEIN ch. 4; CGW ch. 16',
  values: {
    H: { kcal: 0, kJ: 0 },
    methyl: { kcal: 1.74, kJ: 7.3 },
    ethyl: { kcal: 1.79, kJ: 7.5 },
    isopropyl: { kcal: 2.15, kJ: 9.0 },
    tBu: { kcal: 4.9, kJ: 20.5, note: 'often quoted as "> 4.5" or "≈ 5 kcal/mol"; too large to measure directly' },
    phenyl: { kcal: 2.8, kJ: 11.7 },
    CF3: { kcal: 2.4, kJ: 10.0 },
    OH: { kcal: 0.87, kJ: 3.6, note: 'protic solvent; ≈ 0.6 kcal/mol in aprotic solvents' },
    F: { kcal: 0.25, kJ: 1.0 },
    Cl: { kcal: 0.53, kJ: 2.2 },
    Br: { kcal: 0.48, kJ: 2.0 },
    I: { kcal: 0.47, kJ: 2.0 },
    CN: { kcal: 0.17, kJ: 0.7 },
  },
};

/**
 * 1,3-Diaxial interactions between two substituents (kJ/mol), used in place of the sum of A-values when
 * both are axial and 1,3 to each other (cis-1,3 isomers). Only the methyl/methyl pair is a standard
 * textbook figure (3.7 kcal/mol); other pairs fall back to the additive estimate and say so.
 */
export const DIAXIAL_PAIRS = {
  unit: 'kJ/mol', source: 'CGW ch. 16; KLEIN ch. 4 (1,3-diaxial CH₃/CH₃ 3.7 kcal/mol)',
  values: { 'methyl/methyl': { kcal: 3.7, kJ: 15.5 } },
};

/** Cyclohexane ring conformers, kJ/mol above the chair: the textbook teaching values. Only the chair and boat are drawn. */
export const RING_CONFORMER_ENERGIES = {
  cyclohexane: { chair: 0, twistBoat: 23, boat: 29, halfChair: 45, unit: 'kJ/mol', source: 'CGW ch. 16; KLEIN ch. 4 (5.5, 6.9 and 10.8 kcal/mol)' },
};

/** C–X bond dissociation energies, kcal/mol (rounded textbook values). */
export const BDE_CX = { F: 115, Cl: 84, Br: 72, I: 57 }; // KLEIN Table 7.1 (approx.)

/**
 * pKa values quoted in the app (water, 25 °C): the Bruice appendix table and CGW ch. 8 teaching values.
 * The hydrogen halides, ethene and ethane are the usual textbook estimates (the very strong and very weak
 * acids cannot be measured in water): CGW gives HCl −7, HBr −9, HI −10, ethene ≈ 44, ethane ≈ 50.
 */
export const PKA = {
  water: 15.7, methanol: 15.5, ethanol: 16.0, tertButanol: 18.0, phenol: 10.0, aceticAcid: 4.76, formicAcid: 3.75,
  trifluoroaceticAcid: 0.23, chloroaceticAcid: 2.86, pivalicAcid: 5.03, thiophenol: 6.6, ethanethiol: 10.6, nitromethane: 10.2,
  acetylene: 25, ammonium: 9.25, ethylammonium: 10.7, anilinium: 4.6, acetamideH: -0.5, acetoneAlphaH: 19.3, acetaldehydeAlphaH: 16.7,
  acetonitrileAlphaH: 25, hydroniumIon: -1.7, protonatedAlcohol: -2.4,
  hydrogenFluoride: 3.2, hydrogenChloride: -7, hydrogenBromide: -9, hydrogenIodide: -10, ethene: 44, ethane: 50,
}; // BRUICE Appendix pKa table; CGW ch. 8
export const PKA_TABLE = { unit: 'pKa (water, 25 °C)', source: 'BRUICE Appendix (pKa values); CGW ch. 8 (HX, ethene and ethane estimates)', values: PKA };
/** 2.303 RT at 298.15 K: the free-energy change per pKa unit, kJ/mol (R = 8.314 J/mol·K). */
export const RT_LN10_KJ = 5.708;

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

/** Hydrogen energy levels E_n = −R_H / n²: the Rydberg energy (CODATA 2018: 13.605693 eV), rounded as textbooks quote it. */
export const HYDROGEN_ENERGY = { rydbergEV: 13.6, listed: 13.605693, unit: 'eV', source: 'CODATA 2018 (hc R∞); ATKINS ch. 8 (13.6 eV)' };

/**
 * Ground-state electron configurations of the elements 1–36, as listed by the NIST Atomic Spectra
 * Database (ground levels) and reproduced in every general-chemistry text; the oracle the aufbau
 * generator is checked against. Plain ASCII: '1s2 2s2 2p6 3s2 3p6 3d5 4s1'.
 */
export const GROUND_STATE_CONFIGURATIONS = {
  source: 'NIST Atomic Spectra Database, ground levels and ionization energies (2023); ATKINS ch. 8; CRC Handbook, "Electron configuration of neutral atoms"',
  values: {
    1: '1s1', 2: '1s2', 3: '1s2 2s1', 4: '1s2 2s2', 5: '1s2 2s2 2p1', 6: '1s2 2s2 2p2', 7: '1s2 2s2 2p3', 8: '1s2 2s2 2p4', 9: '1s2 2s2 2p5', 10: '1s2 2s2 2p6',
    11: '1s2 2s2 2p6 3s1', 12: '1s2 2s2 2p6 3s2', 13: '1s2 2s2 2p6 3s2 3p1', 14: '1s2 2s2 2p6 3s2 3p2', 15: '1s2 2s2 2p6 3s2 3p3', 16: '1s2 2s2 2p6 3s2 3p4', 17: '1s2 2s2 2p6 3s2 3p5', 18: '1s2 2s2 2p6 3s2 3p6',
    19: '1s2 2s2 2p6 3s2 3p6 4s1', 20: '1s2 2s2 2p6 3s2 3p6 4s2', 21: '1s2 2s2 2p6 3s2 3p6 3d1 4s2', 22: '1s2 2s2 2p6 3s2 3p6 3d2 4s2', 23: '1s2 2s2 2p6 3s2 3p6 3d3 4s2',
    24: '1s2 2s2 2p6 3s2 3p6 3d5 4s1', 25: '1s2 2s2 2p6 3s2 3p6 3d5 4s2', 26: '1s2 2s2 2p6 3s2 3p6 3d6 4s2', 27: '1s2 2s2 2p6 3s2 3p6 3d7 4s2', 28: '1s2 2s2 2p6 3s2 3p6 3d8 4s2',
    29: '1s2 2s2 2p6 3s2 3p6 3d10 4s1', 30: '1s2 2s2 2p6 3s2 3p6 3d10 4s2', 31: '1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p1', 32: '1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p2', 33: '1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p3',
    34: '1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p4', 35: '1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p5', 36: '1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6',
  },
};
/** The aufbau exceptions up to Z = 36: a half-filled or filled d subshell takes one 4s electron. */
export const AUFBAU_EXCEPTIONS = {
  source: 'NIST ASD ground levels; ATKINS ch. 8',
  values: {
    24: { subshells: { '3d': 5, '4s': 1 }, note: 'chromium is [Ar] 3d⁵ 4s¹, not 3d⁴ 4s²: the half-filled d subshell is favoured' },
    29: { subshells: { '3d': 10, '4s': 1 }, note: 'copper is [Ar] 3d¹⁰ 4s¹, not 3d⁹ 4s²: the filled d subshell is favoured' },
  },
};

/**
 * Effective nuclear charges for the valence orbitals drawn in the Molecular orbitals topic (Clementi &
 * Raimondi, J. Chem. Phys. 38, 2686 (1963), from SCF orbital exponents): they contract the hydrogen-like
 * functions to a realistic size next to a measured bond length. Shapes and phases only; no energy is
 * computed from them.
 */
export const SLATER_ZEFF = {
  source: 'Clementi & Raimondi, J. Chem. Phys. 38, 2686 (1963)',
  values: { H_1s: 1.0, C_2p: 3.136, N_2p: 3.834, O_2p: 4.453, Cl_3p: 6.116 },
};

/**
 * Homonuclear diatomics for the Molecular orbitals topic: valence electrons, the textbook level order
 * (N₂ and the lighter molecules have σ2p above π2p because of 2s–2p mixing; O₂ and F₂ do not), the
 * textbook bond order and magnetism, and the bond dissociation energy. H₂ and He₂ use 1s only.
 */
export const DIATOMIC_MO = {
  source: 'ATKINS ch. 9 (molecular orbital theory); Housecroft & Sharpe ch. 2; BDEs: CRC Handbook, "Bond dissociation energies" (D₀, kJ/mol) and ATKINS data section',
  unit: 'kJ/mol',
  values: {
    h2: { formula: 'H₂', electrons: 2, order: ['sigma1s', 'sigma1s*'], bondOrder: 1, unpaired: 0, bde: 436, bondRef: 'H2_HH' },
    he2: { formula: 'He₂', electrons: 4, order: ['sigma1s', 'sigma1s*'], bondOrder: 0, unpaired: 0, bde: null, bondRef: null, note: 'not a bound molecule: equal filling of σ and σ*' },
    n2: { formula: 'N₂', electrons: 10, order: ['sigma2s', 'sigma2s*', 'pi2p', 'sigma2p', 'pi2p*', 'sigma2p*'], bondOrder: 3, unpaired: 0, bde: 945, bondRef: 'N2_NN', note: 's–p mixing puts σ2p above π2p' },
    o2: { formula: 'O₂', electrons: 12, order: ['sigma2s', 'sigma2s*', 'sigma2p', 'pi2p', 'pi2p*', 'sigma2p*'], bondOrder: 2, unpaired: 2, bde: 498, bondRef: 'O2_OO', note: 'two unpaired π* electrons: paramagnetic' },
  },
};

/**
 * Hückel parameters for heteroatoms, in units of β (α_X = α + hβ, β_CX = kβ): the standard teaching set.
 * Only the carbonyl oxygen is used (formaldehyde π / π*).
 */
export const HUCKEL_PARAMETERS = {
  source: 'Streitwieser, Molecular Orbital Theory for Organic Chemists (1961), Table 5.1; CGW ch. 4 (qualitative)',
  values: { O_carbonyl: { h: 1.0, k: 1.0 } },
};

/** Hydrogen-like orbital facts: nodes and symmetry. */
export const ORBITAL_FACTS = {
  radialNodes: { '1s': 0, '2s': 1, '2pz': 0, '3s': 2, '3pz': 1, '3dz2': 0 },
  angularNodes: { s: 0, p: 1, d: 2 },
}; // ATKINS ch. 8

// ---- Transition metals topic ----------------------------------------------------------------------

/**
 * Crystal-field splitting patterns: the barycentre rule in units of Δ. Octahedral: t₂g at −0.4 Δo, e_g at
 * +0.6 Δo; tetrahedral: e at −0.6 Δt, t₂ at +0.4 Δt with Δt ≈ 4/9 Δo for the same metal and ligands; square
 * planar: the textbook order d(x²−y²) > d(xy) > d(z²) > d(xz), d(yz) drawn schematically (no numbers shown).
 */
export const CRYSTAL_FIELD = {
  source: 'Housecroft & Sharpe, Inorganic Chemistry 5e, ch. 20 (crystal field theory); Miessler, Fischer & Tarr, Inorganic Chemistry 5e, ch. 10',
  octahedral: { t2g: -0.4, eg: 0.6, orbitals: { t2g: ['dxy', 'dxz', 'dyz'], eg: ['dz2', 'dx2y2'] } },
  tetrahedral: { e: -0.6, t2: 0.4, ratio: 4 / 9, orbitals: { e: ['dz2', 'dx2y2'], t2: ['dxy', 'dxz', 'dyz'] } },
  squarePlanar: { order: ['dx2y2', 'dxy', 'dz2', 'dxz', 'dyz'], note: 'schematic order only; the gaps carry no numbers' },
};

/**
 * Octahedral splitting energies Δo (cm⁻¹) from electronic spectra: Housecroft & Sharpe 5e Table 20.2 (the
 * values most textbooks reproduce). Compilations differ by a few hundred cm⁻¹ for some entries (e.g. the
 * MIT 5.03 (Nocera) notes list [Cr(H₂O)₆]³⁺ at 17,000 and [Co(NH₃)₆]³⁺ at 22,870; one lecture compilation
 * gives [Fe(CN)₆]⁴⁻ as 32,200), which the card says. Keys are the complex ids of transitionMetals.js.
 */
export const DELTA_O = {
  unit: 'cm⁻¹',
  source: 'Housecroft & Sharpe 5e Table 20.2 (Δoct from electronic spectra); cross-checked against the MIT 5.03 (Nocera) and IIT Delhi (CYL120) lecture tables',
  values: {
    tiAqua: 20300, crAqua: 17400, crAmmine: 21600, crCyano: 26600,
    feAqua: 9400, feCyano: 33800, ferriCyano: 35000,
    coAqua: 9300, coFluoro: 13100, coAmmine: 22900, coCyano: 33500,
    niAqua: 8500, niAmmine: 10800,
  },
};

/**
 * The spectrochemical series, weak field (small Δ) to strong field (large Δ): the textbook ordering.
 * Positions are a ranking, not numbers; Δo for a given metal ion rises along the list.
 */
export const SPECTROCHEMICAL_SERIES = {
  source: 'Housecroft & Sharpe 5e ch. 20 (the spectrochemical series, §20.3); Miessler, Fischer & Tarr ch. 10',
  order: ['I⁻', 'Br⁻', 'S²⁻', 'SCN⁻', 'Cl⁻', 'NO₃⁻', 'F⁻', 'OH⁻', 'C₂O₄²⁻', 'H₂O', 'NCS⁻', 'CH₃CN', 'py', 'NH₃', 'en', 'bipy', 'phen', 'NO₂⁻', 'PPh₃', 'CN⁻', 'CO'],
};

/**
 * Spin states and unpaired-electron counts of the complexes in the Transition metals topic, as the
 * textbooks report them from magnetic moments (the model's filling is checked against this table, never
 * the other way round). d⁴–d⁷ octahedral complexes are the only ones with a high / low choice.
 */
export const COMPLEX_MAGNETISM = {
  source: 'Housecroft & Sharpe 5e ch. 20 (Tables 20.2, 20.8 and the worked examples); Miessler, Fischer & Tarr ch. 10',
  values: {
    tiAqua: { unpaired: 1 }, crAqua: { unpaired: 3 }, crAmmine: { unpaired: 3 }, crCyano: { unpaired: 3 },
    mnAqua: { spin: 'high', unpaired: 5 },
    feAqua: { spin: 'high', unpaired: 4 }, feCyano: { spin: 'low', unpaired: 0 }, ferriCyano: { spin: 'low', unpaired: 1 },
    coAqua: { spin: 'high', unpaired: 3 }, coFluoro: { spin: 'high', unpaired: 4 }, coAmmine: { spin: 'low', unpaired: 0 }, coCyano: { spin: 'low', unpaired: 0 },
    coAmmineChloro: { spin: 'low', unpaired: 0 }, coAmmineTrichloro: { spin: 'low', unpaired: 0 },
    niAqua: { unpaired: 2 }, niAmmine: { unpaired: 2 }, niCyano: { unpaired: 0 }, niChloro: { unpaired: 2 },
    cuAqua: { unpaired: 1 }, znAqua: { unpaired: 0 }, cisplatin: { unpaired: 0 },
  },
};

/**
 * Colours of the complexes as the textbooks describe them (solutions or the common salts). A colour is a
 * card fact; only for the d¹ ion is the one d–d band turned into a wavelength (λ = 10⁷ / Δo), and the
 * observed colour is still quoted, never computed from a colour wheel.
 */
export const COMPLEX_COLOURS = {
  source: 'Housecroft & Sharpe 5e ch. 20–21; Miessler, Fischer & Tarr ch. 10–11; Greenwood & Earnshaw for the halide salts',
  values: {
    tiAqua: 'purple', crAqua: 'violet', crAmmine: 'yellow', crCyano: 'yellow', mnAqua: 'very pale pink', feAqua: 'pale green', feCyano: 'yellow', ferriCyano: 'red-orange',
    coAqua: 'pink', coFluoro: 'blue', coAmmine: 'orange-yellow', coCyano: 'pale yellow', coAmmineChloro: { cis: 'violet', trans: 'green' }, coAmmineTrichloro: null,
    niAqua: 'green', niAmmine: 'blue-violet', niCyano: 'yellow', niChloro: 'blue', cuAqua: 'blue', znAqua: 'colourless', cisplatin: { cis: 'yellow', trans: 'pale yellow' },
  },
};

/**
 * Effective nuclear charge used to draw the metal 3d orbitals: Slater's rules for a 3d electron of iron
 * (σ = 18 × 1.00 for the inner shells + 5 × 0.35 for the other 3d electrons = 19.75; Z_eff = 26 − 19.75).
 * It sets the size of the picture only; no energy is computed from it.
 */
export const D_ORBITAL_ZEFF = { value: 6.25, metal: 'Fe', basis: "Slater's rules: Z_eff(3d, Fe) = 26 − (18 × 1.00 + 5 × 0.35) = 6.25", source: 'Housecroft & Sharpe 5e Box 1.6 (Slater\'s rules); Slater, Phys. Rev. 36, 57 (1930)' };

/** Group numbers of the metals the topic uses: d-electron count = group − oxidation state. */
export const METAL_GROUPS = { source: 'IUPAC periodic table (groups 3–12)', values: { Ti: 4, V: 5, Cr: 6, Mn: 7, Fe: 8, Co: 9, Ni: 10, Cu: 11, Zn: 12, Pd: 10, Pt: 10 } };

/** Spin-only magnetic moment μ = √(n(n+2)) μ_B for n unpaired electrons: the formula applied to a count. */
export const SPIN_ONLY_MOMENT = { formula: 'μ = √(n(n+2)) μ_B', source: 'Housecroft & Sharpe 5e ch. 20 (eq. 20.10); ATKINS ch. 8' };
