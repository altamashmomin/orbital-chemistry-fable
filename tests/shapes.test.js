import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SHAPES, SHAPE_ORDER, SHAPE_FAMILIES, buildShape, shapeAngle, shapeById } from '../src/chem/shapes.js';
import { MEASURED_ANGLES } from '../src/chem/references/measured.js';
import { FUNCTIONAL_GROUPS } from '../src/chem/functionalGroups.js';
import { MECHANISMS } from '../src/chem/mechanisms/index.js';
import { GLOSSARY } from '../src/nexus/glossary.js';
import { audienceOf, isValidAudience } from '../src/chem/audience.js';
import { validateCollection, parseSub } from '../src/ui/collectionExplorer.js';
import { validateTopic } from '../src/topics/registry.js';
import { molecularShapes } from '../src/topics/molecular-shapes/index.js';
import { ACTIVITIES, correctOption } from '../src/topics/molecular-shapes/activities.js';
import { makeShapesCollection, angleStatusText } from '../src/topics/molecular-shapes/panel.js';
import { createFallbackViewport, FallbackMoleculeView, fallbackPanel } from '../src/render/fallback.js';
import { v } from '../src/chem/geometry.js';

const EXPECTED = {
  methane: { hch: ['ideal', 109.47] },
  ammonia: { hnh: ['measured', MEASURED_ANGLES.ammonia_HNH.value] },
  water: { hoh: ['measured', MEASURED_ANGLES.water_HOH.value] },
  'hydrogen-sulfide': { hsh: ['measured', MEASURED_ANGLES.hydrogenSulfide_HSH.value] },
  'carbon-dioxide': { oco: ['ideal', 180] },
  'boron-trifluoride': { fbf: ['ideal', 120] },
  formaldehyde: { hch: ['ideal', 120], hco: ['ideal', 120] },
  'sulfur-dioxide': { oso: ['measured', MEASURED_ANGLES.sulfurDioxide_OSO.value] },
  'phosphorus-pentafluoride': { axax: ['ideal', 180], eqeq: ['ideal', 120], axeq: ['ideal', 90] },
  'sulfur-tetrafluoride': { axax: ['measured', MEASURED_ANGLES.SF4_axial_FSF.value], eqeq: ['measured', MEASURED_ANGLES.SF4_equatorial_FSF.value] },
  'sulfur-hexafluoride': { cis: ['ideal', 90], trans: ['ideal', 180] },
  'xenon-tetrafluoride': { cis: ['ideal', 90], trans: ['ideal', 180] },
};

test('every shape embeds cleanly with the drawn lone-pair count and the expected angle values and statuses', () => {
  assert.equal(SHAPE_ORDER.length, 12);
  for (const s of SHAPES) {
    const b = buildShape(s.id);
    assert.ok(b.frame.atoms.every((a) => a.pos.every(Number.isFinite)), `${s.id}: finite`);
    assert.equal(b.frame.crowding, null, `${s.id}: no steric contacts`);
    const centre = s.graph.atoms.find((a) => a.id === s.centre);
    assert.equal(b.lonePairs, centre.lonePairs || 0, `${s.id}: lone pairs are the drawn count`);
    assert.equal(b.lonePairs, s.lonePairs); assert.equal(b.bonds, s.bonds); assert.equal(b.domains, s.bonds + s.lonePairs);
    assert.ok(SHAPE_FAMILIES[s.family], `${s.id}: known family`);
    assert.equal(b.frame.atoms.find((a) => a.id === s.centre).lonePairs, s.lonePairs, 'the frame carries the physical count');
    const exp = EXPECTED[s.id];
    assert.ok(exp, `${s.id}: expectation listed`);
    for (const a of b.angles) {
      const [status, value] = exp[a.id];
      assert.equal(a.status, status, `${s.id}/${a.id}: status ${a.status}`);
      assert.ok(Math.abs(a.value - value) < 0.1, `${s.id}/${a.id}: ${a.value.toFixed(2)} vs ${value}`);
      if (status === 'measured') { assert.ok(a.source && a.ref && MEASURED_ANGLES[a.ref], `${s.id}/${a.id}: cited`); assert.ok(a.exemplar); }
      if (status === 'ideal' && a.measuredRef) assert.equal(a.measured, MEASURED_ANGLES[a.measuredRef].value, 'the carbonyl states the measured value beside the ideal one');
    }
    // the status text never claims more than the model knows
    for (const a of b.angles) {
      const t = angleStatusText(a);
      if (a.status === 'ideal') assert.match(t, /ideal/);
      if (a.status === 'measured') assert.match(t, new RegExp(`measured \\(${a.exemplar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`));
    }
  }
  assert.ok(Math.abs(shapeAngle('water', 'hoh') - 104.5) < 1e-6);
  assert.equal(shapeAngle('water', 'nope'), null);
  assert.equal(shapeById('nope'), null);
  assert.throws(() => buildShape('nope'), /unknown shape/);
});

test('the formaldehyde example separates ideal from measured, and the SF4 example is the exemplar itself', () => {
  const f = buildShape('formaldehyde');
  assert.ok(f.angles.every((a) => a.status === 'ideal' && a.measured != null && Math.abs(a.value - 120) < 1e-6));
  assert.ok(f.angles.find((a) => a.id === 'hch').measured < 120 && f.angles.find((a) => a.id === 'hco').measured > 120, 'measured H–C–H < 120 < H–C=O');
  const sf4 = buildShape('sulfur-tetrafluoride');
  assert.ok(sf4.angles.every((a) => a.status === 'measured' && a.exemplar === 'SF₄'), 'SF4 is measured on SF4, not a class value');
  assert.equal(buildShape('xenon-tetrafluoride').compression, null, 'trans lone pairs cancel: the square is exact');
});

test('content: invariants, links, audiences and deep links are well formed', () => {
  const ids = new Set();
  for (const s of SHAPES) {
    assert.ok(!ids.has(s.id)); ids.add(s.id);
    assert.ok(s.invariants.length >= 2 && s.invariants.every((inv) => inv.visuals?.length && inv.title && inv.detail.length > 40), `${s.id}: invariants`);
    assert.ok(s.invariants.some((inv) => audienceOf(inv, 'invariants') === 'both'), `${s.id}: keeps a fact at refresher depth`);
    for (const inv of s.invariants) {
      assert.ok(isValidAudience(audienceOf(inv, 'invariants')));
      for (const vis of inv.visuals) for (const key of ['id', 'a', 'b', 'center']) if (vis[key]) assert.ok(s.graph.atoms.some((a) => a.id === vis[key]), `${s.id}/${inv.id}: visual atom ${vis[key]} exists`);
      for (const vis of inv.visuals) if (vis.atoms) for (const id of vis.atoms) assert.ok(s.graph.atoms.some((a) => a.id === id));
      for (const l of inv.links || []) assert.ok(resolves(l.href), `${s.id}/${inv.id}: link ${l.href}`);
    }
    for (const l of s.related || []) assert.ok(resolves(l.href), `${s.id}: related ${l.href}`);
    for (const ang of s.angles) assert.ok(['a', 'b'].every((k) => s.graph.atoms.some((a) => a.id === ang[k])) && typeof ang.ideal === 'number', `${s.id}/${ang.id}: angle spec`);
    const { itemId, invId } = parseSub(`${s.id}/${s.invariants[0].id}`);
    assert.equal(itemId, s.id); assert.equal(invId, s.invariants[0].id);
  }
  // CH4 / NH3 / H2O are the opening comparison and stay at refresher depth; five and six domains are optional
  assert.deepEqual(SHAPE_ORDER.slice(0, 3), ['methane', 'ammonia', 'water']);
  assert.ok(SHAPES.slice(0, 8).every((s) => !s.audience || s.audience === 'both'));
  assert.ok(SHAPES.slice(8).every((s) => s.audience === 'learn'));
});

function resolves(href) {
  const [head, a, b] = href.replace(/^#/, '').split('/');
  if (head === 'glossary') return !a || GLOSSARY.some((t) => t.id === a) || molecularShapes.glossary.some((t) => t.id === a);
  if (head === 'functional-groups') return (!a || !!FUNCTIONAL_GROUPS[a]) && (!b || FUNCTIONAL_GROUPS[a].invariants.some((x) => x.id === b));
  if (head === 'mechanisms') return (!a || !!MECHANISMS[a]) && (!b || MECHANISMS[a].steps.some((x) => x.id === b));
  if (head === 'molecular-shapes') return (!a || !!shapeById(a)) && (!b || shapeById(a).invariants.some((x) => x.id === b));
  return false;
}

test('the topic, its collection, search entries, glossary and activities satisfy the contracts', () => {
  assert.deepEqual(validateTopic(molecularShapes), []);
  assert.equal(molecularShapes.id, 'molecular-shapes');
  assert.ok(molecularShapes.order > 10 && molecularShapes.order < 20, 'sits between Functional groups and the Reaction lab');
  const collection = makeShapesCollection({ activityBlock: () => null, sketch: null });
  assert.deepEqual(validateCollection(collection), []);
  const entries = molecularShapes.index();
  assert.ok(entries.length >= SHAPES.length * 3);
  for (const e of entries) { assert.ok(e.title && e.href, JSON.stringify(e).slice(0, 60)); assert.ok(resolves(e.href), `index href ${e.href}`); assert.ok(isValidAudience(e.audience || 'both')); }
  assert.ok(entries.some((e) => e.kind === 'group' && /seesaw/i.test(e.title)), 'SF4 is findable by its shape name');
  const core = new Set(GLOSSARY.map((t) => t.id));
  for (const t of molecularShapes.glossary) { assert.ok(!core.has(t.id), `${t.id} is new`); assert.ok(t.definition.length > 40); for (const l of t.links) assert.ok(resolves(l.href), l.href); }
  for (const act of ACTIVITIES) {
    assert.equal(act.options.filter((o) => o.correct).length, 1, `${act.id}: exactly one right answer`);
    assert.ok(correctOption(act));
    const text = act.reveal();
    assert.ok(text.length > 80);
    if (act.show) { assert.ok(shapeById(act.show.item), `${act.id}: show item`); if (act.show.invariant) assert.ok(shapeById(act.show.item).invariants.some((i) => i.id === act.show.invariant), `${act.id}: show invariant`); }
  }
  // the reveal texts quote the model's own numbers, so they cannot drift from the frames
  assert.match(ACTIVITIES[0].reveal(), /109\.5°.*106\.7°.*104\.5°/);
  assert.match(ACTIVITIES[1].reveal(), /180\.0°.*119\.5°/);
  assert.match(ACTIVITIES[2].reveal(), /92\.1°/);
});

test('the WebGL fallback keeps the panel surface alive: frames are kept, nothing throws', () => {
  const vp = createFallbackViewport(null, new Error('no context'));
  assert.equal(vp.fallback, true); assert.match(vp.reason, /no context/);
  vp.scene.background.set('#fff'); vp.setAutoRotate(true); vp.fitTo(null); vp.camera.updateProjectionMatrix(); vp.camera.position.set(1, 2, 3);
  assert.equal(vp.controls.autoRotate, true);
  assert.ok(vp.moveCamera([0, 0, 1], [0, 0, 0]) instanceof Promise);
  const off = vp.onTick(() => {}); off();
  const view = new FallbackMoleculeView();
  const { frame } = buildShape('water');
  view.setOptions({ lonePairs: false }); view.setFrame(frame); view.setHighlights([{ type: 'atom', id: 'O' }]); view.setArrows([]);
  assert.equal(view.frame, frame); assert.equal(view.bounds(), null); assert.equal(view.atom('O').el, 'O'); assert.equal(view.options.lonePairs, false);
  view.clear(); assert.equal(view.frame, null);
  // a stub viewport's unknown members are callable, constructible no-ops rather than crashes (the animator does `new THREE.Group()`)
  assert.doesNotThrow(() => vp.THREE.Vector3(1, 2, 3).normalize().length);
  assert.doesNotThrow(() => new vp.THREE.Group().add(new vp.THREE.Mesh()));
  const p = fallbackPanel({ title: 'Reaction lab', summary: 'Mechanisms in motion.' }, new Error('no scene'), null);
  assert.equal(p.fallback, true); assert.equal(p.el, null); assert.doesNotThrow(() => { p.activate(); p.navigate('sn2'); });
  assert.equal(v.len([0, 0, 0]), 0);
});
