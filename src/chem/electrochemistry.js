// Electrochemistry (redox phase B): the couples of src/chem/redox.js that carry a tabulated standard potential,
// the galvanic cell any two of them make (the higher E° is the cathode), E°cell = E°(cathode) − E°(anode), and the
// three identities ΔG° = −nFE°, ln K = nFE°/RT and E = E° − (RT/nF) ln Q at 298 K with activities taken as
// concentrations (pressures 1 bar). Every potential is a table entry (STANDARD_POTENTIALS); every equation comes
// from the phase A balancer; nothing is fitted (docs/REVIEW_PROTOCOL.md §6). Pure and dependency-free.
import { SPECIES, COUPLES, coupleById, balance, orientedOverall, speciesGraph } from './redox.js';
import { ELEMENTS } from './elements.js';
import { STANDARD_POTENTIALS, TEXTBOOK_CELLS, ELECTROCHEMICAL_CONSTANTS } from './references/textbook.js';

export const { F, R, T } = ELECTROCHEMICAL_CONSTANTS;
/** RT/F in volts at 298.15 K (0.02569 V); × ln 10 gives the 0.05916 V of the decimal Nernst form. */
export const RT_OVER_F = (R * T) / F;

export const potentialOf = (coupleId) => STANDARD_POTENTIALS.values[coupleId] ?? null;
/** The couples with a tabulated E°, strongest oxidant (most positive) first. */
export const POTENTIAL_COUPLES = COUPLES.filter((c) => potentialOf(c.id) != null).sort((a, b) => potentialOf(b.id) - potentialOf(a.id));
export const POTENTIAL_IDS = POTENTIAL_COUPLES.map((c) => c.id);

/** Standard-state phase of a species: metals solid, listed gases and liquids, everything else aqueous. */
const GASES = new Set(['dihydrogen', 'dioxygen', 'chlorine', 'fluorine']);
const LIQUIDS = new Set(['water', 'bromine']);
const SOLIDS = new Set(['iodine']);
export function phaseOf(speciesId) {
  const sp = SPECIES[speciesId];
  if (!sp) throw new Error(`phaseOf(): unknown species ${speciesId}`);
  if (GASES.has(speciesId)) return 'g';
  if (LIQUIDS.has(speciesId)) return 'l';
  if (SOLIDS.has(speciesId)) return 's';
  const g = speciesGraph(speciesId);
  if (g.atoms.length === 1 && sp.charge === 0 && !['H', 'C', 'N', 'O', 'F', 'S', 'Cl', 'Br', 'I', 'P'].includes(g.atoms[0].el)) return 's';   // a metal in its element
  return 'aq';
}
const withPhase = (id) => `${SPECIES[id].formula}(${phaseOf(id)})`;

/**
 * One half-cell: the couple's oxidised and reduced forms (whichever way the couple is written), its E°, the electrode
 * (the metal itself when the reduced form is a solid metal, otherwise inert platinum), its solutes and gas, and the
 * half-reaction as a reduction.
 */
export function halfCell(coupleId) {
  const c = coupleById(coupleId);
  if (!c) throw new Error(`halfCell(): unknown couple ${coupleId}`);
  const E0 = potentialOf(coupleId);
  if (E0 == null) throw new Error(`halfCell(): no standard potential for ${coupleId}`);
  const eq = balance(c);
  const red = eq.electrons < 0 ? eq : { ...eq, left: eq.right, right: eq.left, electrons: -eq.electrons };   // written as a reduction
  const ox = (eq.electrons < 0 ? c.from : c.to).map((x) => x.sp), re = (eq.electrons < 0 ? c.to : c.from).map((x) => x.sp);
  const metal = re.find((id) => phaseOf(id) === 's' && speciesGraph(id).atoms.length === 1);
  const gas = [...ox, ...re].find((id) => phaseOf(id) === 'g');
  const solutes = [...ox, ...re].filter((id) => phaseOf(id) === 'aq');
  const needsAcid = red.left.some((t) => t.id === 'proton');
  const electrode = metal ? { kind: 'metal', species: metal, formula: SPECIES[metal].formula, el: speciesGraph(metal).atoms[0].el } : { kind: 'inert', species: null, formula: 'Pt', el: 'Pt' };
  const formula = `${SPECIES[ox[0]].formula}/${SPECIES[re[0]].formula}`;
  return { id: coupleId, couple: c, E0, electrode, oxidised: ox, reduced: re, gas: gas || null, solutes, needsAcid, reduction: red, text: `${red.left.map((t) => `${t.n === 1 ? '' : `${t.n} `}${t.formula}`).join(' + ')} → ${red.right.map((t) => `${t.n === 1 ? '' : `${t.n} `}${t.formula}`).join(' + ')}`, n: Math.abs(red.electrons), formula };
}

/**
 * Half-cell notation: the electrode outermost, then any gas / liquid / solid form next to it, then the solutes of the
 * one aqueous phase separated by commas (on the anode side the reduced form first, on the cathode side the oxidised
 * form first, H⁺ last), phases in brackets. A metal electrode is its own reduced form.
 */
export function halfNotation(coupleId, role) {
  const hc = halfCell(coupleId);
  const aq = (ids) => ids.filter((id) => phaseOf(id) === 'aq').map(withPhase);
  const solutes = role === 'anode' ? [...aq(hc.reduced), ...aq(hc.oxidised)] : [...aq(hc.oxidised), ...aq(hc.reduced)];
  if (hc.needsAcid && !hc.solutes.includes('proton')) solutes.push('H⁺(aq)');
  const layers = [];   // electrode → outward
  if (hc.electrode.kind === 'metal') layers.push(withPhase(hc.electrode.species));
  else { layers.push('Pt(s)'); for (const id of [...hc.oxidised, ...hc.reduced]) if (phaseOf(id) !== 'aq' && id !== 'water') layers.push(withPhase(id)); }   // the solvent is not written
  if (solutes.length) layers.push(solutes.join(', '));
  return role === 'anode' ? layers.join(' | ') : layers.reverse().join(' | ');
}
export const cellNotation = (anodeId, cathodeId) => `${halfNotation(anodeId, 'anode')} || ${halfNotation(cathodeId, 'cathode')}`;

/** Activity of a term in Q: concentrations for aqueous species (H⁺ and OH⁻ from the pH), 1 for solids, liquids and gases at 1 bar. */
export function activity(termId, { conc = {}, pH = 0 } = {}) {
  if (termId === 'proton') return Math.pow(10, -pH);
  if (termId === 'hydroxide') return Math.pow(10, pH - 14);
  if (termId === 'water' || termId === 'electron') return 1;
  if (phaseOf(termId) !== 'aq') return 1;
  const c = conc[termId];
  return c != null && c > 0 ? c : 1;
}

/**
 * The galvanic cell made by two couples: the higher E° is the cathode (reduction), the other the anode (oxidation);
 * the overall equation is the oriented sum of the two half-reactions. Returns E°cell, n, ΔG° (kJ/mol), ln K and log K,
 * the reaction quotient Q at the given concentrations / pH and the Nernst potential, the notation and both half-cells.
 */
export function cell(aId, bId, { conc = {}, pH = 0 } = {}) {
  const Ea = potentialOf(aId), Eb = potentialOf(bId);
  if (Ea == null || Eb == null) throw new Error(`cell(): both couples need a standard potential (${aId}, ${bId})`);
  if (aId === bId) throw new Error('cell(): a couple cannot be paired with itself');
  const cathode = Eb >= Ea ? bId : aId, anode = cathode === aId ? bId : aId;
  const eq = orientedOverall(anode, cathode);
  const n = eq.electrons;
  const E0 = potentialOf(cathode) - potentialOf(anode);
  const dG0 = (-n * F * E0) / 1000;
  const lnK = (n * F * E0) / (R * T), log10K = lnK / Math.LN10;
  const act = (t) => Math.pow(activity(t.id, { conc, pH }), t.n);
  const Q = eq.right.reduce((p, t) => p * act(t), 1) / eq.left.reduce((p, t) => p * act(t), 1);
  const E = E0 - (RT_OVER_F / n) * Math.log(Q);
  const solutes = [...new Set([...eq.left, ...eq.right].filter((t) => t.id !== 'proton' && t.id !== 'hydroxide' && t.id !== 'water' && phaseOf(t.id) === 'aq').map((t) => t.id))];
  const hasProton = [...eq.left, ...eq.right].some((t) => t.id === 'proton' || t.id === 'hydroxide');
  return {
    anode, cathode, swapped: cathode === aId, n, eq, E0, dG0, lnK, log10K, Q, E, conc, pH, solutes, hasProton,
    standard: Math.abs(E - E0) < 1e-12,
    notation: cellNotation(anode, cathode), half: { anode: halfCell(anode), cathode: halfCell(cathode) },
  };
}

/** LevelDiagram spec of the E° ladder: one level per couple at E = E°, strongest oxidant at the top. */
export function ladderSpec({ range = [-3.4, 3.2] } = {}) {
  return {
    columns: [{ id: 'ladder', label: 'E° / V vs SHE' }],
    levels: POTENTIAL_COUPLES.map((c) => ({ id: c.id, column: 'ladder', E: potentialOf(c.id), label: `${halfCell(c.id).formula} ${signed(potentialOf(c.id))}`, electrons: 0 })),
    yLabel: 'stronger oxidant →', range, unit: 'V',
  };
}
/** Number with a typographic minus, e.g. −212 */
export const minus = (s) => String(s).replace(/-/g, '−');
const SUPD = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
/** '1 M', '0.010 M', '1 × 10⁻⁷ M' */
export const fmtConc = (c) => { if (!(c > 0)) return '0 M'; if (c >= 1) return `${Number(c.toPrecision(2))} M`; if (c >= 0.01) return `${c.toPrecision(2)} M`; const e = Math.floor(Math.log10(c)), m = c / Math.pow(10, e); return `${Number(m.toPrecision(2))} × 10${String(e).replace(/./g, (ch) => SUPD[ch] || ch)} M`; };
export const signed = (x, d = 2) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x).toFixed(d)}`;
/** '1.5 × 10³⁷' style text for K. */
export function sciText(log10K) {
  if (!Number.isFinite(log10K)) return '∞';
  const e = Math.floor(log10K), m = Math.pow(10, log10K - e);
  const sup = (n) => String(n).replace(/-/g, '−').replace(/[0-9−]/g, (ch) => ({ '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '−': '⁻' }[ch]));
  return Math.abs(e) < 3 ? Math.pow(10, log10K).toPrecision(3) : `${m.toFixed(1)} × 10${sup(e)}`;
}

/** The cells named in TEXTBOOK_CELLS, computed from the table. */
export function textbookCells() {
  return Object.entries(TEXTBOOK_CELLS.values).map(([key, row]) => { const c = cell(row.anode, row.cathode); return { key, row, cell: c, ok: !c.swapped && Math.abs(c.E0 - row.E) < 0.0051 && c.n === row.n && c.notation === row.notation, anodeOk: c.anode === row.anode }; });
}

/**
 * Everything the card needs: the item couple, the partner (default: the standard hydrogen electrode, or copper for
 * hydrogen itself), the cell between them at the chosen concentrations and pH, and the ladder spec.
 */
export function buildCell(id, state = {}) {
  const item = coupleById(id);
  if (!item || potentialOf(id) == null) throw new Error(`buildCell(): unknown couple ${id}`);
  const partner = state.partner && potentialOf(state.partner) != null && state.partner !== id ? state.partner : id === 'hydrogen' ? 'copper' : 'hydrogen';
  const c = cell(id, partner, { conc: state.conc || {}, pH: state.pH ?? 0 });
  const hc = halfCell(id);
  return {
    item, id, partner, partnerCouple: coupleById(partner), half: hc, E0item: hc.E0, cell: c, ladder: ladderSpec(),
    role: c.anode === id ? 'anode' : 'cathode',
    title: `${c.notation} · E${c.standard ? '°' : ''} = ${signed(c.E)} V`,
    name: `${hc.formula} with ${halfCell(partner).formula}`,
  };
}
