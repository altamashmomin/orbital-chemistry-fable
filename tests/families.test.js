import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MECHANISMS, MECHANISM_ORDER, FAMILIES, FAMILY_ORDER, familyOf, listFamilies, validateFamily, defaultEnv, familyColor, createFamilyRegistry, predict } from '../src/chem/mechanisms/index.js';
import { substitutionElimination } from '../src/chem/mechanisms/substitutionElimination.js';
import { mechanisms as topic } from '../src/topics/mechanisms/index.js';

test('the four mechanisms form the Substitution & elimination family and the flat registries agree', () => {
  assert.deepEqual(FAMILY_ORDER, ['substitution-elimination']);
  const fam = FAMILIES['substitution-elimination'];
  assert.equal(fam, substitutionElimination);
  assert.equal(fam.title, 'Substitution & elimination');
  assert.deepEqual(fam.mechanisms, ['sn2', 'sn1', 'e2', 'e1']);
  assert.deepEqual(MECHANISM_ORDER, ['sn2', 'sn1', 'e2', 'e1'], 'tab order is unchanged');
  assert.deepEqual(Object.keys(MECHANISMS).sort(), ['e1', 'e2', 'sn1', 'sn2']);
  for (const id of MECHANISM_ORDER) { assert.equal(MECHANISMS[id].id, id); assert.equal(familyOf(id), fam, `${id} belongs to the family`); }
  assert.equal(familyOf('nope'), null);
  assert.deepEqual(listFamilies(), [fam]);
  assert.deepEqual(validateFamily(fam, MECHANISMS), []);
  // The family's mechanisms are the same objects as before: chemistry and frames untouched.
  assert.equal(MECHANISMS.sn2.frame(0.5).atoms.length, MECHANISMS.sn2.frame(0).atoms.length);
  assert.equal(MECHANISMS.sn2.steps[1].id, 'ts');
});

test('the family predictor is the existing textbook predictor with declared options and defaults', () => {
  const pred = substitutionElimination.predictor;
  assert.equal(pred.predict, predict);
  assert.deepEqual(pred.options.map((o) => o.key), ['substrate', 'reagent', 'solvent', 'temperature', 'leavingGroup', 'allylicBenzylic']);
  const env = defaultEnv(pred);
  assert.deepEqual(env, { substrate: 'secondary', reagent: 'strongNuStrongBase', solvent: 'polarProtic', temperature: 'low', leavingGroup: 'good', allylicBenzylic: false });
  for (const o of pred.options) if (o.choices) assert.ok(o.choices.some((c) => c.id === env[o.key]), `${o.key} default is one of its choices`);
  const p = pred.predict(env);
  assert.deepEqual(p, predict(), 'defaults reproduce predict() with no arguments');
  for (const id of substitutionElimination.mechanisms) assert.ok(Number.isFinite(p.pct[id]), `${id} has a percentage`);
  assert.ok(Number.isFinite(p.pct.none));
  assert.ok(substitutionElimination.mechanisms.includes(p.dominant) || p.dominant === 'none');
  assert.equal(familyColor(substitutionElimination, 'sn2'), '#38bdf8');
  assert.match(familyColor({ mechanisms: ['x', 'y'] }, 'y'), /^#[0-9a-f]{6}$/, 'palette fallback');
  assert.deepEqual(defaultEnv(undefined), {});
});

test('validateFamily catches the shapes a new family can get wrong', () => {
  const ok = { id: 'addition', title: 'Addition', mechanisms: ['hbr'] };
  const hbr = { id: 'hbr', frame: () => ({}), steps: [{ id: 'a', t: 0 }] };
  assert.deepEqual(validateFamily(ok, { hbr }), []);
  assert.ok(validateFamily(ok, {}).some((e) => e.includes('not registered')));
  assert.ok(validateFamily({ ...ok, id: 'Bad Id' }, { hbr }).some((e) => e.includes('kebab-case')));
  assert.ok(validateFamily({ ...ok, title: '' }, { hbr }).some((e) => e.includes('title')));
  assert.ok(validateFamily({ ...ok, mechanisms: [] }, { hbr }).some((e) => e.includes('non-empty')));
  assert.ok(validateFamily({ ...ok, mechanisms: ['hbr', 'hbr'] }, { hbr }).some((e) => e.includes('repeat')));
  assert.ok(validateFamily(ok, { hbr: { ...hbr, id: 'other' } }).some((e) => e.includes('reports id')));
  assert.ok(validateFamily(ok, { hbr: { id: 'hbr' } }).some((e) => e.includes('frame(t)')));
  assert.ok(validateFamily({ ...ok, predictor: {} }, { hbr }).some((e) => e.includes('predict(env)')));
  assert.ok(validateFamily({ ...ok, predictor: { predict() {}, options: [{ key: 'x' }] } }, { hbr }).some((e) => e.includes('label')));
  assert.ok(validateFamily({ ...ok, predictor: { predict() {}, options: [{ key: 'x', label: 'X', choices: [] }] } }, { hbr }).some((e) => e.includes('choices')));
  assert.ok(validateFamily({ ...ok, predictor: { predict() {}, options: [{ key: 'x', label: 'X', kind: 'toggle' }, { key: 'x', label: 'Y', kind: 'toggle' }] } }, { hbr }).some((e) => e.includes('repeats')));
  assert.deepEqual(validateFamily({ ...ok, predictor: { predict() {}, options: [{ key: 'x', label: 'X', kind: 'toggle' }] } }, { hbr }), []);
  assert.equal(validateFamily(null).length, 1);
});

test('registerFamily appends families in order, flattens their mechanisms and rejects collisions', () => {
  const reg = createFamilyRegistry();
  const mech = (id) => ({ id, name: id.toUpperCase(), fullName: id, frame: () => ({ atoms: [], bonds: [] }), steps: [{ id: 's', t: 0 }] });
  reg.registerFamily({ id: 'one', title: 'One', mechanisms: ['a', 'b'] }, { a: mech('a'), b: mech('b') });
  reg.registerFamily({ id: 'two', title: 'Two', mechanisms: ['c'], predictor: { options: [], predict: () => ({ pct: { c: 100, none: 0 }, ranked: [{ id: 'c', pct: 100 }], dominant: 'c', summary: '', reasons: [], warnings: [] }) } }, { c: mech('c') });
  assert.deepEqual(reg.FAMILY_ORDER, ['one', 'two']);
  assert.deepEqual(reg.MECHANISM_ORDER, ['a', 'b', 'c']);
  assert.equal(reg.familyOf('c').id, 'two');
  assert.equal(reg.familyOf('a').id, 'one');
  assert.throws(() => reg.registerFamily({ id: 'one', title: 'Again', mechanisms: ['a'] }), /already registered/);
  assert.throws(() => reg.registerFamily({ id: 'three', title: 'Three', mechanisms: ['a'] }), /already belongs to family "one"/);
  assert.throws(() => reg.registerFamily({ id: 'four', title: 'Four', mechanisms: ['zz'] }), /not registered/);
  assert.deepEqual(reg.FAMILY_ORDER, ['one', 'two'], 'failed registrations leave the registry untouched');
  assert.deepEqual(reg.MECHANISM_ORDER, ['a', 'b', 'c']);
  // The app-level registry is a separate instance.
  assert.deepEqual(FAMILY_ORDER, ['substitution-elimination']);
});

test('the Reaction lab search index walks families: family entry, mechanisms, steps and predictor vocabulary', () => {
  const entries = topic.index();
  const fam = entries.find((e) => e.href === '#mechanisms/substitution-elimination' && e.kind === 'group');
  assert.ok(fam, 'family entry');
  assert.equal(fam.title, 'Substitution & elimination');
  assert.ok(fam.keywords.includes('SN2') && fam.keywords.includes('E1'));
  for (const id of MECHANISM_ORDER) {
    assert.ok(entries.some((e) => e.kind === 'mechanism' && e.href === `#mechanisms/${id}`), `${id} mechanism entry`);
    for (const s of MECHANISMS[id].steps) assert.ok(entries.some((e) => e.kind === 'step' && e.href === `#mechanisms/${id}/${s.id}`), `${id}/${s.id} step entry`);
  }
  const pred = entries.find((e) => e.kind === 'item' && /which mechanism/i.test(e.title));
  assert.ok(pred, 'predictor entry');
  assert.equal(pred.href, '#mechanisms/substitution-elimination');
  assert.ok(pred.keywords.includes('predictor') && pred.keywords.includes('solvent') && pred.keywords.includes('leaving group'));
  assert.match(pred.snippet, /DMSO/);
});
