// Atomic orbitals panel: a CollectionExplorer over the hydrogen-like orbital gallery, the sp / sp² / sp³
// hybrids and the electron-configuration builder. The 3D view draws |ψ| isosurfaces with OrbitalView (up
// to four at once for a hybrid set or the three 2p orbitals); the card draws the radial distribution
// function on a canvas (readable without WebGL) and the configuration item draws Hund boxes with
// LevelDiagram. Every number on the card is exact for the hydrogen-like functions or a cited table value.
import { h, section, aud, toggle, select } from '../../ui/dom.js';
import { CollectionExplorer } from '../../ui/collectionExplorer.js';
import { LevelDiagram } from '../../ui/levelDiagram.js';
import { OrbitalView } from '../../render/orbitalView.js';
import { orbital, A0_ANGSTROM, ORBITAL_LABELS } from '../../chem/orbitals.js';
import { ORBITAL_ITEMS, FAMILIES, HYBRIDS, PERIODIC, buildItem, hydrogenLevel } from '../../chem/atomicOrbitals.js';
import { HYDROGEN_ENERGY, GROUND_STATE_CONFIGURATIONS, AUFBAU_EXCEPTIONS } from '../../chem/references/textbook.js';
import { INVARIANTS } from './content.js';
import { ACTIVITIES, correctOption } from './activities.js';

const THEME = { muted: '#727e70', accent: '#48725c', amber: '#9c743e', fill: 'rgba(81,119,96,0.08)' };
const A0_PM = A0_ANGSTROM * 100;
const EMPTY_FRAME = { atoms: [], bonds: [], aliases: {} };
const pm = (a0) => `${(a0 * A0_PM).toFixed(0)} pm`;

/** Draw P(r) = r²R² against r (a₀) with the radial nodes and the most probable radius marked. Safe without a 2D context. */
export function drawRadialDistribution(canvas, rdf, { label = '' } = {}) {
  const ctx = canvas.getContext?.('2d'); if (!ctx) return;
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const W = canvas.clientWidth || 320, H = canvas.clientHeight || 150;
  if (canvas.width !== W * dpr || canvas.height !== H * dpr) { canvas.width = W * dpr; canvas.height = H * dpr; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
  const padL = 30, padR = 12, padT = 14, padB = 26;
  const maxP = Math.max(...rdf.P) * 1.1 || 1;
  const X = (r) => padL + (r / rdf.rMax) * (W - padL - padR), Y = (p) => padT + (1 - p / maxP) * (H - padT - padB);
  ctx.strokeStyle = 'rgba(87,109,91,0.25)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, H - padB); ctx.lineTo(W - padR, H - padB); ctx.stroke();
  ctx.fillStyle = THEME.muted; ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const tick = rdf.rMax > 20 ? 5 : rdf.rMax > 8 ? 2 : 1;
  for (let r = 0; r <= rdf.rMax + 1e-9; r += tick) ctx.fillText(String(r), X(r), H - padB + 13);
  ctx.fillText('r / a₀ →', W / 2, H - 3);
  ctx.save(); ctx.translate(9, H / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('r²R²', 0, 0); ctx.restore();
  ctx.beginPath();
  rdf.r.forEach((r, i) => { const y = Y(rdf.P[i]); i ? ctx.lineTo(X(r), y) : ctx.moveTo(X(r), y); });
  ctx.strokeStyle = THEME.accent; ctx.lineWidth = 2; ctx.stroke();
  ctx.lineTo(X(rdf.rMax), H - padB); ctx.lineTo(X(0), H - padB); ctx.closePath(); ctx.fillStyle = THEME.fill; ctx.fill();
  for (const n of rdf.nodes) { ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(173,101,82,0.6)'; ctx.beginPath(); ctx.moveTo(X(n), padT); ctx.lineTo(X(n), H - padB); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#ad6552'; ctx.font = '9px system-ui, sans-serif'; ctx.fillText(`node ${n.toFixed(1)}`, X(n), padT - 3); }
  const mx = X(rdf.rMostProbable), my = Y(Math.max(...rdf.P));
  ctx.fillStyle = THEME.amber; ctx.beginPath(); ctx.arc(mx, my, 4, 0, 2 * Math.PI); ctx.fill();
  ctx.font = '9px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(`${rdf.rMostProbable.toFixed(2)} a₀${label ? ` · ${label}` : ''}`, mx + 7, my + 3);
}

const pct = (x) => `${Math.round(x * 100)} %`;

export function makeOrbitalsCollection(panel) {
  return {
    id: 'atomic-orbitals',
    items: ORBITAL_ITEMS,
    chips: (it) => ({ pattern: it.kind === 'configurations' ? '[Ne] …' : it.kind === 'hybrid' ? HYBRIDS[it.hybrid].label : ORBITAL_LABELS[it.orbital], name: it.name, color: FAMILIES[it.family]?.color, title: FAMILIES[it.family]?.label }),
    initialState: (it) => (it.kind === 'configurations' ? { Z: 6 } : { probability: 0.9, negative: true, wireframe: false, all: false }),
    build: (it, state) => buildItem(it.id, state),
    controls: (it, state, api) => {
      if (it.kind === 'configurations') return [h('div', { class: 'row' }, h('label', {}, 'Element'), select(PERIODIC.map((e) => ({ value: String(e.Z), label: `${e.Z} ${e.symbol} ${e.name}` })), String(state.Z), (z) => api.setState({ Z: Number(z) }), { 'aria-label': 'Element' })), aud(h('div', { class: 'hint' }, 'The 3D view shows the highest occupied orbital that this model can draw (n ≤ 3); 4s and 4p are not drawn.'), 'learn')];
      const slider = h('input', { type: 'range', min: 50, max: 95, step: 5, value: Math.round(state.probability * 100), class: 'scrubber', 'aria-label': 'Enclosed probability', onInput: (e) => api.setState({ probability: Number(e.target.value) / 100 }) });
      return [
        h('div', { class: 'row' }, h('label', {}, `Contour encloses ${Math.round(state.probability * 100)} % of the probability`), slider),
        h('div', { class: 'toggles' },
          toggle('Negative phase', state.negative, (on) => api.setState({ negative: on })),
          toggle('Wireframe', state.wireframe, (on) => api.setState({ wireframe: on })),
          it.kind === 'hybrid' ? toggle(`All ${HYBRIDS[it.hybrid].count} hybrids`, state.all, (on) => api.setState({ all: on })) : null),
        aud(h('div', { class: 'hint' }, 'Amber is the positive phase of ψ, fuchsia the negative. The surface is where |ψ| equals one value; a tighter contour reveals the inner structure.'), 'learn'),
      ];
    },
    card: (it, state, built) => {
      if (it.kind === 'configurations') {
        const c = built.config;
        panel.levels = h('canvas', { class: 'overlay-canvas config-canvas', 'aria-label': `Orbital box diagram of ${c.name}` });
        return [
          h('div', { class: 'mol-pattern' }, c.nobleGasString),
          h('div', { class: 'mol-name' }, `${c.name} (Z = ${c.Z})`),
          h('div', { class: 'shape-angles' },
            h('div', { class: 'shape-angle status-measured' }, h('b', {}, 'Configuration'), h('span', { class: 'value' }, c.string), h('span', { class: 'status' }, `ground state, as tabulated (${GROUND_STATE_CONFIGURATIONS.source.split(';')[0]})`)),
            h('div', { class: 'shape-angle' }, h('b', {}, 'Valence'), h('span', { class: 'value' }, `${c.valence} e⁻`), h('span', { class: 'status' }, c.core ? `outside the [${c.core}] core` : 'no noble-gas core')),
            h('div', { class: 'shape-angle' }, h('b', {}, 'Unpaired'), h('span', { class: 'value' }, `${c.unpaired}`), h('span', { class: 'status' }, "by Hund's rule; what a magnet measures")),
            c.exception ? h('div', { class: 'shape-angle status-class' }, h('b', {}, 'Exception'), h('span', { class: 'value' }, 'yes'), h('span', { class: 'status' }, `${c.exception} (${AUFBAU_EXCEPTIONS.source})`)) : null,
            h('div', { class: 'shape-angle' }, h('b', {}, 'Drawn'), h('span', { class: 'value' }, built.drawn || 'none'), h('span', { class: 'status' }, built.drawn ? `the highest occupied orbital with n ≤ 3 (${ORBITAL_LABELS[built.orbitalName]}, hydrogen-like)` : 'nothing: the model draws n ≤ 3 only')),
          ),
          panel.levels,
          aud(h('p', { class: 'hint' }, 'Boxes in filling order, one per orbital; heights are schematic, not energies.'), 'learn'),
        ];
      }
      if (it.kind === 'hybrid') {
        const H = built.hybrid;
        return [
          h('div', { class: 'mol-pattern' }, H.label),
          h('div', { class: 'mol-name' }, `${H.label} hybrid orbital`),
          h('div', { class: 'shape-angles' },
            h('div', { class: 'shape-angle status-measured' }, h('b', {}, 'Mix'), h('span', { class: 'value' }, `${pct(H.sCharacter)} s`), h('span', { class: 'status' }, `${pct(1 - H.sCharacter)} p; hybrid 1 = ${built.set[0].formula}`)),
            h('div', { class: 'shape-angle status-measured' }, h('b', {}, 'Lobes'), h('span', { class: 'value' }, `${H.count} × ${H.angle}°`), h('span', { class: 'status' }, `${H.geometry}; between the main lobes found on the drawn functions: ${built.angle.toFixed(1)}°`)),
            h('div', { class: 'shape-angle' }, h('b', {}, 'Built from'), h('span', { class: 'value' }, `2s + 2p`), h('span', { class: 'status' }, 'hydrogen-like 2s and 2p (Z = 1); a carbon\'s are contracted but shaped the same')),
          ),
          h('div', { class: 'xlinks' }, h('a', { class: 'xlink', href: H.example.href }, H.example.label), h('a', { class: 'xlink', href: H.shape.href }, H.shape.label)),
        ];
      }
      panel.rdf = h('canvas', { class: 'overlay-canvas rdf-canvas', 'aria-label': `Radial distribution function of ${built.label}` });
      return [
        h('div', { class: 'mol-pattern' }, built.label),
        h('div', { class: 'mol-name' }, `${built.label} orbital of hydrogen`),
        h('div', { class: 'mol-meta' }, h('span', { class: 'formula' }, `n = ${built.n}, l = ${built.l} (${built.subshell})`), h('span', { class: 'pattern' }, `${built.degeneracy} orbital${built.degeneracy === 1 ? '' : 's'} in the subshell, ${built.maxElectrons} electrons`)),
        h('div', { class: 'shape-angles' },
          h('div', { class: 'shape-angle status-measured' }, h('b', {}, 'Nodes'), h('span', { class: 'value' }, `${built.radialNodes} + ${built.angularNodes}`), h('span', { class: 'status' }, `radial (n − l − 1) + angular (l) = ${built.totalNodes}${built.rdf.nodes.length ? `; radial nodes at ${built.rdf.nodes.map((x) => `${x.toFixed(2)} a₀`).join(', ')}` : ''}`)),
          h('div', { class: 'shape-angle status-measured' }, h('b', {}, 'Energy'), h('span', { class: 'value' }, `${built.energyEV.toFixed(2)} eV`), h('span', { class: 'status' }, `hydrogen: E_n = −${HYDROGEN_ENERGY.rydbergEV}/n² eV (${HYDROGEN_ENERGY.source})`)),
          h('div', { class: 'shape-angle status-measured' }, h('b', {}, 'Most probable r'), h('span', { class: 'value' }, `${built.rdf.rMostProbable.toFixed(2)} a₀`), h('span', { class: 'status' }, `${pm(built.rdf.rMostProbable)}; the peak of r²R² below`)),
        ),
        panel.rdf,
      ];
    },
    invariants: (it) => INVARIANTS[it.id] || [],
    highlights: () => [],            // cards adjust the view through `show` in afterUpdate, not through MoleculeView highlights
    guide: (it, api) => [
      section('Predict, then look', ...ACTIVITIES.filter((a) => a.item === it.id).map((act) => panel.activityBlock(act, api))),
      aud(section('Where the numbers come from', h('ul', { class: 'identify' },
        h('li', {}, h('b', {}, 'Shapes and nodes: '), 'the hydrogen-like functions R_nl(r)·Y(θ, φ) for n ≤ 3 (Atkins), drawn as the |ψ| surface enclosing the chosen share of the probability; nothing is fitted.'),
        h('li', {}, h('b', {}, 'Energies: '), `hydrogen only, E_n = −R_H/n² with R_H = ${HYDROGEN_ENERGY.rydbergEV} eV (${HYDROGEN_ENERGY.source}); many-electron atoms get a schematic ladder, no numbers.`),
        h('li', {}, h('b', {}, 'Hybrids: '), 'the stated linear combinations of 2s and 2p; the lobe angle is read off the functions and compared with the analytic value.'),
        h('li', {}, h('b', {}, 'Configurations: '), `the aufbau order with the tabulated exceptions, checked against ${GROUND_STATE_CONFIGURATIONS.source.split(';')[0]} for every element 1–36.`))), 'learn'),
    ],
    titles: { collection: 'The orbitals', build: 'Draw it', invariants: (it) => `What ${it.name} shows` },
  };
}

export class OrbitalsPanel {
  constructor({ view, viewport, level = 'learn', navigate = null }) {
    this.view = view; this.viewport = viewport; this.level = level;
    this.lobes = [];
    this.diagram = null;
    this.answers = {};
    this.explorer = new CollectionExplorer(makeOrbitalsCollection(this), { viewport, navigate, level, onChange: (ctx) => this.afterUpdate(ctx) });
    this.el = this.explorer.el;
    this.inspector = this.explorer.inspector;
  }
  activate() {
    this.view?.setFrame?.(EMPTY_FRAME); this.view?.setHighlights?.([]); this.view?.setArrows?.([]);
    this.viewport.setAutoRotate?.(true);
    this.explorer.activate();
  }
  deactivate() { this.viewport.setAutoRotate?.(false); for (const l of this.lobes) l.dispose(); this.lobes = []; this.diagram?.dispose?.(); this.diagram = null; }
  setLevel(level) { this.level = level; this.explorer.setLevel(level); }
  navigate(sub) { this.explorer.navigate(sub); }

  /** The OrbitalView for slot i, created on demand (none without WebGL). */
  lobe(i) {
    if (this.viewport.fallback) return null;
    while (this.lobes.length <= i) {
      const l = new OrbitalView(this.viewport);
      // The camera looks along z, so turn the orbital frame to put its z axis (p𝓏 lobes, the d𝓏² torus axis) vertical on screen.
      const T = this.viewport.THREE;
      if (T?.Quaternion) l.setPlacement({ quaternion: new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), -Math.PI / 2) });
      this.lobes.push(l);
    }
    return this.lobes[i];
  }

  afterUpdate({ item, state, built, selected, refit }) {
    const show = { probability: state.probability ?? 0.9, negative: state.negative ?? true, wireframe: state.wireframe ?? false, all: state.all ?? false, ...(selected?.show || {}) };
    let orbs = [];
    if (item.kind === 'atomic') orbs = show.orbitals ? show.orbitals.map((n) => orbital(n)) : [built.orbital];
    else if (item.kind === 'hybrid') orbs = show.all ? built.set : [built.orbital];
    else orbs = built.orbital ? [built.orbital] : [];
    const heading = typeof document !== 'undefined' ? document.getElementById?.('workspace-name') : null;
    if (heading) heading.textContent = built.title;
    if (!this.viewport.fallback) {
      orbs.forEach((o, i) => { const l = this.lobe(i); l.setOptions({ negative: show.negative, wireframe: show.wireframe, opacity: orbs.length > 1 ? 0.45 : 0.55 }); l.setOrbital(o, { probability: show.probability, size: orbs.length > 1 ? 36 : 44 }); });
      for (let i = orbs.length; i < this.lobes.length; i++) this.lobes[i].clear();
      if (refit || orbs.length) { const box = this.lobes[0]?.bounds(); for (const l of this.lobes.slice(1)) if (l.grid) box?.union(l.bounds()); if (box && !box.isEmpty()) this.viewport.fitTo(box, 1.15, true); }
    }
    const draw = () => {
      if (this.rdf?.isConnected && built.rdf) drawRadialDistribution(this.rdf, built.rdf, { label: built.label });
      if (this.levels?.isConnected && built.config) { this.diagram?.dispose?.(); this.diagram = new LevelDiagram(this.levels); this.diagram.set(built.config.diagram); }
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
        act.show ? h('button', { class: 'btn poe-show', onClick: () => { if (act.show.item !== api.item.id) api.select(act.show.item); if (act.show.Z) api.setState({ Z: act.show.Z }); if (act.show.invariant) api.selectInvariant(act.show.invariant); } }, 'Show me') : null,
        h('button', { class: 'btn poe-reset', onClick: () => { delete this.answers[act.id]; render(); } }, 'Try again')));
      block.replaceChildren(...kids);
    };
    render();
    return block;
  }
}
export { hydrogenLevel };
