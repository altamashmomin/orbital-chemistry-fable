import { Animator } from './Animator.js';
import { clamp, ease, peaks, timeline } from './pacing.js';

const keyOf = (b) => [b.a, b.b].sort().join('~') + `:${b.order || 1}:${!!b.piOnly}`;
const N = 48;

/** Cinematic timing and reversible scene decoration for the existing frame(t) API. */
export class CinematicAnimator extends Animator {
  static id = 'cinematic';
  static label = 'Cinematic';
  static description = 'Electron flow, checkpoint holds, bond cues and a gently guided camera.';

  /** Own every added resource; the renderer and chemistry retain their original contracts. */
  constructor(ctx) {
    super(ctx);
    const T = ctx.viewport.THREE;
    this.T = T;
    this.group = new T.Group();
    this.group.name = 'cinematic-effects';
    ctx.viewport.root.add(this.group);
    this.resources = new Set();
    this.undo = [];
    this.snapshots = new WeakMap();
    this.clones = new Map();
    this.arrows = [];
    this.puffs = [];
    this.previousBonds = new Map();
    this.flashes = new Map();
    this.charges = new Map();
    this.ghosts = [];
    this.clock = 0;
    this.enabled = false;
    this.disposed = false;
    this.task = null;
    this.flight = null;
    this.V = () => new T.Vector3();
    this.center = this.V();
    this.scratch = Array.from({ length: 8 }, this.V);
    this.up = new T.Vector3(0, 1, 0);
    this.sphere = this._own(new T.SphereGeometry(1, 10, 8));
    this.cone = this._own(new T.ConeGeometry(0.12, 0.3, 10));
    this.glow = new T.Mesh(this._own(new T.PlaneGeometry(5, 5)), this._own(new T.ShaderMaterial({
      transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending,
      uniforms: { alpha: { value: 0 } },
      vertexShader: 'varying vec2 p; void main(){ p=uv*2.0-1.0; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'varying vec2 p; uniform float alpha; void main(){ float r=length(p); float a=exp(-5.0*r*r)*(1.0-smoothstep(0.6,1.0,r))*alpha; gl_FragColor=vec4(0.65,0.45,1.0,a); }',
    })));
    this.group.add(this.glow);
    for (let i = 0; i < 32; i++) {
      const material = this._own(new T.MeshBasicMaterial({ color: '#fbbf24', transparent: true,
        depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }));
      const mesh = new T.Mesh(this.sphere, material);
      mesh.visible = false;
      this.group.add(mesh);
      this.puffs.push({ mesh, age: 1, origin: this.V(), velocity: this.V() });
    }
    this.originalFrame = ctx.view.setFrame;
    this.originalArrows = ctx.view.setArrows;
    const self = this;
    ctx.view.setFrame = function(frame) {
      self._restore();
      return self.originalFrame.call(this, self.enabled ? self._ghostFrame(frame) : frame);
    };
    ctx.view.setArrows = function(arrows) {
      return self.originalArrows.call(this, self.enabled ? [] : arrows);
    };
    this.touch = () => { this.cameraDriven = false; this.flight = null; };
    ctx.viewport.controls.addEventListener('start', this.touch);
  }

  _own(resource) { this.resources.add(resource); return resource; }

  _restore() {
    for (const entry of this.undo) {
      if (entry.mesh) {
        const m = entry.mesh;
        m.scale.copy(entry.scale);
        m.position.copy(entry.position);
        m.material.opacity = entry.opacity;
        m.material.emissiveIntensity = entry.emission;
        m.material.depthWrite = entry.depth;
        if (entry.color) m.material.emissive.copy(entry.color);
      } else {
        entry.style.opacity = entry.opacity;
        entry.style.scale = entry.scale;
      }
      entry.touched = false;
    }
    this.undo.length = 0;
  }

  _mesh(mesh) {
    let entry = this.snapshots.get(mesh);
    if (!entry) {
      entry = { mesh, scale: this.V(), position: this.V(), color: mesh.material.emissive?.clone() };
      this.snapshots.set(mesh, entry);
    }
    if (entry.touched) return;
    entry.touched = true;
    entry.scale.copy(mesh.scale);
    entry.position.copy(mesh.position);
    entry.opacity = mesh.material.opacity;
    entry.emission = mesh.material.emissiveIntensity;
    entry.depth = mesh.material.depthWrite;
    if (entry.color) entry.color.copy(mesh.material.emissive);
    this.undo.push(entry);
  }

  _label(style) {
    let entry = this.snapshots.get(style);
    if (!entry) { entry = { style }; this.snapshots.set(style, entry); }
    if (entry.touched) return;
    entry.touched = true;
    entry.opacity = style.opacity;
    entry.scale = style.scale;
    this.undo.push(entry);
  }

  _ghostFrame(frame) {
    if (!this.ghosts.length) return frame;
    const t = this.ctx.getT();
    const atoms = frame.atoms.slice();
    const bonds = frame.bonds.slice();
    const ids = new Set(atoms.map((a) => a.id));
    for (const ghost of this.ghosts) {
      const weight = ease((t - ghost.start + 0.035) / 0.07) * ease((ghost.end + 0.035 - t) / 0.07);
      ghost.weight = weight;
      if (weight < 0.001) continue;
      for (const a of ghost.atoms) if (!ids.has(a.id)) { atoms.push(a); ids.add(a.id); }
      for (const b of ghost.bonds) if (!bonds.some((x) => keyOf(x) === keyOf(b))) bonds.push(b);
    }
    return { ...frame, atoms, bonds };
  }

  /** Reset effects and fly to the mechanism's preferred view without a competing camera tween. */
  onMechanismChange(mechanism) {
    this.cancel();
    this.mechanism = mechanism;
    this.maxima = peaks(mechanism);
    this.ghosts = [];
    // Sample presence boundaries once; cache ghost-only records to fade across topology changes.
    let run = null;
    for (let i = 0; i <= 100; i++) {
      const frame = mechanism.frame(i / 100);
      const atoms = frame.atoms.filter((a) => a.ghost);
      if (atoms.length) {
        if (!run) { run = { start: i / 100, end: i / 100, atoms, bonds: [] }; this.ghosts.push(run); }
        run.end = i / 100;
        run.atoms = atoms;
        const ids = new Set(atoms.map((a) => a.id));
        run.bonds = frame.bonds.filter((b) => ids.has(b.a) && ids.has(b.b));
      } else run = null;
    }
    this.enabled = true;
    this._cancelled = false;
    this.group.visible = true;
    this.cameraDriven = true;
    this.previousBonds.clear();
    this.charges.clear();
    const v = mechanism.view;
    if (v) this.flight = { elapsed: 0, from: this.ctx.viewport.camera.position.clone(),
      target: this.ctx.viewport.controls.target.clone(), to: new this.T.Vector3(...v.position),
      aim: new this.T.Vector3(...(v.target || [0, 0, 0])) };
    this.ctx.setT(this.ctx.getT());
    this._paint(0);
  }

  /** Animate through checkpoints and energy peaks; the Promise settles immediately on cancellation. */
  transition({ mechanism, fromT, toT, fromStep, toStep, durationMs = 1600 }) {
    this.cancel();
    if (this.disposed) return Promise.resolve();
    this.mechanism = mechanism;
    this.maxima = peaks(mechanism);
    this.enabled = true;
    this._cancelled = false;
    this.group.visible = true;
    this.cameraDriven = true;
    this.flight = null;
    this.cameraStart = this.ctx.viewport.camera.position.clone().sub(this.ctx.viewport.controls.target);
    this.targetStart = this.ctx.viewport.controls.target.clone();
    this.previousBonds.clear();
    this._setArrowSpecs(fromStep?.arrows?.length ? fromStep.arrows : toStep?.arrows || []);
    return new Promise((resolve) => {
      this.task = { resolve, parts: timeline(mechanism, fromT, toT, durationMs), index: 0,
        elapsed: 0, slow: 0, fromT, toT, progress: 0 };
      if (!this.task.parts.length) this._finish();
    });
  }

  /** Apply the supplied coordinate immediately, preserving scrubbing as a direct frame lookup. */
  scrub() {
    this.cancel();
    if (this.disposed) return;
    this.enabled = true;
    this.group.visible = true;
    this.cameraDriven = false;
    this.ctx.setT(this.ctx.getT());
    this._paint(0);
  }

  /** Advance with the viewport clock; speed scales moves, holds and effect time exactly once. */
  tick(dt) {
    if (!this.enabled || this.disposed) return;
    const delta = Math.max(0, Math.min(dt, 0.1)) * Math.max(0.05, this.ctx.getSpeed?.() || 1);
    this.clock += delta;
    const task = this.task;
    if (task) {
      const part = task.parts[task.index];
      const u = clamp(task.elapsed / part.seconds);
      const nearPeak = part.kind === 'move' && part.peak && u > 0.72;
      // Spend 0.8 unscaled seconds at 0.35x around each maximum, in addition to the exact-peak hold.
      const slow = nearPeak && task.slow < 0.8;
      task.elapsed += delta * (slow ? 0.35 : 1);
      if (slow && task.slow + delta < 0.8) task.elapsed = Math.min(task.elapsed, part.seconds * 0.995);
      if (slow) task.slow += delta;
      const w = ease(task.elapsed / part.seconds);
      const t = part.kind === 'hold' ? part.t : part.from + (part.to - part.from) * w;
      task.progress = clamp(Math.abs(t - task.fromT) / Math.max(1e-8, Math.abs(task.toT - task.fromT)));
      this.ctx.setT(t);
      if (task.elapsed >= part.seconds) {
        this.ctx.setT(part.kind === 'hold' ? part.t : part.to);
        task.index++;
        task.elapsed = 0;
        if (part.kind === 'hold') task.slow = 0;
        if (task.index >= task.parts.length) this._finish();
      }
    }
    this._restore();
    this._camera(delta);
    this._paint(delta);
  }

  _finish() {
    const task = this.task;
    if (!task) return;
    this.ctx.setT(task.toT);
    this.task = null;
    for (const arrow of this.arrows) arrow.group.visible = false;
    task.resolve();
  }

  _camera(dt) {
    const { camera, controls } = this.ctx.viewport;
    if (!this.cameraDriven) return;
    if (this.flight) {
      const f = this.flight;
      f.elapsed += dt;
      const w = ease(f.elapsed / 0.8);
      camera.position.lerpVectors(f.from, f.to, w);
      controls.target.lerpVectors(f.target, f.aim, w);
      if (w >= 1) this.flight = null;
    } else if (this.task) {
      const frame = this.ctx.view.frame;
      const focus = frame.focus || [];
      this.center.set(0, 0, 0);
      let count = 0;
      for (const id of focus) {
        const a = this.ctx.view.atom(id);
        if (a && !a.ghost) { this.center.add(this.scratch[0].fromArray(a.pos)); count++; }
      }
      if (count) this.center.multiplyScalar(1 / count);
      else this.center.copy(this.targetStart);
      const w = ease(this.task.progress);
      controls.target.lerpVectors(this.targetStart, this.center, w * 0.65);
      const offset = this.scratch[0].copy(this.cameraStart);
      // A side-on final SN2 view keeps the reaction axis and the flipped umbrella visible together.
      const angle = (this.mechanism.id === 'sn2' ? 0.16 : 0.11) * w;
      offset.applyAxisAngle(this.up, angle).multiplyScalar(1 - 0.035 * Math.sin(Math.PI * w));
      camera.position.copy(controls.target).add(offset);
    }
    camera.lookAt(controls.target);
  }

  _setArrowSpecs(specs) {
    this.arrowSpecs = specs;
    while (this.arrows.length < specs.length) {
      const geometry = this._own(new this.T.BufferGeometry());
      geometry.setAttribute('position', new this.T.BufferAttribute(new Float32Array((N + 1) * 3), 3));
      const material = this._own(new this.T.LineBasicMaterial({ color: '#fbbf24', transparent: true,
        depthWrite: false, toneMapped: false }));
      const group = new this.T.Group();
      const line = new this.T.Line(geometry, material);
      line.frustumCulled = false;
      const head = new this.T.Mesh(this.cone, material);
      const pair = [0, 1].map(() => {
        const m = new this.T.Mesh(this.sphere, this._own(new this.T.MeshBasicMaterial({
          color: '#fff4c2', transparent: true, depthWrite: false, toneMapped: false,
          blending: this.T.AdditiveBlending })));
        m.scale.setScalar(0.065);
        return m;
      });
      group.add(line, head, ...pair);
      this.group.add(group);
      this.arrows.push({ group, line, head, pair });
    }
    this.arrows.forEach((a) => { a.group.visible = false; });
  }

  _anchor(spec, out, towards) {
    const view = this.ctx.view;
    if (spec.type === 'bond') {
      const a = view.atom(spec.a), b = view.atom(spec.b);
      if (!a || !b) return false;
      out.fromArray(a.pos).add(this.scratch[7].fromArray(b.pos)).multiplyScalar(0.5);
    } else {
      const a = view.atom(spec.atom);
      if (!a) return false;
      out.fromArray(a.pos);
      const d = this.scratch[6];
      if (spec.type === 'lonePair' && a.lonePairDirs?.length) {
        const aim = this.scratch[5].copy(towards).sub(out).normalize();
        let best = -Infinity;
        for (const dir of a.lonePairDirs) {
          d.fromArray(dir);
          const score = d.dot(aim);
          if (score > best) { best = score; this.scratch[4].copy(d); }
        }
        out.addScaledVector(this.scratch[4], 0.7);
      } else if (towards) out.addScaledVector(d.copy(towards).sub(out).normalize(), 0.48);
    }
    return true;
  }

  _flow(progress) {
    const enabled = this.ctx.view.options.arrows;
    for (let i = 0; i < this.arrows.length; i++) {
      const item = this.arrows[i], spec = this.arrowSpecs?.[i];
      item.group.visible = !!(enabled && spec && this.task);
      if (!item.group.visible) continue;
      const [a, b, c, out] = this.scratch;
      if (!this._anchor(spec.to, b) || !this._anchor(spec.from, a, b) || !this._anchor(spec.to, b, a)) {
        item.group.visible = false; continue;
      }
      c.copy(a).lerp(b, 0.5);
      c.y += 0.5 + 0.18 * a.distanceTo(b);
      const point = (u, target) => target.copy(a).multiplyScalar((1 - u) ** 2)
        .addScaledVector(c, 2 * (1 - u) * u).addScaledVector(b, u * u);
      const attr = item.line.geometry.attributes.position;
      for (let j = 0; j <= N; j++) { point(j / N, out); attr.setXYZ(j, out.x, out.y, out.z); }
      attr.needsUpdate = true;
      const reveal = ease(progress / 0.4);
      item.line.geometry.setDrawRange(0, Math.max(0, Math.floor(N * reveal) + 1));
      point(reveal, item.head.position);
      out.copy(c).sub(a).multiplyScalar(1 - reveal).addScaledVector(this.scratch[4].copy(b).sub(c), reveal).normalize();
      item.head.quaternion.setFromUnitVectors(this.up, out);
      item.head.visible = reveal > 0.03;
      let strength = 0;
      const frame = this.ctx.view.frame;
      if (spec.to.type === 'bond') strength = frame.bonds.find((x) => (x.a === spec.to.a && x.b === spec.to.b) || (x.b === spec.to.a && x.a === spec.to.b))?.partial ?? 0;
      else if (spec.from.type === 'lonePair') strength = frame.bonds.find((x) => (x.a === spec.from.atom && x.b === spec.to.atom) || (x.b === spec.from.atom && x.a === spec.to.atom))?.partial ?? 0;
      const fade = 1 - ease((progress - 0.8) / 0.2);
      item.line.material.opacity = fade * 0.85;
      for (let j = 0; j < 2; j++) {
        const u = clamp((progress - 0.4) / 0.5 - j * 0.025);
        const mesh = item.pair[j];
        mesh.visible = progress > 0.4 && progress < 0.99;
        point(u, mesh.position);
        mesh.position.z += (j ? -1 : 1) * 0.065;
        mesh.material.opacity = (1 - ease((strength - 0.75) / 0.25)) * fade;
      }
    }
  }

  _puff(position) {
    let n = 0;
    for (const p of this.puffs) {
      if (p.age < 0.5) continue;
      const angle = n * 2.39996;
      p.origin.copy(position);
      p.velocity.set(Math.cos(angle), Math.sin(angle), (n % 3 - 1) * 0.45).multiplyScalar(0.55);
      p.age = 0;
      if (++n === 6) break;
    }
  }

  _paint(dt) {
    const view = this.ctx.view, frame = view.frame;
    if (!frame) return;
    const current = new Map();
    for (const b of frame.bonds) {
      const key = keyOf(b), partial = b.partial ?? 1;
      const old = this.previousBonds.get(key);
      const a = view.atom(b.a), z = view.atom(b.b);
      if (!a || !z) continue;
      const midpoint = this.scratch[0].fromArray(a.pos).add(this.scratch[1].fromArray(z.pos)).multiplyScalar(0.5);
      current.set(key, { partial, position: midpoint.clone(), breaking: old && (partial < old.partial - 1e-6 || (Math.abs(partial - old.partial) < 1e-6 && old.breaking)) });
      if (old && old.partial < 0.95 && partial >= 0.95 && this.task) this.flashes.set(key, this.clock);
      const flash = Math.max(0, 1 - (this.clock - (this.flashes.get(key) ?? -10)) / 0.3);
      const breaking = current.get(key).breaking;
      const ghostWeight = this.ghosts.find((g) => g.atoms.some((x) => x.id === a.id || x.id === z.id))?.weight ?? 1;
      for (let i = 0; i < (b.order || 1); i++) for (const side of ['a', 'b']) {
        const mesh = view.bondPool.items.get(`${b.a}|${b.b}|${i}|${side}`);
        if (!mesh?.visible) continue;
        this._mesh(mesh);
        const strength = Math.sqrt(partial);
        mesh.scale.x *= strength;
        mesh.scale.z *= strength;
        if (!breaking && partial < 1) {
          const length = mesh.scale.y;
          mesh.scale.y *= 0.45 + 0.55 * strength;
          this.scratch[2].set(0, 1, 0).applyQuaternion(mesh.quaternion);
          mesh.position.addScaledVector(this.scratch[2], (side === 'a' ? -1 : 1) * (length - mesh.scale.y) / 2);
        }
        mesh.material.opacity *= partial * ghostWeight * (breaking ? 0.88 + 0.12 * Math.sin(this.clock * 35) : 1);
        mesh.material.depthWrite = partial > 0.98 && ghostWeight > 0.99;
        if (flash > 0) mesh.material.emissive.set('#fbbf24');
        mesh.material.emissiveIntensity = 0.3 + flash * 2;
      }
    }
    if (this.task) for (const [key, old] of this.previousBonds) if (!current.has(key) && old.partial < 0.2) this._puff(old.position);
    this.previousBonds = current;
    for (const a of frame.atoms) {
      const ghost = a.ghost ? this.ghosts.find((g) => g.atoms.some((x) => x.id === a.id))?.weight ?? 1 : 1;
      const mesh = view.atomPool.items.get(`${a.id}|${a.el}|${a.ghost ? 1 : 0}`);
      if (mesh?.visible && a.ghost) {
        if (!this.clones.has(mesh)) { this.clones.set(mesh, mesh.material); mesh.material = this._own(mesh.material.clone()); }
        this._mesh(mesh);
        mesh.material.opacity = 0.28 * ghost;
      }
      const empty = a.orbital?.kind === 'empty';
      for (const [key, orb] of view.orbPool.items) if (orb.visible && key.startsWith(`${a.id}|`)) {
        this._mesh(orb);
        if (empty) orb.scale.multiplyScalar(1 + 0.055 * Math.sin(this.clock * 3));
        orb.material.opacity *= ghost;
      }
      const attack = this.task && this.arrowSpecs?.some((x) => x.from.type === 'lonePair' && x.from.atom === a.id);
      for (const [key, lp] of view.lpPool.items) if (lp.visible && key.startsWith(`${a.id}|`)) {
        this._mesh(lp);
        if (attack) lp.scale.multiplyScalar(1 + 0.16 * Math.sin(this.clock * 7) ** 2);
        lp.material.opacity *= ghost;
      }
      if (a.ghost) {
        const note = view.labelPool.items.get(`${a.id}|text`);
        if (note?.visible) { this._label(note.element.style); note.element.style.opacity = String(ghost); }
      }
      const label = view.labelPool.items.get(`${a.id}|charge`);
      if (label?.visible) {
        const magnitude = Math.abs(a.charge || 0);
        const full = magnitude >= 0.75;
        const prior = this.charges.get(a.id);
        if (full && !prior?.full) this.charges.set(a.id, { full, time: this.clock });
        else if (!full) this.charges.set(a.id, { full: false, time: this.clock });
        const age = this.clock - (this.charges.get(a.id)?.time ?? this.clock);
        const style = label.element.style;
        this._label(style);
        style.opacity = String(ghost * (full ? 1 : ease((magnitude - 0.12) / 0.25)));
        style.scale = String(full ? 1 + 0.28 * Math.sin(clamp(age / 0.4) * Math.PI) : 1);
      }
    }
    const distance = Math.min(...(this.maxima || []).map((t) => Math.abs(t - this.ctx.getT())), 1);
    this.glow.material.uniforms.alpha.value = 0.22 * (1 - ease(distance / 0.055));
    const focus = view.atom(frame.focus?.[0]);
    if (focus) this.glow.position.fromArray(focus.pos);
    this.glow.quaternion.copy(this.ctx.viewport.camera.quaternion);
    for (const p of this.puffs) {
      p.age += dt;
      p.mesh.visible = p.age < 0.5;
      if (p.mesh.visible) {
        p.mesh.position.copy(p.origin).addScaledVector(p.velocity, p.age);
        p.mesh.scale.setScalar(0.035 * (1 + p.age));
        p.mesh.material.opacity = 1 - p.age / 0.5;
      }
    }
    this._flow(this.task?.progress || 0);
  }

  /** Stop motion, camera and effects synchronously; never leave a pending transition Promise. */
  cancel() {
    this._cancelled = true;
    this.enabled = false;
    this.flight = null;
    this.cameraDriven = false;
    this._restore();
    this.group.visible = false;
    const task = this.task;
    this.task = null;
    if (task) task.resolve();
    for (const p of this.puffs) p.age = 1;
    this.flashes.clear();
    if (this.mechanism && !this.disposed) {
      const steps = this.mechanism.steps;
      const step = steps.filter((s) => s.t <= this.ctx.getT() + 1e-6).at(-1);
      this.originalArrows.call(this.ctx.view, step?.arrows || []);
    }
  }

  /** Restore instance hooks and borrowed materials, detach listeners and dispose owned GPU resources. */
  dispose() {
    if (this.disposed) return;
    this.cancel();
    this.disposed = true;
    this.ctx.viewport.controls.removeEventListener('start', this.touch);
    this.ctx.view.setFrame = this.originalFrame;
    this.ctx.view.setArrows = this.originalArrows;
    for (const [mesh, original] of this.clones) mesh.material = original;
    this.clones.clear();
    this.ctx.viewport.root.remove(this.group);
    for (const resource of this.resources) resource.dispose();
    this.resources.clear();
  }
}
