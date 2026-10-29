// Conformations panel: a rotor (ethane, butane, 2-bromobutane) shown in 3D at a chosen dihedral, with a
// Newman projection and a torsional-energy diagram that move with the same number, named conformations
// to jump to, predict-observe-explain activities, and the E2 anti-periplanar geometry as the pay-off.
import { h, clear, fill, section, aud, toggle } from '../../ui/dom.js';
import { drawNewman } from '../../ui/overlays.js';
import { ROTORS, rotorById, conformer, torsionEnergy, periplanarity } from '../../chem/conformations.js';
import { TORSION_ENERGIES } from '../../chem/references/textbook.js';
import { ACTIVITIES, correctOption } from './activities.js';

const THEME = { text: '#2d3b32', muted: '#727e70', accent: '#48725c', amber: '#9c743e', line: '#e2e7dd', fill: 'rgba(81,119,96,0.08)' };

/** Draw E(φ) over 0–360° with the landmarks labelled and a marker at phi. Returns nothing; safe without a 2D context. */
export function drawTorsionDiagram(canvas, rotor, phi) {
  const ctx = canvas.getContext?.('2d'); if (!ctx) return;
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const W = canvas.clientWidth || 320, H = canvas.clientHeight || 160;
  if (canvas.width !== W * dpr || canvas.height !== H * dpr) { canvas.width = W * dpr; canvas.height = H * dpr; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
  const padL = 34, padR = 12, padT = 16, padB = 28;
  const maxE = Math.max(...Array.from({ length: 361 }, (_, d) => torsionEnergy(rotor.id, d))) + 3;
  const X = (d) => padL + (d / 360) * (W - padL - padR), Y = (E) => padT + (1 - E / maxE) * (H - padT - padB);
  ctx.strokeStyle = 'rgba(87,109,91,0.25)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, H - padB); ctx.lineTo(W - padR, H - padB); ctx.stroke();
  ctx.fillStyle = THEME.muted; ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  for (const d of [0, 60, 120, 180, 240, 300, 360]) ctx.fillText(`${d}°`, X(d), H - padB + 13);
  ctx.fillText('dihedral →', W / 2, H - 4);
  ctx.save(); ctx.translate(10, H / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(`kJ/mol`, 0, 0); ctx.restore();
  ctx.beginPath();
  for (let d = 0; d <= 360; d++) { const y = Y(torsionEnergy(rotor.id, d)); d ? ctx.lineTo(X(d), y) : ctx.moveTo(X(d), y); }
  ctx.strokeStyle = THEME.accent; ctx.lineWidth = 2; ctx.stroke();
  ctx.lineTo(X(360), H - padB); ctx.lineTo(X(0), H - padB); ctx.closePath(); ctx.fillStyle = THEME.fill; ctx.fill();
  for (const l of rotor.landmarks) {
    for (let k = 0; k * rotor.period + l.phi <= 360; k++) {
      const d = l.phi + k * rotor.period, E = torsionEnergy(rotor.id, d);
      ctx.fillStyle = E > 0.5 ? THEME.amber : THEME.muted; ctx.beginPath(); ctx.arc(X(d), Y(E), 2.5, 0, 2 * Math.PI); ctx.fill();
      if (k === 0 || rotor.period === 360) { ctx.font = '9px system-ui, sans-serif'; ctx.fillText(`${E.toFixed(E % 1 ? 1 : 0)}`, X(d), Y(E) - 6); }
    }
  }
  const mx = X(((phi % 360) + 360) % 360), my = Y(torsionEnergy(rotor.id, phi));
  ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(156,116,62,0.4)'; ctx.beginPath(); ctx.moveTo(mx, padT); ctx.lineTo(mx, H - padB); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = THEME.amber; ctx.beginPath(); ctx.arc(mx, my, 5, 0, 2 * Math.PI); ctx.fill(); ctx.strokeStyle = '#fffefa'; ctx.lineWidth = 1.5; ctx.stroke();
}

export class ConformationsPanel {
  constructor({ view, viewport, level = 'learn', navigate = null }) {
    this.view = view; this.viewport = viewport; this.level = level; this.nav = navigate;
    this.rotorId = ROTORS[0].id;
    this.phi = ROTORS[0].landmarks.find((l) => l.id === 'staggered')?.phi ?? 60;
    this.answers = {};
    this.spin = null;
    this.opts = { hydrogens: true, labels: true };
    this.el = h('div', { class: 'panel-inner explorer conformations' });
    this.inspector = h('div', { class: 'panel-inner study-guide' });
    this.refs = {};
    this.render();
  }

  get rotor() { return rotorById(this.rotorId); }
  get built() { return conformer(this.rotorId, this.phi); }

  activate() {
    this.view.setOptions({ lonePairs: true, hydrogens: this.opts.hydrogens, labels: this.opts.labels, orbitals: false, arrows: false, highlights: true });
    this.viewport.setAutoRotate(false);
    this.update(true);
  }
  deactivate() { this.stopSpin(); }
  setLevel(level) { this.level = level; }
  /** Deep link: '<rotor>' or '<rotor>/<landmark>' (or '<rotor>/<degrees>'). */
  navigate(sub = '') {
    const [rid = '', mark = ''] = String(sub).split('/');
    if (rid && rotorById(rid) && rid !== this.rotorId) this.setRotor(rid, false);
    if (mark) {
      const l = this.rotor.landmarks.find((x) => x.id === mark);
      if (l) this.setPhi(l.phi); else if (/^\d+$/.test(mark)) this.setPhi(Number(mark) % 360);
    }
  }
  syncHash() { const l = this.rotor.landmarks.find((x) => x.phi === this.phi); this.nav?.(`conformations/${this.rotorId}${l ? `/${l.id}` : `/${Math.round(this.phi)}`}`); }

  setRotor(id, sync = true) {
    if (!rotorById(id)) return;
    this.stopSpin();
    this.rotorId = id;
    const r = this.rotor;
    this.phi = (r.landmarks.find((l) => l.id === 'staggered' || l.id === 'anti') || r.landmarks[0]).phi;
    this.render();
    this.update(true);
    if (sync) this.syncHash();
  }
  setPhi(phi, sync = true) { this.phi = ((phi % 360) + 360) % 360; if (this.refs.slider) this.refs.slider.value = String(Math.round(this.phi)); this.update(false); if (sync) this.syncHash(); }
  startSpin() { if (this.spin) return; this.spin = setInterval(() => this.setPhi(this.phi + 2, false), 40); this.refs.spinBtn?.classList.add('active'); }
  stopSpin() { if (this.spin) { clearInterval(this.spin); this.spin = null; this.refs.spinBtn?.classList.remove('active'); this.syncHash(); } }

  /** Static DOM for the current rotor: chips, dihedral controls, view toggles; inspector shells. */
  render() {
    clear(this.el); clear(this.inspector);
    const r = this.rotor;
    const chips = section('The rotors', h('div', { class: 'chips' }, ROTORS.map((x) => h('button', {
      class: `chip ${x.id === this.rotorId ? 'active' : ''}`, 'aria-pressed': String(x.id === this.rotorId), dataset: { id: x.id }, title: x.name, onClick: () => this.setRotor(x.id),
    }, h('span', { class: 'chip-pattern' }, x.id === 'ethane' ? 'C₂H₆' : x.id === 'butane' ? 'C₄H₁₀' : 'C₄H₉Br'), h('span', { class: 'chip-name' }, x.name)))));
    this.refs.slider = h('input', { type: 'range', min: 0, max: 360, step: 1, value: Math.round(this.phi), class: 'scrubber', 'aria-label': `Dihedral ${r.reference.join('–')}`, onInput: (e) => { this.stopSpin(); this.setPhi(Number(e.target.value)); } });
    this.refs.spinBtn = h('button', { class: 'btn', onClick: () => (this.spin ? this.stopSpin() : this.startSpin()) }, 'Spin');
    const controls = section('Turn the bond',
      h('div', { class: 'row' }, h('label', {}, `Dihedral ${r.reference.map((a) => r.labels[a] || a).join('–')}`), this.refs.slider),
      h('div', { class: 'landmarks' }, r.landmarks.map((l) => h('button', { class: 'btn landmark', dataset: { mark: l.id }, onClick: () => { this.stopSpin(); this.setPhi(l.phi); } }, `${l.label} · ${l.phi}°`))),
      h('div', { class: 'toggles' }, this.refs.spinBtn),
      aud(h('div', { class: 'hint' }, 'The Newman projection and the energy curve follow the same dihedral as the 3D model: one number, three views.'), 'learn'),
    );
    const viewSec = section('View',
      h('div', { class: 'toggles' },
        toggle('Hydrogens', this.opts.hydrogens, (on) => { this.opts.hydrogens = on; this.view.setOptions({ hydrogens: on }); }),
        toggle('Labels', this.opts.labels, (on) => { this.opts.labels = on; this.view.setOptions({ labels: on }); })),
      h('button', { class: 'btn', onClick: () => this.viewport.fitTo(this.view.bounds()) }, 'Re-centre view'));
    this.el.append(chips, controls, viewSec);

    this.refs.card = h('div', { class: 'card molecule-card' });
    this.refs.newman = h('canvas', { class: 'overlay-canvas newman-canvas', 'aria-label': `Newman projection of ${r.name} down the ${r.axis.join('–')} bond` });
    this.refs.diagram = r.energy ? h('canvas', { class: 'overlay-canvas torsion-canvas', 'aria-label': `Torsional energy of ${r.name} against the dihedral` }) : null;
    this.refs.periplanar = r.energy ? null : h('div', { class: 'periplanar' });
    this.refs.facts = h('div', { class: 'invariants' });
    this.inspector.append(
      this.refs.card,
      section('Newman projection', this.refs.newman),
      r.energy ? section('Torsional energy', this.refs.diagram, aud(h('p', { class: 'hint' }, `Textbook values (${TORSION_ENERGIES[r.energy].source}); the curve between the marked points is an illustrative fit, not a computed potential.`), 'learn')) : section('σ C–H / σ* C–Br alignment', this.refs.periplanar),
      section(`What ${r.name.replace(/ \(.*\)$/, '')} shows`, this.refs.facts),
      section('Predict, then turn', ...ACTIVITIES.filter((a) => a.rotor === r.id).map((a) => this.activityBlock(a))),
      section('Connect it', h('div', { class: 'xlinks' }, (r.links || []).map((l) => h('a', { class: 'xlink', href: l.href }, l.label)))),
    );
  }

  /** Dynamic part: rebuild the frame at phi and refresh the 3D view, card, Newman view and diagram. */
  update(refit = false) {
    const b = this.built, r = b.rotor;
    const hl = [{ type: 'bond', a: r.axis[0], b: r.axis[1] }, { type: 'atom', id: r.reference[0] }, { type: 'atom', id: r.reference[3] }];
    this.view.setFrame(b.frame); this.view.setArrows?.([]); this.view.setHighlights(hl);
    if (refit) this.viewport?.fitTo(this.view.bounds(), 1.1, true);
    const heading = typeof document !== 'undefined' ? document.getElementById?.('workspace-name') : null;
    if (heading) heading.textContent = `${r.name.replace(/ \(.*\)$/, '')} · ${b.conformation} · ${Math.round(b.phi)}°`;
    fill(this.refs.card,
      h('div', { class: 'mol-pattern' }, r.formula),
      h('div', { class: 'mol-name' }, r.name),
      h('div', { class: 'shape-angles' },
        h('div', { class: 'shape-angle' }, h('b', {}, 'Dihedral'), h('span', { class: 'value' }, `${Math.round(b.phi)}°`), h('span', { class: 'status' }, `${r.reference.map((a) => r.labels[a] || a).join('–')}, measured in the model ${b.dihedral.toFixed(1)}°`)),
        h('div', { class: 'shape-angle' }, h('b', {}, 'Conformation'), h('span', { class: 'value' }, b.conformation), null),
        b.energy != null ? h('div', { class: 'shape-angle status-class' }, h('b', {}, 'Energy'), h('span', { class: 'value' }, `${b.energy.toFixed(1)} kJ/mol`), h('span', { class: 'status' }, 'above the lowest conformer; textbook values, curve illustrative')) : null,
        r.energy ? null : h('div', { class: 'shape-angle' }, h('b', {}, 'Alignment'), h('span', { class: 'value' }, `${Math.round(periplanarity(b.phi) * 100)} %`), h('span', { class: 'status' }, '|cos φ|: a cartoon of σ(C–H)/σ*(C–Br) overlap, 100 % at 180° and 0°, 0 at 90°')),
      ));
    fill(this.refs.facts, (r.facts || []).map((f) => aud(h('div', { class: 'invariant static' }, h('div', { class: 'inv-title' }, f.title), h('p', { class: 'inv-detail' }, f.detail)), f.audience || 'both')));
    if (this.refs.periplanar) fill(this.refs.periplanar, h('div', { class: 'bar-row' }, h('span', {}, '0'), h('div', { class: 'bar' }, h('i', { style: { width: `${Math.round(periplanarity(b.phi) * 100)}%` } })), h('span', {}, `${Math.round(periplanarity(b.phi) * 100)} %`)),
      h('p', { class: 'hint' }, b.phi % 360 > 165 && b.phi % 360 < 195 ? 'Anti-periplanar: the C–Hβ bond and the C–Br bond lie in one plane, pointing opposite ways. This is the geometry E2 needs; the breaking C–H σ bond can feed the C–Br σ* orbital.' : b.phi % 360 < 15 || b.phi % 360 > 345 ? 'Syn-periplanar: aligned, but eclipsed and crowded; E2 strongly prefers the anti arrangement.' : 'Out of plane: no useful overlap between the C–H σ bond and the C–Br σ* orbital, so E2 waits for the bond to turn.'));
    const draw = () => {
      if (this.refs.newman?.isConnected) drawNewman(this.refs.newman, b.frame, r.axis[0], r.axis[1], { labels: r.labels });
      if (this.refs.diagram?.isConnected) drawTorsionDiagram(this.refs.diagram, r, b.phi);
    };
    typeof setTimeout === 'function' ? setTimeout(draw, 0) : draw();
  }

  activityBlock(act) {
    const block = h('div', { class: 'poe', dataset: { activity: act.id } });
    const render = () => {
      const chosen = this.answers[act.id], correct = correctOption(act);
      const kids = [h('h4', { class: 'poe-title' }, act.title), h('p', { class: 'poe-prompt' }, act.prompt),
        h('div', { class: 'poe-options', role: 'group', 'aria-label': act.title }, act.options.map((o) => h('button', { class: `btn poe-option ${chosen === o.id ? (o.correct ? 'right' : 'wrong') : ''} ${chosen && o.correct ? 'reveal' : ''}`, 'aria-pressed': String(chosen === o.id), onClick: () => { this.answers[act.id] = o.id; render(); } }, o.label)))];
      if (chosen) kids.push(h('div', { class: `poe-reveal ${chosen === correct?.id ? 'right' : 'wrong'}` }, h('b', {}, chosen === correct?.id ? 'Right. ' : `Not quite: ${correct?.label.toLowerCase()}. `), act.reveal(),
        act.show ? h('button', { class: 'btn poe-show', onClick: () => { this.stopSpin(); if (act.show.rotor && act.show.rotor !== this.rotorId) this.setRotor(act.show.rotor); const l = this.rotor.landmarks.find((x) => x.id === act.show.landmark); if (l) this.setPhi(l.phi); } }, 'Show me') : null,
        h('button', { class: 'btn poe-reset', onClick: () => { delete this.answers[act.id]; render(); } }, 'Try again')));
      clear(block).append(...kids);
    };
    render();
    return block;
  }
}
