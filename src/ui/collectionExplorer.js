// CollectionExplorer: the panel shape shared by "a collection of things you pick one of, build,
// and read invariants about" (functional groups today; VSEPR shapes, ligands, orbitals and
// complexes next). It renders, in order,
//   chips → build controls → entity card → invariant cards → field guide
// splits them between the left column (`el`: chips, controls, footer) and the inspector
// (`inspector`: card, invariants, guide), keeps the hash in sync (#<id>/<item>/<invariant>),
// and owns selection state. It knows nothing about chemistry: the collection definition does.
//
// collection = {
//   id: 'functional-groups',                       // hash head for deep links
//   items: [{ id, name, … }],                      // in chip order
//   chips: (item) => ({ pattern, name, color? }),   // chip content (pattern = short formula tile)
//   initialState?: (item) => state,                // per-item mutable state (e.g. { choice }); default {}
//   build?: (item, state) => built,                // anything the card / guide need; `built.frame` is sent to the 3D view, `built.title` to the workspace heading
//   controls?: (item, state, api) => node[],       // "build" rows; call api.update() after changing state
//   card?: (item, state, built) => node[],         // children of the entity card
//   invariants?: (item) => [{ id, title, detail, links?, visuals?, audience? }],
//   guide?: (item, api) => node[],                 // field-guide sections; api.live(fn) gives a block re-rendered on every update
//   titles?: { collection?, build?, invariants?: string | (item) => string },
//   highlights?: (invariant, item, state, built) => visuals[],   // default: invariant.visuals
// }
// options = { view?, viewport?, navigate?, level?, footer?: node | node[] | () => node[], onChange?: (ctx) => void }
// With `view` (a MoleculeView) the explorer applies the standard 3D wiring itself: setFrame,
// setArrows([]), highlights for the selected invariant, fitTo, workspace heading.
import { h, clear, fill, section, aud } from './dom.js';
import { audienceOf } from '../chem/audience.js';

const DEFAULT_TITLES = {
  collection: 'The collection',
  build: 'Build the molecule',
  invariants: (item) => `Always true for every ${String(item.name || item.id).toLowerCase()}`,
};

/** Return a list of problems with a collection definition (empty when valid). */
export function validateCollection(c) {
  const errors = [];
  if (!c || typeof c !== 'object') return ['collection is not an object'];
  if (!/^[a-z][a-z0-9-]*$/.test(c.id || '')) errors.push('id must be kebab-case (a-z, 0-9, -)');
  if (!Array.isArray(c.items) || !c.items.length) errors.push('items must be a non-empty array');
  else {
    const ids = new Set();
    for (const it of c.items) {
      if (!it || typeof it.id !== 'string' || !it.id) { errors.push('every item needs a string id'); break; }
      if (ids.has(it.id)) errors.push(`item id "${it.id}" repeats`);
      ids.add(it.id);
    }
  }
  if (typeof c.chips !== 'function') errors.push('chips(item) must be a function');
  for (const k of ['initialState', 'build', 'controls', 'card', 'invariants', 'guide', 'highlights']) if (c[k] !== undefined && typeof c[k] !== 'function') errors.push(`${k} must be a function`);
  return errors;
}

/** Split a deep-link sub path '<item>/<invariant>' into its parts. */
export const parseSub = (sub = '') => { const [itemId = '', invId = ''] = String(sub).split('/'); return { itemId, invId }; };
/** Hash sub path for an item and optional invariant: 'alcohol' or 'alcohol/acid'. */
export const subPath = (itemId, invId) => `${itemId}${invId ? `/${invId}` : ''}`;

export class CollectionExplorer {
  constructor(collection, { view = null, viewport = null, navigate = null, level = 'learn', footer = null, onChange = null } = {}) {
    const errors = validateCollection(collection);
    if (errors.length) throw new Error(`Invalid collection "${collection?.id}": ${errors.join('; ')}`);
    this.collection = collection;
    this.view = view; this.viewport = viewport; this.nav = navigate; this.level = level;
    this.footer = footer; this.onChange = onChange;
    this.titles = { ...DEFAULT_TITLES, ...(collection.titles || {}) };
    this.itemId = collection.items[0].id;
    this.state = collection.initialState?.(this.item) ?? {};
    this.selected = null;          // selected invariant id
    this.built = null;
    this.live = [];                // [{ el, render }] blocks re-rendered on every update
    this.el = h('div', { class: `panel-inner explorer ${collection.id}` });
    this.inspector = h('div', { class: 'panel-inner study-guide' });
    this.api = {
      update: (refit = false) => this.update(refit),
      setState: (patch) => { Object.assign(this.state, patch); this.update(); },
      select: (id) => { this.setItem(id); this.syncHash(); },
      selectInvariant: (id) => this.selectInvariant(id),
      live: (render, attrs = {}) => { const el = h('div', attrs); this.live.push({ el, render }); return el; },
      get item() { return this.explorer.item; }, get state() { return this.explorer.state; }, get built() { return this.explorer.built; }, get level() { return this.explorer.level; },
      explorer: this,
    };
    this.render();
  }

  get item() { return this.collection.items.find((x) => x.id === this.itemId) || this.collection.items[0]; }
  itemById(id) { return this.collection.items.find((x) => x.id === id) || null; }

  /** Switch item: fresh per-item state, nothing selected, full re-render, fitted view. */
  setItem(id) {
    if (!this.itemById(id)) return;
    this.itemId = id;
    this.state = this.collection.initialState?.(this.item) ?? {};
    this.selected = null;
    this.render();
    this.update(true);
  }

  /** Toggle an invariant card (same id again deselects). */
  selectInvariant(id) {
    this.selected = this.selected === id ? null : id;
    this.update();
    this.syncHash();
  }

  /** Deep link: 'alcohol' or 'alcohol/acid' (item id, optional invariant id). Unknown parts are ignored. */
  navigate(sub = '') {
    const { itemId, invId } = parseSub(sub);
    if (itemId && this.itemById(itemId) && itemId !== this.itemId) this.setItem(itemId);
    if (invId && this.invariants().some((x) => x.id === invId)) { this.selected = invId; this.update(); }
  }

  syncHash() { this.nav?.(`${this.collection.id}/${subPath(this.itemId, this.selected)}`); }
  setLevel(level) { this.level = level; }
  activate() { this.update(true); }
  deactivate() {}

  invariants() { return this.collection.invariants?.(this.item) || []; }
  selectedInvariant() { return this.invariants().find((x) => x.id === this.selected) || null; }
  title(key) { const t = this.titles[key]; return typeof t === 'function' ? t(this.item) : t; }

  /** Build the static DOM for the current item (chips, controls, card shell, invariants shell, guide, footer). */
  render() {
    const c = this.collection, item = this.item;
    clear(this.el); clear(this.inspector);
    this.live = [];
    this.refs = {};
    const chipsSec = section(this.title('collection'),
      h('div', { class: 'chips' }, c.items.map((it) => {
        const chip = c.chips(it) || {};
        return h('button', { class: `chip ${it.id === this.itemId ? 'active' : ''}`, 'aria-pressed': String(it.id === this.itemId), dataset: { id: it.id }, style: chip.color ? { '--fg': chip.color } : null, title: chip.title || null, onClick: () => this.api.select(it.id) },
          h('span', { class: 'chip-pattern' }, chip.pattern ?? ''), h('span', { class: 'chip-name' }, chip.name ?? it.name ?? it.id));
      })));
    const controls = (c.controls?.(item, this.state, this.api) || []).flat(Infinity).filter(Boolean);
    const buildSec = controls.length ? section(this.title('build'), ...controls) : null;
    this.refs.card = h('div', { class: 'card molecule-card' });
    this.refs.inv = h('div', { class: 'invariants' });
    const invSec = this.invariants().length ? section(this.title('invariants'), this.refs.inv) : null;
    const guide = (c.guide?.(item, this.api) || []).flat(Infinity).filter(Boolean);
    const footer = typeof this.footer === 'function' ? this.footer(this.api) : this.footer;
    this.el.append(...[chipsSec, buildSec, footer].flat(Infinity).filter(Boolean));
    this.inspector.append(...[c.card ? this.refs.card : null, invSec, guide].flat(Infinity).filter(Boolean));
  }

  /** Re-build the item, refresh the card, invariant cards and live guide blocks, and wire the 3D view. */
  update(refit = false) {
    const c = this.collection, item = this.item, state = this.state;
    this.built = c.build ? c.build(item, state) : null;
    const built = this.built;
    if (c.card) fill(this.refs.card, ...[c.card(item, state, built)].flat(Infinity));
    const color = c.chips(item)?.color;
    fill(this.refs.inv, this.invariants().map((inv) => aud(h('button', {
      class: `invariant ${this.selected === inv.id ? 'active' : ''}`, dataset: { id: inv.id }, style: color ? { '--fg': color } : null,
      onClick: () => this.selectInvariant(inv.id),
    }, h('div', { class: 'inv-title' }, inv.title),
      this.selected === inv.id ? h('p', { class: 'inv-detail' }, inv.detail) : null,
      this.selected === inv.id && inv.links?.length ? h('div', { class: 'xlinks' }, inv.links.map((l) => h('a', { class: 'xlink', href: l.href, onClick: (e) => e.stopPropagation() }, l.label))) : null,
    ), audienceOf(inv, 'invariants'))));
    for (const block of this.live) fill(block.el, ...[block.render(state, built, item)].flat(Infinity));
    const selected = this.selectedInvariant();
    const visuals = selected ? (c.highlights ? c.highlights(selected, item, state, built) : selected.visuals) || [] : [];
    if (this.view) {
      if (built?.frame) this.view.setFrame(built.frame);
      this.view.setArrows?.([]);
      this.view.setHighlights(visuals);
      if (built?.frame) this.viewport?.fitTo(this.view.bounds(), 1.05, true);
      const heading = typeof document !== 'undefined' ? document.getElementById?.('workspace-name') : null;
      if (heading && built && 'title' in built) heading.textContent = built.title ?? '';
    }
    this.onChange?.({ item, state, built, selected, visuals, refit, explorer: this });
  }
}
