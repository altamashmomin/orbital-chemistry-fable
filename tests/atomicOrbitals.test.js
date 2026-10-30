import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fakeDom.js';
import { ORBITAL_ITEMS, itemById, FAMILIES, buildItem, radialDistribution, hydrogenLevel, HYBRIDS, hybridOrbital, hybridLobeDirection, angleBetween, hybridChecks, PERIODIC, MAX_Z, electronConfiguration, configurationAscii, AUFBAU_ORDER } from '../src/chem/atomicOrbitals.js';
import { HYDROGEN_ENERGY, GROUND_STATE_CONFIGURATIONS, AUFBAU_EXCEPTIONS, IDEAL_ANGLES } from '../src/chem/references/textbook.js';
import { sampleGrid, gridProbability, radialNodes, angularNodes } from '../src/chem/orbitals.js';
import { layoutLevels } from '../src/ui/levelDiagram.js';
import { validateCollection } from '../src/ui/collectionExplorer.js';
import { validateTopic } from '../src/topics/registry.js';
import { atomicOrbitals } from '../src/topics/atomic-orbitals/index.js';
import { INVARIANTS, GLOSSARY_TERMS } from '../src/topics/atomic-orbitals/content.js';
import { ACTIVITIES, correctOption } from '../src/topics/atomic-orbitals/activities.js';
import { makeOrbitalsCollection, drawRadialDistribution } from '../src/topics/atomic-orbitals/panel.js';
import { GLOSSARY } from '../src/nexus/glossary.js';
import { FUNCTIONAL_GROUPS } from '../src/chem/functionalGroups.js';
import { shapeById } from '../src/chem/shapes.js';
import { isValidAudience, audienceOf } from '../src/chem/audience.js';

test('the gallery: quantum numbers, node counts, energies and radial distributions are the hydrogen-atom values', () => {
  const expectRmp = { '1s': 1, '2s': 3 + Math.sqrt(5), '2p': 4, '3s': null, '3p': 12, '3dz2': 9, '3dxy': 9 };
  const expectNodes = { '1s': [], '2s': [2], '2p': [], '3s': [(9 - 3 * Math.sqrt(3)) / 2, (9 + 3 * Math.sqrt(3)) / 2], '3p': [6], '3dz2': [], '3dxy': [] };
  for (const it of ORBITAL_ITEMS.filter((x) => x.kind === 'atomic')) {
    const b = buildItem(it.id);
    assert.equal(b.radialNodes, radialNodes(b.n, b.l)); assert.equal(b.angularNodes, angularNodes(b.l)); assert.equal(b.totalNodes, b.n - 1);
    assert.equal(b.degeneracy, 2 * b.l + 1); assert.equal(b.maxElectrons, 2 * (2 * b.l + 1));
    assert.ok(Math.abs(b.energyEV - hydrogenLevel(b.n)) < 1e-12 && Math.abs(b.energyEV + HYDROGEN_ENERGY.rydbergEV / (b.n * b.n)) < 1e-12);
    assert.equal(b.rdf.nodes.length, b.radialNodes, `${it.id}: ${b.rdf.nodes.length} radial nodes found`);
    b.rdf.nodes.forEach((x, i) => assert.ok(Math.abs(x - expectNodes[it.id][i]) < 1e-3, `${it.id} node ${x}`));
    if (expectRmp[it.id] != null) assert.ok(Math.abs(b.rdf.rMostProbable - expectRmp[it.id]) < 1e-3, `${it.id} most probable radius ${b.rdf.rMostProbable}`);
    assert.ok(b.rdf.P.every((p) => p >= 0) && b.rdf.r.length === b.rdf.P.length && b.rdf.P[0] === 0);
    assert.ok(buildItem(it.id) === b, 'cached');
  }
  assert.ok(Math.abs(buildItem('3s').rdf.rMostProbable - 13.07) < 0.01);
  assert.equal(hydrogenLevel(1), -HYDROGEN_ENERGY.rydbergEV);
  assert.ok(Math.abs(HYDROGEN_ENERGY.listed - 13.605693) < 1e-6 && Math.abs(HYDROGEN_ENERGY.rydbergEV - HYDROGEN_ENERGY.listed) < 0.01);
  const d = radialDistribution(2, 0, { points: 100 });
  assert.equal(d.nodes.length, 1); assert.ok(Math.abs(d.nodes[0] - 2) < 1e-6);
  assert.throws(() => buildItem('nope'), /unknown item/);
  assert.equal(itemById('nope'), null);
  for (const it of ORBITAL_ITEMS) assert.ok(FAMILIES[it.family], `${it.id} family`);
});

test('hybrids: stated combinations, normalised, lobes at the analytic angles', () => {
  for (const [kind, H] of Object.entries(HYBRIDS)) {
    assert.equal(H.rows.length, H.count);
    for (const row of H.rows) assert.ok(Math.abs(row.reduce((s, c) => s + c * c, 0) - 1) < 1e-12, `${kind} row normalised`);
    for (let i = 0; i < H.rows.length; i++) for (let j = i + 1; j < H.rows.length; j++) assert.ok(Math.abs(H.rows[i].reduce((s, c, k) => s + c * H.rows[j][k], 0)) < 1e-12, `${kind} hybrids ${i},${j} orthogonal`);
    assert.ok(Math.abs(H.rows[0][0] * H.rows[0][0] - H.sCharacter) < 1e-12, `${kind} s character`);
    const b = buildItem(kind);
    // analytic angle between the p-vector directions of two hybrids
    const pv = (row) => { const L = Math.hypot(row[1], row[2], row[3]); return [row[1] / L, row[2] / L, row[3] / L]; };
    assert.ok(Math.abs(angleBetween(pv(H.rows[0]), pv(H.rows[1])) - H.angle) < 0.01, `${kind} analytic angle`);
    // the lobe found on the drawn function agrees with the analytic direction
    for (let i = 0; i < H.count; i++) assert.ok(angleBetween(b.directions[i], pv(H.rows[i])) < 0.5, `${kind} hybrid ${i} lobe direction off by ${angleBetween(b.directions[i], pv(H.rows[i])).toFixed(2)}°`);
    const c = hybridChecks(kind, { size: 32 });
    for (const a of c.angles) assert.ok(Math.abs(a - H.angle) < 0.5, `${kind} angles ${c.angles}`);
    assert.ok(c.probability > 0.98 && c.probability < 1.02, `${kind} normalised on the grid: ${c.probability}`);
    assert.ok(Math.abs(b.angle - H.angle) < 0.5);
  }
  assert.ok(Math.abs(HYBRIDS.sp3.angle - IDEAL_ANGLES.tetrahedral) < 1e-9 && HYBRIDS.sp2.angle === IDEAL_ANGLES.trigonal && HYBRIDS.sp.angle === IDEAL_ANGLES.linear);
  const h = hybridOrbital('sp3', 0);
  assert.ok(h.psi(2, 2, 2) > 0 && h.psi(-2, -2, -2) < 0.2 * h.psi(2, 2, 2), 'the lobe points along (1,1,1), the back lobe is small');
  assert.throws(() => hybridOrbital('sp4'), /unknown hybrid/);
  assert.throws(() => hybridOrbital('sp', 2), /has 2 hybrids/);
  assert.ok(Math.abs(hybridLobeDirection(hybridOrbital('sp', 0))[2] - 1) < 1e-3);
});

test('electron configurations: every element 1–36 matches the NIST table, with Hund boxes and noble-gas cores', () => {
  assert.equal(MAX_Z, 36); assert.equal(PERIODIC.length, 36);
  assert.deepEqual(AUFBAU_ORDER.map((s) => s.label), ['1s', '2s', '2p', '3s', '3p', '4s', '3d', '4p']);
  assert.equal(AUFBAU_ORDER.reduce((a, s) => a + s.capacity, 0), 36);
  for (const e of PERIODIC) {
    const c = electronConfiguration(e.Z);
    assert.equal(configurationAscii(c), GROUND_STATE_CONFIGURATIONS.values[e.Z], `${e.symbol}`);
    assert.equal(c.subshells.reduce((a, s) => a + s.electrons, 0), e.Z, `${e.symbol} electron count`);
    assert.equal(!!c.exception, e.Z in AUFBAU_EXCEPTIONS.values);
    assert.equal(c.boxes.reduce((a, b) => a + b.orbitals.reduce((x, o) => x + o.length, 0), 0), e.Z);
    for (const b of c.boxes) { for (const o of b.orbitals) { assert.ok(o.length <= 2, 'Pauli'); if (o.length === 2) assert.deepEqual(o, ['up', 'down']); } const singles = b.orbitals.filter((o) => o.length === 1).length, pairs = b.orbitals.filter((o) => o.length === 2).length; if (pairs) assert.equal(singles + pairs, b.orbitals.length, `${e.symbol} ${b.label}: no pairing before every orbital is singly occupied`); }
    const L = layoutLevels(c.diagram, { width: 320, height: 200 });
    assert.equal(L.levels.length, c.boxes.reduce((a, b) => a + b.orbitals.length, 0));
  }
  const n = electronConfiguration(7), o = electronConfiguration(8), cr = electronConfiguration(24), cu = electronConfiguration(29), kr = electronConfiguration(36), h = electronConfiguration(1);
  assert.equal(n.unpaired, 3); assert.equal(o.unpaired, 2); assert.equal(cr.unpaired, 6); assert.equal(cu.unpaired, 1); assert.equal(kr.unpaired, 0);
  assert.equal(n.nobleGasString, '[He] 2s² 2p³'); assert.equal(cr.nobleGasString, '[Ar] 3d⁵ 4s¹'); assert.equal(cu.string, '1s² 2s² 2p⁶ 3s² 3p⁶ 3d¹⁰ 4s¹'); assert.equal(h.nobleGasString, '1s¹'); assert.equal(h.core, null);
  assert.equal(electronConfiguration(17).valence, 7); assert.equal(electronConfiguration(6).valence, 4); assert.equal(electronConfiguration(26).valence, 8);
  assert.equal(cr.highest, '3d'); assert.equal(electronConfiguration(19).highest, '4s');
  assert.throws(() => electronConfiguration(37), /Z must be/);
  assert.throws(() => electronConfiguration(0), /Z must be/);
  const cfg = buildItem('configurations', { Z: 26 });
  assert.equal(cfg.drawn, '3d'); assert.equal(cfg.orbitalName, '3dz2'); assert.ok(cfg.orbital);
  assert.equal(buildItem('configurations', { Z: 19 }).drawn, '3p', 'potassium: 4s is not drawable, the highest n ≤ 3 subshell is');
  assert.equal(buildItem('configurations', { Z: 8 }).orbitalName, '2pz');
  assert.equal(buildItem('configurations').config.Z, 6, 'carbon by default');
});

function resolves(href) {
  const [head, a, b] = href.replace(/^#/, '').split('/');
  const terms = new Set([...GLOSSARY.map((t) => t.id), ...GLOSSARY_TERMS.map((t) => t.id)]);
  if (head === 'glossary') return !a || terms.has(a);
  if (head === 'atomic-orbitals') return (!a || !!itemById(a)) && (!b || (INVARIANTS[a] || []).some((x) => x.id === b));
  if (head === 'functional-groups') return (!a || !!FUNCTIONAL_GROUPS[a]) && (!b || FUNCTIONAL_GROUPS[a].invariants.some((x) => x.id === b));
  if (head === 'molecular-shapes') return (!a || !!shapeById(a)) && (!b || shapeById(a).invariants.some((x) => x.id === b));
  return false;
}

test('the topic, its collection, content, activities and links satisfy the contracts', () => {
  const restore = installFakeDom();
  try {
  assert.deepEqual(validateTopic(atomicOrbitals), []);
  assert.ok(atomicOrbitals.order > 20, 'after the Reaction lab in the learning order');
  const fake = { activityBlock: () => null };
  const coll = makeOrbitalsCollection(fake);
  assert.deepEqual(validateCollection(coll), []);
  assert.equal(coll.items, ORBITAL_ITEMS);
  for (const it of ORBITAL_ITEMS) {
    const invs = INVARIANTS[it.id];
    assert.ok(invs && invs.length >= 2, `${it.id} has invariant cards`);
    const ids = new Set();
    for (const inv of invs) { assert.ok(inv.id && inv.title && inv.detail && !ids.has(inv.id)); ids.add(inv.id); assert.ok(isValidAudience(audienceOf(inv, 'invariants'))); for (const l of inv.links || []) assert.ok(resolves(l.href), `${it.id}/${inv.id}: ${l.href}`); }
    const chip = coll.chips(it); assert.ok(chip.pattern && chip.name && chip.color);
    const state = coll.initialState(it); const built = coll.build(it, state);
    assert.ok(built.title && (coll.card(it, state, built)).length);
    assert.ok(coll.controls(it, state, { setState() {} }).length);
  }
  const core = new Set(GLOSSARY.map((t) => t.id));
  for (const t of GLOSSARY_TERMS) { assert.ok(!core.has(t.id), `${t.id} is new`); assert.ok(t.term && t.definition && t.why); for (const l of t.links) assert.ok(resolves(l.href), `glossary ${t.id}: ${l.href}`); }
  for (const e of atomicOrbitals.index()) { assert.ok(e.title && e.href); assert.ok(resolves(e.href), `index ${e.href}`); }
  assert.ok(atomicOrbitals.index().length > 60);
  for (const act of ACTIVITIES) { assert.equal(act.options.filter((o) => o.correct).length, 1); assert.ok(correctOption(act)); assert.ok(itemById(act.item) && itemById(act.show.item)); assert.ok(act.reveal().length > 80); assert.ok((INVARIANTS[act.show.item] || []).some((x) => x.id === act.show.invariant)); }
  assert.match(ACTIVITIES[0].reveal(), /1\.90 and 7\.10 a₀/);
  assert.match(ACTIVITIES[1].reveal(), /\[Ar\] 4s¹/);
  assert.match(ACTIVITIES[2].reveal(), /109\.47°/);
  assert.doesNotThrow(() => drawRadialDistribution({ getContext: () => null }, buildItem('2s').rdf));
  } finally { restore(); }
});
