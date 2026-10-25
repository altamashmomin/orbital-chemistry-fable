import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FUNCTIONAL_GROUPS, FUNCTIONAL_GROUP_ORDER } from '../src/chem/functionalGroups.js';
import { MECHANISMS, MECHANISM_ORDER } from '../src/chem/mechanisms/index.js';
import { audienceOf, isValidAudience, visibleAt, listAudience, textOf, DEFAULTS } from '../src/chem/audience.js';

test('every content item has a valid effective audience', () => {
  for (const id of FUNCTIONAL_GROUP_ORDER) {
    const g = FUNCTIONAL_GROUPS[id];
    for (const [coll, items] of [['invariants', g.invariants], ['varies', g.varies], ['identify', g.identify]]) {
      for (const it of items) { assert.ok(isValidAudience(audienceOf(it, coll)), `${id}/${coll}: ${textOf(it).slice(0, 30)}`); assert.ok(textOf(it).length > 3); }
    }
  }
  for (const id of MECHANISM_ORDER) {
    const m = MECHANISMS[id];
    for (const k of m.keyIdeas) assert.ok(isValidAudience(audienceOf(k, 'keyIdeas')));
    for (const s of m.steps) for (const k of s.keyPoints) assert.ok(isValidAudience(audienceOf(k, 'keyPoints')));
  }
  for (const v of Object.values(DEFAULTS)) assert.ok(isValidAudience(v));
});

test('refresher keeps the facts and learn adds the reasoning', () => {
  for (const id of FUNCTIONAL_GROUP_ORDER) {
    const g = FUNCTIONAL_GROUPS[id];
    assert.ok(g.invariants.filter((x) => visibleAt(x, 'invariants', 'refresher')).length >= 4, `${id}: invariants stay in refresher`);
    assert.ok(g.identify.every((x) => visibleAt(x, 'identify', 'refresher')), `${id}: recognition stays in refresher`);
  }
  const withLearnNotes = FUNCTIONAL_GROUP_ORDER.filter((id) => FUNCTIONAL_GROUPS[id].varies.some((x) => !visibleAt(x, 'varies', 'refresher')));
  assert.ok(withLearnNotes.length >= 12, `most groups keep some learn-only R-group notes (${withLearnNotes.length}/15)`);
  let structural = 0;
  for (const id of FUNCTIONAL_GROUP_ORDER) structural += FUNCTIONAL_GROUPS[id].varies.filter((x) => audienceOf(x, 'varies') === 'both').length;
  assert.ok(structural >= 12, 'structural classifications (degree, E/Z, terminal vs internal …) are tagged for both');
  for (const id of MECHANISM_ORDER) {
    const m = MECHANISMS[id];
    assert.ok(m.keyIdeas.some((k) => audienceOf(k, 'keyIdeas') === 'both'), `${id}: has a rule-like key idea for refresher`);
    assert.ok(m.keyIdeas.some((k) => audienceOf(k, 'keyIdeas') === 'learn'), `${id}: has explanatory key ideas for learn`);
    assert.equal(listAudience(m.keyIdeas, 'keyIdeas'), null, `${id}: key ideas are mixed, so the section stays visible`);
    for (const s of m.steps) assert.ok(s.keyPoints.some((k) => audienceOf(k, 'keyPoints') === 'both'), `${id}/${s.id}: each step keeps one fact in refresher`);
  }
});
