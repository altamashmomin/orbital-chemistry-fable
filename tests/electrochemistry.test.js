import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fakeDom.js';
import { POTENTIAL_COUPLES, POTENTIAL_IDS, potentialOf, phaseOf, halfCell, halfNotation, cellNotation, activity, cell, ladderSpec, signed, sciText, textbookCells, buildCell, F, R, T, RT_OVER_F } from '../src/chem/electrochemistry.js';
import { COUPLES, SPECIES, coupleById, balance, isBalanced, orientedOverall, overall } from '../src/chem/redox.js';
import { STANDARD_POTENTIALS, TEXTBOOK_CELLS, HALF_REACTIONS, ELECTROCHEMICAL_CONSTANTS } from '../src/chem/references/textbook.js';
import { layoutLevels } from '../src/ui/levelDiagram.js';
import { validateCollection } from '../src/ui/collectionExplorer.js';
import { validateTopic } from '../src/topics/registry.js';
import { electrochemistry } from '../src/topics/electrochemistry/index.js';
import { INVARIANTS, GLOSSARY_TERMS } from '../src/topics/electrochemistry/content.js';
import { ACTIVITIES, correctOption } from '../src/topics/electrochemistry/activities.js';
import { makeCellsCollection } from '../src/topics/electrochemistry/panel.js';
import { drawCell } from '../src/topics/electrochemistry/cellCanvas.js';
import { GLOSSARY } from '../src/nexus/glossary.js';
import { redox } from '../src/topics/redox/index.js';
import { COMPLEXES } from '../src/chem/transitionMetals.js';
import { isValidAudience, audienceOf } from '../src/chem/audience.js';

const near = (x, y, tol = 1e-9) => Math.abs(x - y) < tol;

test('tables: every potential names a couple with a textbook half-reaction, the ladder is in textbook order, SHE is zero', () => {
  assert.ok(STANDARD_POTENTIALS.unit && STANDARD_POTENTIALS.source && TEXTBOOK_CELLS.source && ELECTROCHEMICAL_CONSTANTS.source);
  assert.equal(POTENTIAL_COUPLES.length, 20);
  for (const id of Object.keys(STANDARD_POTENTIALS.values)) {
    assert.ok(coupleById(id), `${id} is a couple`);
    assert.ok(Object.values(HALF_REACTIONS.values).some((r) => r.couple === id), `${id} has a textbook half-reaction`);
    assert.ok(balance(coupleById(id)).electrons !== 0, `${id} is a redox couple`);
  }
  assert.equal(potentialOf('hydrogen'), 0);
  assert.equal(potentialOf('substitution'), null);
  const E = potentialOf;
  assert.ok(E('fluorine') > E('chlorine') && E('chlorine') > E('bromine') && E('bromine') > E('iodine'), 'halogens');
  for (const [a, b] of [['lithium', 'magnesium'], ['magnesium', 'aluminium'], ['aluminium', 'zinc'], ['zinc', 'ironMetal'], ['ironMetal', 'nickel'], ['nickel', 'lead'], ['lead', 'hydrogen'], ['hydrogen', 'copper'], ['copper', 'silver']]) assert.ok(E(a) < E(b), `${a} below ${b}`);
  assert.ok(E('peroxideReduced') > E('permanganate') && E('permanganate') > E('dichromate') && E('oxygen') > E('iron') && E('peroxideOxidised') < E('oxygen'));
  assert.deepEqual(POTENTIAL_IDS.slice(0, 3), ['fluorine', 'peroxideReduced', 'permanganate']); assert.equal(POTENTIAL_IDS.at(-1), 'lithium');
  assert.ok(near(F, 96485.33212) && near(R, 8.314462618) && near(T, 298.15) && near(RT_OVER_F, 0.025693, 1e-6));
  assert.ok(near(RT_OVER_F * Math.LN10, 0.05916, 1e-5), 'the 59 mV per decade');
});

test('half-cells and notation: electrodes, phases, the textbook strings', () => {
  for (const id of POTENTIAL_IDS) {
    const hc = halfCell(id);
    assert.ok(hc.n >= 1 && hc.reduction.electrons < 0 && hc.text.includes('e⁻ →'), `${id} written as a reduction`);
    assert.ok(hc.electrode.kind === 'metal' ? phaseOf(hc.electrode.species) === 's' : hc.electrode.formula === 'Pt', `${id} electrode`);
    assert.ok(halfNotation(id, 'anode').split(' | ').length >= 2 && halfNotation(id, 'cathode').endsWith(hc.electrode.kind === 'metal' ? `${hc.electrode.formula}(s)` : 'Pt(s)'), `${id} notation ends in the electrode`);
  }
  assert.equal(phaseOf('copper'), 's'); assert.equal(phaseOf('copper2'), 'aq'); assert.equal(phaseOf('dihydrogen'), 'g'); assert.equal(phaseOf('bromine'), 'l'); assert.equal(phaseOf('iodine'), 's'); assert.equal(phaseOf('water'), 'l'); assert.equal(phaseOf('hydrogenPeroxide'), 'aq'); assert.equal(phaseOf('proton'), 'aq');
  assert.throws(() => phaseOf('nope'), /unknown species/);
  assert.equal(halfCell('copper').electrode.species, 'copper'); assert.equal(halfCell('iron').electrode.kind, 'inert'); assert.equal(halfCell('hydrogen').gas, 'dihydrogen');
  assert.equal(halfCell('zinc').formula, 'Zn²⁺/Zn', 'a couple written as an oxidation still reads oxidised/reduced');
  assert.equal(cellNotation('zinc', 'copper'), 'Zn(s) | Zn²⁺(aq) || Cu²⁺(aq) | Cu(s)');
  assert.equal(cellNotation('hydrogen', 'oxygen'), 'Pt(s) | H₂(g) | H⁺(aq) || H⁺(aq) | O₂(g) | Pt(s)');
  assert.equal(halfNotation('bromine', 'anode'), 'Pt(s) | Br₂(l) | Br⁻(aq)'); assert.equal(halfNotation('iron', 'cathode'), 'Fe³⁺(aq), Fe²⁺(aq) | Pt(s)');
  assert.throws(() => halfCell('substitution'), /no standard potential/); assert.throws(() => halfCell('nope'), /unknown couple/);
});

test('cells: the higher couple is the cathode, textbook E°cell / n / notation reproduced, the identities and Nernst behave', () => {
  const tb = textbookCells();
  assert.equal(tb.length, 6);
  for (const t of tb) assert.ok(t.ok && t.anodeOk, `${t.key}: ${t.cell.E0.toFixed(2)} V, n = ${t.cell.n}, ${t.cell.notation}`);
  const d = cell('zinc', 'copper');
  assert.ok(d.cathode === 'copper' && d.anode === 'zinc' && !d.swapped && near(d.E0, 1.10, 1e-9) && d.n === 2 && d.eq.text === 'Zn + Cu²⁺ → Zn²⁺ + Cu');
  assert.ok(Math.abs(d.dG0 + 212.3) < 0.2 && Math.abs(d.log10K - 37.2) < 0.1 && sciText(d.log10K) === '1.5 × 10³⁷', 'Atkins: ΔG° = −212 kJ/mol, K = 1.5 × 10³⁷');
  assert.ok(d.standard && near(d.E, d.E0) && d.Q === 1 && !d.hasProton && [...d.solutes].sort().join() === 'copper2,zinc2');
  const same = cell('copper', 'zinc'); assert.ok(same.swapped && same.cathode === 'copper' && near(same.E0, d.E0), 'order of arguments does not matter');
  // Nernst: dilute a reactant and E falls by (RT/nF) ln Q; the activity rules
  const dil = cell('zinc', 'copper', { conc: { copper2: 0.01 } });
  assert.ok(near(dil.Q, 100) && near(dil.E, 1.10 - (RT_OVER_F / 2) * Math.log(100)) && Math.abs(dil.E - 1.041) < 0.001 && !dil.standard);
  assert.ok(near(cell('zinc', 'copper', { conc: { zinc2: 0.01 } }).E, 1.10 + (RT_OVER_F / 2) * Math.log(100)), 'diluting a product raises E');
  assert.equal(activity('copper'), 1); assert.equal(activity('dihydrogen'), 1); assert.equal(activity('water'), 1); assert.ok(near(activity('proton', { pH: 3 }), 1e-3)); assert.ok(near(activity('hydroxide', { pH: 11 }), 1e-3)); assert.equal(activity('copper2', { conc: { copper2: 0.2 } }), 0.2); assert.equal(activity('copper2', { conc: { copper2: 0 } }), 1);
  // a hydrogen electrode is a pH meter: 59 mV per unit
  const ph = cell('hydrogen', 'copper', { pH: 4 }); assert.ok(ph.hasProton && Math.abs((ph.E - 0.34) - 4 * 0.05916) < 1e-3 && ph.cathode === 'copper', 'H⁺ is a product of H₂ + Cu²⁺ → 2 H⁺ + Cu, so raising the pH raises E');
  // permanganate: 8 H⁺ per 5 e⁻ → 0.0947 V per pH unit against a pH-independent couple
  const p0 = cell('iron', 'permanganate'), p1 = cell('iron', 'permanganate', { pH: 1 });
  assert.ok(near(p0.E0, 0.74, 1e-9) && p0.n === 5 && Math.abs((p0.E - p1.E) - 8 * 0.05916 / 5) < 1e-3);
  // every pair: balanced, cathode = higher E°, E° positive, overall oriented so the cathode is reduced
  for (const a of POTENTIAL_IDS) for (const b of POTENTIAL_IDS) if (a < b) {
    const c = cell(a, b);
    assert.ok(c.E0 >= 0 && c.cathode === (potentialOf(a) >= potentialOf(b) ? a : b) && isBalanced(c.eq) && c.eq.reduction === c.cathode && c.eq.oxidation === c.anode, `${a} / ${b}`);
    assert.ok(near(c.dG0, (-c.n * F * c.E0) / 1000) && near(c.lnK, (c.n * F * c.E0) / (R * T)) && c.notation.includes(' || '));
  }
  assert.throws(() => cell('zinc', 'zinc'), /itself/); assert.throws(() => cell('zinc', 'substitution'), /standard potential/);
  // orientedOverall vs overall: the Daniell direction either way round
  assert.equal(orientedOverall('zinc', 'copper').text, 'Zn + Cu²⁺ → Zn²⁺ + Cu'); assert.equal(orientedOverall('copper', 'zinc').text, 'Cu + Zn²⁺ → Cu²⁺ + Zn'); assert.ok(overall('zinc', 'copper').balanced);
  assert.equal(orientedOverall('substitution', 'zinc'), null); assert.throws(() => orientedOverall('nope', 'zinc'), /unknown couple/);
  assert.equal(signed(0), '0.00'); assert.equal(signed(-0.76), '−0.76'); assert.equal(signed(1.1), '+1.10'); assert.equal(sciText(2), '100'); assert.equal(sciText(-5.3), '5.0 × 10⁻⁶');
});

test('build, ladder and the canvas drawing', () => {
  const b = buildCell('zinc');
  assert.ok(b.partner === 'hydrogen' && b.role === 'anode' && b.cell.E0 === 0.76 && b.title === 'Zn(s) | Zn²⁺(aq) || H⁺(aq) | H₂(g) | Pt(s) · E° = +0.76 V');
  assert.equal(buildCell('hydrogen').partner, 'copper'); assert.equal(buildCell('zinc', { partner: 'zinc' }).partner, 'hydrogen'); assert.equal(buildCell('zinc', { partner: 'substitution' }).partner, 'hydrogen');
  const dil = buildCell('zinc', { partner: 'copper', conc: { copper2: 0.01 } }); assert.ok(dil.title.startsWith('Zn(s) | Zn²⁺(aq) || Cu²⁺(aq) | Cu(s) · E = +1.04'));
  assert.throws(() => buildCell('substitution'), /unknown couple/);
  const spec = ladderSpec();
  assert.equal(spec.levels.length, 20); assert.ok(spec.levels.every((l) => l.E === potentialOf(l.id) && l.label.includes(signed(l.E))));
  assert.ok(layoutLevels(spec, { width: 320, height: 460 }).levels.every((l) => Number.isFinite(l.y)));
  // the drawing runs against a stub 2D context and touches the labels the cell carries
  const calls = [];
  const ctx = new Proxy({}, { get: (_, k) => (k === 'measureText' ? () => ({ width: 10 }) : (...args) => { calls.push([k, ...args]); }), set: () => true });
  const canvas = { clientWidth: 640, clientHeight: 420, width: 0, height: 0, getContext: () => ctx };
  drawCell(canvas, buildCell('zinc', { partner: 'copper' }).cell, { dpr: 1, colors: { accent: '#0', accent2: '#0', muted: '#0', text: '#0', line2: '#0', bad: '#0', panel: '#fff' } });
  const texts = calls.filter((c) => c[0] === 'fillText').map((c) => c[1]);
  assert.ok(texts.includes('Zn(s)') && texts.includes('Cu(s)') && texts.includes('+1.10 V') && texts.includes('Zn(s) | Zn²⁺(aq) || Cu²⁺(aq) | Cu(s)') && texts.some((t) => t.startsWith('anode (−)')) && texts.some((t) => t.startsWith('cathode (+)')));
  assert.ok(canvas.width === 640 && canvas.height === 420);
  drawCell(null, null); drawCell(canvas, null);
});

function resolves(href) {
  const [head, a, b] = href.replace(/^#/, '').split('/');
  const terms = new Set([...GLOSSARY.map((t) => t.id), ...GLOSSARY_TERMS.map((t) => t.id), ...redox.glossary.map((t) => t.id)]);
  if (head === 'glossary') return !a || terms.has(a);
  if (head === 'electrochemistry') return (!a || potentialOf(a) != null) && (!b || (INVARIANTS[a] || []).some((x) => x.id === b));
  if (head === 'redox') return !a || !!coupleById(a);
  if (head === 'transition-metals') return !a || COMPLEXES.some((c) => c.id === a);
  return false;
}

test('the topic, its collection, content, activities and links satisfy the contracts', () => {
  const restore = installFakeDom();
  try {
    assert.deepEqual(validateTopic(electrochemistry), []);
    assert.ok(electrochemistry.order > redox.order && electrochemistry.order < 40 && electrochemistry.workspace.kind === 'canvas');
    const coll = makeCellsCollection({ activityBlock: () => null });
    assert.deepEqual(validateCollection(coll), []);
    for (const c of POTENTIAL_COUPLES) {
      const invs = INVARIANTS[c.id]; assert.ok(invs && invs.length >= 1, `${c.id} cards`);
      const ids = new Set();
      for (const inv of invs) {
        assert.ok(inv.id && inv.title && inv.detail && !ids.has(inv.id)); ids.add(inv.id);
        assert.ok(isValidAudience(audienceOf(inv, 'invariants')));
        for (const l of inv.links || []) assert.ok(resolves(l.href), `${c.id}/${inv.id}: ${l.href}`);
        if (inv.show?.partner) assert.ok(potentialOf(inv.show.partner) != null && inv.show.partner !== c.id, `${c.id}/${inv.id} partner`);
        if (inv.show?.conc) for (const k of Object.keys(inv.show.conc)) assert.ok(cell(c.id, inv.show.partner).solutes.includes(k), `${c.id}/${inv.id}: ${k} is a solute of that cell`);
        if (inv.show?.pH != null) assert.ok(cell(c.id, inv.show.partner).hasProton, `${c.id}/${inv.id}: pH matters in that cell`);
        // the potential quoted in the title is the table's
        const m = inv.title.match(/([+−]\d\.\d\d) V/); if (m) assert.equal(m[1], signed(potentialOf(c.id)), `${c.id}/${inv.id} quotes its own E°`);
      }
      const state = coll.initialState(c); const built = coll.build(c, state);
      const liveRows = []; const controls = coll.controls(c, state, { setState() {}, live: (fn) => { liveRows.push(...fn(state, built)); return { live: true }; } });
      assert.ok(coll.card(c, state, built).length && controls.length >= 2 && liveRows.length >= 2 + built.cell.solutes.length, `${c.id}: controls`);
      const chip = coll.chips(c); assert.ok(chip.pattern && chip.name && chip.color);
    }
    const core = new Set([...GLOSSARY.map((t) => t.id), ...redox.glossary.map((t) => t.id)]);
    for (const t of GLOSSARY_TERMS) { assert.ok(!core.has(t.id), `${t.id} is new`); for (const l of t.links) assert.ok(resolves(l.href), `glossary ${t.id}: ${l.href}`); }
    for (const e of electrochemistry.index()) { assert.ok(e.title && e.href); assert.ok(resolves(e.href), `index ${e.href}`); }
    for (const act of ACTIVITIES) { assert.equal(act.options.filter((o) => o.correct).length, 1); assert.ok(correctOption(act) && potentialOf(act.item) != null); assert.ok(act.reveal().length > 80); assert.ok(INVARIANTS[act.show.item].some((x) => x.id === act.show.invariant)); }
    assert.match(ACTIVITIES[0].reveal(), /\+0\.34 − \(−0\.76\) = \+1\.10 V/);
    assert.match(ACTIVITIES[2].reveal(), /−89 kJ per mole of copper/);
    assert.match(ACTIVITIES[3].reveal(), /drops to 1\.04 V/);
  } finally { restore(); }
});
