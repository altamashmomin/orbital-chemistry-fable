// Molecular shapes panel: a CollectionExplorer over the curated VSEPR set (src/chem/shapes.js) with a
// shape card (domains, bonds and lone pairs as drawn, angles with their status, a 2D sketch that reads
// without WebGL), invariant cards with 3D highlights, predict-observe-explain activities and links into
// the lessons the shapes explain.
import { h, section, aud, toggle } from '../../ui/dom.js';
import { CollectionExplorer } from '../../ui/collectionExplorer.js';
import { drawWedgeDash } from '../../ui/overlays.js';
import { SHAPES, SHAPE_FAMILIES, buildShape, ANGLE_STATUS } from '../../chem/shapes.js';
import { ACTIVITIES, correctOption } from './activities.js';
import { ELEMENTS } from '../../chem/elements.js';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** One line of status for a displayed angle: what the number is and where it comes from. */
export function angleStatusText(a) {
  if (a.status === 'measured') return `measured (${a.exemplar})`;
  if (a.status === 'class') return `class value, from ${a.exemplar}`;
  if (a.status === 'fallback') return ANGLE_STATUS.fallback;
  if (a.status === 'derived') return ANGLE_STATUS.derived;
  return a.measured != null ? `ideal VSEPR; measured ${a.measured.toFixed(1)}°` : 'ideal, fixed by symmetry';
}

export function makeShapesCollection(panel) {
  return {
    id: 'molecular-shapes',
    items: SHAPES,
    chips: (s) => ({ pattern: s.formula, name: s.name, color: SHAPE_FAMILIES[s.family]?.color, title: `${SHAPE_FAMILIES[s.family]?.label}: ${s.shape}` }),
    build: (s) => buildShape(s.id),
    card: (s, state, built) => {
      panel.sketch = h('canvas', { class: 'overlay-canvas shape-sketch', 'aria-label': `Wedge and dash sketch of ${s.name}` });
      return [
        h('div', { class: 'mol-pattern' }, s.formula),
        h('div', { class: 'mol-name' }, s.name),
        h('div', { class: 'mol-meta' }, h('span', { class: 'formula' }, plural(built.domains, 'electron domain')), h('span', { class: 'pattern' }, `${plural(built.bonds, 'bond')} + ${plural(built.lonePairs, 'lone pair')} on ${s.centre}`)),
        h('dl', { class: 'shape-facts' },
          h('dt', {}, 'Domain arrangement'), h('dd', {}, s.arrangement),
          h('dt', {}, 'Molecular shape'), h('dd', {}, s.shape)),
        h('div', { class: 'shape-angles' }, built.angles.map((a) => h('div', { class: `shape-angle status-${a.status}` },
          h('b', {}, a.label), h('span', { class: 'value' }, `${a.value.toFixed(1)}°`), h('span', { class: 'status' }, angleStatusText(a))))),
        panel.sketch,
        s.related?.length ? h('div', { class: 'xlinks' }, s.related.map((l) => h('a', { class: 'xlink', href: l.href }, l.label))) : null,
      ];
    },
    invariants: (s) => s.invariants,
    guide: (s, api) => [
      section('Predict, then look', ...ACTIVITIES.map((act) => panel.activityBlock(act, api))),
      aud(section('Where the numbers come from', api.live((state, built) => h('ul', { class: 'identify' }, built.angles.map((a) => h('li', {},
        h('b', {}, `${a.label} ${a.value.toFixed(1)}°: `), a.status === 'ideal' ? (a.measured != null ? `the model draws the ideal ${a.ideal}°; measured ${a.measured.toFixed(1)}° (${a.source}). Carbonyl angles are an accepted idealisation.` : `fixed by symmetry; no measurement needed.`) : a.status === 'derived' ? 'not in the reference table; it follows from the two measured angles.' : `${angleStatusText(a)}${a.source ? ` — ${a.source}` : ''}.`))))), 'learn'),
    ],
    titles: { collection: 'The shapes', invariants: (s) => `What ${s.formula} shows` },
  };
}

export class ShapesPanel {
  constructor({ view, viewport, level = 'learn', navigate = null }) {
    this.view = view; this.viewport = viewport; this.level = level;
    this.opts = { lonePairs: true, labels: true, autoRotate: false };
    this.answers = {};   // activity id → chosen option id
    this.explorer = new CollectionExplorer(makeShapesCollection(this), { view, viewport, navigate, level, footer: () => this.viewSection(), onChange: (ctx) => this.afterUpdate(ctx) });
    this.el = this.explorer.el;
    this.inspector = this.explorer.inspector;
  }

  activate() {
    this.view.setOptions({ lonePairs: this.opts.lonePairs, hydrogens: true, labels: this.opts.labels, orbitals: false, arrows: false, highlights: true });
    this.viewport.setAutoRotate(this.opts.autoRotate);
    this.explorer.update(true);
  }
  deactivate() { this.viewport.setAutoRotate(false); }
  setLevel(level) { this.level = level; this.explorer.setLevel(level); }
  navigate(sub) { this.explorer.navigate(sub); }
  get shapeId() { return this.explorer.itemId; }

  /** After every update: tag learn-only chips so the depth switch hides them, and draw the 2D sketch. */
  afterUpdate({ built }) {
    for (const btn of this.explorer.el.querySelectorAll('.chip')) {
      const item = SHAPES.find((s) => s.id === btn.dataset.id);
      if (item?.audience === 'learn') btn.dataset.audience = 'learn';
    }
    const canvas = this.sketch;
    if (canvas && built?.frame) {
      const draw = () => { if (canvas.isConnected) drawWedgeDash(canvas, built.frame, { hydrogens: true, labelCarbons: true }); };
      typeof setTimeout === 'function' ? setTimeout(draw, 0) : draw();
    }
  }

  /** One predict-observe-explain block; re-rendered in place when the learner answers. */
  activityBlock(act, api) {
    const block = h('div', { class: 'poe', dataset: { activity: act.id } });
    const render = () => {
      const chosen = this.answers[act.id];
      const correct = correctOption(act);
      const children = [
        h('h4', { class: 'poe-title' }, act.title),
        h('p', { class: 'poe-prompt' }, act.prompt),
        h('div', { class: 'poe-options', role: 'group', 'aria-label': act.title }, act.options.map((o) => h('button', {
          class: `btn poe-option ${chosen === o.id ? (o.correct ? 'right' : 'wrong') : ''} ${chosen && o.correct ? 'reveal' : ''}`,
          'aria-pressed': String(chosen === o.id), disabled: !!chosen && chosen !== o.id && !o.correct ? null : null,
          onClick: () => { this.answers[act.id] = o.id; render(); },
        }, o.label))),
      ];
      if (chosen) {
        children.push(h('div', { class: `poe-reveal ${chosen === correct?.id ? 'right' : 'wrong'}` },
          h('b', {}, chosen === correct?.id ? 'Right. ' : `Not quite: ${correct?.label.toLowerCase()}. `), act.reveal(),
          act.show ? h('button', { class: 'btn poe-show', onClick: () => { api.select(act.show.item); if (act.show.invariant) api.selectInvariant(act.show.invariant); } }, 'Show me') : null,
          h('button', { class: 'btn poe-reset', onClick: () => { delete this.answers[act.id]; render(); } }, 'Try again')));
      }
      while (block.firstChild) block.removeChild(block.firstChild);
      block.append(...children);
    };
    render();
    return block;
  }

  viewSection() {
    return section('View',
      h('div', { class: 'toggles' },
        toggle('Lone pairs', this.opts.lonePairs, (v) => { this.opts.lonePairs = v; this.view.setOptions({ lonePairs: v }); }),
        toggle('Labels', this.opts.labels, (v) => { this.opts.labels = v; this.view.setOptions({ labels: v }); }),
        toggle('Auto-rotate', this.opts.autoRotate, (v) => { this.opts.autoRotate = v; this.viewport.setAutoRotate(v); }),
      ),
      h('button', { class: 'btn', onClick: () => this.viewport.fitTo(this.view.bounds()) }, 'Re-centre view'),
      h('div', { class: 'legend' }, ['H', 'C', 'N', 'O', 'F', 'S', 'P', 'B', 'Xe'].map((el) => h('span', { class: 'swatch' }, h('i', { style: { background: ELEMENTS[el].color } }), el)),
        h('span', { class: 'swatch' }, h('i', { style: { background: '#fde68a' } }), 'lone pair')),
    );
  }
}
