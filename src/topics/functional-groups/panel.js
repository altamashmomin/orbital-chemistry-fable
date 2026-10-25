// Functional-group explorer panel: a CollectionExplorer over the 15 groups, with the builder's
// R-group / halogen controls, the molecule card, the invariant cards and the field guide.
import { h, select, toggle, section, aud } from '../../ui/dom.js';
import { CollectionExplorer } from '../../ui/collectionExplorer.js';
import { FUNCTIONAL_GROUPS, FUNCTIONAL_GROUP_ORDER } from '../../chem/functionalGroups.js';
import { R_GROUPS, R_GROUP_ORDER } from '../../chem/rGroups.js';
import { makeMolecule, defaultChoice } from '../../chem/builder.js';
import { ELEMENTS } from '../../chem/elements.js';
import { audienceOf, textOf, listAudience } from '../../chem/audience.js';

/** The functional-group collection: what the explorer needs to render each group. */
export const functionalGroupCollection = {
  id: 'functional-groups',
  items: FUNCTIONAL_GROUP_ORDER.map((id) => FUNCTIONAL_GROUPS[id]),
  chips: (fg) => ({ pattern: fg.pattern, name: fg.name, color: fg.color }),
  initialState: (fg) => ({ choice: defaultChoice(fg) }),
  build: (fg, state) => { const { mol, frame } = makeMolecule(fg.id, state.choice); return { mol, frame, title: mol.meta.name }; },
  controls: (fg, state, api) => [
    fg.variants ? h('div', { class: 'row' }, h('label', {}, 'Halogen'), select(fg.variants, state.choice.variant, (v) => { state.choice.variant = v; api.update(); })) : null,
    ...fg.attachments.map((att) => h('div', { class: 'row' },
      h('label', {}, att.label),
      select(R_GROUP_ORDER.map((id) => ({ id, label: `${R_GROUPS[id].label}  (${R_GROUPS[id].name})` })), state.choice.R[att.id], (v) => { state.choice.R[att.id] = v; api.update(); }),
    )),
    aud(h('div', { class: 'hint' }, 'Swap R groups and watch which properties stay fixed. The highlighted cards below are true for every member of the class.'), 'learn'),
  ],
  card: (fg, state, built) => {
    const m = built.mol.meta;
    return [
      h('div', { class: 'mol-pattern' }, fg.pattern),
      h('div', { class: 'mol-name' }, fg.name),
      h('div', { class: 'mol-meta' }, h('span', { class: 'formula' }, m.formula), h('span', { class: 'pattern' }, m.name)),
      m.classification ? h('div', { class: 'mol-class' }, m.classification) : null,
    ];
  },
  invariants: (fg) => fg.invariants,
  guide: (fg, api) => [
    aud(section('What the R group changes',
      h('ul', { class: 'varies' }, fg.varies.map((x) => aud(h('li', {}, h('details', {}, h('summary', {}, x.title), h('p', {}, x.detail))), audienceOf(x, 'varies'))))), listAudience(fg.varies, 'varies')),
    section('How to recognise it (spectroscopy & tests)',
      h('ul', { class: 'identify' }, fg.identify.map((x) => aud(h('li', {}, textOf(x)), audienceOf(x, 'identify'))))),
    aud(section('About the current R groups', api.live((state) => fg.attachments.map((att) => {
      const rg = R_GROUPS[state.choice.R[att.id]];
      return h('div', { class: 'rnote' }, h('b', {}, `${att.label} = ${rg.label} (${rg.name}). `), h('span', {}, `${rg.electronic}. ${rg.note}`));
    }), { class: 'rnotes' })), 'learn'),
  ],
  titles: { invariants: (fg) => `Always true for every ${fg.name.toLowerCase()}` },
};

export class ExplorerPanel {
  constructor({ view, viewport, level = 'learn', navigate = null }) {
    this.view = view; this.viewport = viewport; this.level = level;
    this.opts = { lonePairs: true, hydrogens: true, labels: true, autoRotate: false, orbitals: true };
    this.explorer = new CollectionExplorer(functionalGroupCollection, { view, viewport, navigate, level, footer: () => this.viewSection() });
    this.el = this.explorer.el;
    this.inspector = this.explorer.inspector;
  }

  activate() {
    this.view.setOptions({ lonePairs: this.opts.lonePairs, hydrogens: this.opts.hydrogens, labels: this.opts.labels, orbitals: this.opts.orbitals, arrows: false, highlights: true });
    this.viewport.setAutoRotate(this.opts.autoRotate);
    this.explorer.update(true);
  }
  deactivate() { this.viewport.setAutoRotate(false); }
  setLevel(level) { this.level = level; this.explorer.setLevel(level); }
  navigate(sub) { this.explorer.navigate(sub); }

  get fgId() { return this.explorer.itemId; }
  get fg() { return this.explorer.item; }
  get selected() { return this.explorer.selected; }
  get choice() { return this.explorer.state.choice; }
  setGroup(id) { this.explorer.setItem(id); }
  update(refit) { this.explorer.update(refit); }

  viewSection() {
    return section('View',
      h('div', { class: 'toggles' },
        toggle('Lone pairs', this.opts.lonePairs, (v) => { this.opts.lonePairs = v; this.view.setOptions({ lonePairs: v }); }),
        toggle('Hydrogens', this.opts.hydrogens, (v) => { this.opts.hydrogens = v; this.view.setOptions({ hydrogens: v }); }),
        toggle('Labels', this.opts.labels, (v) => { this.opts.labels = v; this.view.setOptions({ labels: v }); }),
        toggle('p orbitals', this.opts.orbitals, (v) => { this.opts.orbitals = v; this.view.setOptions({ orbitals: v }); }),
        toggle('Auto-rotate', this.opts.autoRotate, (v) => { this.opts.autoRotate = v; this.viewport.setAutoRotate(v); }),
      ),
      h('button', { class: 'btn', onClick: () => this.viewport.fitTo(this.view.bounds()) }, 'Re-centre view'),
      h('div', { class: 'legend' }, ['H', 'C', 'N', 'O', 'S', 'F', 'Cl', 'Br', 'I'].map((el) => h('span', { class: 'swatch' }, h('i', { style: { background: ELEMENTS[el].color } }), el)),
        h('span', { class: 'swatch' }, h('i', { style: { background: '#fde68a' } }), 'lone pair'), h('span', { class: 'swatch' }, h('i', { style: { background: '#f0abfc' } }), 'p orbital')),
    );
  }
}
