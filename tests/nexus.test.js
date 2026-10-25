import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOPICS, topicById } from '../src/topics/index.js';
import { template } from '../src/topics/_template/index.js';
import { GLOSSARY } from '../src/nexus/glossary.js';
import { buildIndex, search, allTerms, normalise } from '../src/nexus/search.js';
import { FUNCTIONAL_GROUPS } from '../src/chem/functionalGroups.js';
import { MECHANISMS, FAMILIES } from '../src/chem/mechanisms/index.js';

const termIds = new Set([...GLOSSARY, ...(template.glossary || [])].map((t) => t.id));

/** True when a deep link points at something that exists. */
function resolves(href) {
  const raw = href.replace(/^#/, '');
  const [head, a, b] = raw.split('/');
  if (head === 'glossary') return !a || termIds.has(a);
  if (head === 'functional-groups') return (!a || !!FUNCTIONAL_GROUPS[a]) && (!b || FUNCTIONAL_GROUPS[a].invariants.some((x) => x.id === b));
  if (head === 'mechanisms') return (!a || !!MECHANISMS[a] || (!!FAMILIES[a] && !b)) && (!b || !!MECHANISMS[a]?.steps.some((s) => s.id === b));
  return !!topicById(head) || head === template.id;
}

test('glossary terms are well formed and unique', () => {
  const ids = new Set();
  for (const t of GLOSSARY) {
    assert.match(t.id, /^[a-z0-9-]+$/, t.id);
    assert.ok(!ids.has(t.id), `duplicate ${t.id}`); ids.add(t.id);
    assert.ok(t.term && t.definition.length > 20, t.id);
  }
  assert.ok(GLOSSARY.length >= 40);
});

test('every cross-link resolves to a real topic, entity or term', () => {
  const hrefs = [];
  for (const t of GLOSSARY) for (const l of t.links || []) hrefs.push(l.href);
  for (const g of Object.values(FUNCTIONAL_GROUPS)) for (const inv of g.invariants) for (const l of inv.links || []) hrefs.push(l.href);
  for (const m of Object.values(MECHANISMS)) for (const l of m.related || []) hrefs.push(l.href);
  assert.ok(hrefs.length >= 60);
  for (const h of hrefs) assert.ok(resolves(h), `unresolved link ${h}`);
  assert.ok(Object.values(FUNCTIONAL_GROUPS).filter((g) => g.invariants.some((i) => i.links?.length)).length >= 8, 'most groups cross-link somewhere');
  for (const m of Object.values(MECHANISMS)) assert.ok(m.related?.length >= 3, `${m.id} has related links`);
});

test('search index covers topics, content and glossary; links in the index resolve', () => {
  const entries = buildIndex(TOPICS);
  assert.ok(entries.length > 150, `index size ${entries.length}`);
  for (const e of entries) { assert.ok(e.title && e.href, JSON.stringify(e).slice(0, 80)); assert.ok(resolves(e.href), `index href ${e.href}`); }
  const kinds = new Set(entries.map((e) => e.kind));
  for (const k of ['topic', 'group', 'mechanism', 'step', 'term', 'item']) assert.ok(kinds.has(k), k);
});

test('search ranks the obvious answers first and respects the audience level', () => {
  const entries = buildIndex(TOPICS);
  const top = (q, opts) => search(entries, q, opts).map((e) => e.href);
  assert.equal(top('sn2')[0], '#mechanisms/sn2');
  assert.equal(top('walden')[0], '#glossary/walden-inversion');
  assert.equal(top('phenol')[0], '#functional-groups/alcohol');
  assert.ok(top('leaving group').includes('#glossary/leaving-group'));
  assert.ok(top('anti periplanar').some((h) => h.startsWith('#mechanisms/e2') || h === '#glossary/anti-periplanar'));
  assert.ok(top('H₂O').length > 0, 'subscripts normalise');
  assert.equal(normalise('CH₃CH₂–Br'), 'ch3ch2-br');
  assert.deepEqual(top(''), []);
  const learnOnly = entries.filter((e) => e.audience === 'learn');
  assert.ok(learnOnly.length > 0);
  const q = learnOnly[0].title.split(':').pop().trim().split(' ').slice(0, 3).join(' ');
  assert.ok(!search(entries, q, { level: 'refresher' }).includes(learnOnly[0]), 'learn-only entries hidden in refresher');
});

test('glossary listing merges topic-contributed terms alphabetically', () => {
  const terms = allTerms([...TOPICS, template]);
  assert.ok(terms.some((t) => t.id === 'standing-wave' && t.topic === template.id));
  const names = terms.map((t) => t.term.toLowerCase());
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })));
});
