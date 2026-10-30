// Molecular orbitals panel: a CollectionExplorer over H₂ / N₂ / O₂, the Hückel π systems (ethene, butadiene,
// the carbonyl) and the C–Cl σ / σ*. The 3D view shows the molecule frame (MoleculeView) with the chosen
// MO as a |ψ| isosurface (OrbitalView) over it; the card holds the MO diagram (LevelDiagram: click a level
// to draw it), the filling, bond order, magnetism, the Hückel energies and the tabulated facts.
import { h, section, aud, toggle, select } from '../../ui/dom.js';
import { CollectionExplorer } from '../../ui/collectionExplorer.js';
import { LevelDiagram } from '../../ui/levelDiagram.js';
import { OrbitalView } from '../../render/orbitalView.js';
import { MO_ITEMS, MO_FAMILIES, buildMO } from '../../chem/molecularOrbitals.js';
import { DIATOMIC_MO, HUCKEL_PARAMETERS, SLATER_ZEFF } from '../../chem/references/textbook.js';
import { INVARIANTS } from './content.js';
import { ACTIVITIES, correctOption } from './activities.js';

const fmtX = (x) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(3)}`;

export function makeMOCollection(panel) {
  return {
    id: 'molecular-orbitals',
    items: MO_ITEMS,
    chips: (it) => ({ pattern: it.formula, name: it.name, color: MO_FAMILIES[it.family]?.color, title: MO_FAMILIES[it.family]?.label }),
    initialState: (it) => ({ mo: null, electrons: it.id === 'h2' ? 2 : null, probability: 0.8, negative: true }),
    build: (it, state) => buildMO(it.id, state),
    controls: (it, state, api) => {
      const built = buildMO(it.id, state);
      const rows = [h('div', { class: 'row' }, h('label', {}, 'Orbital drawn'), select(built.mos.map((m) => ({ value: m.id, label: `${m.label}${m.total != null ? ` · ${m.total} e⁻` : m.electrons != null ? ` · ${m.electrons} e⁻` : ''}` })), built.selected.id, (id) => api.setState({ mo: id }), { 'aria-label': 'Orbital drawn' }))];
      if (it.id === 'h2') rows.push(h('div', { class: 'landmarks' }, [2, 4].map((n) => h('button', { class: `btn landmark ${Number(state.electrons) === n ? 'active' : ''}`, dataset: { electrons: n }, onClick: () => api.setState({ electrons: n, mo: null }) }, n === 2 ? 'H₂ · 2 electrons' : 'He₂ · 4 electrons'))));
      const slider = h('input', { type: 'range', min: 50, max: 95, step: 5, value: Math.round(state.probability * 100), class: 'scrubber', 'aria-label': 'Enclosed probability', onInput: (e) => api.setState({ probability: Number(e.target.value) / 100 }) });
      rows.push(h('div', { class: 'row' }, h('label', {}, `Contour encloses ${Math.round(state.probability * 100)} % of the orbital`), slider));
      rows.push(h('div', { class: 'toggles' }, toggle('Negative phase', state.negative, (on) => api.setState({ negative: on }))));
      rows.push(aud(h('div', { class: 'hint' }, 'Click a level in the diagram to draw that orbital. Amber is the positive phase, fuchsia the negative; a node is where they meet.'), 'learn'));
      return rows;
    },
    card: (it, state, built) => {
      panel.levels = h('canvas', { class: 'overlay-canvas mo-canvas', 'aria-label': `Molecular orbital diagram of ${built.formula}` });
      const F = built.facts, sel = built.selected;
      const rows = [];
      if (it.kind === 'diatomic') {
        rows.push(h('div', { class: 'shape-angle status-measured' }, h('b', {}, 'Bond order'), h('span', { class: 'value' }, String(F.bondOrder)), h('span', { class: 'status' }, `(bonding − antibonding)/2 from the ${F.electrons} valence electrons${F.note ? `; ${F.note}` : ''}`)));
        rows.push(h('div', { class: 'shape-angle status-measured' }, h('b', {}, 'Unpaired'), h('span', { class: 'value' }, String(F.unpaired)), h('span', { class: 'status' }, F.unpaired ? 'paramagnetic (Hund\'s rule in the degenerate π* pair)' : 'all paired: diamagnetic')));
        if (F.bde != null) rows.push(h('div', { class: 'shape-angle status-class' }, h('b', {}, 'Bond energy'), h('span', { class: 'value' }, `${F.bde} ${F.bdeUnit}`), h('span', { class: 'status' }, `tabulated dissociation energy (${DIATOMIC_MO.source.split('BDEs: ')[1] || DIATOMIC_MO.source})`)));
        if (F.bondLength) rows.push(h('div', { class: 'shape-angle status-measured' }, h('b', {}, 'Bond length'), h('span', { class: 'value' }, `${F.bondLength.value} Å`), h('span', { class: 'status' }, `measured (${F.bondLength.source}); the frame is drawn at it`)));
      } else if (it.kind === 'huckel') {
        rows.push(h('div', { class: 'shape-angle status-measured' }, h('b', {}, 'Drawn'), h('span', { class: 'value' }, sel.short), h('span', { class: 'status' }, `E = α ${fmtX(sel.x)} β; coefficients ${sel.coefficients.map((c) => fmtX(c)).join(', ')} on ${built.labels.join(', ')}; ${sel.nodes} node${sel.nodes === 1 ? '' : 's'} along the chain`)));
        rows.push(h('div', { class: 'shape-angle status-measured' }, h('b', {}, 'HOMO / LUMO'), h('span', { class: 'value' }, `${F.homo} / ${F.lumo}`), h('span', { class: 'status' }, `${F.electrons} π electrons; Hückel energies E = α + xβ are exact for the stated matrix (${F.source})`)));
        if (F.delocalisation != null) rows.push(h('div', { class: 'shape-angle status-measured' }, h('b', {}, 'Delocalisation'), h('span', { class: 'value' }, `${F.delocalisation.toFixed(3)} β`), h('span', { class: 'status' }, `π energy ${F.piEnergy.toFixed(3)} β against ${(F.piEnergy - F.delocalisation).toFixed(0)} β for isolated double bonds; β itself is not given a number`)));
        if (F.parameters) rows.push(h('div', { class: 'shape-angle status-class' }, h('b', {}, 'Parameters'), h('span', { class: 'value' }, `h = ${F.parameters.h}, k = ${F.parameters.k}`), h('span', { class: 'status' }, `α_O = α + hβ, β_CO = kβ: the tabulated teaching set (${HUCKEL_PARAMETERS.source.split(';')[0]})`)));
        if (F.bondLength) rows.push(h('div', { class: 'shape-angle status-measured' }, h('b', {}, 'Bond length'), h('span', { class: 'value' }, `${F.bondLength.value} Å`), h('span', { class: 'status' }, `${F.bondLength.atoms}, measured (${F.bondLength.source})`)));
      } else {
        rows.push(h('div', { class: 'shape-angle status-measured' }, h('b', {}, 'Drawn'), h('span', { class: 'value' }, sel.label), h('span', { class: 'status' }, sel.bonding ? 'in phase between C and Cl: the bonding pair lives here' : 'a node between C and Cl; the outer lobe sits behind carbon')));
        rows.push(h('div', { class: 'shape-angle status-fallback' }, h('b', {}, 'Weights'), h('span', { class: 'value' }, 'equal'), h('span', { class: 'status' }, `${F.schematic}; hydrogen-like p orbitals with exponents from ${SLATER_ZEFF.source.split(',')[0]}`)));
        rows.push(h('div', { class: 'shape-angle status-measured' }, h('b', {}, 'Bond length'), h('span', { class: 'value' }, `${F.bondLength.value} Å`), h('span', { class: 'status' }, `C–Cl, measured (${F.bondLength.source})`)));
      }
      return [
        h('div', { class: 'mol-pattern' }, built.formula),
        h('div', { class: 'mol-name' }, built.titleBase),
        h('div', { class: 'shape-angles' }, rows),
        panel.levels,
        aud(h('p', { class: 'hint' }, it.kind === 'huckel' ? 'Levels at E = α + xβ (β < 0, so larger x is lower). Click a level to draw it.' : 'Heights are schematic: the order is the textbook one, the spacings are not energies. Click a level to draw it.'), 'learn'),
      ];
    },
    invariants: (it) => INVARIANTS[it.id] || [],
    highlights: (inv) => inv.show || null,
    guide: (it, api) => [
      section('Predict, then look', ...ACTIVITIES.filter((a) => a.item === it.id).map((act) => panel.activityBlock(act, api))),
      aud(section('Where the numbers come from', h('ul', { class: 'identify' },
        h('li', {}, h('b', {}, 'Shapes: '), `combinations of hydrogen-like orbitals with the exponents of ${SLATER_ZEFF.source}, on frames at the measured bond lengths (NIST CCCBDB); the 2s-based σ orbitals of N₂ / O₂ use the 2p exponent (shape only).`),
        h('li', {}, h('b', {}, 'Diatomic ladders: '), `the textbook level order and filling (${DIATOMIC_MO.source.split(';')[0]}); bond orders and unpaired counts follow by counting; heights are schematic.`),
        h('li', {}, h('b', {}, 'Hückel: '), 'exact eigenvalues and eigenvectors of the stated matrix, in units of β; the heteroatom parameters are the tabulated teaching set.'),
        h('li', {}, h('b', {}, 'Bond energies: '), 'tabulated dissociation energies; nothing is computed from the drawings.'))), 'learn'),
    ],
    titles: { collection: 'The molecules', build: 'Draw it', invariants: (it) => `What ${it.formula} shows` },
  };
}

export class MOPanel {
  constructor({ view, viewport, level = 'learn', navigate = null }) {
    this.view = view; this.viewport = viewport; this.level = level;
    this.lobes = null; this.diagram = null; this.answers = {};
    this.explorer = new CollectionExplorer(makeMOCollection(this), { view, viewport, navigate, level, onChange: (ctx) => this.afterUpdate(ctx) });
    this.el = this.explorer.el; this.inspector = this.explorer.inspector;
  }
  activate() {
    this.view?.setOptions?.({ lonePairs: false, hydrogens: true, labels: true, orbitals: false, arrows: false, highlights: false });
    this.viewport.setAutoRotate?.(false);
    this.explorer.activate();
  }
  deactivate() { this.lobes?.dispose(); this.lobes = null; this.diagram?.dispose?.(); this.diagram = null; }
  setLevel(level) { this.level = level; this.explorer.setLevel(level); }
  navigate(sub) { this.explorer.navigate(sub); }

  afterUpdate({ item, state, built, selected }) {
    const show = selected?.show || {};
    if (show.electrons && Number(state.electrons) !== show.electrons) { this.explorer.api.setState({ electrons: show.electrons, mo: show.mo || null }); return; }
    const moId = show.mo && built.mos.some((m) => m.id === show.mo) ? show.mo : built.selected.id;
    if (moId !== built.selected.id) { this.explorer.api.setState({ mo: moId }); return; }
    const mo = built.selected;
    if (!this.viewport.fallback) {
      if (!this.lobes) this.lobes = new OrbitalView(this.viewport, { molecule: this.view });
      this.lobes.setOptions({ negative: state.negative ?? true, opacity: 0.5 });
      this.lobes.setOrbital(mo.psi, { probability: state.probability ?? 0.8, size: 44, extent: mo.psi.extent, center: mo.psi.center });
      this.viewport.fitTo(this.lobes.bounds(), 1.15, true);
    }
    const draw = () => {
      if (!this.levels?.isConnected) return;
      this.diagram?.dispose?.();
      this.diagram = new LevelDiagram(this.levels, { onHighlight: (level, source) => { if (source === 'click' && level && built.mos.some((m) => m.id === level.id.split('#')[0])) this.explorer.api.setState({ mo: level.id.split('#')[0] }); } });
      this.diagram.set(built.diagram);
      this.diagram.highlight(built.mos.filter((m) => m.id === mo.id).map((m) => m.id));
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
