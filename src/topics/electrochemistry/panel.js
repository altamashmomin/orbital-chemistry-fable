// Electrochemistry panel: a CollectionExplorer over the couples with a tabulated E°, in a canvas workspace that draws
// the galvanic cell between the chosen couple and a partner. The card holds E° with its source, E°cell with the
// anode / cathode assignment, ΔG° and K, the Nernst potential at the concentrations and pH set in the controls, the
// overall equation and notation, and the E° ladder (LevelDiagram: click a rung to pick that couple).
import { h, clear, section, aud, select } from '../../ui/dom.js';
import { CollectionExplorer } from '../../ui/collectionExplorer.js';
import { LevelDiagram } from '../../ui/levelDiagram.js';
import { SPECIES } from '../../chem/redox.js';
import { POTENTIAL_COUPLES, buildCell, halfCell, potentialOf, signed, sciText, minus, fmtConc, RT_OVER_F } from '../../chem/electrochemistry.js';
import { STANDARD_POTENTIALS, TEXTBOOK_CELLS, ELECTROCHEMICAL_CONSTANTS } from '../../chem/references/textbook.js';
import { drawCell } from './cellCanvas.js';
import { INVARIANTS } from './content.js';
import { ACTIVITIES, correctOption } from './activities.js';

const FAMILY_COLOR = (E) => (E >= 1.2 ? '#ad6552' : E >= 0.3 ? '#a3853f' : E > -0.01 ? '#5f8ea3' : E >= -0.8 ? '#7f8bb3' : '#6b8f71');

export function makeCellsCollection(panel) {
  return {
    id: 'electrochemistry',
    items: POTENTIAL_COUPLES,
    chips: (c) => ({ pattern: halfCell(c.id).formula, name: `${signed(potentialOf(c.id))} V`, color: FAMILY_COLOR(potentialOf(c.id)), title: halfCell(c.id).text }),
    initialState: () => ({ partner: null, conc: {}, pH: 0 }),
    build: (c, state) => buildCell(c.id, state),
    controls: (c, state, api) => {
      const live = api.live((st, built) => {
        const rows = [];
        const partners = POTENTIAL_COUPLES.filter((q) => q.id !== c.id).map((q) => ({ value: q.id, label: `${halfCell(q.id).formula} (${signed(potentialOf(q.id))} V)` }));
        rows.push(h('div', { class: 'row' }, h('label', {}, 'Pair it with'), select(partners, built.partner, (id) => api.setState({ partner: id }), { 'aria-label': 'Partner couple' })));
        for (const id of built.cell.solutes) {
          const conc = st.conc?.[id] ?? 1;
          rows.push(h('div', { class: 'row' }, h('label', {}, `[${SPECIES[id].formula}] = ${fmtConc(conc)}`), h('input', { type: 'range', min: -6, max: 0, step: 0.25, value: Math.log10(conc), class: 'scrubber', 'aria-label': `Concentration of ${SPECIES[id].formula}`, dataset: { species: id }, onInput: (e) => api.setState({ conc: { ...(st.conc || {}), [id]: Math.pow(10, Number(e.target.value)) } }) })));
        }
        if (built.cell.hasProton) rows.push(h('div', { class: 'row' }, h('label', {}, `pH ${Number(st.pH ?? 0).toFixed(1)} ([H⁺] = ${fmtConc(Math.pow(10, -(st.pH ?? 0)))})`), h('input', { type: 'range', min: 0, max: 14, step: 0.5, value: st.pH ?? 0, class: 'scrubber', 'aria-label': 'pH', onInput: (e) => api.setState({ pH: Number(e.target.value) }) })));
        rows.push(h('div', { class: 'landmarks' }, h('button', { class: `btn landmark ${built.cell.standard ? 'active' : ''}`, dataset: { standard: 'true' }, onClick: () => api.setState({ conc: {}, pH: 0 }) }, built.cell.standard ? 'Standard state (1 M, 1 bar, pH 0)' : 'Back to standard state')));
        return rows;
      });
      return [
        live,
        aud(h('div', { class: 'hint' }, 'The couple with the higher E° is always the cathode; swap partners and watch which side the electrons flow to. The sliders change Q, and only Q: E° stays where the table puts it.'), 'learn'),
      ];
    },
    card: (c, state, built) => {
      const cl = built.cell, hc = built.half;
      panel.ladder = h('canvas', { class: 'overlay-canvas eo-ladder', 'aria-label': 'Standard potential ladder; click a rung to pick that couple' });
      const rows = [];
      rows.push(h('div', { class: 'shape-angle status-class' }, h('b', {}, 'E°'), h('span', { class: 'value' }, `${signed(hc.E0)} V`), h('span', { class: 'status' }, `${hc.text}; tabulated (${STANDARD_POTENTIALS.source.split(';')[0]}); ${hc.electrode.kind === 'metal' ? `the ${SPECIES[hc.electrode.species].name} is its own electrode` : 'both forms are dissolved or gaseous, so the electrode is inert platinum'}`)));
      rows.push(h('div', { class: 'shape-angle status-measured' }, h('b', {}, 'Cell'), h('span', { class: 'value' }, `${signed(cl.E0)} V`), h('span', { class: 'status' }, `${halfCell(cl.cathode).formula} (${signed(potentialOf(cl.cathode))} V) is the cathode and ${halfCell(cl.anode).formula} (${signed(potentialOf(cl.anode))} V) the anode: E°cell = ${signed(potentialOf(cl.cathode))} − (${signed(potentialOf(cl.anode))}) = ${signed(cl.E0)} V; ${built.role === 'cathode' ? 'this couple is reduced' : 'this couple is oxidised'}; n = ${cl.n}`)));
      rows.push(h('div', { class: 'shape-angle status-ideal' }, h('b', {}, 'ΔG°, K'), h('span', { class: 'value' }, `${minus(cl.dG0.toFixed(0))} kJ/mol`), h('span', { class: 'status' }, `ΔG° = −nFE° = −${cl.n} × 96 485 × ${signed(cl.E0)} J; K = exp(nFE°/RT) = ${sciText(cl.log10K)} (log K = ${cl.log10K.toFixed(1)}); identities at 298 K, per mole of reaction as written`)));
      rows.push(h('div', { class: `shape-angle ${cl.standard ? 'status-ideal' : 'status-measured'}` }, h('b', {}, 'Nernst'), h('span', { class: 'value' }, `${signed(cl.E)} V`), h('span', { class: 'status' }, cl.standard ? 'every solute at 1 M, gases at 1 bar, pH 0: Q = 1 and E = E°. Move a slider to leave the standard state.' : `Q = ${cl.Q >= 1e4 || cl.Q <= 1e-4 ? cl.Q.toExponential(2) : cl.Q.toPrecision(3)}; E = E° − (RT/nF) ln Q = ${signed(cl.E0)} − ${(RT_OVER_F / cl.n).toFixed(4)} × ${minus(Math.log(cl.Q).toFixed(2))} = ${signed(cl.E)} V${cl.E <= 0 ? '; E ≤ 0: at these concentrations the reaction as written is not downhill' : ''}`)));
      return [
        h('div', { class: 'mol-pattern' }, cl.notation),
        h('div', { class: 'mol-name' }, `${hc.formula} with ${halfCell(built.partner).formula}`),
        h('div', { class: 'mol-meta' }, h('span', { class: 'formula' }, `${cl.eq.text}`), h('span', { class: 'pattern' }, `E${cl.standard ? '°' : ''} = ${signed(cl.E)} V`)),
        h('div', { class: 'shape-angles' }, ...rows),
        h('div', { class: 'redox-eq active' }, h('b', {}, 'Overall: '), `${cl.eq.text} (${halfCell(cl.anode).formula} × ${cl.eq.multipliers[cl.anode]}, ${halfCell(cl.cathode).formula} × ${cl.eq.multipliers[cl.cathode]})`),
        panel.ladder,
        aud(h('p', { class: 'hint' }, 'The ladder: every couple at its tabulated E°, strongest oxidant at the top. Of any two, the higher is reduced and the lower oxidised; the gap is the standard cell voltage. Click a rung to pick it.'), 'learn'),
      ];
    },
    invariants: (c) => INVARIANTS[c.id] || [],
    highlights: () => [],
    guide: (c, api) => [
      section('Predict, then compute', ...ACTIVITIES.filter((a) => a.item === c.id).map((act) => panel.activityBlock(act, api))),
      aud(section('Where the numbers come from', h('ul', { class: 'identify' },
        h('li', {}, h('b', {}, 'E°: '), `${STANDARD_POTENTIALS.source}; ${STANDARD_POTENTIALS.unit}. The hydrogen couple is 0 by convention.`),
        h('li', {}, h('b', {}, 'The cell: '), 'E°cell = E°(cathode) − E°(anode) with the higher couple as the cathode; the overall equation is the two half-reactions of the Redox tab scaled to the same electron count.'),
        h('li', {}, h('b', {}, 'ΔG°, K, Nernst: '), `ΔG° = −nFE°, ln K = nFE°/RT and E = E° − (RT/nF) ln Q with F = ${ELECTROCHEMICAL_CONSTANTS.F} C/mol, R = ${ELECTROCHEMICAL_CONSTANTS.R} J/(K·mol), T = ${ELECTROCHEMICAL_CONSTANTS.T} K (${ELECTROCHEMICAL_CONSTANTS.source.split(';')[0]}); activities are the concentrations you set, 10^−pH for H⁺, 1 for solids, liquids and gases at 1 bar.`),
        h('li', {}, h('b', {}, 'Checked against: '), `${Object.values(TEXTBOOK_CELLS.values).map((r) => `${r.notation.split(' || ')[0].split(' | ')[0]}/${r.notation.split(' || ')[1].split(' | ').pop()} ${r.E.toFixed(2)} V`).join(', ')} (${TEXTBOOK_CELLS.source.split(';')[0]}).`),
        h('li', {}, h('b', {}, 'The drawing: '), 'a schematic: no solution colours, no liquid-junction potential, no overpotential, no rate. A positive E says downhill, not fast.'))), 'learn'),
    ],
    titles: { collection: 'The couples, by E°', build: 'Build the cell', invariants: (c) => `What ${halfCell(c.id).formula} shows` },
  };
}

export class ElectrochemistryPanel {
  constructor({ level = 'learn', navigate = null } = {}) {
    this.level = level; this.answers = {}; this.canvas = null; this.diagram = null;
    this.explorer = new CollectionExplorer(makeCellsCollection(this), { navigate, level, onChange: (ctx) => this.afterUpdate(ctx) });
    this.el = this.explorer.el; this.inspector = this.explorer.inspector;
  }
  activate() { this.explorer.activate(); }
  deactivate() { this.diagram?.dispose?.(); this.diagram = null; }
  setLevel(level) { this.level = level; this.explorer.setLevel(level); }
  navigate(sub) { this.explorer.navigate(sub); }
  mountWorkspace(container) {
    this.canvas = h('canvas', { class: 'workspace-canvas cell-canvas', 'aria-label': 'Galvanic cell diagram' });
    container.append(this.canvas);
    if (typeof ResizeObserver === 'function') { this.ro = new ResizeObserver(() => this.draw()); this.ro.observe(container); }
    this.draw();
  }
  unmountWorkspace(container) { this.ro?.disconnect(); this.ro = null; clear(container); this.canvas = null; }
  draw() { if (this.canvas && this.explorer.built) drawCell(this.canvas, this.explorer.built.cell); }

  afterUpdate({ state, built, selected }) {
    const show = selected?.show || {};
    const want = {};
    if (show.partner && built.partner !== show.partner) want.partner = show.partner;
    if (show.pH != null && (state.pH ?? 0) !== show.pH) want.pH = show.pH;
    if (show.conc && Object.entries(show.conc).some(([k, v]) => (state.conc?.[k] ?? 1) !== v)) want.conc = { ...(state.conc || {}), ...show.conc };
    if (Object.keys(want).length) { this.explorer.api.setState(want); return; }
    const heading = typeof document !== 'undefined' ? document.getElementById?.('workspace-name') : null;
    if (heading) heading.textContent = built.title;
    this.draw();
    const drawLadder = () => {
      if (!this.ladder?.isConnected) return;
      this.diagram?.dispose?.();
      this.diagram = new LevelDiagram(this.ladder, { followConnections: false, onHighlight: (level, source) => { if (source === 'click' && level && potentialOf(level.id) != null && level.id !== built.id) this.explorer.api.select(level.id); } });
      this.diagram.set(built.ladder);
      this.diagram.highlight([built.id, built.partner]);
    };
    typeof setTimeout === 'function' ? setTimeout(drawLadder, 0) : drawLadder();
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
