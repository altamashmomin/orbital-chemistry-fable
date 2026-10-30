import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fakeDom.js';
import { MO_ITEMS, MO_FAMILIES, moItemById, buildMO, huckel, symmetricEigen, fillDiatomic, pOrbitalAlong, moProbe } from '../src/chem/molecularOrbitals.js';
import { DIATOMIC_MO, HUCKEL_PARAMETERS, SLATER_ZEFF } from '../src/chem/references/textbook.js';
import { MEASURED_BONDS } from '../src/chem/references/measured.js';
import { sampleGrid, gridProbability } from '../src/chem/orbitals.js';
import { layoutLevels } from '../src/ui/levelDiagram.js';
import { validateCollection } from '../src/ui/collectionExplorer.js';
import { validateTopic } from '../src/topics/registry.js';
import { molecularOrbitals } from '../src/topics/molecular-orbitals/index.js';
import { INVARIANTS, GLOSSARY_TERMS } from '../src/topics/molecular-orbitals/content.js';
import { ACTIVITIES, correctOption } from '../src/topics/molecular-orbitals/activities.js';
import { makeMOCollection } from '../src/topics/molecular-orbitals/panel.js';
import { GLOSSARY } from '../src/nexus/glossary.js';
import { FUNCTIONAL_GROUPS } from '../src/chem/functionalGroups.js';
import { MECHANISMS } from '../src/chem/mechanisms/index.js';
import { isValidAudience, audienceOf } from '../src/chem/audience.js';
import { v } from '../src/chem/geometry.js';
import { assertNoClashes } from './helpers.js';

const PHI = (1 + Math.sqrt(5)) / 2;

test('Hückel: ethene, butadiene and the carbonyl give the closed-form eigenvalues and textbook coefficients', () => {
  const e = symmetricEigen([[2, 1], [1, 2]]);
  assert.deepEqual(e.values.map((x) => Math.round(x * 1e9) / 1e9).sort((a, b) => a - b), [1, 3]);
  const eth = huckel({ n: 2, bonds: [[0, 1]], electrons: 2 });
  assert.ok(Math.abs(eth.levels[0].x - 1) < 1e-9 && Math.abs(eth.levels[1].x + 1) < 1e-9);
  assert.deepEqual(eth.levels.map((l) => l.electrons), [2, 0]);
  assert.ok(eth.levels[0].coefficients.every((c) => Math.abs(c - Math.SQRT1_2) < 1e-9), 'ψ1 = (p1 + p2)/√2');
  assert.ok(Math.abs(eth.levels[1].coefficients[0] - Math.SQRT1_2) < 1e-9 && Math.abs(eth.levels[1].coefficients[1] + Math.SQRT1_2) < 1e-9, 'ψ2 = (p1 − p2)/√2');
  const bd = huckel({ n: 4, bonds: [[0, 1], [1, 2], [2, 3]], electrons: 4 });
  const xs = bd.levels.map((l) => l.x);
  [PHI, PHI - 1, 1 - PHI, -PHI].forEach((x, i) => assert.ok(Math.abs(xs[i] - x) < 1e-9, `butadiene x${i + 1} = ${xs[i]}`));
  assert.deepEqual(bd.levels.map((l) => l.nodes), [0, 1, 2, 3], 'one more node per level');
  assert.equal(bd.homo.id, 'psi2'); assert.equal(bd.lumo.id, 'psi3');
  assert.ok(Math.abs(bd.piEnergy - (2 * PHI + 2 * (PHI - 1))) < 1e-9 && Math.abs(bd.piEnergy - 4 - 0.4721359549995794) < 1e-9, 'delocalisation energy 0.472 β');
  const c = bd.levels[1].coefficients.map(Math.abs);
  assert.ok(Math.abs(c[0] - 0.6015) < 1e-3 && Math.abs(c[1] - 0.3717) < 1e-3, 'HOMO is largest on the terminal carbons');
  for (const l of bd.levels) assert.ok(Math.abs(l.coefficients.reduce((s, x) => s + x * x, 0) - 1) < 1e-9, 'normalised');
  const P = HUCKEL_PARAMETERS.values.O_carbonyl;
  const co = huckel({ n: 2, bonds: [[0, 1, P.k]], h: { 1: P.h }, electrons: 2 });
  assert.ok(Math.abs(co.levels[0].x - PHI) < 1e-9 && Math.abs(co.levels[1].x - (1 - PHI)) < 1e-9, 'carbonyl x = (1 ± √5)/2');
  assert.ok(Math.abs(co.levels[0].coefficients[1]) > Math.abs(co.levels[0].coefficients[0]), 'π is larger on O');
  assert.ok(Math.abs(co.levels[1].coefficients[0]) > Math.abs(co.levels[1].coefficients[1]), 'π* is larger on C');
  assert.ok(Math.abs(Math.abs(co.levels[1].coefficients[0]) - 0.8507) < 1e-3);
});

test('diatomics: the textbook filling gives the textbook bond orders and magnetism', () => {
  const expect = { h2: [1, 0], he2: [0, 0], n2: [3, 0], o2: [2, 2] };
  for (const [id, [bo, unp]] of Object.entries(expect)) {
    const f = fillDiatomic(id);
    assert.equal(f.bondOrder, bo, `${id} bond order`); assert.equal(f.unpaired, unp, `${id} unpaired`);
    assert.equal(f.bondOrder, DIATOMIC_MO.values[id].bondOrder); assert.equal(f.unpaired, DIATOMIC_MO.values[id].unpaired);
    assert.equal(f.levels.reduce((s, l) => s + l.total, 0), DIATOMIC_MO.values[id].electrons);
    for (const l of f.levels) for (const comp of l.electrons) assert.ok(comp.length <= 2 && (comp.length < 2 || (comp[0] === 'up' && comp[1] === 'down')));
  }
  assert.equal(fillDiatomic('n2').homo.id, 'sigma2p'); assert.equal(fillDiatomic('n2').lumo.id, 'pi2p*');
  assert.equal(fillDiatomic('o2').homo.id, 'pi2p*'); assert.deepEqual(fillDiatomic('o2').levels.find((l) => l.id === 'pi2p*').electrons, [['up'], ['up']], 'Hund in π*');
  assert.ok(DIATOMIC_MO.values.n2.bde > DIATOMIC_MO.values.o2.bde && DIATOMIC_MO.values.o2.bde > DIATOMIC_MO.values.h2.bde, 'N₂ > O₂ > H₂ bond energies');
  assert.throws(() => fillDiatomic('f2'), /unknown diatomic/);
  assert.throws(() => fillDiatomic('h2', 6), /do not fit/);
});

test('every item builds a frame at the measured lengths, a diagram, and MOs with the right nodal structure', () => {
  for (const it of MO_ITEMS) {
    const b = buildMO(it.id);
    assert.ok(b.frame.atoms.length >= 2 && b.mos.length >= 2 && b.selected && b.title.includes(b.selected.label));
    const byId = new Map(b.frame.atoms.map((a) => [a.id, a]));
    for (const bd of b.frame.bonds) { assert.ok(bd.ref && MEASURED_BONDS[bd.ref], `${it.id} ${bd.a}–${bd.b} cites a measured length`); assert.ok(Math.abs(v.dist(byId.get(bd.a).pos, byId.get(bd.b).pos) - bd.length) < 1e-6, `${it.id} ${bd.a}–${bd.b} drawn at ${bd.length}`); }
    assertNoClashes(b.frame, it.id);
    assert.ok(layoutLevels(b.diagram, { width: 320, height: 220 }).levels.length >= 3);
    for (const m of b.mos) {
      const g = sampleGrid(m.psi.psi, { size: 24, extent: m.psi.extent, center: m.psi.center });
      assert.ok(g.max > 0 && Number.isFinite(g.min), `${it.id} ${m.label} samples`);
      // coefficients ±1/√2 (or Hückel's) neglect overlap, so the norm is 1 ± S: finite and of order one, not exactly 1
      const norm = gridProbability(g); assert.ok(norm > 0.15 && norm < 2.5, `${it.id} ${m.label} norm of order one (${norm.toFixed(3)})`);
    }
    assert.ok(MO_FAMILIES[it.family]);
  }
  // σ(1s) of H₂ is positive at the midpoint, σ*(1s) is zero there; π has its node in the plane, π* a second one between the atoms
  assert.ok(moProbe('h2', 'sigma1s').mid > 0.5 && Math.abs(moProbe('h2', 'sigma1s*').mid) < 1e-9);
  const pi = buildMO('ethene', { mo: 'psi1' }).selected.psi, piS = buildMO('ethene', { mo: 'psi2' }).selected.psi;
  const [c1, c2] = ['C1', 'C2'].map((id) => buildMO('ethene').frame.atoms.find((a) => a.id === id).pos);
  assert.ok(Math.abs(pi.psi(0, 0, 0)) < 1e-9, 'π vanishes in the molecular plane');
  assert.ok(pi.psi(c1[0], 0, 0.6) > 0 && pi.psi(c2[0], 0, 0.6) > 0 && pi.psi(c1[0], 0, -0.6) < 0, 'π: same phase above both carbons, opposite below');
  assert.ok(piS.psi(c1[0], 0, 0.6) * piS.psi(c2[0], 0, 0.6) < 0, 'π*: opposite phase on the two carbons');
  // σ*(C–Cl): the lobe behind carbon (away from Cl) is the large one and opposite in sign to the lobe between C and Cl
  const cm = buildMO('chloromethane', { mo: 'sigma*' }); const C = cm.frame.atoms.find((a) => a.id === 'C').pos, Cl = cm.frame.atoms.find((a) => a.id === 'Cl').pos;
  const behind = cm.selected.psi.psi(C[0] - 0.7, 0, 0), between = cm.selected.psi.psi((C[0] + Cl[0]) / 2, 0, 0);
  assert.ok(Math.abs(behind) > 0.2 && behind * between < 0, `σ* lobe behind carbon (${behind.toFixed(2)}) opposes the midpoint (${between.toFixed(2)})`);
  const sig = buildMO('chloromethane', { mo: 'sigma' }).selected.psi; assert.ok(Math.abs(sig.psi((C[0] + Cl[0]) / 2, 0, 0)) < 0.05 || sig.psi((C[0] + Cl[0]) / 2 + 0.3, 0, 0) * sig.psi((C[0] + Cl[0]) / 2 - 0.3, 0, 0) > 0, 'σ: same phase either side of the midpoint');
  // He₂ via the electron count
  const he = buildMO('h2', { electrons: 4 });
  assert.equal(he.facts.bondOrder, 0); assert.ok(he.facts.isHe && he.frame.atoms.every((a) => a.el === 'He') && he.selected.id === 'sigma1s*');
  assert.equal(buildMO('h2').facts.bondOrder, 1);
  assert.equal(buildMO('o2').facts.unpaired, 2); assert.equal(buildMO('n2').facts.bondOrder, 3);
  assert.equal(buildMO('butadiene').selected.id, 'psi2', 'HOMO drawn by default');
  assert.ok(Math.abs(buildMO('butadiene').facts.delocalisation - 0.4721) < 1e-3);
  assert.equal(buildMO('carbonyl').facts.parameters.h, 1);
  assert.throws(() => buildMO('nope'), /unknown item/);
  assert.equal(moItemById('nope'), null);
  const p = pOrbitalAlong([0, 0, 0], [0, 0, 1], { Z: SLATER_ZEFF.values.C_2p }); assert.ok(p(0, 0, 0.5) > 0 && p(0, 0, -0.5) < 0 && p(0.5, 0, 0) === 0);
});

function resolves(href) {
  const [head, a, b] = href.replace(/^#/, '').split('/');
  const terms = new Set([...GLOSSARY.map((t) => t.id), ...GLOSSARY_TERMS.map((t) => t.id)]);
  if (head === 'glossary') return !a || terms.has(a);
  if (head === 'molecular-orbitals') return (!a || !!moItemById(a)) && (!b || (INVARIANTS[a] || []).some((x) => x.id === b));
  if (head === 'functional-groups') return (!a || !!FUNCTIONAL_GROUPS[a]) && (!b || FUNCTIONAL_GROUPS[a].invariants.some((x) => x.id === b));
  if (head === 'mechanisms') return (!a || !!MECHANISMS[a]) && (!b || MECHANISMS[a].steps.some((x) => x.id === b));
  return false;
}

test('the topic, its collection, content, activities and links satisfy the contracts', () => {
  const restore = installFakeDom();
  try {
    assert.deepEqual(validateTopic(molecularOrbitals), []);
    assert.ok(molecularOrbitals.order > 30, 'after Atomic orbitals');
    const coll = makeMOCollection({ activityBlock: () => null });
    assert.deepEqual(validateCollection(coll), []);
    for (const it of MO_ITEMS) {
      const invs = INVARIANTS[it.id]; assert.ok(invs && invs.length >= 3, `${it.id} cards`);
      const ids = new Set();
      for (const inv of invs) { assert.ok(inv.id && inv.title && inv.detail && !ids.has(inv.id)); ids.add(inv.id); assert.ok(isValidAudience(audienceOf(inv, 'invariants'))); for (const l of inv.links || []) assert.ok(resolves(l.href), `${it.id}/${inv.id}: ${l.href}`); if (inv.show?.mo) assert.ok(buildMO(it.id, { electrons: inv.show.electrons || undefined }).mos.some((m) => m.id === inv.show.mo), `${it.id}/${inv.id} shows a real MO`); }
      const state = coll.initialState(it); const built = coll.build(it, state);
      assert.ok(coll.card(it, state, built).length && coll.controls(it, state, { setState() {} }).length);
      const chip = coll.chips(it); assert.ok(chip.pattern && chip.name && chip.color);
    }
    const core = new Set(GLOSSARY.map((t) => t.id));
    for (const t of GLOSSARY_TERMS) { assert.ok(!core.has(t.id), `${t.id} is new`); for (const l of t.links) assert.ok(resolves(l.href), `glossary ${t.id}: ${l.href}`); }
    for (const e of molecularOrbitals.index()) { assert.ok(e.title && e.href); assert.ok(resolves(e.href), `index ${e.href}`); }
    for (const act of ACTIVITIES) { assert.equal(act.options.filter((o) => o.correct).length, 1); assert.ok(correctOption(act) && moItemById(act.item)); assert.ok(act.reveal().length > 80); assert.ok(INVARIANTS[act.show.item].some((x) => x.id === act.show.invariant)); }
    assert.match(ACTIVITIES[0].reveal(), /2 unpaired electrons, bond order 2/);
    assert.match(ACTIVITIES[1].reveal(), /bond order \(2 − 2\)\/2 = 0/);
    assert.match(ACTIVITIES[2].reveal(), /0\.851 on C against 0\.526 on O/);
  } finally { restore(); }
});
