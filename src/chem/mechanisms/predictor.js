// Environment → mechanism predictor. Encodes the standard textbook decision table
// (substrate class × nucleophile/base class) with solvent, temperature and leaving-group
// modifiers, and returns percentages plus the reasons, so students see WHY.

export const SUBSTRATES = [
  { id: 'methyl', label: 'Methyl (CH₃–X)' },
  { id: 'primary', label: 'Primary (RCH₂–X)' },
  { id: 'secondary', label: 'Secondary (R₂CH–X)' },
  { id: 'tertiary', label: 'Tertiary (R₃C–X)' },
];
export const REAGENTS = [
  { id: 'strongNuStrongBase', label: 'Strong nucleophile + strong base', examples: 'HO⁻, CH₃O⁻, EtO⁻, NH₂⁻' },
  { id: 'bulkyBase', label: 'Bulky strong base', examples: 'tBuO⁻, LDA, DBU' },
  { id: 'strongNuWeakBase', label: 'Strong nucleophile, weak base', examples: 'I⁻, Br⁻, CN⁻, N₃⁻, RS⁻, NH₃' },
  { id: 'weakNuWeakBase', label: 'Weak nucleophile, weak base', examples: 'H₂O, ROH, RCOOH (solvolysis)' },
];
export const SOLVENTS = [
  { id: 'polarProtic', label: 'Polar protic', examples: 'H₂O, MeOH, EtOH, AcOH' },
  { id: 'polarAprotic', label: 'Polar aprotic', examples: 'DMSO, DMF, acetone, MeCN' },
  { id: 'nonpolar', label: 'Nonpolar', examples: 'hexane, Et₂O, benzene' },
];
export const TEMPERATURES = [
  { id: 'low', label: 'Room temperature or below' },
  { id: 'high', label: 'Heat (Δ)' },
];
export const LEAVING_GROUPS = [
  { id: 'excellent', label: 'Excellent: I⁻, OTs⁻, OMs⁻, N₂' },
  { id: 'good', label: 'Good: Br⁻' },
  { id: 'fair', label: 'Fair: Cl⁻' },
  { id: 'poor', label: 'Poor: F⁻, HO⁻, RO⁻ (needs activation)' },
];

// Base scores [SN2, SN1, E2, E1] per substrate × reagent, plus a "no reaction" weight.
const TABLE = {
  methyl: {
    strongNuStrongBase: [100, 0, 0, 0, 0], bulkyBase: [100, 0, 0, 0, 0], strongNuWeakBase: [100, 0, 0, 0, 0], weakNuWeakBase: [15, 0, 0, 0, 85],
  },
  primary: {
    strongNuStrongBase: [85, 0, 15, 0, 0], bulkyBase: [15, 0, 85, 0, 0], strongNuWeakBase: [100, 0, 0, 0, 0], weakNuWeakBase: [10, 0, 0, 0, 90],
  },
  secondary: {
    strongNuStrongBase: [30, 0, 70, 0, 0], bulkyBase: [3, 0, 97, 0, 0], strongNuWeakBase: [85, 7, 2, 6, 0], weakNuWeakBase: [3, 55, 2, 40, 0],
  },
  tertiary: {
    strongNuStrongBase: [0, 5, 95, 0, 0], bulkyBase: [0, 0, 100, 0, 0], strongNuWeakBase: [0, 60, 5, 35, 0], weakNuWeakBase: [0, 65, 0, 35, 0],
  },
};

const NAMES = ['sn2', 'sn1', 'e2', 'e1'];

export function predict({ substrate = 'secondary', reagent = 'strongNuStrongBase', solvent = 'polarProtic', temperature = 'low', leavingGroup = 'good', allylicBenzylic = false } = {}) {
  const base = TABLE[substrate][reagent].slice();
  let [sn2, sn1, e2, e1, none] = base;
  const reasons = [];
  const warnings = [];

  // --- substrate reasons
  const subReason = {
    methyl: 'Methyl: no β-hydrogens (no elimination possible) and a hopeless cation (no SN1/E1). Only SN2 is open, and backside attack is unhindered.',
    primary: 'Primary: backside attack is easy, a primary cation is far too unstable to form. SN2 unless a bulky base forces E2.',
    secondary: 'Secondary: the crossroads. Hindered enough that strong bases prefer E2, but still open to SN2 with good nucleophiles; the cation is marginal, so SN1/E1 only with weak nucleophiles in protic solvent.',
    tertiary: 'Tertiary: backside attack is blocked (no SN2 ever), but the cation is stable, so SN1/E1 with weak nucleophiles and E2 with strong bases.',
  }[substrate];
  reasons.push(subReason);

  const regReason = {
    strongNuStrongBase: 'A strong, small base/nucleophile: substitutes at unhindered carbons, eliminates at hindered ones.',
    bulkyBase: 'A bulky base cannot reach the carbon but easily reaches a peripheral β-H: E2, and the Hofmann (less substituted) alkene when there is a choice.',
    strongNuWeakBase: 'Strong nucleophile that is a weak base: wants to substitute, not eliminate.',
    weakNuWeakBase: 'Weak nucleophile and weak base (solvolysis): cannot force anything; waits for a carbocation, so SN1/E1 if the substrate can ionise, otherwise little happens.',
  }[reagent];
  reasons.push(regReason);

  // --- allylic / benzylic unlock SN1/E1 for 1°/2° and speed SN2
  if (allylicBenzylic && (substrate === 'primary' || substrate === 'secondary')) {
    if (reagent === 'weakNuWeakBase') { sn1 += 60; e1 += 20; none = Math.max(0, none - 70); }
    if (reagent === 'strongNuWeakBase') { sn2 += 10; }
    reasons.push('Allylic/benzylic: the cation is resonance-stabilised, so SN1/E1 become possible even at a primary or secondary carbon, and the SN2 transition state is also stabilised by π overlap.');
  }

  // --- solvent
  if (solvent === 'polarProtic') { sn1 *= 1.35; e1 *= 1.3; sn2 *= 0.7; reasons.push('Polar protic solvent: stabilises carbocations and leaving anions (helps SN1/E1) but hydrogen-bonds and deactivates anionic nucleophiles (slows SN2).'); }
  if (solvent === 'polarAprotic') { sn2 *= 1.5; sn1 *= 0.45; e1 *= 0.45; reasons.push('Polar aprotic solvent: solvates the cation only, leaving the nucleophile "naked" and highly reactive (big SN2 boost); cannot stabilise a carbocation well.'); }
  if (solvent === 'nonpolar') { sn1 *= 0.25; e1 *= 0.25; sn2 *= 0.9; reasons.push('Nonpolar solvent: cannot stabilise ions, so ionisation (SN1/E1) is strongly disfavoured; reactions are slow overall.'); if (reagent !== 'weakNuWeakBase') warnings.push('Ionic reagents are poorly soluble in nonpolar solvents; expect a slow reaction.'); }

  // --- temperature
  if (temperature === 'high') { e2 *= 1.6; e1 *= 1.7; sn2 *= 0.85; sn1 *= 0.85; reasons.push('Heat favours elimination: more product molecules (ΔS > 0) and a higher activation energy, so raising T helps E1/E2 more than SN1/SN2.'); }
  else reasons.push('Low temperature favours substitution over elimination.');

  // --- leaving group
  if (leavingGroup === 'poor') { none += 60; reasons.push('Poor leaving group (F⁻, HO⁻, RO⁻): nothing proceeds until it is activated, e.g. protonate the OH with acid or convert it to a tosylate.'); warnings.push('Activate the leaving group first (H⁺, TsCl, SOCl₂, PBr₃).'); }
  if (leavingGroup === 'excellent') reasons.push('Excellent leaving group: every pathway is faster; iodides/tosylates ionise most easily.');
  if (leavingGroup === 'fair') reasons.push('Chloride is a fair leaving group: all rates are slower than for bromides/iodides.');

  // --- hard constraints
  if (substrate === 'tertiary') { sn2 = 0; }
  if (substrate === 'methyl') { sn1 = 0; e1 = 0; e2 = 0; }
  if (substrate === 'primary' && !allylicBenzylic) { sn1 = 0; e1 = 0; }

  const scores = [sn2, sn1, e2, e1];
  const total = scores.reduce((a, b) => a + b, 0) + none;
  const pct = {};
  NAMES.forEach((n, i) => { pct[n] = total ? Math.round((scores[i] / total) * 100) : 0; });
  pct.none = total ? Math.round((none / total) * 100) : 100;
  const ranked = NAMES.map((n) => ({ id: n, pct: pct[n] })).sort((a, b) => b.pct - a.pct);
  const dominant = ranked[0].pct > 0 && ranked[0].pct >= pct.none ? ranked[0].id : 'none';

  const summary = dominant === 'none'
    ? 'Little or no reaction under these conditions.'
    : ranked[1].pct >= ranked[0].pct * 0.6 && ranked[1].pct > 10
      ? `Mixture: mainly ${ranked[0].id.toUpperCase()} with substantial ${ranked[1].id.toUpperCase()}.`
      : `${ranked[0].id.toUpperCase()} dominates.`;

  return { pct, ranked, dominant, summary, reasons, warnings };
}
