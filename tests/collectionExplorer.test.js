import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fakeDom.js';

installFakeDom();
const { CollectionExplorer, validateCollection, parseSub, subPath } = await import('../src/ui/collectionExplorer.js');
const { functionalGroupCollection, ExplorerPanel } = await import('../src/topics/functional-groups/panel.js');
const { FUNCTIONAL_GROUPS, FUNCTIONAL_GROUP_ORDER } = await import('../src/chem/functionalGroups.js');
const { h } = await import('../src/ui/dom.js');

/** A MoleculeView / viewport stand-in that records calls. */
function fakeView() {
  const calls = [];
  const view = {
    frame: null, highlights: null, arrows: null, options: {},
    setFrame(f) { this.frame = f; calls.push('setFrame'); }, setArrows(a) { this.arrows = a; calls.push('setArrows'); },
    setHighlights(hl) { this.highlights = hl; calls.push('setHighlights'); }, setOptions(o) { Object.assign(this.options, o); }, bounds: () => ({ min: [0, 0, 0], max: [1, 1, 1] }),
  };
  const viewport = { fits: 0, autoRotate: null, fitTo() { this.fits++; }, setAutoRotate(v) { this.autoRotate = v; } };
  return { view, viewport, calls };
}

test('validateCollection and the hash helpers', () => {
  assert.deepEqual(validateCollection(functionalGroupCollection), []);
  assert.ok(validateCollection({}).some((e) => e.includes('kebab-case')));
  assert.ok(validateCollection({ id: 'x', items: [], chips() {} }).some((e) => e.includes('non-empty')));
  assert.ok(validateCollection({ id: 'x', items: [{ id: 'a' }, { id: 'a' }], chips() {} }).some((e) => e.includes('repeats')));
  assert.ok(validateCollection({ id: 'x', items: [{ id: 'a' }] }).some((e) => e.includes('chips')));
  assert.ok(validateCollection({ id: 'x', items: [{ id: 'a' }], chips() {}, build: 3 }).some((e) => e.includes('build')));
  assert.throws(() => new CollectionExplorer({ id: 'bad id' }), /Invalid collection/);
  assert.deepEqual(parseSub('alcohol/acid'), { itemId: 'alcohol', invId: 'acid' });
  assert.deepEqual(parseSub(''), { itemId: '', invId: '' });
  assert.equal(subPath('alcohol', null), 'alcohol');
  assert.equal(subPath('alcohol', 'acid'), 'alcohol/acid');
});

test('a minimal collection renders chips, optional sections and live guide blocks', () => {
  const items = [{ id: 'a', name: 'Alpha' }, { id: 'b', name: 'Beta' }];
  let builds = 0;
  const changes = [];
  const ex = new CollectionExplorer({
    id: 'demo', items, chips: (it) => ({ pattern: it.id.toUpperCase(), name: it.name, color: '#123456' }),
    initialState: () => ({ n: 1 }),
    build: (it, s) => { builds++; return { title: `${it.name} ${s.n}` }; },
    controls: (it, s, api) => [h('button', { class: 'bump', onClick: () => api.setState({ n: s.n + 1 }) }, '+')],
    card: (it, s, built) => [h('div', { class: 'mol-name' }, built.title)],
    guide: (it, api) => [api.live((s) => h('span', { class: 'live' }, `n=${s.n}`), { class: 'block' })],
  }, { navigate: (p) => changes.push(p), onChange: (ctx) => changes.push(ctx.built.title) });
  ex.update();
  assert.equal(ex.el.querySelectorAll('.chip').length, 2);
  assert.equal(ex.el.querySelectorAll('.chip.active').length, 1);
  assert.equal(ex.el.querySelector('.chip').getAttribute('aria-pressed'), 'true');
  assert.equal(ex.el.querySelector('.chip').style['--fg'], '#123456');
  assert.equal(ex.el.querySelectorAll('.sec').length, 2, 'chips + build sections; no footer');
  assert.equal(ex.inspector.querySelectorAll('.invariants').length, 0, 'no invariants section when there are none');
  assert.equal(ex.inspector.querySelector('.mol-name').textContent, 'Alpha 1');
  assert.equal(ex.inspector.querySelector('.live').textContent, 'n=1');
  ex.el.querySelector('.bump').click();
  assert.equal(ex.inspector.querySelector('.mol-name').textContent, 'Alpha 2');
  assert.equal(ex.inspector.querySelector('.live').textContent, 'n=2', 'live block re-rendered on update');
  ex.el.querySelectorAll('.chip')[1].click();
  assert.equal(ex.itemId, 'b');
  assert.deepEqual(ex.state, { n: 1 }, 'state resets per item');
  assert.equal(ex.inspector.querySelector('.mol-name').textContent, 'Beta 1');
  assert.deepEqual(changes.filter((c) => c.startsWith('demo/')), ['demo/b'], 'chip click syncs the hash');
  assert.ok(builds >= 3);
  ex.navigate('zzz/zzz');
  assert.equal(ex.itemId, 'b', 'unknown deep links are ignored');
});

test('the functional-group panel keeps its DOM, deep links and 3D wiring on top of the explorer', () => {
  const { view, viewport, calls } = fakeView();
  const hashes = [];
  const panel = new ExplorerPanel({ view, viewport, level: 'learn', navigate: (p) => hashes.push(p) });
  assert.equal(panel.fgId, 'alcohol');
  assert.ok(panel.el.classList.contains('explorer') && panel.inspector.classList.contains('study-guide'));
  // Left column: chips, build controls, View section. Inspector: card, invariants, varies, identify, R notes.
  assert.equal(panel.el.querySelectorAll('.chip').length, FUNCTIONAL_GROUP_ORDER.length);
  assert.deepEqual(panel.el.children.map((n) => n.querySelector('.sec-title')?.textContent), ['The collection', 'Build the molecule', 'View']);
  assert.equal(panel.el.querySelectorAll('.toggles .toggle').length, 5);
  assert.ok(panel.el.querySelector('.legend'));
  panel.activate();
  assert.equal(viewport.autoRotate, false);
  assert.ok(view.frame?.atoms?.length > 0, 'frame sent to the view');
  assert.deepEqual(view.arrows, []);
  assert.deepEqual(view.highlights, []);
  assert.ok(viewport.fits >= 1);
  assert.equal(document.getElementById('workspace-name').textContent, 'ethanol');
  assert.equal(panel.inspector.children[0].className, 'card molecule-card');
  assert.equal(panel.inspector.querySelector('.mol-name').textContent, 'Alcohol');
  assert.equal(panel.inspector.querySelector('.formula').textContent, 'C₂H₆O');
  assert.equal(panel.inspector.querySelectorAll('.sec-title')[0].textContent, 'Always true for every alcohol');
  assert.equal(panel.inspector.querySelectorAll('.invariant').length, FUNCTIONAL_GROUPS.alcohol.invariants.length);
  assert.ok(panel.inspector.querySelectorAll('.varies li').length >= 2 && panel.inspector.querySelectorAll('.identify li').length >= 2);
  assert.equal(panel.inspector.querySelector('.rnotes').parentNode.dataset.audience, 'learn', 'R notes section is learn-only');
  assert.match(panel.inspector.querySelector('.rnote').textContent, /R = CH₂CH₃ \(ethyl\)/);
  // Audience tags come through on invariant cards and varies items.
  const both = FUNCTIONAL_GROUPS.alcohol.varies.find((x) => x.audience === 'both');
  assert.ok(both);
  assert.ok(panel.inspector.querySelectorAll('.varies li').some((li) => li.dataset.audience === undefined && li.textContent.includes(both.title)));
  // Deep link to an invariant: selected card shows its detail and links; highlights = its visuals.
  panel.navigate('alcohol/lp');
  const active = panel.inspector.querySelector('.invariant.active');
  assert.equal(active.dataset.id, 'lp');
  assert.ok(active.querySelector('.inv-detail'));
  assert.equal(active.querySelectorAll('.xlink').length, FUNCTIONAL_GROUPS.alcohol.invariants.find((x) => x.id === 'lp').links.length);
  assert.deepEqual(view.highlights, FUNCTIONAL_GROUPS.alcohol.invariants.find((x) => x.id === 'lp').visuals);
  // Clicking the active card deselects it and syncs the hash.
  active.click();
  assert.equal(panel.selected, null);
  assert.deepEqual(view.highlights, []);
  assert.equal(hashes.at(-1), 'functional-groups/alcohol');
  // Changing an R group rebuilds the molecule and the live R notes.
  const sel = panel.el.querySelectorAll('.sec')[1].querySelector('select');
  sel.value = 'phenyl'; sel.dispatch('change');
  assert.equal(panel.choice.R.R1, 'phenyl');
  assert.equal(document.getElementById('workspace-name').textContent, 'phenol');
  assert.match(panel.inspector.querySelector('.rnote').textContent, /phenyl/);
  assert.match(panel.inspector.querySelector('.mol-class').textContent, /PHENOL/);
  // Deep link to another group with an invariant.
  panel.navigate('haloalkane/cx');
  assert.equal(panel.fgId, 'haloalkane');
  assert.equal(panel.selected, FUNCTIONAL_GROUPS.haloalkane.invariants.some((x) => x.id === 'cx') ? 'cx' : null);
  assert.ok(panel.el.querySelectorAll('.sec')[1].textContent.includes('Halogen'), 'variant select appears for haloalkanes');
  assert.equal(panel.el.querySelector('.chip.active').dataset.id, 'haloalkane');
  // Chip click resets the choice and clears the selection.
  const ketoneChip = panel.el.querySelectorAll('.chip').find((c) => c.dataset.id === 'ketone');
  ketoneChip.click();
  assert.equal(panel.fgId, 'ketone');
  assert.equal(panel.selected, null);
  assert.equal(hashes.at(-1), 'functional-groups/ketone');
  assert.equal(panel.inspector.querySelectorAll('.sec-title')[0].textContent, 'Always true for every ketone');
  panel.setLevel('refresher');
  assert.equal(panel.explorer.level, 'refresher');
  panel.deactivate();
  assert.equal(viewport.autoRotate, false);
  assert.ok(calls.includes('setFrame') && calls.includes('setHighlights'));
});
