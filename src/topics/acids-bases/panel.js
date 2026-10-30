// Acids and bases panel: a CollectionExplorer over the conjugate pairs. The 3D view shows the acid with
// its acidic proton, which a slider sends off as H⁺ (ghost bond, charges appear); the card holds the pKa
// with its source, the factors behind it, a "which way?" equilibrium against a chosen base, and the full
// pKa ladder on a LevelDiagram where clicking a level selects that pair.
import { h, section, aud, select } from '../../ui/dom.js';
import { CollectionExplorer } from '../../ui/collectionExplorer.js';
import { LevelDiagram } from '../../ui/levelDiagram.js';
import { PAIRS, FACTORS, buildPair, ladderSpec, pairById } from '../../chem/acidsBases.js';
import { PKA_TABLE, RT_LN10_KJ } from '../../chem/references/textbook.js';
import { INVARIANTS } from './content.js';
import { ACTIVITIES, correctOption } from './activities.js';

const FACTOR_COLOR = { element: '#6b8f71', size: '#7f8bb3', resonance: '#b07a9a', induction: '#a3853f', hybridisation: '#5f8ea3', charge: '#8a6a1e' };
const sci = (x) => { if (x === 0) return '0'; const e = Math.floor(Math.log10(Math.abs(x))); const m = x / Math.pow(10, e); return `${m.toFixed(1)} × 10^${e}`; };

export function makeAcidsCollection(panel) {
  return {
    id: 'acids-bases',
    items: PAIRS,
    chips: (p) => ({ pattern: p.acid.replace(/ \(.*\)$/, ''), name: `${p.name} · ${buildPair(p.id).pka}`, color: FACTOR_COLOR[p.factors[0]], title: p.factors.map((f) => FACTORS[f].label).join('; ') }),
    initialState: () => ({ t: 0, partner: null }),
    build: (p, state) => buildPair(p.id, state),
    controls: (p, state, api) => {
      const slider = h('input', { type: 'range', min: 0, max: 100, step: 2, value: Math.round(state.t * 100), class: 'scrubber', 'aria-label': 'Proton transfer', onInput: (e) => api.setState({ t: Number(e.target.value) / 100 }) });
      const partners = PAIRS.filter((q) => q.id !== p.id).map((q) => ({ value: q.id, label: `${q.base} (from ${q.acid}, pKa ${buildPair(q.id).pka})` }));
      const current = buildPair(p.id, state).partner.id;
      return [
        h('div', { class: 'row' }, h('label', {}, `Send the proton off: ${state.t >= 0.999 ? `${p.base} + H⁺` : state.t > 0 ? `${Math.round(state.t * 100)} % of the way` : p.acid}`), slider),
        h('div', { class: 'landmarks' }, h('button', { class: `btn landmark ${state.t === 0 ? 'active' : ''}`, onClick: () => api.setState({ t: 0 }) }, `Acid ${p.acid}`), h('button', { class: `btn landmark ${state.t >= 0.999 ? 'active' : ''}`, onClick: () => api.setState({ t: 1 }) }, `Base ${p.base}`)),
        h('div', { class: 'row' }, h('label', {}, 'Which way? Pair it with the base'), select(partners, current, (id) => api.setState({ partner: id }), { 'aria-label': 'Partner base' })),
        aud(h('div', { class: 'hint' }, 'The proton moves along its bond and the charges follow; nothing else in the model changes. The equilibrium row subtracts two tabulated pKa values and nothing more.'), 'learn'),
      ];
    },
    card: (p, state, built) => {
      panel.ladder = h('canvas', { class: 'overlay-canvas pka-ladder', 'aria-label': 'pKa ladder; click a level to pick that acid' });
      const e = built.eq;
      return [
        h('div', { class: 'mol-pattern' }, `${p.acid} ⇌ ${p.base} + H⁺`),
        h('div', { class: 'mol-name' }, p.name),
        h('div', { class: 'mol-meta' }, h('span', { class: 'formula' }, `conjugate base: ${p.baseName}`), h('span', { class: 'pattern' }, built.factors.map((f) => f.label.split(':')[0]).join(' · '))),
        h('div', { class: 'shape-angles' },
          h('div', { class: 'shape-angle status-class' }, h('b', {}, 'pKa'), h('span', { class: 'value' }, String(built.pka)), h('span', { class: 'status' }, `Ka = ${sci(built.ka)}; tabulated (${PKA_TABLE.source.split(';')[0]}${built.pka < -2 || built.pka > 30 ? '; an estimate outside the range water can measure' : ''})`)),
          h('div', { class: 'shape-angle status-measured' }, h('b', {}, 'Which way'), h('span', { class: 'value' }, e.favoured === 'products' ? '→' : e.favoured === 'reactants' ? '←' : '⇌'), h('span', { class: 'status' }, `${e.equation}: K = 10^${e.logK.toFixed(1)} = ${sci(e.K)}, ΔG° = ${e.deltaG.toFixed(1)} kJ/mol (−${RT_LN10_KJ} × log K at 25 °C). ${e.sentence}`)),
          ...built.factors.map((f) => h('div', { class: 'shape-angle' }, h('b', {}, f.label.split(':')[0]), h('span', { class: 'value', style: { color: FACTOR_COLOR[f.id] } }, '●'), h('span', { class: 'status' }, f.summary))),
        ),
        panel.ladder,
        aud(h('p', { class: 'hint' }, 'The ladder: every pair at its tabulated pKa, strongest acid at the bottom. A base takes the proton from any acid below its own conjugate acid. Click a level to pick it.'), 'learn'),
      ];
    },
    invariants: (p) => INVARIANTS[p.id] || [],
    highlights: () => [],            // cards adjust the view through `show` in afterUpdate, not through MoleculeView highlights
    guide: (p, api) => [
      section('Predict, then check the ladder', ...ACTIVITIES.filter((a) => a.item === p.id).map((act) => panel.activityBlock(act, api))),
      aud(section('The five factors', h('ul', { class: 'identify' }, Object.entries(FACTORS).map(([id, f]) => h('li', {}, h('b', { style: { color: FACTOR_COLOR[id] } }, `${f.label}: `), f.summary)))), 'learn'),
      aud(section('Where the numbers come from', h('ul', { class: 'identify' },
        h('li', {}, h('b', {}, 'pKa: '), `${PKA_TABLE.source}. Values below −2 or above ≈ 30 are the usual textbook estimates: water cannot measure them (levelling).`),
        h('li', {}, h('b', {}, 'Which way: '), `K = 10^(pKa(HB) − pKa(HA)) and ΔG° = −2.303RT log K with 2.303RT = ${RT_LN10_KJ} kJ/mol at 298 K: a thermodynamic identity applied to two tabulated values.`),
        h('li', {}, h('b', {}, 'The 3D model: '), 'the acid is the Functional groups molecule (cationic acids get their proton added on the lone pair); sending the proton off moves it along its bond and shifts the charges. No energy or geometry is computed.'))), 'learn'),
    ],
    titles: { collection: 'The acids', build: 'Move the proton', invariants: (p) => `What ${p.acid.replace(/ \(.*\)$/, '')} shows` },
  };
}

export class AcidsPanel {
  constructor({ view, viewport, level = 'learn', navigate = null }) {
    this.view = view; this.viewport = viewport; this.level = level;
    this.diagram = null; this.answers = {};
    this.explorer = new CollectionExplorer(makeAcidsCollection(this), { view, viewport, navigate, level, onChange: (ctx) => this.afterUpdate(ctx) });
    this.el = this.explorer.el; this.inspector = this.explorer.inspector;
  }
  activate() {
    this.view?.setOptions?.({ lonePairs: true, hydrogens: true, labels: true, orbitals: false, arrows: false, highlights: true });
    this.viewport.setAutoRotate?.(false);
    this.explorer.activate();
  }
  deactivate() { this.diagram?.dispose?.(); this.diagram = null; }
  setLevel(level) { this.level = level; this.explorer.setLevel(level); }
  navigate(sub) { this.explorer.navigate(sub); }

  afterUpdate({ item, state, built, selected }) {
    const show = selected?.show || {};
    const wantT = show.t ?? null, wantP = show.partner ?? null;
    if ((wantT != null && Math.abs(state.t - wantT) > 1e-9) || (wantP && state.partner !== wantP)) { this.explorer.api.setState({ ...(wantT != null ? { t: wantT } : {}), ...(wantP ? { partner: wantP } : {}) }); return; }
    this.view?.setHighlights?.([{ type: 'atom', id: built.acidH }, { type: 'bond', a: built.donor, b: built.acidH }]);
    const draw = () => {
      if (!this.ladder?.isConnected) return;
      this.diagram?.dispose?.();
      this.diagram = new LevelDiagram(this.ladder, { followConnections: false, onHighlight: (level, source) => { if (source === 'click' && level && pairById(level.id) && level.id !== item.id) this.explorer.api.select(level.id); } });
      this.diagram.set(ladderSpec({ selected: item.id }));
      this.diagram.highlight(item.id);
    };
    typeof setTimeout === 'function' ? setTimeout(draw, 0) : draw();
  }

  activityBlock(act, api) {
    const block = h('div', { class: 'poe', dataset: { activity: act.id } });
    const render = () => {
      const chosen = this.answers[act.id], correct = correctOption(act);
      const kids = [h('h4', { class: 'poe-title' }, act.title), h('p', { class: 'poe-prompt' }, act.prompt),
        h('div', { class: 'poe-options', role: 'group', 'aria-label': act.title }, act.options.map((o) => h('button', { class: `btn poe-option ${chosen === o.id ? (o.correct ? 'right' : 'wrong') : ''} ${chosen && o.correct ? 'reveal' : ''}`, 'aria-pressed': String(chosen === o.id), onClick: () => { this.answers[act.id] = o.id; render(); } }, o.label)))];
      if (chosen) kids.push(h('div', { class: `poe-reveal ${chosen === correct?.id ? 'right' : 'wrong'}` }, h('b', {}, chosen === correct?.id ? 'Right. ' : `Not quite: ${correct?.label.toLowerCase()}. `), act.reveal(),
        act.show ? h('button', { class: 'btn poe-show', onClick: () => { if (act.show.item !== api.item.id) api.select(act.show.item); if (act.show.invariant) api.selectInvariant(act.show.invariant); } }, 'Show me') : null,
        h('button', { class: 'btn poe-reset', onClick: () => { delete this.answers[act.id]; render(); } }, 'Try again')));
      block.replaceChildren(...kids);
    };
    render();
    return block;
  }
}
