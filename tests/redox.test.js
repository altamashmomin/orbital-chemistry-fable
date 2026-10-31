import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fakeDom.js';
import { assertNoClashes } from './helpers.js';
import { SPECIES, SPECIES_IDS, COUPLES, LADDERS, VALENCE_ELECTRONS, oxidationStates, lewisProblems, composition, totalCharge, speciesGraph, speciesFrame, labelledFrame, balance, isBalanced, keyChange, overall, bookkeeping, keyAtoms, buildCouple, coupleById, ladderLevels, osText, chargeSup } from '../src/chem/redox.js';
import { OXIDATION_STATE_RULES, OXIDATION_LEVELS, HALF_REACTIONS, REDOX_BOND_LENGTHS, DICHROMATE_BRIDGE_ANGLE, ELECTRONEGATIVITY, LONE_PAIR_ANGLES } from '../src/chem/references/textbook.js';
import { MEASURED_BONDS, MEASURED_ANGLES } from '../src/chem/references/measured.js';
import { FUNCTIONAL_GROUPS, FUNCTIONAL_GROUP_ORDER } from '../src/chem/functionalGroups.js';
import { buildMolecule } from '../src/chem/builder.js';
import { COMPLEXES, complexFrame as metalComplexFrame } from '../src/chem/transitionMetals.js';
import { v, DEG } from '../src/chem/geometry.js';
import { validateCollection } from '../src/ui/collectionExplorer.js';
import { validateTopic } from '../src/topics/registry.js';
import { redox } from '../src/topics/redox/index.js';
import { INVARIANTS, GLOSSARY_TERMS } from '../src/topics/redox/content.js';
import { ACTIVITIES, correctOption } from '../src/topics/redox/activities.js';
import { makeRedoxCollection, bookText } from '../src/topics/redox/panel.js';
import { GLOSSARY } from '../src/nexus/glossary.js';
import { isValidAudience, audienceOf } from '../src/chem/audience.js';
import { transitionMetals } from '../src/topics/transition-metals/index.js';
import { MECHANISMS } from '../src/chem/mechanisms/index.js';

const angle = (a, c, b) => Math.acos(Math.max(-1, Math.min(1, v.dot(v.norm(v.sub(a, c)), v.norm(v.sub(b, c)))))) / DEG;
const near = (x, y, tol = 1e-6) => Math.abs(x - y) < tol;

test('oxidation states: the rule on hand-checked molecules, both formulations agree, every drawn Lewis structure is consistent', () => {
  const g = (atoms, bonds) => ({ atoms, bonds });
  // water, hydroxide, hydronium: oxidation states do not change with protonation
  assert.equal(oxidationStates(g([{ id: 'O', el: 'O', lonePairs: 2 }, { id: 'H1', el: 'H' }, { id: 'H2', el: 'H' }], [{ a: 'O', b: 'H1', order: 1 }, { a: 'O', b: 'H2', order: 1 }])).get('O').os, -2);
  assert.equal(oxidationStates(g([{ id: 'O', el: 'O', lonePairs: 3, charge: -1 }, { id: 'H', el: 'H' }], [{ a: 'O', b: 'H', order: 1 }])).get('O').os, -2);
  assert.equal(oxidationStates(g([{ id: 'O', el: 'O', lonePairs: 1, charge: 1 }, { id: 'H1', el: 'H' }, { id: 'H2', el: 'H' }, { id: 'H3', el: 'H' }], [{ a: 'O', b: 'H1', order: 1 }, { a: 'O', b: 'H2', order: 1 }, { a: 'O', b: 'H3', order: 1 }])).get('O').os, -2);
  // CF₃COOH: the CF₃ carbon is +3, the carboxyl carbon +3; HCN: C +2, N −3; a bond between like atoms counts nothing
  const tfa = buildMolecule('carboxylicAcid', { R: { R1: 'CF3' } }); const os = oxidationStates(tfa);
  assert.equal(os.get('C').os, 3); assert.equal(os.get('R1.C').os, 3); assert.equal(os.get('O1').os, -2);
  const hcn = oxidationStates(buildMolecule('nitrile', { R: { R1: 'H' } })); assert.equal(hcn.get('C').os, 2); assert.equal(hcn.get('N').os, -3);
  // every species: total charge as stated, Lewis structure consistent, electron-count form equals the bond-sign form
  for (const id of SPECIES_IDS) {
    const graph = speciesGraph(id), o = oxidationStates(graph);
    assert.equal(totalCharge(graph), SPECIES[id].charge, `${id}: drawn charges sum to the species charge`);
    assert.deepEqual(lewisProblems(graph), [], `${id}: consistent Lewis structure`);
    for (const [aid, r] of o) { assert.ok(Number.isInteger(r.os), `${id}/${aid}`); if (r.osByCount != null) assert.equal(r.osByCount, r.os, `${id}/${aid}: V − 2LP − won equals q + Σ±order`); if (r.el === 'H') assert.ok(r.os === 1 || (r.os === 0 && graph.atoms.length === 2), `${id}: hydrogen is +1 (0 only in H₂)`); }
    const sum = [...o.values()].reduce((s, r) => s + r.os, 0); assert.equal(sum, SPECIES[id].charge, `${id}: Σ oxidation states = charge`);
  }
  // every functional-group default molecule and every complex ligand set is a consistent Lewis structure too
  for (const fg of FUNCTIONAL_GROUP_ORDER) { const mol = buildMolecule(fg); assert.deepEqual(lewisProblems(mol), [], `${FUNCTIONAL_GROUPS[fg].name}: Lewis`); const s = [...oxidationStates(mol).values()].reduce((a, r) => a + r.os, 0); assert.equal(s, mol.atoms.reduce((a, x) => a + (x.charge || 0), 0), `${fg}: Σ os = charge`); }
  // the textbook ladder rows
  for (const [k, row] of Object.entries(OXIDATION_LEVELS.values)) assert.equal(oxidationStates(speciesGraph(row.species)).get(row.atom).os, row.os, `OXIDATION_LEVELS.${k}`);
  for (const l of LADDERS) { const lv = ladderLevels(l.id); for (let i = 1; i < lv.length; i++) assert.equal(lv[i].os - lv[i - 1].os, 2, `${l.id}: two electrons a rung`); }
  assert.ok(OXIDATION_STATE_RULES.source && OXIDATION_LEVELS.source && HALF_REACTIONS.source);
  for (const el of ['H', 'C', 'N', 'O', 'S', 'Cl', 'Br', 'Mn', 'Cr', 'Fe', 'Cu', 'Zn']) assert.ok(ELECTRONEGATIVITY[el] > 0 && VALENCE_ELECTRONS[el] > 0, el);
  assert.equal(osText(-1), '−1'); assert.equal(osText(0), '0'); assert.equal(osText(7), '+7'); assert.equal(chargeSup(-2), '²⁻'); assert.equal(chargeSup(1), '⁺'); assert.equal(chargeSup(0), '');
  assert.throws(() => oxidationStates(g([{ id: 'X', el: 'Xx' }, { id: 'H', el: 'H' }], [{ a: 'X', b: 'H', order: 1 }])), /electronegativity/);
  assert.throws(() => speciesGraph('nope'), /unknown species/);
});

test('balancing: every couple balances in acid and base, the electrons equal the key-element change, the textbook forms are reproduced, overall equations balance', () => {
  for (const c of COUPLES) {
    const a = balance(c, 'acid'), b = balance(c, 'base'), k = keyChange(c);
    assert.ok(isBalanced(a) && isBalanced(b), `${c.id}: atoms and charge balance`);
    assert.equal(a.electrons, b.electrons, `${c.id}: the medium does not change the electron count`);
    assert.equal(a.electrons, k.lost, `${c.id}: e⁻ in the half-reaction = change in Σ oxidation state of ${c.key.join('/')}`);
    assert.ok(!b.left.some((t) => t.id === 'proton') && !b.right.some((t) => t.id === 'proton'), `${c.id}: no H⁺ in base`);
    assert.ok(!a.left.some((t) => t.id === 'hydroxide') && !a.right.some((t) => t.id === 'hydroxide'), `${c.id}: no OH⁻ in acid`);
    assert.ok(!(a.left.some((t) => t.id === 'water') && a.right.some((t) => t.id === 'water')), `${c.id}: water on one side only`);
    for (const { sp } of [...c.from, ...c.to]) for (const aid of keyAtoms(c, sp)) assert.ok(speciesGraph(sp).atoms.some((x) => x.id === aid), `${c.id}: key atom ${aid} exists in ${sp}`);
    // the key elements appear only in the listed species, never in the balancer's water / protons / hydroxide
    assert.ok(c.key.every((el) => !['H', 'O'].includes(el)) || c.id === 'hydrogen' || c.id === 'oxygen' || c.id.startsWith('peroxide'), `${c.id} key`);
  }
  for (const [k, row] of Object.entries(HALF_REACTIONS.values)) {
    const c = coupleById(row.couple); assert.ok(c, `HALF_REACTIONS.${k} names a couple`);
    const eq = balance(c, row.medium || 'acid');
    assert.equal(eq.electrons > 0 ? eq.reverseText : eq.text, row.text, `HALF_REACTIONS.${k}`);
    assert.equal(Math.abs(eq.electrons), row.n, `${k}: ${row.n} e⁻`);
  }
  const none = COUPLES.filter((c) => balance(c).electrons === 0).map((c) => c.id);
  assert.deepEqual(none, ['substitution', 'elimination', 'hydration'], 'the Reaction lab reactions and hydration are not redox');
  assert.ok(MECHANISMS.sn2 && MECHANISMS.e2, 'the mechanisms the links point at exist');
  // E2: one carbon down, one up, net zero
  const be = oxidationStates(speciesGraph('bromoethane')), et = oxidationStates(speciesGraph('ethene'));
  assert.equal(be.get('R1.C1').os, -1); assert.equal(be.get('R1.C2').os, -3); assert.equal(et.get('C1').os, -2); assert.equal(et.get('C2').os, -2);
  // overall equations
  const ov = overall('ethanol', 'dichromate');
  assert.ok(ov.balanced && ov.multipliers.ethanol === 3 && ov.multipliers.dichromate === 1 && ov.electrons === 6 && !ov.partnerReversed);
  assert.equal(ov.text, '3 CH₃CH₂OH + Cr₂O₇²⁻ + 8 H⁺ → 3 CH₃CHO + 2 Cr³⁺ + 7 H₂O');
  const dan = overall('zinc', 'copper'); assert.equal(dan.text, 'Zn + Cu²⁺ → Zn²⁺ + Cu');
  const dis = overall('peroxideOxidised', 'peroxideReduced'); assert.equal(dis.text, '2 H₂O₂ → O₂ + 2 H₂O'); assert.ok(dis.balanced);
  const rev = overall('iron', 'copper'); assert.ok(rev.partnerReversed && rev.text === '2 Fe³⁺ + Cu → 2 Fe²⁺ + Cu²⁺');
  assert.equal(overall('substitution', 'zinc'), null);
  assert.throws(() => overall('nope', 'zinc'), /unknown couple/);
  assert.throws(() => balance({ from: [{ sp: 'chlorine', n: 1 }], to: [{ sp: 'chloride', n: 1 }] }), /Cl does not balance/);
  for (const c of COUPLES) for (const p of COUPLES) if (c !== p && balance(c).electrons && balance(p).electrons) assert.ok(overall(c.id, p.id).balanced, `${c.id} + ${p.id}`);
});

test('frames: measured lengths and the bridge angle where cited, ideal angles elsewhere, labels are oxidation states, no clashes', () => {
  for (const id of SPECIES_IDS) {
    const f = speciesFrame(id), lf = labelledFrame(id), o = oxidationStates(speciesGraph(id));
    assert.ok(f.atoms.every((a) => a.pos.every(Number.isFinite)), `${id}: finite`);
    assert.equal(f.atoms.length, speciesGraph(id).atoms.length);
    if (f.atoms.length > 1) assertNoClashes(f, id, 1.6);
    for (const a of lf.atoms) if (a.el !== 'H' || lf.atoms.length <= 3) assert.equal(a.label, osText(o.get(a.id).os), `${id}/${a.id} label`);
    for (const b of f.bonds) if (b.length != null) { assert.ok(b.ref && MEASURED_BONDS[b.ref], `${id}: ${b.a}–${b.b} cites a measured row`); const A = f.atoms.find((x) => x.id === b.a).pos, B = f.atoms.find((x) => x.id === b.b).pos; assert.ok(near(v.dist(A, B), b.length, 1e-6), `${id}: ${b.a}–${b.b} drawn at ${b.length}`); }
    lf.atoms[0].pos[0] = 99; assert.notEqual(speciesFrame(id).atoms[0].pos[0], 99, `${id}: the cache is not mutated`);
  }
  for (const [k, row] of Object.entries(REDOX_BOND_LENGTHS)) assert.ok(MEASURED_BONDS[row.ref] && near(MEASURED_BONDS[row.ref].value, row.length, 1e-9), `REDOX_BOND_LENGTHS.${k} equals the oracle`);
  assert.ok(near(MEASURED_ANGLES[DICHROMATE_BRIDGE_ANGLE.ref].value, DICHROMATE_BRIDGE_ANGLE.angle, 1e-9) && LONE_PAIR_ANGLES['O/2/2/H,O'].ref === 'hydrogenPeroxide_HOO');
  const d = speciesFrame('dichromate'), P = (id) => d.atoms.find((x) => x.id === id).pos;
  assert.ok(near(angle(P('Cr1'), P('Ob'), P('Cr2')), 126, 1e-6), 'Cr–O–Cr at the measured mean');
  for (const cr of ['Cr1', 'Cr2']) { const os = d.bonds.filter((b) => b.a === cr).map((b) => b.b); for (let i = 0; i < os.length; i++) for (let j = i + 1; j < os.length; j++) assert.ok(near(angle(P(os[i]), P(cr), P(os[j])), 109.4712, 1e-3), `${cr}: ideal O–Cr–O`); }
  const m = speciesFrame('permanganate'), Q = (id) => m.atoms.find((x) => x.id === id).pos;
  for (const [a, b] of [['O1', 'O2'], ['O1', 'O4'], ['O3', 'O4']]) assert.ok(near(angle(Q(a), Q('Mn'), Q(b)), 109.4712, 1e-3));
  const p = speciesFrame('hydrogenPeroxide'), R = (id) => p.atoms.find((x) => x.id === id).pos;
  assert.ok(near(angle(R('H1'), R('O1'), R('O2')), 94.8, 0.05) && near(v.dist(R('O1'), R('O2')), 1.475, 1e-6), 'H₂O₂ measured angle and O–O');
  assert.equal(speciesFrame('iron3').atoms.length, 1); assert.equal(labelledFrame('iron3').atoms[0].label, '+3'); assert.equal(labelledFrame('dihydrogen').atoms[0].label, '0');
  assert.equal(labelledFrame('ethanol').atoms.find((a) => a.id === 'R1.C1').label, '−1');
});

test('build: the card facts, bookkeeping text, ladders, defaults and what-if states', () => {
  const b = buildCouple('ethanol');
  assert.ok(b.kind === 'oxidation' && b.n === 2 && b.side === 'from' && b.shownId === 'ethanol' && b.partner === 'permanganate' && b.overall.balanced);
  assert.equal(b.title, 'CH₃CH₂OH → CH₃CHO · 2 e⁻ lost');
  assert.deepEqual(b.keyAtoms, ['R1.C1']); assert.deepEqual(b.book[0], { id: 'R1.C1', el: 'C', os: -1, toH: 2, toHetero: 1, toSame: 1 });
  assert.equal(bookText(b.book[0], b.frame.atoms), '2 bonds to H (−2), 1 to a more electronegative atom (+1), 1 to C (0) = −1');
  const to = buildCouple('ethanol', { side: 'to', medium: 'base', partner: 'dichromate' });
  assert.ok(to.shownId === 'acetaldehyde' && to.half.medium === 'base' && to.partner === 'dichromate' && to.overall.multipliers.ethanol === 3);
  assert.equal(buildCouple('ethanol', { partner: 'ethanol' }).partner, 'permanganate', 'a couple is not its own partner');
  assert.equal(buildCouple('ethanol', { partner: 'substitution' }).overall, null, 'a non-redox partner gives no overall equation');
  const n = buildCouple('nitrobenzene'); assert.ok(n.kind === 'reduction' && n.n === 6 && n.partner === 'zinc' && /formal charge \+1/.test(bookText(n.book[0], n.frame.atoms)));
  const s = buildCouple('substitution'); assert.ok(s.kind === 'none' && s.n === 0 && s.partner === null && s.overall === null && /not a redox reaction/.test(s.changeText) && s.title.endsWith('· not redox'));
  const hy = buildCouple('hydrogenation'); assert.ok(hy.partner === 'hydrogen' && hy.overall.text === 'C₂H₄ + H₂ → C₂H₆');
  const z = buildCouple('zinc'); assert.ok(z.kind === 'oxidation' && z.partner === 'permanganate' && buildCouple('copper').partner === 'zinc');
  assert.equal(bookText(bookkeeping('iron3', ['Fe'])[0], speciesFrame('iron3').atoms), 'no bonds: the charge is the oxidation state = +3');
  assert.equal(buildCouple('dichromate', { index: 5 }).index, 0, 'index clamps');
  assert.throws(() => buildCouple('nope'), /unknown couple/);
  assert.equal(ladderLevels('c1').map((r) => r.os).join(','), '-4,-2,0,2,4'); assert.throws(() => ladderLevels('nope'), /unknown ladder/);
});

function resolves(href) {
  const [head, a, b] = href.replace(/^#/, '').split('/');
  const terms = new Set([...GLOSSARY.map((t) => t.id), ...GLOSSARY_TERMS.map((t) => t.id), ...transitionMetals.glossary.map((t) => t.id)]);
  if (head === 'glossary') return !a || terms.has(a);
  if (head === 'redox') return (!a || !!coupleById(a)) && (!b || (INVARIANTS[a] || []).some((x) => x.id === b));
  if (head === 'functional-groups') return !a || (!!FUNCTIONAL_GROUPS[a] && (!b || FUNCTIONAL_GROUPS[a].invariants.some((x) => x.id === b)));
  if (head === 'mechanisms') return !a || !!MECHANISMS[a];
  if (head === 'transition-metals') return !a || COMPLEXES.some((c) => c.id === a);
  return false;
}

test('the topic, its collection, content, activities and links satisfy the contracts', () => {
  const restore = installFakeDom();
  try {
    assert.deepEqual(validateTopic(redox), []);
    assert.ok(redox.order > 35 && redox.order < 40, 'between Molecular orbitals and Transition metals');
    const coll = makeRedoxCollection({ activityBlock: () => null });
    assert.deepEqual(validateCollection(coll), []);
    for (const c of COUPLES) {
      const invs = INVARIANTS[c.id]; assert.ok(invs && invs.length >= 1, `${c.id} cards`);
      const ids = new Set();
      for (const inv of invs) {
        assert.ok(inv.id && inv.title && inv.detail && !ids.has(inv.id)); ids.add(inv.id);
        assert.ok(isValidAudience(audienceOf(inv, 'invariants')));
        for (const l of inv.links || []) assert.ok(resolves(l.href), `${c.id}/${inv.id}: ${l.href}`);
        if (inv.show?.side) assert.ok(c[inv.show.side] && c[inv.show.side][inv.show.index || 0], `${c.id}/${inv.id} side`);
        if (inv.show?.partner) assert.ok(coupleById(inv.show.partner) && balance(coupleById(inv.show.partner)).electrons && balance(c).electrons, `${c.id}/${inv.id} partner`);
        if (inv.show?.medium) assert.ok(['acid', 'base'].includes(inv.show.medium) && balance(c).electrons, `${c.id}/${inv.id} medium`);
      }
      const state = coll.initialState(c); const built = coll.build(c, state);
      const liveRows = []; const controls = coll.controls(c, state, { setState() {}, live: (fn) => { liveRows.push(...fn(state, built)); return { live: true }; } });
      assert.ok(coll.card(c, state, built).length && controls.length >= 2 && liveRows.length >= (built.kind === 'none' ? 1 : 3), `${c.id}: controls`);
      const chip = coll.chips(c); assert.ok(chip.pattern && chip.name && chip.color);
    }
    const core = new Set(GLOSSARY.map((t) => t.id));
    for (const t of GLOSSARY_TERMS) { assert.ok(!core.has(t.id), `${t.id} is new`); for (const l of t.links) assert.ok(resolves(l.href), `glossary ${t.id}: ${l.href}`); }
    for (const e of redox.index()) { assert.ok(e.title && e.href); assert.ok(resolves(e.href), `index ${e.href}`); }
    for (const act of ACTIVITIES) { assert.equal(act.options.filter((o) => o.correct).length, 1); assert.ok(correctOption(act) && coupleById(act.item)); assert.ok(act.reveal().length > 80); assert.ok(INVARIANTS[act.show.item].some((x) => x.id === act.show.invariant)); }
    assert.match(ACTIVITIES[0].reveal(), /−1 to \+1: 2 electrons lost/);
    assert.match(ACTIVITIES[2].reveal(), /MnO₄⁻ \+ 8 H⁺ \+ 5 e⁻ → Mn²⁺ \+ 4 H₂O/);
    assert.match(ACTIVITIES[3].reveal(), /2 H₂O₂ → O₂ \+ 2 H₂O/);
  } finally { restore(); }
});
