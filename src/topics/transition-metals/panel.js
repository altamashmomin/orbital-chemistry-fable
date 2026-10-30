// Transition metals panel: a CollectionExplorer over first-row complexes. The 3D view shows the complex
// (MoleculeView, crystal-field axes with z vertical) with an optional metal d orbital drawn over it
// (OrbitalView); the card holds the d count, the splitting diagram (LevelDiagram: click a level to draw
// that orbital), the filling with its unpaired count and spin-only moment, the tabulated Δo and colour,
// and the ligands' place in the spectrochemical series. Every number is counting or a cited table value.
import { h, section, aud, toggle, select } from '../../ui/dom.js';
import { CollectionExplorer } from '../../ui/collectionExplorer.js';
import { LevelDiagram } from '../../ui/levelDiagram.js';
import { OrbitalView } from '../../render/orbitalView.js';
import { COMPLEXES, FAMILIES, D_ORBITALS, dLabel, buildComplex, KJ_PER_WAVENUMBER } from '../../chem/transitionMetals.js';
import { DELTA_O, CRYSTAL_FIELD, SPECTROCHEMICAL_SERIES, COMPLEX_MAGNETISM, COMPLEX_COLOURS, D_ORBITAL_ZEFF, SPIN_ONLY_MOMENT } from '../../chem/references/textbook.js';
import { INVARIANTS } from './content.js';
import { ACTIVITIES, correctOption } from './activities.js';

const n0 = (x) => Math.round(x).toLocaleString('en');
const SET_LABEL = { t2g: 't₂g', eg: 'e_g', e: 'e', t2: 't₂' };
const SUPN = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹', '¹⁰'];
/** t₂g⁴ e_g² style configuration string from a filling. */
export function configurationText(filling) {
  if (filling.levels.some((l) => l.schematic)) return filling.levels.map((l) => `${dLabel(l.id)}${SUPN[l.electrons]}`).join(' ');
  const sets = [];
  for (const l of filling.levels) { const s = sets.find((x) => x.set === l.set); if (s) s.n += l.electrons; else sets.push({ set: l.set, n: l.electrons }); }
  return sets.map((s) => `${SET_LABEL[s.set] || s.set}${SUPN[s.n]}`).join(' ');
}

export function makeMetalsCollection(panel) {
  return {
    id: 'transition-metals',
    items: COMPLEXES,
    chips: (c) => ({ pattern: c.formula, name: `${c.metal}(${['0', 'I', 'II', 'III', 'IV'][c.oxidation]}) · d${SUPN[buildComplex(c.id).d]}`, color: FAMILIES[c.family]?.color, title: FAMILIES[c.family]?.label }),
    initialState: (c) => ({ spin: null, isomer: c.isomers ? c.isomers[0] : null, orbital: null, probability: 0.8, negative: true }),
    build: (c, state) => buildComplex(c.id, state),
    controls: (c, state, api) => {
      // the select and the landmark buttons re-render on every update (api.live) so their active states follow the state
      const live = api.live((st, built) => {
        const rows = [h('div', { class: 'row' }, h('label', {}, 'Draw a d orbital'), select([{ value: '', label: 'none' }, ...D_ORBITALS.map((id) => ({ value: id, label: dLabel(id) }))], st.orbital || '', (id) => api.setState({ orbital: id || null }), { 'aria-label': 'd orbital drawn' }))];
        if (built.spinChoice) rows.push(h('div', { class: 'landmarks' }, ['high', 'low'].map((s) => h('button', { class: `btn landmark ${built.spin === s ? 'active' : ''}`, dataset: { spin: s }, onClick: () => api.setState({ spin: s }) }, `${s === 'high' ? 'High spin' : 'Low spin'}${built.tabulatedSpin === s ? ' · tabulated' : ' · what if?'}`))));
        if (built.isomers) rows.push(h('div', { class: 'landmarks' }, built.isomers.map((iso) => h('button', { class: `btn landmark ${built.isomer === iso ? 'active' : ''}`, dataset: { isomer: iso }, onClick: () => api.setState({ isomer: iso }) }, `${iso}-${c.formula}`))));
        return rows;
      });
      const slider = h('input', { type: 'range', min: 50, max: 95, step: 5, value: Math.round(state.probability * 100), class: 'scrubber', 'aria-label': 'Enclosed probability', onInput: (e) => api.setState({ probability: Number(e.target.value) / 100 }) });
      return [
        live,
        h('div', { class: 'row' }, h('label', {}, `Contour encloses ${Math.round(state.probability * 100)} % of the drawn orbital`), slider),
        h('div', { class: 'toggles' }, toggle('Negative phase', state.negative, (on) => api.setState({ negative: on }))),
        aud(h('div', { class: 'hint' }, 'Click a level in the diagram to draw that orbital over the complex: e_g lobes point at the ligands, t₂g lobes between them. The spin buttons re-fill the same diagram; the card says which filling is the measured one.'), 'learn'),
      ];
    },
    card: (c, state, built) => {
      panel.levels = h('canvas', { class: 'overlay-canvas cf-canvas', 'aria-label': `Crystal-field splitting diagram of ${built.title}` });
      const rows = [];
      rows.push(h('div', { class: 'shape-angle status-measured' }, h('b', {}, 'd count'), h('span', { class: 'value' }, `d${SUPN[built.d]}`), h('span', { class: 'status' }, `${built.oxidationText}: ${built.dText}; oxidation state = complex charge (${built.complex.charge >= 0 ? '+' : ''}${built.complex.charge}) minus the ligand charges`)));
      rows.push(h('div', { class: 'shape-angle status-ideal' }, h('b', {}, 'Geometry'), h('span', { class: 'value' }, built.geometryLabel), h('span', { class: 'status' }, `${built.ligands.map((l) => `${l.n} × ${l.formula}`).join(' + ')}; donor atoms on the ideal template at the element/order bond length (${built.donors.map((d) => `${built.metal}–${d.el}`).filter((x, i, a) => a.indexOf(x) === i).join(', ')})${built.isomer ? `; ${built.isomer} isomer` : ''}`)));
      const spinNote = built.spinChoice ? (built.isWhatIf ? `a what-if filling: the tabulated state is ${built.tabulatedSpin} spin (${COMPLEX_MAGNETISM.source.split(';')[0]})` : `tabulated ${built.tabulatedSpin} spin (${COMPLEX_MAGNETISM.source.split(';')[0]})`) : built.geometry === 'tetrahedral' ? 'tetrahedral complexes are high spin (Δt small)' : built.geometry === 'squarePlanar' ? 'square-planar d⁸: the four lower orbitals fill' : 'no high / low choice for this count';
      rows.push(h('div', { class: `shape-angle ${built.isWhatIf ? 'status-class' : 'status-measured'}` }, h('b', {}, 'Filling'), h('span', { class: 'value' }, configurationText(built.filling)), h('span', { class: 'status' }, `${built.unpaired} unpaired → μ(spin-only) = √(${built.unpaired}·${built.unpaired + 2}) = ${built.moment.toFixed(2)} μ_B${built.tabulatedUnpaired != null && !built.isWhatIf ? `; measured moments give ${built.tabulatedUnpaired} unpaired` : ''}; ${spinNote}`)));
      rows.push(h('div', { class: 'shape-angle status-ideal' }, h('b', {}, 'CFSE'), h('span', { class: 'value' }, built.cfse.text), h('span', { class: 'status' }, built.geometry === 'squarePlanar' ? 'four distinct levels; the diagram shows the textbook order only' : `counting on the barycentre pattern (${built.geometry === 'tetrahedral' ? 'e −0.6 Δt, t₂ +0.4 Δt; Δt ≈ 4/9 Δo' : 't₂g −0.4 Δo, e_g +0.6 Δo'}); P = pairing energy per extra pair`)));
      if (built.deltaO != null) rows.push(h('div', { class: 'shape-angle status-class' }, h('b', {}, 'Δo'), h('span', { class: 'value' }, `${n0(built.deltaO)} cm⁻¹`), h('span', { class: 'status' }, `= ${built.deltaKJ.toFixed(0)} kJ/mol; as a wavelength ${built.lambdaNm.toFixed(0)} nm${built.d === 1 || built.d === 9 ? ' (the one d–d band of this ion)' : ' (the t₂g → e_g gap; this ion has several bands)'}; tabulated (${DELTA_O.source.split(';')[0]}; compilations differ by a few hundred cm⁻¹)`)));
      else rows.push(h('div', { class: 'shape-angle status-class' }, h('b', {}, 'Δ'), h('span', { class: 'value' }, '—'), h('span', { class: 'status' }, built.geometry === 'octahedral' ? 'no Δo quoted for this complex here (not in the cited table); the filling needs only the pattern' : built.geometry === 'tetrahedral' ? 'Δt is not tabulated here; it is ≈ 4/9 of the octahedral value for the same ligands' : 'square-planar gaps are drawn schematically')));
      if (built.colour) rows.push(h('div', { class: 'shape-angle status-class' }, h('b', {}, 'Colour'), h('span', { class: 'value' }, built.colour), h('span', { class: 'status' }, `as described (${COMPLEX_COLOURS.source.split(';')[0]}); the colour seen is the complement of what the d–d bands absorb, and only a d¹ or d⁹ ion has a single band`)));
      const ranks = built.ligands.map((l) => l.rank);
      return [
        h('div', { class: 'mol-pattern' }, built.title),
        h('div', { class: 'mol-name' }, built.name),
        h('div', { class: 'mol-meta' }, h('span', { class: 'formula' }, `${built.oxidationText} · d${SUPN[built.d]} · ${built.geometryLabel}`), h('span', { class: 'pattern' }, FAMILIES[c.family]?.label)),
        h('div', { class: 'shape-angles' }, ...rows),
        panel.levels,
        h('p', { class: 'series' }, h('b', {}, 'Spectrochemical series: '), ...SPECTROCHEMICAL_SERIES.order.map((lig, i) => h('span', { class: `series-item ${ranks.includes(i) ? 'active' : ''}` }, `${lig}${i < SPECTROCHEMICAL_SERIES.order.length - 1 ? ' < ' : ''}`))),
        aud(h('p', { class: 'hint' }, 'The diagram: five equal d orbitals in the free ion on the left, the split set on the right, in units of Δ. Click a level to draw that orbital on the complex.'), 'learn'),
      ];
    },
    invariants: (c) => INVARIANTS[c.id] || [],
    highlights: () => [],            // cards adjust the view through `show` in afterUpdate, not through MoleculeView highlights
    guide: (c, api) => [
      section('Predict, then fill the diagram', ...ACTIVITIES.filter((a) => a.item === c.id).map((act) => panel.activityBlock(act, api))),
      aud(section('Where the numbers come from', h('ul', { class: 'identify' },
        h('li', {}, h('b', {}, 'The pattern: '), `the barycentre rule (${CRYSTAL_FIELD.source.split(';')[0]}): t₂g −0.4 Δo and e_g +0.6 Δo, e −0.6 Δt and t₂ +0.4 Δt; the square-planar order is drawn without numbers.`),
        h('li', {}, h('b', {}, 'Δo: '), `${DELTA_O.source}.`),
        h('li', {}, h('b', {}, 'Spin states and colours: '), `read from the textbooks (${COMPLEX_MAGNETISM.source.split(';')[0]}); the filling shown is checked against the tabulated unpaired count, never used to predict it.`),
        h('li', {}, h('b', {}, 'Counting: '), `d count = group − oxidation state; unpaired electrons and CFSE by counting the filling; μ = ${SPIN_ONLY_MOMENT.formula} (${SPIN_ONLY_MOMENT.source.split(';')[0]}); 1 cm⁻¹ = ${KJ_PER_WAVENUMBER} kJ/mol and λ = 10⁷ / Δo are unit conversions.`),
        h('li', {}, h('b', {}, 'The pictures: '), `donor atoms on the ideal template at the element/order bond length; ligand hydrogens on ideal tetrahedral slots; the d orbital is the hydrogen-like 3d function with Z_eff = ${D_ORBITAL_ZEFF.value} (${D_ORBITAL_ZEFF.basis}), size only.`))), 'learn'),
    ],
    titles: { collection: 'The complexes', build: 'Fill the diagram', invariants: (c) => `What ${c.formula} shows` },
  };
}

export class MetalsPanel {
  constructor({ view, viewport, level = 'learn', navigate = null }) {
    this.view = view; this.viewport = viewport; this.level = level;
    this.lobes = null; this.diagram = null; this.answers = {};
    this.explorer = new CollectionExplorer(makeMetalsCollection(this), { view, viewport, navigate, level, onChange: (ctx) => this.afterUpdate(ctx) });
    this.el = this.explorer.el; this.inspector = this.explorer.inspector;
  }
  /** Crystal-field axes on screen: z vertical, then a slight oblique turn so no ligand hides the metal. */
  _quaternion() {
    const q = this.view?.group?.quaternion;
    if (!q || !q.constructor) return null;
    const Q = q.constructor;
    const V = this.view.group.position.constructor;
    const out = new Q().setFromAxisAngle(new V(1, 0, 0), -Math.PI / 2);
    out.premultiply(new Q().setFromAxisAngle(new V(0, 1, 0), 0.6));
    out.premultiply(new Q().setFromAxisAngle(new V(1, 0, 0), -0.35));
    return out;
  }
  activate() {
    this.view?.setOptions?.({ lonePairs: false, hydrogens: true, labels: true, orbitals: false, arrows: false, highlights: true });
    this.viewport.setAutoRotate?.(false);
    const q = this._quaternion();
    if (q) this.view.group.quaternion.copy(q);
    this.explorer.activate();
  }
  deactivate() {
    this.lobes?.dispose(); this.lobes = null; this.diagram?.dispose?.(); this.diagram = null;
    if (this.view?.group?.quaternion?.identity) this.view.group.quaternion.identity();
  }
  setLevel(level) { this.level = level; this.explorer.setLevel(level); }
  navigate(sub) { this.explorer.navigate(sub); }

  afterUpdate({ item, state, built, selected }) {
    const show = selected?.show || {};
    const want = {};
    if (show.orbital && state.orbital !== show.orbital) want.orbital = show.orbital;
    if (show.spin && built.spinChoice && state.spin !== show.spin) want.spin = show.spin;
    if (show.isomer && built.isomers && state.isomer !== show.isomer) want.isomer = show.isomer;
    if (Object.keys(want).length) { this.explorer.api.setState(want); return; }
    // highlight the minority ligands of an isomer pair so the cis / trans relation reads at a glance
    const minority = built.complex.ligands.length > 1 ? built.donors.filter((d) => d.lig === built.complex.ligands[1].lig) : [];
    this.view?.setHighlights?.(minority.map((d) => ({ type: 'bond', a: built.metalId, b: d.id })));
    if (!this.viewport.fallback) {
      if (built.psi) {
        if (!this.lobes) { this.lobes = new OrbitalView(this.viewport, { molecule: this.view }); const q = this._quaternion(); if (q) this.lobes.setPlacement({ quaternion: q }); }
        this.lobes.setOptions({ negative: state.negative ?? true, opacity: 0.5 });
        this.lobes.setOrbital(built.psi, { probability: state.probability ?? 0.8, size: 40 });
        this.viewport.fitTo(this.lobes.bounds(), 1.2, true);
      } else if (this.lobes) { this.lobes.clear(); }
    }
    const draw = () => {
      if (!this.levels?.isConnected) return;
      this.diagram?.dispose?.();
      this.diagram = new LevelDiagram(this.levels, { followConnections: false, onHighlight: (level, source) => { if (source === 'click' && level && D_ORBITALS.includes(level.id)) this.explorer.api.setState({ orbital: level.id }); } });
      this.diagram.set(built.diagram);
      if (built.orbital) this.diagram.highlight(built.orbital);
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
