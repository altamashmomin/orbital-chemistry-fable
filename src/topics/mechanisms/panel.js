// Mechanism viewer panel: SN2 / SN1 / E2 / E1 with stepper, scrubber, energy diagram,
// environment predictor and pluggable animators.
import { h, clear, fill, select, toggle, section, aud } from '../../ui/dom.js';
import { MECHANISMS, MECHANISM_ORDER, stepIndexAt, predict, SUBSTRATES, REAGENTS, SOLVENTS, TEMPERATURES, LEAVING_GROUPS } from '../../chem/mechanisms/index.js';
import { listAnimators, createAnimator, onAnimatorsChanged } from '../../anim/index.js';
import { EnergyDiagram } from '../../ui/energyDiagram.js';

const DWELL_MS = 1100;

export class MechanismPanel {
  constructor({ view, viewport, level = 'learn' }) {
    this.view = view; this.viewport = viewport; this.level = level;
    this.mechId = 'sn2';
    this.t = 0; this.stepIdx = -1; this.playing = false; this.speed = 1;
    this.animatorId = 'cinematic';
    this.opts = { arrows: true, lonePairs: true, labels: true, hydrogens: true, orbitals: true };
    this.env = { substrate: 'secondary', reagent: 'strongNuStrongBase', solvent: 'polarProtic', temperature: 'low', leavingGroup: 'good', allylicBenzylic: false };
    this.el = h('div', { class: 'panel-inner mechanism' });
    this.inspector = h('div', { class: 'panel-inner study-guide' });
    this.ctx = {
      viewport, view,
      getMechanism: () => this.mech, getT: () => this.t, setT: (t) => this.setT(t), getSpeed: () => this.speed,
    };
    this.animator = createAnimator(this.animatorId, this.ctx);
    this._offTick = viewport.onTick((dt) => this.animator?.tick?.(dt));
    onAnimatorsChanged(() => this.renderAnimatorSelect());
    this.render();
  }

  get mech() { return MECHANISMS[this.mechId]; }

  activate() {
    this.view.setOptions({ ...this.opts, highlights: true });
    this.viewport.setAutoRotate(false);
    this.energy.set(this.mech);
    this.renderHeader();
    this.setT(this.t, true);
    this.animator.onMechanismChange?.(this.mech);
  }
  deactivate() { this.pause(); }
  setLevel(level) { this.level = level; }

  // ---------------------------------------------------------------- rendering
  render() {
    clear(this.el);
    clear(this.inspector);
    this.refs = {};
    const ref = (name, node) => { this.refs[name] = node; return node; };
    this.el.append(
      h('div', { class: 'mech-tabs' }, MECHANISM_ORDER.map((id) => h('button', { class: `mtab ${id === this.mechId ? 'active' : ''}`, dataset: { id }, onClick: () => this.setMechanism(id) }, h('b', {}, MECHANISMS[id].name), h('small', {}, MECHANISMS[id].fullName)))),
      ref('header', h('div', { class: 'card mech-header' })),
      section('Play the mechanism',
        h('div', { class: 'transport' },
          h('button', { class: 'btn icon', title: 'Start', onClick: () => this.jump(0) }, '⏮'),
          h('button', { class: 'btn icon', title: 'Previous step', onClick: () => this.step(-1) }, '◀'),
          ref('play', h('button', { class: 'btn icon primary', title: 'Play', onClick: () => (this.playing ? this.pause() : this.play()) }, '▶')),
          h('button', { class: 'btn icon', title: 'Next step', onClick: () => this.step(1) }, '▶|'),
          h('button', { class: 'btn icon', title: 'End', onClick: () => this.jump(1) }, '⏭'),
          select([{ id: '0.5', label: '0.5×' }, { id: '1', label: '1×' }, { id: '2', label: '2×' }], String(this.speed), (v) => { this.speed = Number(v); }, { class: 'select small', 'aria-label': 'Animation speed' }),
        ),
        ref('scrub', h('input', { type: 'range', 'aria-label': 'Reaction progress', min: 0, max: 1000, value: 0, class: 'scrubber', onInput: (e) => { this.pause(); this.setT(Number(e.target.value) / 1000); this.animator.scrub?.(this.t); } })),
        ref('steps', h('ol', { class: 'steps' })),
        h('div', { class: 'row' }, h('label', {}, 'Animator'), ref('animSel', h('span', {}))),
      ),
      ref('narration', h('div', { class: 'card narration' })),
      section('Energy profile', ref('energyWrap', h('div', { class: 'energy-wrap' }, h('canvas', { class: 'energy' })))),
      section('Which mechanism will my reaction follow?',
        aud(h('div', { class: 'hint' }, 'Set the conditions from your homework problem. The predictor applies the standard decision table and explains each factor.'), 'learn'),
        this.envRow('Substrate', SUBSTRATES, 'substrate'),
        this.envRow('Nucleophile / base', REAGENTS, 'reagent'),
        this.envRow('Solvent', SOLVENTS, 'solvent'),
        this.envRow('Temperature', TEMPERATURES, 'temperature'),
        this.envRow('Leaving group', LEAVING_GROUPS, 'leavingGroup'),
        toggle('Allylic or benzylic carbon', this.env.allylicBenzylic, (v) => { this.env.allylicBenzylic = v; this.renderPrediction(); }),
        ref('prediction', h('div', { class: 'prediction' })),
      ),
      ref('ideas', h('div', {})),
      section('View',
        h('div', { class: 'toggles' },
          toggle('Electron arrows', this.opts.arrows, (v) => { this.opts.arrows = v; this.view.setOptions({ arrows: v }); this.setT(this.t, true); }),
          toggle('Lone pairs', this.opts.lonePairs, (v) => { this.opts.lonePairs = v; this.view.setOptions({ lonePairs: v }); }),
          toggle('Labels', this.opts.labels, (v) => { this.opts.labels = v; this.view.setOptions({ labels: v }); }),
          toggle('Hydrogens', this.opts.hydrogens, (v) => { this.opts.hydrogens = v; this.view.setOptions({ hydrogens: v }); }),
          toggle('p orbitals', this.opts.orbitals, (v) => { this.opts.orbitals = v; this.view.setOptions({ orbitals: v }); }),
        ),
        h('button', { class: 'btn', onClick: () => { const vw = this.mech.view; vw ? this.viewport.moveCamera(vw.position, vw.target || [0, 0, 0], 500) : this.viewport.fitTo(this.view.bounds()); } }, 'Reset camera'),
        h('button', { class: 'btn', onClick: () => this.viewport.fitTo(this.view.bounds()) }, 'Fit to molecules'),
      ),
    );
    const sections = [...this.el.children];
    this.inspector.append(sections[3], sections[1], sections[4], sections[6], sections[7]);
    this.energy = new EnergyDiagram(this.refs.energyWrap.querySelector('canvas'));
    this.energy.set(this.mech);
    this.renderAnimatorSelect();
    this.renderHeader();
    this.renderSteps();
    this.renderPrediction();
    this.renderIdeas();
  }

  envRow(label, options, key) {
    return h('div', { class: 'row' }, h('label', {}, label), select(options.map((o) => ({ id: o.id, label: o.examples ? `${o.label} — ${o.examples}` : o.label })), this.env[key], (v) => { this.env[key] = v; this.renderPrediction(); }));
  }

  renderAnimatorSelect() {
    if (!this.refs?.animSel) return;
    const list = listAnimators();
    fill(this.refs.animSel, select(list.map((a) => ({ id: a.id, label: a.label })), this.animatorId, (id) => this.setAnimator(id), { class: 'select', 'aria-label': 'Animator', title: list.find((a) => a.id === this.animatorId)?.description || '' }));
  }

  renderHeader() {
    const m = this.mech;
    document.getElementById('workspace-name').textContent = `${m.name} · ${m.fullName}`;
    fill(this.refs.header,
      h('div', { class: 'mech-title' }, h('b', {}, m.name), ' · ', m.fullName),
      h('div', { class: 'equation' }, m.equation),
      h('dl', { class: 'facts' },
        h('dt', {}, 'Substrate'), h('dd', {}, m.substrate),
        h('dt', {}, 'Reagent'), h('dd', {}, m.reagent),
        h('dt', {}, 'Products'), h('dd', {}, m.products),
        h('dt', {}, 'Rate law'), h('dd', {}, m.rateLaw),
        h('dt', {}, 'Steps'), h('dd', {}, m.molecularity),
        h('dt', {}, 'Stereo'), h('dd', {}, m.stereochemistry),
      ),
    );
    this.el.querySelectorAll('.mtab').forEach((b) => b.classList.toggle('active', b.dataset.id === this.mechId));
  }

  renderSteps() {
    fill(this.refs.steps, this.mech.steps.map((s, i) => h('li', { class: i === this.stepIdx ? 'active' : '', onClick: () => this.goToStep(i) }, h('span', { class: 'step-n' }, i + 1), h('span', {}, s.title))));
  }

  renderNarration() {
    const s = this.mech.steps[this.stepIdx] || this.mech.steps[0];
    fill(this.refs.narration,
      h('div', { class: 'step-title' }, `Step view ${this.stepIdx + 1} of ${this.mech.steps.length}: ${s.title}`),
      h('p', {}, s.narration),
      aud(h('ul', { class: 'keypoints' }, s.keyPoints.map((k) => h('li', {}, k))), 'learn'),
      s.arrows?.length ? aud(h('div', { class: 'hint' }, 'Amber curved arrows show where each electron pair moves in this step (from a lone pair or bond, to an atom or a new bond).'), 'learn') : null,
    );
    this.refs.steps.querySelectorAll('li').forEach((li, i) => li.classList.toggle('active', i === this.stepIdx));
  }

  renderIdeas() {
    const m = this.mech;
    fill(this.refs.ideas,
      aud(section('Key ideas', h('ul', { class: 'ideas' }, m.keyIdeas.map((k) => h('li', {}, k)))), 'learn'),
      section('Conditions',
        h('div', { class: 'cond' }, h('b', {}, 'Favoured by'), h('ul', {}, m.conditions.favoredBy.map((x) => h('li', {}, x)))),
        h('div', { class: 'cond bad' }, h('b', {}, 'Disfavoured by'), h('ul', {}, m.conditions.disfavoredBy.map((x) => h('li', {}, x)))),
        m.solventNote ? aud(h('div', { class: 'hint' }, `Solvent: ${m.solventNote}.`), 'learn') : null,
      ),
    );
  }

  renderPrediction() {
    const p = predict(this.env);
    const bar = (id, label, pct, color) => h('div', { class: 'bar-row' }, h('span', { class: 'bar-label' }, label), h('div', { class: 'bar' }, h('i', { style: { width: `${pct}%`, background: color } })), h('span', { class: 'bar-pct' }, `${pct}%`));
    fill(this.refs.prediction,
      h('div', { class: 'pred-summary' }, p.summary),
      bar('sn2', 'SN2', p.pct.sn2, '#38bdf8'), bar('sn1', 'SN1', p.pct.sn1, '#a78bfa'), bar('e2', 'E2', p.pct.e2, '#34d399'), bar('e1', 'E1', p.pct.e1, '#fbbf24'),
      p.pct.none ? bar('none', 'no rxn', p.pct.none, '#64748b') : null,
      p.dominant !== 'none' ? h('button', { class: 'btn primary', onClick: () => { this.setMechanism(p.dominant); this.play(); } }, `Watch ${p.dominant.toUpperCase()}`) : null,
      p.warnings.length ? h('div', { class: 'warn' }, p.warnings.map((w) => h('div', {}, '⚠ ', w))) : null,
      aud(h('details', { open: true }, h('summary', {}, 'Why?'), h('ul', { class: 'reasons' }, p.reasons.map((r) => h('li', {}, r)))), 'learn'),
      aud(h('div', { class: 'hint' }, 'Percentages are a teaching heuristic, not measured yields: they rank tendencies the way a textbook decision table does.'), 'learn'),
    );
  }

  // ---------------------------------------------------------------- state
  setT(t, force = false) {
    t = Math.max(0, Math.min(1, t));
    this.t = t;
    const m = this.mech;
    const frame = m.frame(t);
    this.view.setFrame(frame);
    const idx = stepIndexAt(m, t);
    const step = m.steps[idx];
    const next = m.steps[idx + 1];
    const showArrows = !next || t < step.t + 0.7 * (next.t - step.t);
    this.view.setArrows(showArrows ? step.arrows : []);
    this.view.setHighlights(step.highlights || []);
    if (idx !== this.stepIdx || force) { this.stepIdx = idx; this.renderNarration(); }
    this.refs.scrub.value = Math.round(t * 1000);
    this.energy.draw(t);
  }

  setMechanism(id) {
    if (!MECHANISMS[id]) return;
    this.pause();
    this.mechId = id;
    this.stepIdx = -1;
    this.energy.set(this.mech);
    this.renderHeader(); this.renderSteps(); this.renderIdeas();
    this.setT(0, true);
    this.animator.onMechanismChange?.(this.mech);
  }

  setAnimator(id) {
    this.pause();
    this.animator?.dispose?.();
    this.animatorId = id;
    this.animator = createAnimator(id, this.ctx);
    this.animator.onMechanismChange?.(this.mech);
    this.renderAnimatorSelect();
  }

  async goToStep(i, { fromPlay = false } = {}) {
    const m = this.mech;
    const toStep = m.steps[Math.max(0, Math.min(m.steps.length - 1, i))];
    if (!fromPlay) this.pause();
    const fromT = this.t, toT = toStep.t;
    if (Math.abs(toT - fromT) < 1e-4) { this.setT(toT, true); return; }
    const fromStep = m.steps[stepIndexAt(m, fromT)];
    const durationMs = Math.max(700, Math.abs(toT - fromT) * 7000);
    this._busy = true;
    try { await this.animator.transition({ mechanism: m, fromT, toT, fromStep, toStep, durationMs }); }
    finally { this._busy = false; }
    if (Math.abs(this.t - toT) > 1e-3 && !this.playing && !fromPlay) this.setT(toT, true);
  }

  step(dir) {
    const m = this.mech;
    const idx = stepIndexAt(m, this.t);
    const atStep = Math.abs(m.steps[idx].t - this.t) < 1e-3;
    const target = dir > 0 ? idx + 1 : atStep ? idx - 1 : idx;
    this.goToStep(Math.max(0, Math.min(m.steps.length - 1, target)));
  }

  jump(t) { this.pause(); this.setT(t, true); this.animator.scrub?.(t); }

  async play() {
    if (this.playing) return;
    if (this.t >= 0.999) this.setT(0, true);
    this.playing = true;
    this.refs.play.textContent = '⏸';
    const m = this.mech;
    const token = (this._playToken = Symbol('play'));
    for (let i = 0; i < m.steps.length; i++) {
      if (m.steps[i].t <= this.t + 1e-4) continue;
      await this.goToStep(i, { fromPlay: true });
      if (!this.playing || this._playToken !== token) return;
      if (i < m.steps.length - 1) await new Promise((r) => setTimeout(r, DWELL_MS / this.speed));
      if (!this.playing || this._playToken !== token) return;
    }
    this.playing = false;
    this.refs.play.textContent = '▶';
  }

  pause() {
    this.playing = false;
    this._playToken = null;
    this.animator?.cancel?.();
    if (this.refs?.play) this.refs.play.textContent = '▶';
  }

  dispose() { this.pause(); this._offTick(); this.energy?.dispose(); this.animator?.dispose?.(); }
}
