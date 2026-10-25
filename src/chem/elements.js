// Element data used for rendering and geometry.
// color: CPK-inspired palette tuned for a dark background.
// radius: ball-and-stick sphere radius (Å, display only).
// covalent: covalent radius (Å) used as a fallback for bond lengths.
// en: Pauling electronegativity.
export const ELEMENTS = {
  H:  { name: 'Hydrogen',   color: '#f1f5f9', radius: 0.22, covalent: 0.31, en: 2.20, valence: 1 },
  C:  { name: 'Carbon',     color: '#6b7280', radius: 0.33, covalent: 0.76, en: 2.55, valence: 4 },
  N:  { name: 'Nitrogen',   color: '#3b82f6', radius: 0.31, covalent: 0.71, en: 3.04, valence: 3 },
  O:  { name: 'Oxygen',     color: '#ef4444', radius: 0.30, covalent: 0.66, en: 3.44, valence: 2 },
  F:  { name: 'Fluorine',   color: '#86efac', radius: 0.28, covalent: 0.57, en: 3.98, valence: 1 },
  S:  { name: 'Sulfur',     color: '#facc15', radius: 0.37, covalent: 1.05, en: 2.58, valence: 2 },
  Cl: { name: 'Chlorine',   color: '#22c55e', radius: 0.37, covalent: 1.02, en: 3.16, valence: 1 },
  Br: { name: 'Bromine',    color: '#b45309', radius: 0.41, covalent: 1.20, en: 2.96, valence: 1 },
  I:  { name: 'Iodine',     color: '#a855f7', radius: 0.45, covalent: 1.39, en: 2.66, valence: 1 },
  P:  { name: 'Phosphorus', color: '#fb923c', radius: 0.38, covalent: 1.07, en: 2.19, valence: 3 },
  // Transition metals for coordination complexes (Jmol/CPK colours, Cordero covalent radii, Pauling EN).
  // M–L bond lengths fall back to covalent radii sums, e.g. Fe–N ≈ 2.03 Å, Pt–Cl ≈ 2.38 Å.
  Ti: { name: 'Titanium',   color: '#9ca3af', radius: 0.46, covalent: 1.60, en: 1.54, valence: 4 },
  V:  { name: 'Vanadium',   color: '#8b8f9a', radius: 0.45, covalent: 1.53, en: 1.63, valence: 5 },
  Cr: { name: 'Chromium',   color: '#8a99c7', radius: 0.44, covalent: 1.39, en: 1.66, valence: 3 },
  Mn: { name: 'Manganese',  color: '#9c7ac7', radius: 0.44, covalent: 1.39, en: 1.55, valence: 2 },
  Fe: { name: 'Iron',       color: '#e06633', radius: 0.44, covalent: 1.32, en: 1.83, valence: 3 },
  Co: { name: 'Cobalt',     color: '#f090a0', radius: 0.43, covalent: 1.26, en: 1.88, valence: 3 },
  Ni: { name: 'Nickel',     color: '#50d050', radius: 0.43, covalent: 1.24, en: 1.91, valence: 2 },
  Cu: { name: 'Copper',     color: '#c88033', radius: 0.43, covalent: 1.32, en: 1.90, valence: 2 },
  Zn: { name: 'Zinc',       color: '#7d80b0', radius: 0.43, covalent: 1.22, en: 1.65, valence: 2 },
  Pd: { name: 'Palladium',  color: '#4b8a9b', radius: 0.46, covalent: 1.39, en: 2.20, valence: 2 },
  Pt: { name: 'Platinum',   color: '#b8bcd0', radius: 0.47, covalent: 1.36, en: 2.28, valence: 2 },
};

// Typical bond lengths in Å. Key: "A-B" single, "A=B" double, "A#B" triple, "A:B" aromatic.
const BOND_LENGTHS = {
  'C-C': 1.54, 'C=C': 1.34, 'C#C': 1.20, 'C:C': 1.39,
  'C-H': 1.09, 'C-O': 1.43, 'C=O': 1.21, 'O-H': 0.96,
  'C-N': 1.47, 'C=N': 1.28, 'C#N': 1.16, 'N-H': 1.01,
  'C-F': 1.35, 'C-Cl': 1.77, 'C-Br': 1.94, 'C-I': 2.14,
  'C-S': 1.82, 'S-H': 1.34, 'S-S': 2.05,
  'N-O': 1.40, 'N=O': 1.21, 'O-O': 1.48, 'N-N': 1.45,
  'H-H': 0.74, 'H-O': 0.96, 'H-Br': 1.41, 'H-Cl': 1.27,
};

const ORDER_SYMBOL = { 1: '-', 2: '=', 3: '#', 1.5: ':' };

/** Bond length in Å for two element symbols and a bond order (1, 2, 3 or 1.5 for aromatic). */
export function bondLength(e1, e2, order = 1) {
  const sym = ORDER_SYMBOL[order] || '-';
  const k1 = `${e1}${sym}${e2}`;
  const k2 = `${e2}${sym}${e1}`;
  if (BOND_LENGTHS[k1] !== undefined) return BOND_LENGTHS[k1];
  if (BOND_LENGTHS[k2] !== undefined) return BOND_LENGTHS[k2];
  const r = (ELEMENTS[e1]?.covalent ?? 0.75) + (ELEMENTS[e2]?.covalent ?? 0.75);
  const factor = order >= 3 ? 0.78 : order >= 2 ? 0.87 : order > 1 ? 0.92 : 1.0;
  return r * factor;
}

/** Partial-charge hint from electronegativity difference (positive means e1 is δ+). */
export function polarity(e1, e2) {
  return (ELEMENTS[e2]?.en ?? 2.5) - (ELEMENTS[e1]?.en ?? 2.5);
}

/** Hill-system molecular formula string with unicode subscripts, e.g. C₂H₆O. */
export function formulaFromAtoms(atoms) {
  const counts = {};
  for (const a of atoms) counts[a.el] = (counts[a.el] || 0) + 1;
  const sub = (n) => (n === 1 ? '' : String(n).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[d]));
  const keys = Object.keys(counts);
  const ordered = [];
  if (counts.C) { ordered.push('C'); if (counts.H) ordered.push('H'); }
  for (const k of keys.sort()) if (!ordered.includes(k)) ordered.push(k);
  if (!counts.C && counts.H) { ordered.splice(ordered.indexOf('H'), 1); ordered.unshift('H'); }
  return ordered.map((k) => `${k}${sub(counts[k])}`).join('');
}
