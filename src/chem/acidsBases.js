// Acids and bases topic: conjugate pairs with tabulated pKa (references/textbook.js PKA), the pKa ladder,
// the direction of a proton-transfer equilibrium from two tabulated values (K = 10^ΔpKa, ΔG° = −2.303RT
// log K at 298 K), the five factors behind acid strength as ordered comparisons the sweep checks, and a
// proton-departure frame for the 3D view built on the functional-group molecules. Nothing is computed from
// the drawn geometry (docs/REVIEW_PROTOCOL.md §6). Pure and dependency-free.
import { makeMolecule } from './builder.js';
import { bondLength } from './elements.js';
import { v } from './geometry.js';
import { PKA, PKA_TABLE, RT_LN10_KJ } from './references/textbook.js';

/**
 * The conjugate pairs, strongest acid first. `build` says how the acid molecule is made from a functional
 * group: `acidH` is the departing hydrogen's atom id in that frame; `protonate` adds the acidic H on that
 * atom's lone pair instead (cationic acids: hydronium, ammonium, anilinium). `factors` name the reasons
 * the card gives; `charge` is the acid's charge.
 */
export const PAIRS = [
  { id: 'hydrogenIodide', acid: 'HI', base: 'I⁻', name: 'Hydrogen iodide', baseName: 'iodide', pka: 'hydrogenIodide', charge: 0, factors: ['size'], build: { fg: 'haloalkane', choice: { variant: 'I', R: { R1: 'H' } }, acidH: 'R1.H' } },
  { id: 'hydrogenChloride', acid: 'HCl', base: 'Cl⁻', name: 'Hydrogen chloride', baseName: 'chloride', pka: 'hydrogenChloride', charge: 0, factors: ['size', 'element'], build: { fg: 'haloalkane', choice: { variant: 'Cl', R: { R1: 'H' } }, acidH: 'R1.H' } },
  { id: 'hydroniumIon', acid: 'H₃O⁺', base: 'H₂O', name: 'Hydronium ion', baseName: 'water', pka: 'hydroniumIon', charge: 1, factors: ['charge'], build: { fg: 'alcohol', choice: { R: { R1: 'H' } }, protonate: 'O' } },
  { id: 'trifluoroaceticAcid', acid: 'CF₃COOH', base: 'CF₃COO⁻', name: 'Trifluoroacetic acid', baseName: 'trifluoroacetate', pka: 'trifluoroaceticAcid', charge: 0, factors: ['induction', 'resonance'], build: { fg: 'carboxylicAcid', choice: { R: { R1: 'CF3' } }, acidH: 'H' } },
  { id: 'hydrogenFluoride', acid: 'HF', base: 'F⁻', name: 'Hydrogen fluoride', baseName: 'fluoride', pka: 'hydrogenFluoride', charge: 0, factors: ['size', 'element'], build: { fg: 'haloalkane', choice: { variant: 'F', R: { R1: 'H' } }, acidH: 'R1.H' } },
  { id: 'anilinium', acid: 'C₆H₅NH₃⁺', base: 'C₆H₅NH₂', name: 'Anilinium ion', baseName: 'aniline', pka: 'anilinium', charge: 1, factors: ['resonance', 'charge'], build: { fg: 'amine', choice: { R: { R1: 'phenyl', R2: 'H', R3: 'H' } }, protonate: 'N' }, audience: 'learn' },
  { id: 'aceticAcid', acid: 'CH₃COOH', base: 'CH₃COO⁻', name: 'Acetic acid', baseName: 'acetate', pka: 'aceticAcid', charge: 0, factors: ['resonance'], build: { fg: 'carboxylicAcid', choice: {}, acidH: 'H' } },
  { id: 'thiophenol', acid: 'C₆H₅SH', base: 'C₆H₅S⁻', name: 'Thiophenol', baseName: 'thiophenolate', pka: 'thiophenol', charge: 0, factors: ['size', 'resonance'], build: { fg: 'thiol', choice: { R: { R1: 'phenyl' } }, acidH: 'H' }, audience: 'learn' },
  { id: 'ammonium', acid: 'NH₄⁺', base: 'NH₃', name: 'Ammonium ion', baseName: 'ammonia', pka: 'ammonium', charge: 1, factors: ['charge', 'element'], build: { fg: 'amine', choice: { R: { R1: 'H', R2: 'H', R3: 'H' } }, protonate: 'N' } },
  { id: 'phenol', acid: 'C₆H₅OH', base: 'C₆H₅O⁻', name: 'Phenol', baseName: 'phenoxide', pka: 'phenol', charge: 0, factors: ['resonance'], build: { fg: 'alcohol', choice: { R: { R1: 'phenyl' } }, acidH: 'H' } },
  { id: 'nitromethane', acid: 'CH₃NO₂', base: '⁻CH₂NO₂', name: 'Nitromethane (C–H)', baseName: 'nitronate', pka: 'nitromethane', charge: 0, factors: ['resonance'], build: { fg: 'nitro', choice: {}, acidH: 'R1.H1' }, audience: 'learn' },
  { id: 'ethanethiol', acid: 'CH₃CH₂SH', base: 'CH₃CH₂S⁻', name: 'Ethanethiol', baseName: 'ethanethiolate', pka: 'ethanethiol', charge: 0, factors: ['size'], build: { fg: 'thiol', choice: { R: { R1: 'ethyl' } }, acidH: 'H' } },
  { id: 'water', acid: 'H₂O', base: 'HO⁻', name: 'Water', baseName: 'hydroxide', pka: 'water', charge: 0, factors: ['element', 'charge'], build: { fg: 'alcohol', choice: { R: { R1: 'H' } }, acidH: 'H' } },
  { id: 'ethanol', acid: 'CH₃CH₂OH', base: 'CH₃CH₂O⁻', name: 'Ethanol', baseName: 'ethoxide', pka: 'ethanol', charge: 0, factors: ['resonance', 'size'], build: { fg: 'alcohol', choice: {}, acidH: 'H' } },
  { id: 'acetaldehyde', acid: 'CH₃CHO (α C–H)', base: '⁻CH₂CHO', name: 'Acetaldehyde (α C–H)', baseName: 'enolate', pka: 'acetaldehydeAlphaH', charge: 0, factors: ['resonance'], build: { fg: 'aldehyde', choice: {}, acidH: 'R1.H1' }, audience: 'learn' },
  { id: 'acetone', acid: 'CH₃COCH₃ (α C–H)', base: '⁻CH₂COCH₃', name: 'Acetone (α C–H)', baseName: 'enolate', pka: 'acetoneAlphaH', charge: 0, factors: ['resonance'], build: { fg: 'ketone', choice: {}, acidH: 'R1.H1' }, audience: 'learn' },
  { id: 'acetylene', acid: 'HC≡CH', base: 'HC≡C⁻', name: 'Acetylene', baseName: 'acetylide', pka: 'acetylene', charge: 0, factors: ['hybridisation', 'element'], build: { fg: 'alkyne', choice: { R: { R1: 'H', R2: 'H' } }, acidH: 'R1.H' } },
  { id: 'ethene', acid: 'H₂C=CH₂', base: 'H₂C=CH⁻', name: 'Ethene', baseName: 'vinyl anion', pka: 'ethene', charge: 0, factors: ['hybridisation'], build: { fg: 'alkene', choice: { R: { R1: 'H', R2: 'H', R3: 'H', R4: 'H' } }, acidH: 'R1.H' }, audience: 'learn' },
];
export const pairById = (id) => PAIRS.find((p) => p.id === id) || null;
export const pkaOf = (id) => PKA[pairById(id).pka];

/** The five factors, each as ordered comparisons (stronger acid first, so pKa rises along the list) the sweep checks. */
export const FACTORS = {
  element: { label: 'Element: across a row', summary: 'For H–A with A in one row, the more electronegative A holds the negative charge better: C–H < N–H < O–H < H–F in acidity.', orders: [['hydrogenFluoride', 'water', 'acetylene']] },
  size: { label: 'Size: down a column', summary: 'A larger atom spreads the negative charge over more volume, which beats electronegativity: HI > HBr > HCl > HF, and thiols beat alcohols.', orders: [['hydrogenIodide', 'hydrogenChloride', 'hydrogenFluoride'], ['ethanethiol', 'ethanol'], ['thiophenol', 'phenol']] },
  resonance: { label: 'Resonance: delocalising the charge', summary: 'If the conjugate base spreads its charge over several atoms it is more stable and the acid is stronger: carboxylic acids and phenols beat alcohols by 10¹¹ and 10⁶; an α C–H next to a carbonyl or a nitro group is acidic; aniline\'s lone pair is tied up, so anilinium is a stronger acid than ammonium.', orders: [['aceticAcid', 'phenol', 'ethanol'], ['anilinium', 'ammonium'], ['nitromethane', 'acetone'], ['acetaldehyde', 'ethene']] },
  induction: { label: 'Induction: electron-withdrawing groups nearby', summary: 'Electronegative atoms pull electron density through the σ bonds and stabilise the anion: CF₃COOH is 10⁴·⁵ times stronger than CH₃COOH.', orders: [['trifluoroaceticAcid', 'aceticAcid']] },
  hybridisation: { label: 'Hybridisation: s character of the C–H', summary: 'An sp carbon holds its lone pair closer to the nucleus than sp² or sp³: acetylene (25) beats ethene (≈ 44) and an alkane (≈ 50), which is why terminal alkynes can be deprotonated by amide.', orders: [['acetylene', 'ethene']] },
  charge: { label: 'Charge: a positive acid is stronger', summary: 'Losing a proton from a cation relieves the charge: H₃O⁺ (−1.7) is far stronger than H₂O (15.7); NH₄⁺ (9.25) is an acid, NH₃ barely is.', orders: [['hydroniumIon', 'water']] },
};
export const FACTOR_IDS = Object.keys(FACTORS);

/** Ka = 10^−pKa. */
export const ka = (pka) => Math.pow(10, -pka);
/**
 * HA + B⁻ ⇌ A⁻ + HB for the acid `acidId` and the conjugate base of `baseOfId`: the equilibrium lies
 * on the side of the weaker acid. K = 10^(pKa(HB) − pKa(HA)); ΔG° = −2.303RT log K at 298 K.
 * Returns { K, logK, deltaPka, deltaG (kJ/mol), favoured: 'products' | 'reactants' | 'even', acid, base, acidOfBase, conjugateBase, sentence }.
 */
export function equilibrium(acidId, baseOfId) {
  const HA = pairById(acidId), HB = pairById(baseOfId);
  if (!HA || !HB) throw new Error(`equilibrium(): unknown pair ${!HA ? acidId : baseOfId}`);
  const deltaPka = PKA[HB.pka] - PKA[HA.pka];
  const logK = deltaPka, K = Math.pow(10, logK), deltaG = -RT_LN10_KJ * logK;
  const favoured = Math.abs(logK) < 0.3 ? 'even' : logK > 0 ? 'products' : 'reactants';
  return {
    K, logK, deltaPka, deltaG, favoured, acid: HA, base: HB, acidOfBase: HB.acid, conjugateBase: HA.base,
    equation: `${HA.acid} + ${HB.base} ⇌ ${HA.base} + ${HB.acid}`,
    sentence: favoured === 'even' ? `pKa ${PKA[HA.pka]} against ${PKA[HB.pka]}: nearly balanced, K ≈ ${K.toFixed(1)}.` : favoured === 'products' ? `${HA.acid} (pKa ${PKA[HA.pka]}) is the stronger acid, so the proton moves to ${HB.base}: K = 10^${logK.toFixed(1)}, products favoured.` : `${HB.acid} (pKa ${PKA[HB.pka]}) is the stronger acid, so ${HB.base} cannot take the proton from ${HA.acid}: K = 10^${logK.toFixed(1)}, reactants favoured.`,
  };
}

/** LevelDiagram spec of the pKa ladder: one level per pair at E = pKa, strongest at the bottom. */
export function ladderSpec({ selected = null, range = [-12, 47] } = {}) {
  return {
    columns: [{ id: 'ladder', label: 'pKa (water, 25 °C)' }],
    levels: PAIRS.map((p) => ({ id: p.id, column: 'ladder', E: PKA[p.pka], label: `${p.acid} ${PKA[p.pka]}`, electrons: 0, style: p.id === selected ? 'solid' : 'solid' })),
    yLabel: 'weaker acid →', range, unit: 'pKa',
  };
}

// ---- frames ---------------------------------------------------------------------------------------------------
const DEPART = 1.4;   // Å the proton travels along its bond by t = 1
const cache = new Map();
/**
 * The acid molecule with its acidic proton leaving: at t = 0 the H is bonded, at t = 1 it sits DEPART Å
 * further out as H⁺ (ghost bond, charges −t on the atom it leaves for a neutral acid, 1 − t for a cation).
 * Returns { frame, acidH (id), donor (id), item, length (the X–H bond length used) }.
 */
export function acidFrame(id, t = 0) {
  const item = pairById(id);
  if (!item) throw new Error(`acidFrame(): unknown pair ${id}`);
  const tt = Math.max(0, Math.min(1, Number(t) || 0));
  let base = cache.get(id);
  if (!base) {
    const { frame } = makeMolecule(item.build.fg, item.build.choice);
    let acidH, donor, length;
    if (item.build.protonate) {
      donor = item.build.protonate;
      const X = frame.atoms.find((a) => a.id === donor);
      const dir = X.lonePairDirs?.[0] || [0, 0, 1];
      length = bondLength(X.el, 'H', 1);
      acidH = 'Hp';
      frame.atoms.push({ id: acidH, el: 'H', charge: 0, lonePairs: 0, pos: v.add(X.pos, v.scale(v.norm(dir), length)), lonePairDirs: [], orbital: null, ghost: false, label: null, aromatic: false });
      frame.bonds.push({ a: donor, b: acidH, order: 1, partial: 1, aromatic: false, ring: null, ghost: false, piOnly: false });
      X.lonePairDirs = (X.lonePairDirs || []).slice(1);
      X.lonePairs = Math.max(0, (X.lonePairs || 0) - 1);
    } else {
      acidH = frame.aliases?.[item.build.acidH] || item.build.acidH;
      const bond = frame.bonds.find((b) => b.a === acidH || b.b === acidH);
      donor = bond.a === acidH ? bond.b : bond.a;
      const H = frame.atoms.find((a) => a.id === acidH), X = frame.atoms.find((a) => a.id === donor);
      length = v.dist(H.pos, X.pos);
    }
    base = { frame, acidH, donor, length };
    cache.set(id, base);
  }
  const atoms = base.frame.atoms.map((a) => ({ ...a, pos: [...a.pos] }));
  const bonds = base.frame.bonds.map((b) => ({ ...b }));
  const H = atoms.find((a) => a.id === base.acidH), X = atoms.find((a) => a.id === base.donor);
  const dir = v.norm(v.sub(H.pos, X.pos));
  H.pos = v.add(X.pos, v.scale(dir, base.length + DEPART * tt));
  H.charge = tt; H.label = tt > 0.5 ? 'H⁺' : null;
  X.charge = item.charge === 1 ? 1 - tt : -tt;
  const b = bonds.find((x) => (x.a === base.acidH && x.b === base.donor) || (x.b === base.acidH && x.a === base.donor));
  b.partial = 1 - tt; b.ghost = tt >= 0.999;
  return { frame: { ...base.frame, atoms, bonds }, acidH: base.acidH, donor: base.donor, item, length: base.length, t: tt };
}

/** Everything the card needs: the pair, its pKa and Ka, the factor labels, the equilibrium against a partner base. */
export function buildPair(id, state = {}) {
  const item = pairById(id);
  if (!item) throw new Error(`buildPair(): unknown pair ${id}`);
  const t = state.t ?? 0;
  const partnerId = state.partner && pairById(state.partner) ? state.partner : (id === 'water' ? 'ethanol' : 'water');
  const f = acidFrame(id, t);
  const pka = PKA[item.pka];
  return { item, pka, ka: ka(pka), source: PKA_TABLE.source, frame: f.frame, acidH: f.acidH, donor: f.donor, t, factors: item.factors.map((k) => ({ id: k, ...FACTORS[k] })), eq: equilibrium(id, partnerId), partner: pairById(partnerId), title: `${item.name} · pKa ${pka}${t >= 0.999 ? ` · ${item.base} + H⁺` : t > 0 ? ' · proton leaving' : ''}` };
}
