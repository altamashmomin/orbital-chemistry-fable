import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fakeDom.js';
import { PAIRS, FACTORS, FACTOR_IDS, pairById, pkaOf, ka, equilibrium, ladderSpec, acidFrame, buildPair } from '../src/chem/acidsBases.js';
import { PKA, PKA_TABLE, RT_LN10_KJ } from '../src/chem/references/textbook.js';
import { bondLength } from '../src/chem/elements.js';
import { layoutLevels } from '../src/ui/levelDiagram.js';
import { validateCollection } from '../src/ui/collectionExplorer.js';
import { validateTopic } from '../src/topics/registry.js';
import { acidsBases } from '../src/topics/acids-bases/index.js';
import { INVARIANTS, GLOSSARY_TERMS } from '../src/topics/acids-bases/content.js';
import { ACTIVITIES, correctOption } from '../src/topics/acids-bases/activities.js';
import { makeAcidsCollection } from '../src/topics/acids-bases/panel.js';
import { GLOSSARY } from '../src/nexus/glossary.js';
import { FUNCTIONAL_GROUPS } from '../src/chem/functionalGroups.js';
import { isValidAudience, audienceOf } from '../src/chem/audience.js';
import { v } from '../src/chem/geometry.js';

test('pairs: every pKa is a table value, the ladder is sorted, the factors order as the textbooks say', () => {
  assert.ok(PAIRS.length >= 16);
  for (const p of PAIRS) { assert.ok(p.pka in PKA, `${p.id} cites a PKA key`); assert.equal(pkaOf(p.id), PKA[p.pka]); assert.ok(p.acid && p.base && p.name && p.baseName && p.factors.length && p.factors.every((f) => FACTOR_IDS.includes(f))); assert.ok([0, 1].includes(p.charge)); }
  for (let i = 1; i < PAIRS.length; i++) assert.ok(pkaOf(PAIRS[i].id) >= pkaOf(PAIRS[i - 1].id), `strongest first: ${PAIRS[i - 1].id} ≤ ${PAIRS[i].id}`);
  for (const [id, f] of Object.entries(FACTORS)) for (const order of f.orders) { const vals = order.map(pkaOf); for (let i = 1; i < vals.length; i++) assert.ok(vals[i] > vals[i - 1], `${id}: ${order.join(' < ')} (${vals.join(' < ')})`); for (const x of order) assert.ok(pairById(x), `${id}: ${x} is a pair`); }
  assert.ok(Math.abs(ka(4.76) - 1.74e-5) < 2e-7);
  assert.equal(PKA_TABLE.values, PKA); assert.ok(PKA_TABLE.unit && PKA_TABLE.source);
  assert.ok(Math.abs(RT_LN10_KJ - Math.LN10 * 8.314 * 298.15 / 1000) < 0.002, '2.303 RT at 298.15 K');
  const L = ladderSpec({ selected: 'water' });
  assert.equal(L.levels.length, PAIRS.length);
  assert.ok(layoutLevels(L, { width: 320, height: 440 }).levels.every((l) => Number.isFinite(l.y)));
});

test('equilibrium: K = 10^ΔpKa toward the weaker acid, ΔG° = −2.303RT log K', () => {
  const e = equilibrium('aceticAcid', 'water');
  assert.ok(Math.abs(e.logK - (15.7 - 4.76)) < 1e-9 && e.favoured === 'products' && Math.abs(e.deltaG + RT_LN10_KJ * e.logK) < 1e-9);
  assert.equal(e.equation, 'CH₃COOH + HO⁻ ⇌ CH₃COO⁻ + H₂O');
  const r = equilibrium('acetylene', 'water'); assert.equal(r.favoured, 'reactants'); assert.ok(Math.abs(r.logK + 9.3) < 1e-9);
  const even = equilibrium('ethanol', 'water'); assert.equal(even.favoured, 'reactants'); assert.ok(Math.abs(even.K - Math.pow(10, -0.3)) < 1e-9);
  assert.equal(equilibrium('water', 'ethanol').favoured, 'products');
  assert.equal(equilibrium('acetylene', 'acetonitrileLike' in PKA ? 'water' : 'water').acid.id, 'acetylene');
  assert.throws(() => equilibrium('nope', 'water'), /unknown pair/);
  assert.match(e.sentence, /products favoured/); assert.match(r.sentence, /cannot take the proton/);
});

test('acid frames: the proton is bonded at t = 0, departs 1.4 Å by t = 1, charges are conserved, cations lose their charge', () => {
  for (const p of PAIRS) {
    const a0 = acidFrame(p.id, 0), a1 = acidFrame(p.id, 1), half = acidFrame(p.id, 0.5);
    const at = (f, id) => f.frame.atoms.find((a) => a.id === id);
    const d0 = v.dist(at(a0, a0.acidH).pos, at(a0, a0.donor).pos), d1 = v.dist(at(a1, a1.acidH).pos, at(a1, a1.donor).pos);
    assert.ok(Math.abs(d0 - a0.length) < 1e-9 && Math.abs(d1 - d0 - 1.4) < 1e-9, `${p.id}: ${d0.toFixed(3)} → ${d1.toFixed(3)}`);
    if (p.build.protonate) assert.ok(Math.abs(a0.length - bondLength(at(a0, a0.donor).el, 'H', 1)) < 1e-9, `${p.id}: added proton at the table X–H length`);
    const q = (f) => f.frame.atoms.reduce((s, a) => s + (a.charge || 0), 0);
    assert.ok(Math.abs(q(a0) - p.charge) < 1e-9 && Math.abs(q(a1) - p.charge) < 1e-9 && Math.abs(q(half) - p.charge) < 1e-9, `${p.id}: charge conserved`);
    assert.equal(at(a1, a1.acidH).charge, 1); assert.equal(at(a1, a1.donor).charge, p.charge === 1 ? 0 : -1);
    assert.equal(a0.frame.atoms.length, a1.frame.atoms.length);
    const bond = (f) => f.frame.bonds.find((b) => (b.a === f.acidH && b.b === f.donor) || (b.b === f.acidH && b.a === f.donor));
    assert.equal(bond(a0).partial, 1); assert.ok(bond(a1).partial === 0 && bond(a1).ghost); assert.ok(Math.abs(bond(half).partial - 0.5) < 1e-9);
    assert.ok(a0.frame.atoms.every((a) => a.pos.every(Number.isFinite)));
    // no other atom sits on the proton's path
    for (const a of a1.frame.atoms) if (a.id !== a1.acidH && a.id !== a1.donor) assert.ok(v.dist(a.pos, at(a1, a1.acidH).pos) > 1.5, `${p.id}: ${a.id} clear of the departing proton`);
    assert.equal(acidFrame(p.id, 0).frame.atoms.length, a0.frame.atoms.length, 'the cached base frame is not mutated');
  }
  assert.throws(() => acidFrame('nope'), /unknown pair/);
  const b = buildPair('phenol', { t: 1, partner: 'ethanol' });
  assert.ok(b.title.includes('C₆H₅O⁻ + H⁺') && b.eq.base.id === 'ethanol' && b.partner.id === 'ethanol' && b.pka === 10);
  assert.equal(buildPair('water').partner.id, 'ethanol'); assert.equal(buildPair('ethanol').partner.id, 'water');
});

function resolves(href) {
  const [head, a, b] = href.replace(/^#/, '').split('/');
  const terms = new Set([...GLOSSARY.map((t) => t.id), ...GLOSSARY_TERMS.map((t) => t.id)]);
  if (head === 'glossary') return !a || terms.has(a);
  if (head === 'acids-bases') return (!a || !!pairById(a)) && (!b || (INVARIANTS[a] || []).some((x) => x.id === b));
  if (head === 'functional-groups') return (!a || !!FUNCTIONAL_GROUPS[a]) && (!b || FUNCTIONAL_GROUPS[a].invariants.some((x) => x.id === b));
  return false;
}

test('the topic, its collection, content, activities and links satisfy the contracts', () => {
  const restore = installFakeDom();
  try {
    assert.deepEqual(validateTopic(acidsBases), []);
    assert.ok(acidsBases.order > 17 && acidsBases.order < 20, 'between Conformations and the Reaction lab');
    const coll = makeAcidsCollection({ activityBlock: () => null });
    assert.deepEqual(validateCollection(coll), []);
    for (const p of PAIRS) {
      const invs = INVARIANTS[p.id]; assert.ok(invs && invs.length >= 2, `${p.id} cards`);
      const ids = new Set();
      for (const inv of invs) { assert.ok(inv.id && inv.title && inv.detail && !ids.has(inv.id)); ids.add(inv.id); assert.ok(isValidAudience(audienceOf(inv, 'invariants'))); for (const l of inv.links || []) assert.ok(resolves(l.href), `${p.id}/${inv.id}: ${l.href}`); if (inv.show?.partner) assert.ok(pairById(inv.show.partner) && inv.show.partner !== p.id, `${p.id}/${inv.id} partner`); }
      const state = coll.initialState(p); const built = coll.build(p, state);
      assert.ok(coll.card(p, state, built).length && coll.controls(p, state, { setState() {} }).length);
      const chip = coll.chips(p); assert.ok(chip.pattern && chip.name && chip.color);
    }
    const core = new Set(GLOSSARY.map((t) => t.id));
    for (const t of GLOSSARY_TERMS) { assert.ok(!core.has(t.id), `${t.id} is new`); for (const l of t.links) assert.ok(resolves(l.href), `glossary ${t.id}: ${l.href}`); }
    for (const e of acidsBases.index()) { assert.ok(e.title && e.href); assert.ok(resolves(e.href), `index ${e.href}`); }
    for (const act of ACTIVITIES) { assert.equal(act.options.filter((o) => o.correct).length, 1); assert.ok(correctOption(act) && pairById(act.item)); assert.ok(act.reveal().length > 80); assert.ok(INVARIANTS[act.show.item].some((x) => x.id === act.show.invariant)); }
    assert.match(ACTIVITIES[0].reveal(), /10\^6\.0 times more acidic/);
    assert.match(ACTIVITIES[1].reveal(), /K = 10\^-9\.3/);
    assert.match(ACTIVITIES[2].reveal(), /pKa -10 against 3\.2/);
  } finally { restore(); }
});
