// Conformations panel: a rotor (ethane, butane, 2-bromobutane) shown in 3D at a chosen dihedral, with a
// Newman projection and a torsional-energy diagram that move with the same number, named conformations
// to jump to, predict-observe-explain activities, and the E2 anti-periplanar geometry as the pay-off;
// plus the cyclohexane chair: one substituent, two chairs (the ring flip) and the boat, with the A-value
// read from the textbook table.
import { h, clear, fill, section, aud, toggle, select } from '../../ui/dom.js';
import { drawNewman } from '../../ui/overlays.js';
import { ROTORS, rotorById, conformer, torsionEnergy, periplanarity } from '../../chem/conformations.js';
import { CHAIR, CHAIR_SUBSTITUENTS, RING_FORMS, substituentById, formById, cyclohexaneFrame, equatorialFraction, KCAL } from '../../chem/cyclohexane.js';
import { TORSION_ENERGIES, RING_CONFORMER_ENERGIES, A_VALUES } from '../../chem/references/textbook.js';
import { ACTIVITIES, correctOption } from './activities.js';

const THEME = { text: '#2d3b32', muted: '#727e70', accent: '#48725c', amber: '#9c743e', line: '#e2e7dd', fill: 'rgba(81,119,96,0.08)' };
/** Items in chip order: the three rotors, then the chair lesson. */
export const ITEMS = [...ROTORS, CHAIR];
const PATTERN = { ethane: 'C₂H₆', butane: 'C₄H₁₀', bromobutane: 'C₄H₉Br', cyclohexane: 'C₆H₁₂' };

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

const kJ = (x, d = 1) => `${x.toFixed(x % 1 ? d : 0)} kJ/mol`;
const pct = (f) => (f >= 0.9995 ? '> 99.9 %' : `${(f * 100).toFixed(f > 0.99 ? 1 : 0)} %`);

export class ConformationsPanel {
  constructor({ view, viewport, level = 'learn', navigate = null }) {
    this.view = view; this.viewport = viewport; this.level = level; this.nav = navigate;
    this.rotorId = ROTORS[0].id;
    this.phi = ROTORS[0].landmarks.find((l) => l.id === 'staggered')?.phi ?? 60;
    this.chair = { sub: 'methyl', form: 'axial' };
    this.answers = {};
    this.spin = null;
    this.opts = { hydrogens: true, labels: true };
    this.el = h('div', { class: 'panel-inner explorer conformations' });
    this.inspector = h('div', { class: 'panel-inner study-guide' });
    this.refs = {};
    this.render();
  }

  get isChair() { return this.rotorId === CHAIR.id; }
  get rotor() { return rotorById(this.rotorId); }
  get built() { return this.isChair ? cyclohexaneFrame(this.chair.sub, this.chair.form) : conformer(this.rotorId, this.phi); }

  activate() {
    this.view.setOptions({ lonePairs: true, hydrogens: this.opts.hydrogens, labels: this.opts.labels, orbitals: false, arrows: false, highlights: true });
    this.viewport.setAutoRotate(false);
    this.update(true);
  }
  deactivate() { this.stopSpin(); }
  setLevel(level) { this.level = level; }
  /** Deep link: '<rotor>' or '<rotor>/<landmark>' (or '<rotor>/<degrees>'); 'cyclohexane/<form>/<substituent>'. */
  navigate(sub = '') {
    const [rid = '', mark = '', extra = ''] = String(sub).split('/');
    if (rid && (rotorById(rid) || rid === CHAIR.id) && rid !== this.rotorId) this.setRotor(rid, false);
    if (this.isChair) {
      const s = extra && substituentById(extra) ? extra : this.chair.sub;
      const f = mark && formById(mark) ? mark : this.chair.form;
      this.setChair(s, f, false);
      return;
    }
    if (mark) {
      const l = this.rotor.landmarks.find((x) => x.id === mark);
      if (l) this.setPhi(l.phi); else if (/^\d+$/.test(mark)) this.setPhi(Number(mark) % 360);
    }
  }
  syncHash() {
    if (this.isChair) { this.nav?.(`conformations/${CHAIR.id}/${this.chair.form}/${this.chair.sub}`); return; }
    const l = this.rotor.landmarks.find((x) => x.phi === this.phi);
    this.nav?.(`conformations/${this.rotorId}${l ? `/${l.id}` : `/${Math.round(this.phi)}`}`);
  }

  setRotor(id, sync = true) {
    if (!rotorById(id) && id !== CHAIR.id) return;
    this.stopSpin();
    this.rotorId = id;
    const r = this.rotor;
    if (r) this.phi = (r.landmarks.find((l) => l.id === 'staggered' || l.id === 'anti') || r.landmarks[0]).phi;
    this.render();
    this.update(true);
    if (sync) this.syncHash();
  }
  setPhi(phi, sync = true) { if (this.isChair) return; this.phi = ((phi % 360) + 360) % 360; if (this.refs.slider) this.refs.slider.value = String(Math.round(this.phi)); this.update(false); if (sync) this.syncHash(); }
  /** Chair lesson: choose the substituent and the ring form; the view refits because the shape changes. */
  setChair(sub, form, sync = true) {
    if (!substituentById(sub) || !formById(form)) return;
    const changed = sub !== this.chair.sub || form !== this.chair.form;
    this.chair = { sub, form };
    if (this.refs.subSelect) this.refs.subSelect.value = sub;
    for (const b of this.refs.formBtns || []) b.classList.toggle('active', b.dataset.mark === form);
    this.update(changed);
    if (sync) this.syncHash();
  }
  flipRing() { this.setChair(this.chair.sub, this.chair.form === 'equatorial' ? 'axial' : 'equatorial'); }
  /** Jump to what an activity wants to show: a rotor landmark or a chair form (and substituent). */
  jumpTo(show) {
    this.stopSpin();
    const target = show.rotor || CHAIR.id;
    if (target !== this.rotorId) this.setRotor(target);
    if (this.isChair) { this.setChair(show.substituent || this.chair.sub, show.form || this.chair.form); return; }
    const l = this.rotor.landmarks.find((x) => x.id === show.landmark); if (l) this.setPhi(l.phi);
  }
  startSpin() { if (this.spin || this.isChair) return; this.spin = setInterval(() => this.setPhi(this.phi + 2, false), 40); this.refs.spinBtn?.classList.add('active'); }
  stopSpin() { if (this.spin) { clearInterval(this.spin); this.spin = null; this.refs.spinBtn?.classList.remove('active'); this.syncHash(); } }

  /** Static DOM for the current item: chips, controls, view toggles; inspector shells. */
  render() {
    clear(this.el); clear(this.inspector);
    const chips = section('The rotors', h('div', { class: 'chips' }, ITEMS.map((x) => h('button', {
      class: `chip ${x.id === this.rotorId ? 'active' : ''}`, 'aria-pressed': String(x.id === this.rotorId), dataset: { id: x.id }, title: x.name, onClick: () => this.setRotor(x.id),
    }, h('span', { class: 'chip-pattern' }, PATTERN[x.id] || x.formula), h('span', { class: 'chip-name' }, x.name)))));
    const viewSec = section('View',
      h('div', { class: 'toggles' },
        toggle('Hydrogens', this.opts.hydrogens, (on) => { this.opts.hydrogens = on; this.view.setOptions({ hydrogens: on }); }),
        toggle('Labels', this.opts.labels, (on) => { this.opts.labels = on; this.view.setOptions({ labels: on }); })),
      h('button', { class: 'btn', onClick: () => this.viewport.fitTo(this.view.bounds()) }, 'Re-centre view'));
    if (this.isChair) { this.renderChair(chips, viewSec); return; }
    const r = this.rotor;
    this.refs.slider = h('input', { type: 'range', min: 0, max: 360, step: 1, value: Math.round(this.phi), class: 'scrubber', 'aria-label': `Dihedral ${r.reference.join('–')}`, onInput: (e) => { this.stopSpin(); this.setPhi(Number(e.target.value)); } });
    this.refs.spinBtn = h('button', { class: 'btn', onClick: () => (this.spin ? this.stopSpin() : this.startSpin()) }, 'Spin');
    const controls = section('Turn the bond',
      h('div', { class: 'row' }, h('label', {}, `Dihedral ${r.reference.map((a) => r.labels[a] || a).join('–')}`), this.refs.slider),
      h('div', { class: 'landmarks' }, r.landmarks.map((l) => h('button', { class: 'btn landmark', dataset: { mark: l.id }, onClick: () => { this.stopSpin(); this.setPhi(l.phi); } }, `${l.label} · ${l.phi}°`))),
      h('div', { class: 'toggles' }, this.refs.spinBtn),
      aud(h('div', { class: 'hint' }, 'The Newman projection and the energy curve follow the same dihedral as the 3D model: one number, three views.'), 'learn'),
    );
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

  /** Static DOM for the chair lesson. */
  renderChair(chips, viewSec) {
    this.refs.slider = null; this.refs.spinBtn = null; this.refs.newman = null; this.refs.diagram = null; this.refs.periplanar = null;
    this.refs.subSelect = select(CHAIR_SUBSTITUENTS.map((s) => ({ value: s.id, label: `${s.label} (${s.formula})` })), this.chair.sub, (id) => this.setChair(id, this.chair.form), { 'aria-label': 'Substituent on C1' });
    this.refs.formBtns = RING_FORMS.map((f) => h('button', { class: `btn landmark ${f.id === this.chair.form ? 'active' : ''}`, dataset: { mark: f.id }, onClick: () => this.setChair(this.chair.sub, f.id) }, f.label));
    const controls = section('Flip the ring',
      h('div', { class: 'row' }, h('label', {}, 'Substituent X on C1'), this.refs.subSelect),
      h('div', { class: 'landmarks' }, this.refs.formBtns),
      h('div', { class: 'toggles' }, h('button', { class: 'btn', onClick: () => this.flipRing() }, 'Flip chair ⇄')),
      aud(h('div', { class: 'hint' }, 'The flip is a rotation about the ring bonds, not a bond breaking: every axial position becomes equatorial and back. The model draws the two chairs and the boat as rigid templates; it does not animate the path between them.'), 'learn'),
    );
    this.el.append(chips, controls, viewSec);
    this.refs.card = h('div', { class: 'card molecule-card' });
    this.refs.facts = h('div', { class: 'invariants' });
    const E = RING_CONFORMER_ENERGIES.cyclohexane;
    const ladder = [['Chair', E.chair, 'drawn'], ['Twist-boat', E.twistBoat, 'not drawn'], ['Boat', E.boat, 'drawn'], ['Half-chair (the pass)', E.halfChair, 'not drawn']].map(([name, val, drawn]) =>
      h('div', { class: 'shape-angle status-class' }, h('b', {}, name), h('span', { class: 'value' }, kJ(val)), h('span', { class: 'status' }, drawn)));
    this.inspector.append(
      this.refs.card,
      section('The ring forms of cyclohexane', h('div', { class: 'shape-angles' }, ladder), aud(h('p', { class: 'hint' }, `Textbook values above the chair (${E.source}). The twist-boat and half-chair are named here but not drawn: the model has no template for them.`), 'learn')),
      section('What the chair shows', this.refs.facts),
      section('Predict, then flip', ...ACTIVITIES.filter((a) => a.rotor === CHAIR.id).map((a) => this.activityBlock(a))),
      section('Connect it', h('div', { class: 'xlinks' }, CHAIR.links.map((l) => h('a', { class: 'xlink', href: l.href }, l.label)))),
    );
  }

  /** Dynamic part: rebuild the frame and refresh the 3D view, card, Newman view and diagram. */
  update(refit = false) {
    if (this.isChair) { this.updateChair(refit); return; }
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

  updateChair(refit = false) {
    const b = this.built, s = b.sub, f = b.form, isH = s.id === 'H';
    const hl = [{ type: 'bond', a: 'ring.C1', b: b.attach }, { type: 'atom', id: b.attach }, ...b.diaxial.map((id) => ({ type: 'atom', id })), { type: 'label', id: b.attach, text: isH ? `H ${b.site}` : `${s.formula} ${b.site}` }];
    this.view.setFrame(b.frame); this.view.setArrows?.([]); this.view.setHighlights(hl);
    if (refit) this.viewport?.fitTo(this.view.bounds(), 1.1, true);
    const heading = typeof document !== 'undefined' ? document.getElementById?.('workspace-name') : null;
    if (heading) heading.textContent = `${s.name} · ${f.short} · X ${b.site}`;
    const E = b.energy;
    const chairForm = f.shape === 'cyclohexaneChair';
    const frac = chairForm && !isH ? equatorialFraction(A_VALUES.values[s.id].kJ) : null;
    const siteText = { axial: 'parallel to the ring axis', equatorial: 'pointing out along the rim', flagpole: 'the bow of the boat, facing the stern hydrogen', bowsprit: 'pointing out from the bow' }[b.site];
    fill(this.refs.card,
      h('div', { class: 'mol-pattern' }, isH ? CHAIR.formula : `C₆H₁₁–${s.formula}`),
      h('div', { class: 'mol-name' }, s.name),
      h('div', { class: 'shape-angles' },
        h('div', { class: 'shape-angle' }, h('b', {}, 'Form'), h('span', { class: 'value' }, f.short), h('span', { class: 'status' }, f.label)),
        h('div', { class: 'shape-angle status-measured' }, h('b', {}, isH ? 'H on C1' : 'X on C1'), h('span', { class: 'value' }, b.site), h('span', { class: 'status' }, `${siteText}; C1–X is ${b.tilt.toFixed(1)}° from the ring axis in the model`)),
        h('div', { class: 'shape-angle status-class' }, h('b', {}, 'Energy'), h('span', { class: 'value' }, `${kJ(E.value)}`), h('span', { class: 'status' }, `${E.kcal ? `${E.kcal} kcal/mol; ` : ''}${E.note}. Textbook table (${E.source})`)),
        frac != null ? h('div', { class: 'shape-angle status-class' }, h('b', {}, 'Equatorial'), h('span', { class: 'value' }, pct(frac)), h('span', { class: 'status' }, `of the molecules at 25 °C, from the A-value: K = e^(A/RT)`)) : null,
        b.contact ? h('div', { class: 'shape-angle' }, h('b', {}, chairForm ? '1,3-diaxial' : 'Flagpole'), h('span', { class: 'value' }, `${b.contact.d.toFixed(2)} Å`), h('span', { class: 'status' }, `closest X···H contact in the model (${b.contact.b.replace('ring.', '')}); the ring keeps its template angles, so the crowding is drawn, not relieved`)) : null,
      ),
      b.crowding ? h('div', { class: 'mol-crowding' }, h('b', {}, 'Too crowded for the model. '), `${s.name} with X ${b.site}: atoms overlap (closest ${b.crowding.worst.a.replace(/^(ring|X)\./, '')}···${b.crowding.worst.b.replace(/^(ring|X)\./, '')} ${b.crowding.worst.d.toFixed(2)} Å). A real molecule bends its angles and twists to make room, which this model never does, so the overlap is the model's limit; the A-value says how costly the position really is.`) : null,
    );
    fill(this.refs.facts, CHAIR.facts.map((x) => aud(h('div', { class: 'invariant static' }, h('div', { class: 'inv-title' }, x.title), h('p', { class: 'inv-detail' }, x.detail)), x.audience || 'both')));
  }

  activityBlock(act) {
    const block = h('div', { class: 'poe', dataset: { activity: act.id } });
    const render = () => {
      const chosen = this.answers[act.id], correct = correctOption(act);
      const kids = [h('h4', { class: 'poe-title' }, act.title), h('p', { class: 'poe-prompt' }, act.prompt),
        h('div', { class: 'poe-options', role: 'group', 'aria-label': act.title }, act.options.map((o) => h('button', { class: `btn poe-option ${chosen === o.id ? (o.correct ? 'right' : 'wrong') : ''} ${chosen && o.correct ? 'reveal' : ''}`, 'aria-pressed': String(chosen === o.id), onClick: () => { this.answers[act.id] = o.id; render(); } }, o.label)))];
      if (chosen) kids.push(h('div', { class: `poe-reveal ${chosen === correct?.id ? 'right' : 'wrong'}` }, h('b', {}, chosen === correct?.id ? 'Right. ' : `Not quite: ${correct?.label.toLowerCase()}. `), act.reveal(),
        act.show ? h('button', { class: 'btn poe-show', onClick: () => this.jumpTo(act.show) }, 'Show me') : null,
        h('button', { class: 'btn poe-reset', onClick: () => { delete this.answers[act.id]; render(); } }, 'Try again')));
      clear(block).append(...kids);
    };
    render();
    return block;
  }
}
