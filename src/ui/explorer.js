// Functional-group explorer panel.
import { h, clear, fill, select, toggle, section } from './dom.js';
import { FUNCTIONAL_GROUPS, FUNCTIONAL_GROUP_ORDER } from '../chem/functionalGroups.js';
import { R_GROUPS, R_GROUP_ORDER } from '../chem/rGroups.js';
import { makeMolecule, defaultChoice } from '../chem/builder.js';
import { ELEMENTS } from '../chem/elements.js';

export class ExplorerPanel {
  constructor({ view, viewport }) {
    this.view = view; this.viewport = viewport;
    this.fgId = 'alcohol';
    this.choice = defaultChoice(FUNCTIONAL_GROUPS[this.fgId]);
    this.selected = null;          // selected invariant id
    this.opts = { lonePairs: true, hydrogens: true, labels: true, autoRotate: false, orbitals: true };
    this.el = h('div', { class: 'panel-inner explorer' });
    this.render();
  }

  activate() {
    this.view.setOptions({ lonePairs: this.opts.lonePairs, hydrogens: this.opts.hydrogens, labels: this.opts.labels, orbitals: this.opts.orbitals, arrows: false, highlights: true });
    this.viewport.setAutoRotate(this.opts.autoRotate);
    this.update(true);
  }
  deactivate() { this.viewport.setAutoRotate(false); }

  get fg() { return FUNCTIONAL_GROUPS[this.fgId]; }

  setGroup(id) {
    this.fgId = id;
    this.choice = defaultChoice(this.fg);
    this.selected = null;
    this.render();
    this.update(true);
  }

  render() {
    const fg = this.fg;
    clear(this.el);
    this.el.append(
      section('Functional group',
        h('div', { class: 'chips' }, FUNCTIONAL_GROUP_ORDER.map((id) => {
          const g = FUNCTIONAL_GROUPS[id];
          return h('button', { class: `chip ${id === this.fgId ? 'active' : ''}`, style: { '--fg': g.color }, onClick: () => this.setGroup(id) },
            h('span', { class: 'chip-pattern' }, g.pattern), h('span', { class: 'chip-name' }, g.name));
        })),
      ),
      section('Build the molecule',
        fg.variants ? h('div', { class: 'row' }, h('label', {}, 'Halogen'), select(fg.variants, this.choice.variant, (v) => { this.choice.variant = v; this.update(); })) : null,
        ...fg.attachments.map((att) => h('div', { class: 'row' },
          h('label', {}, att.label),
          select(R_GROUP_ORDER.map((id) => ({ id, label: `${R_GROUPS[id].label}  (${R_GROUPS[id].name})` })), this.choice.R[att.id], (v) => { this.choice.R[att.id] = v; this.update(); }),
        )),
        h('div', { class: 'hint' }, 'Swap R groups and watch which properties stay fixed. The highlighted cards below are true for every member of the class.'),
      ),
      h('div', { class: 'card molecule-card', ref: 'mol' }),
      section(`Always true for every ${fg.name.toLowerCase()}`,
        h('div', { class: 'invariants', ref: 'inv' })),
      section('What the R group changes',
        h('ul', { class: 'varies' }, fg.varies.map((x) => h('li', {}, h('details', {}, h('summary', {}, x.title), h('p', {}, x.detail)))))),
      section('How to recognise it (spectroscopy & tests)',
        h('ul', { class: 'identify' }, fg.identify.map((x) => h('li', {}, x)))),
      section('About the current R groups', h('div', { class: 'rnotes', ref: 'rnotes' })),
      section('View',
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
      ),
    );
    this.refs = {};
    this.el.querySelectorAll('[ref]').forEach((n) => { this.refs[n.getAttribute('ref')] = n; });
  }

  update(refit = false) {
    const { mol, frame } = makeMolecule(this.fgId, this.choice);
    this.mol = mol; this.frame = frame;
    this.view.setFrame(frame);
    this.view.setArrows([]);
    this.applyHighlights();
    if (refit) this.viewport.fitTo(this.view.bounds());
    else this.viewport.fitTo(this.view.bounds(), 1.35, true);

    const m = mol.meta;
    fill(this.refs.mol,
      h('div', { class: 'mol-name' }, m.name),
      h('div', { class: 'mol-meta' }, h('span', { class: 'formula' }, m.formula), h('span', { class: 'pattern', style: { color: this.fg.color } }, this.fg.pattern)),
      m.classification ? h('div', { class: 'mol-class' }, m.classification) : null,
    );

    fill(this.refs.inv, this.fg.invariants.map((inv) => h('button', {
      class: `invariant ${this.selected === inv.id ? 'active' : ''}`, style: { '--fg': this.fg.color },
      onClick: () => { this.selected = this.selected === inv.id ? null : inv.id; this.update(); },
    }, h('div', { class: 'inv-title' }, inv.title), this.selected === inv.id ? h('p', { class: 'inv-detail' }, inv.detail) : null)));

    fill(this.refs.rnotes, this.fg.attachments.map((att) => {
      const rg = R_GROUPS[this.choice.R[att.id]];
      return h('div', { class: 'rnote' }, h('b', {}, `${att.label} = ${rg.label} (${rg.name}). `), h('span', {}, `${rg.electronic}. ${rg.note}`));
    }));
  }

  applyHighlights() {
    const inv = this.fg.invariants.find((x) => x.id === this.selected);
    this.view.setHighlights(inv ? inv.visuals : []);
  }
}
