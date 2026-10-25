// Ball-and-stick molecule renderer with lone pairs, orbitals, charge labels,
// curved electron-pushing arrows and teaching highlights.
// Everything is keyed by atom/bond id so frames can be swapped every animation tick.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { ELEMENTS } from '../chem/elements.js';
import { chargeLabel } from '../chem/mechanisms/frameUtils.js';

const V = (p) => new THREE.Vector3(p[0], p[1], p[2]);
const UP = new THREE.Vector3(0, 1, 0);
const sphereGeo = new THREE.SphereGeometry(1, 36, 24);
const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 20, 1, false);
const lobeGeo = new THREE.SphereGeometry(1, 20, 14);
const matCache = new Map();

function elementMaterial(el, ghost = false) {
  const key = `${el}|${ghost}`;
  if (!matCache.has(key)) {
    const color = ELEMENTS[el]?.color || '#ff00ff';
    matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.38, metalness: 0.05, transparent: ghost, opacity: ghost ? 0.28 : 1, depthWrite: !ghost }));
  }
  return matCache.get(key);
}

class Pool {
  constructor(parent, factory) { this.parent = parent; this.factory = factory; this.items = new Map(); this.used = new Set(); }
  begin() { this.used.clear(); }
  get(key, ...args) {
    let it = this.items.get(key);
    if (!it) { it = this.factory(key, ...args); this.items.set(key, it); this.parent.add(it); }
    this.used.add(key); it.visible = true; return it;
  }
  end() { for (const [k, it] of this.items) if (!this.used.has(k)) it.visible = false; }
  clear() { for (const it of this.items.values()) { this.parent.remove(it); disposeObject(it); } this.items.clear(); this.used.clear(); }
}

function disposeObject(obj) {
  obj.traverse?.((o) => {
    if (o.geometry && !sharedGeo.has(o.geometry)) o.geometry.dispose();
    if (o.material && !sharedMat(o.material)) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
    if (o.isCSS2DObject && o.element?.parentNode) o.element.parentNode.removeChild(o.element);
  });
}
const sharedGeo = new Set([sphereGeo, cylGeo, lobeGeo]);
const sharedMat = (m) => [...matCache.values()].includes(m);

function orientCylinder(mesh, a, b, radius) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.scale.set(radius, len, radius);
  mesh.quaternion.setFromUnitVectors(UP, dir.normalize());
}

function makeLabel(className, text) {
  const el = document.createElement('div');
  el.className = `lbl ${className}`;
  el.textContent = text;
  return new CSS2DObject(el);
}

export class MoleculeView {
  constructor(viewport) {
    this.viewport = viewport;
    this.group = new THREE.Group();
    viewport.root.add(this.group);
    this.layers = {
      atoms: new THREE.Group(), bonds: new THREE.Group(), lonePairs: new THREE.Group(), orbitals: new THREE.Group(),
      labels: new THREE.Group(), arrows: new THREE.Group(), highlights: new THREE.Group(),
    };
    Object.values(this.layers).forEach((g) => this.group.add(g));
    this.atomPool = new Pool(this.layers.atoms, (key, el, ghost) => new THREE.Mesh(sphereGeo, elementMaterial(el, ghost)));
    this.bondPool = new Pool(this.layers.bonds, () => new THREE.Mesh(cylGeo, new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.05, transparent: true })));
    this.lpPool = new Pool(this.layers.lonePairs, () => new THREE.Mesh(lobeGeo, new THREE.MeshStandardMaterial({ color: '#fde68a', emissive: '#f59e0b', emissiveIntensity: 0.45, roughness: 0.5, transparent: true, opacity: 0.9 })));
    this.orbPool = new Pool(this.layers.orbitals, (key, kind) => new THREE.Mesh(lobeGeo, new THREE.MeshStandardMaterial({ color: kind === 'empty' ? '#f0abfc' : '#fde68a', emissive: kind === 'empty' ? '#d946ef' : '#f59e0b', emissiveIntensity: 0.35, transparent: true, opacity: kind === 'empty' ? 0.38 : 0.5, depthWrite: false, side: THREE.DoubleSide })));
    this.labelPool = new Pool(this.layers.labels, (key, cls, text) => makeLabel(cls, text));
    this.options = { lonePairs: true, hydrogens: true, labels: true, orbitals: true, arrows: true, highlights: true, atomScale: 1 };
    this.frame = null;
    this.arrows = [];
    this.highlights = [];
    this.pulse = 0;
    this._offTick = viewport.onTick((dt) => this._tick(dt));
  }

  setOptions(opts) { Object.assign(this.options, opts); if (this.frame) this.setFrame(this.frame); }

  atom(id) { return this._byId?.get(this.frame?.aliases?.[id] || id); }

  /** Replace the displayed molecule(s) with a frame; keyed meshes are reused. */
  setFrame(frame) {
    this.frame = frame;
    const byId = new Map(frame.atoms.map((a) => [a.id, a]));
    this._byId = byId;
    const o = this.options;
    const show = (a) => o.hydrogens || a.el !== 'H' || this._hydrogenIsInteresting(a, frame);

    this.atomPool.begin();
    for (const a of frame.atoms) {
      if (!show(a)) continue;
      const m = this.atomPool.get(`${a.id}|${a.el}|${a.ghost ? 1 : 0}`, a.el, a.ghost);
      const r = (ELEMENTS[a.el]?.radius || 0.3) * o.atomScale;
      m.position.set(a.pos[0], a.pos[1], a.pos[2]);
      m.scale.setScalar(r);
    }
    this.atomPool.end();

    this.bondPool.begin();
    for (const b of frame.bonds) {
      const A = byId.get(b.a), B = byId.get(b.b);
      if (!A || !B || !show(A) || !show(B)) continue;
      const pa = V(A.pos), pb = V(B.pos), mid = pa.clone().lerp(pb, 0.5);
      const partial = b.partial ?? 1;
      const ghost = b.ghost || A.ghost || B.ghost;
      const order = b.order || 1;
      const offsets = this._bondOffsets(b, A, B, frame, byId);
      offsets.forEach((off, i) => {
        if (b.piOnly && i === 0) return; // π-only overlay: draw just the second cylinder
        const radius = (order > 1 ? 0.075 : 0.1) * (0.45 + 0.55 * partial);
        for (const [key, from, to, el] of [[`${b.a}|${b.b}|${i}|a`, pa, mid, A.el], [`${b.a}|${b.b}|${i}|b`, mid, pb, B.el]]) {
          const m = this.bondPool.get(key);
          orientCylinder(m, from.clone().add(off), to.clone().add(off), radius);
          m.material.color.set(partial < 0.98 ? '#fbbf24' : (ELEMENTS[el]?.color || '#888'));
          m.material.opacity = ghost ? 0.25 : partial < 0.98 ? 0.35 + 0.5 * partial : 1;
          m.material.depthWrite = !ghost && partial >= 0.98;
          m.material.emissive = m.material.emissive || new THREE.Color();
          m.material.emissive.set(partial < 0.98 ? '#92400e' : '#000000');
        }
      });
    }
    this.bondPool.end();

    this.lpPool.begin();
    if (o.lonePairs) {
      for (const a of frame.atoms) {
        if (!show(a)) continue;
        const r = (ELEMENTS[a.el]?.radius || 0.3) * o.atomScale;
        a.lonePairDirs.forEach((d, i) => {
          const m = this.lpPool.get(`${a.id}|lp${i}`);
          const dir = V(d).normalize();
          m.position.copy(V(a.pos)).addScaledVector(dir, r + 0.22);
          m.scale.set(0.12, 0.12, 0.2);
          m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
          m.material.opacity = a.ghost ? 0.3 : 0.9;
        });
      }
    }
    this.lpPool.end();

    this.orbPool.begin();
    if (o.orbitals) {
      for (const a of frame.atoms) {
        if (!a.orbital) continue;
        a.orbital.dirs.forEach((d, i) => {
          const m = this.orbPool.get(`${a.id}|orb${i}|${a.orbital.kind}`, a.orbital.kind);
          const dir = V(d).normalize();
          m.position.copy(V(a.pos)).addScaledVector(dir, 0.62);
          m.scale.set(0.24, 0.24, 0.5);
          m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
        });
      }
    }
    this.orbPool.end();

    this.labelPool.begin();
    if (o.labels) {
      for (const a of frame.atoms) {
        if (!show(a)) continue;
        const r = (ELEMENTS[a.el]?.radius || 0.3) * o.atomScale;
        const q = chargeLabel(a.charge || 0);
        if (q) {
          const lab = this.labelPool.get(`${a.id}|charge`, 'charge', q);
          lab.element.textContent = q;
          lab.element.classList.toggle('neg', (a.charge || 0) < 0);
          lab.element.classList.toggle('full', Math.abs(a.charge || 0) >= 0.75);
          lab.position.set(a.pos[0] + r * 0.9, a.pos[1] + r * 1.1, a.pos[2]);
        }
        if (a.label) {
          const lab = this.labelPool.get(`${a.id}|text`, 'note', a.label);
          lab.element.textContent = a.label;
          lab.position.set(a.pos[0], a.pos[1] - r - 0.35, a.pos[2]);
        }
      }
    }
    this.labelPool.end();

    this._rebuildArrows();
    this._rebuildHighlights();
  }

  _hydrogenIsInteresting(a, frame) {
    // Keep hydrogens that are bonded to heteroatoms or participate in a partial bond.
    return frame.bonds.some((b) => (b.a === a.id || b.b === a.id) && ((b.partial ?? 1) < 1 || ['O', 'N', 'S'].includes(this._byId.get(b.a === a.id ? b.b : b.a)?.el)));
  }

  _bondOffsets(b, A, B, frame, byId) {
    const order = b.order || 1;
    if (order === 1) return [new THREE.Vector3()];
    const axis = V(B.pos).sub(V(A.pos)).normalize();
    let ref = null;
    if (b.ring) {
      const c = new THREE.Vector3();
      let n = 0;
      for (const id of b.ring) { const at = byId.get(id); if (at) { c.add(V(at.pos)); n++; } }
      if (n) { c.multiplyScalar(1 / n); ref = c.sub(V(A.pos)); }
    }
    if (!ref) {
      const other = frame.bonds.find((x) => x !== b && (x.a === b.a || x.b === b.a || x.a === b.b || x.b === b.b));
      if (other) {
        const pid = [other.a, other.b].find((id) => id !== b.a && id !== b.b);
        const p = byId.get(pid);
        if (p) ref = V(p.pos).sub(V(A.pos));
      }
    }
    const perp = ref ? ref.clone().addScaledVector(axis, -ref.dot(axis)) : new THREE.Vector3();
    if (perp.lengthSq() < 1e-6) perp.copy(Math.abs(axis.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).cross(axis);
    perp.normalize();
    if (b.ring) return [new THREE.Vector3(), perp.clone().multiplyScalar(0.19)];
    if (order === 2) return [perp.clone().multiplyScalar(0.13), perp.clone().multiplyScalar(-0.13)];
    return [new THREE.Vector3(), perp.clone().multiplyScalar(0.2), perp.clone().multiplyScalar(-0.2)];
  }

  // ---------------------------------------------------------------- arrows
  setArrows(arrows) { this.arrows = arrows || []; this._rebuildArrows(); }

  _anchor(spec, towards) {
    const f = this.frame;
    if (spec.type === 'atom' || spec.type === 'lonePair') {
      const a = this.atom(spec.atom);
      if (!a) return null;
      const p = V(a.pos), r = (ELEMENTS[a.el]?.radius || 0.3) * this.options.atomScale;
      if (spec.type === 'lonePair') {
        let dir = null;
        if (a.lonePairDirs.length && towards) {
          const tw = towards.clone().sub(p).normalize();
          dir = a.lonePairDirs.map(V).sort((x, y) => y.dot(tw) - x.dot(tw))[0];
        } else if (a.lonePairDirs.length) dir = V(a.lonePairDirs[0]);
        else if (towards) dir = towards.clone().sub(p).normalize();
        else dir = new THREE.Vector3(0, 1, 0);
        return p.addScaledVector(dir, r + 0.45);
      }
      if (towards) { const d = towards.clone().sub(p).normalize(); return p.addScaledVector(d, r + 0.2); }
      return p;
    }
    if (spec.type === 'bond') {
      const a = this.atom(spec.a), b = this.atom(spec.b);
      if (!a || !b) return null;
      return V(a.pos).lerp(V(b.pos), 0.5);
    }
    return null;
  }

  _rebuildArrows() {
    const g = this.layers.arrows;
    while (g.children.length) { const c = g.children.pop(); disposeObject(c); }
    if (!this.frame || !this.options.arrows) return;
    const centroid = new THREE.Vector3();
    this.frame.atoms.forEach((a) => centroid.add(V(a.pos)));
    centroid.multiplyScalar(1 / Math.max(1, this.frame.atoms.length));
    for (const arrow of this.arrows) {
      const roughTo = this._anchor(arrow.to, null);
      const from = this._anchor(arrow.from, roughTo);
      const to = from ? this._anchor(arrow.to, from) : null;
      if (!from || !to) continue;
      const mid = from.clone().lerp(to, 0.5);
      const chord = to.clone().sub(from);
      const dist = chord.length() || 1;
      let bulge = mid.clone().sub(centroid);
      bulge.addScaledVector(chord, -bulge.dot(chord) / (dist * dist));
      if (bulge.lengthSq() < 1e-4) bulge = new THREE.Vector3(0, 1, 0).cross(chord);
      bulge.normalize().multiplyScalar(0.35 * dist + 0.45);
      const ctrl = mid.add(bulge);
      const curve = new THREE.QuadraticBezierCurve3(from, ctrl, to);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 28, 0.05, 10, false), new THREE.MeshBasicMaterial({ color: '#fbbf24', toneMapped: false }));
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.36, 14), tube.material);
      head.position.copy(to);
      head.quaternion.setFromUnitVectors(UP, curve.getTangent(1).normalize());
      const tail = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), tube.material);
      tail.position.copy(from);
      const grp = new THREE.Group();
      grp.add(tube, head, tail);
      grp.userData.arrow = arrow;
      g.add(grp);
    }
  }

  // ---------------------------------------------------------------- highlights
  setHighlights(visuals) { this.highlights = visuals || []; this._rebuildHighlights(); }

  _rebuildHighlights() {
    const g = this.layers.highlights;
    while (g.children.length) { const c = g.children.pop(); disposeObject(c); }
    if (!this.frame || !this.options.highlights) return;
    const accent = '#38bdf8';
    const glowMat = () => new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.28, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending });
    const pos = (id) => { const a = this.atom(id); return a ? V(a.pos) : null; };
    const radius = (id) => (ELEMENTS[this.atom(id)?.el]?.radius || 0.3) * this.options.atomScale;
    const addLabel = (cls, text, p) => { const l = makeLabel(cls, text); l.position.copy(p); g.add(l); };

    for (const vis of this.highlights) {
      switch (vis.type) {
        case 'atom': { const p = pos(vis.id); if (!p) break; const m = new THREE.Mesh(sphereGeo, glowMat()); m.position.copy(p); m.scale.setScalar(radius(vis.id) * 1.8); m.userData.pulse = true; g.add(m); break; }
        case 'bond': { const a = pos(vis.a), b = pos(vis.b); if (!a || !b) break; const m = new THREE.Mesh(cylGeo, glowMat()); orientCylinder(m, a, b, 0.24); m.userData.pulse = true; g.add(m); break; }
        case 'lonePairs': {
          const a = this.atom(vis.id); if (!a) break;
          const r = radius(vis.id);
          for (const d of a.lonePairDirs) { const m = new THREE.Mesh(lobeGeo, glowMat()); m.material.color.set('#fbbf24'); const dir = V(d).normalize(); m.position.copy(V(a.pos)).addScaledVector(dir, r + 0.22); m.scale.set(0.24, 0.24, 0.36); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir); m.userData.pulse = true; g.add(m); }
          if (!a.lonePairDirs.length) { const m = new THREE.Mesh(sphereGeo, glowMat()); m.position.copy(V(a.pos)); m.scale.setScalar(r * 1.8); g.add(m); }
          addLabel('hl', `${a.lonePairs} lone pair${a.lonePairs === 1 ? '' : 's'}`, V(a.pos).add(new THREE.Vector3(0, r + 0.55, 0)));
          break;
        }
        case 'orbital': {
          const a = this.atom(vis.id); if (!a?.orbital) break;
          for (const d of a.orbital.dirs) { const m = new THREE.Mesh(lobeGeo, glowMat()); m.material.color.set(a.orbital.kind === 'empty' ? '#e879f9' : '#fbbf24'); const dir = V(d).normalize(); m.position.copy(V(a.pos)).addScaledVector(dir, 0.62); m.scale.set(0.36, 0.36, 0.68); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir); m.userData.pulse = true; g.add(m); }
          addLabel('hl', a.orbital.kind === 'empty' ? 'empty p orbital' : 'lone pair in p orbital', V(a.pos).add(new THREE.Vector3(0, 1.3, 0)));
          break;
        }
        case 'dipole': {
          const a = pos(vis.from), b = pos(vis.to); if (!a || !b) break;
          const dir = b.clone().sub(a); const len = dir.length(); dir.normalize();
          const side = new THREE.Vector3(0, 1, 0); if (Math.abs(side.dot(dir)) > 0.9) side.set(1, 0, 0);
          const off = side.clone().cross(dir).cross(dir).multiplyScalar(-1).normalize().multiplyScalar(0.55);
          const start = a.clone().add(off), end = b.clone().add(off);
          const arrow = new THREE.ArrowHelper(dir, start, len, 0x22d3ee, 0.3, 0.18);
          g.add(arrow);
          const cross = new THREE.Group();
          const lm = new THREE.LineBasicMaterial({ color: 0x22d3ee });
          const n1 = off.clone().normalize().multiplyScalar(0.12), n2 = dir.clone().multiplyScalar(0.12);
          cross.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([start.clone().sub(n1), start.clone().add(n1)]), lm));
          cross.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([start.clone().sub(n2), start.clone().add(n2)]), lm));
          g.add(cross);
          addLabel('hl dipole', 'dipole', end.clone().add(off.clone().normalize().multiplyScalar(0.3)));
          break;
        }
        case 'angle': {
          const c = pos(vis.center), a = pos(vis.a), b = pos(vis.b); if (!c || !a || !b) break;
          const da = a.clone().sub(c).normalize(), db = b.clone().sub(c).normalize();
          const pts = [];
          const ang = Math.acos(THREE.MathUtils.clamp(da.dot(db), -1, 1));
          let axis = new THREE.Vector3().crossVectors(da, db);
          if (axis.lengthSq() < 1e-6) axis = Math.abs(da.y) < 0.9 ? new THREE.Vector3(0, 1, 0).cross(da) : new THREE.Vector3(1, 0, 0).cross(da);
          axis.normalize();
          const R = 0.75;
          for (let i = 0; i <= 32; i++) pts.push(c.clone().addScaledVector(da.clone().applyAxisAngle(axis, (ang * i) / 32), R));
          g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: accent })));
          const midDir = da.clone().applyAxisAngle(axis, ang / 2);
          addLabel('hl', vis.text || `${(ang * 180 / Math.PI).toFixed(0)}°`, c.clone().addScaledVector(midDir, R + 0.45));
          break;
        }
        case 'plane': {
          const ps = vis.atoms.map(pos).filter(Boolean); if (ps.length < 3) break;
          const c = ps.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(1 / ps.length);
          const n = new THREE.Vector3();
          for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
            const cr = new THREE.Vector3().crossVectors(ps[i].clone().sub(c), ps[j].clone().sub(c));
            if (cr.dot(n) < 0) cr.negate();
            n.add(cr);
          }
          if (n.lengthSq() < 1e-6) n.set(0, 0, 1);
          n.normalize();
          const ext = Math.max(...ps.map((p) => p.distanceTo(c))) * 2 + 1.0;
          const m = new THREE.Mesh(new THREE.PlaneGeometry(ext, ext), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
          m.position.copy(c);
          m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
          g.add(m);
          const edge = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.6 }));
          edge.position.copy(c); edge.quaternion.copy(m.quaternion); g.add(edge);
          break;
        }
        case 'charges': {
          for (const [id, text] of Object.entries(vis.map)) { const p = pos(id); if (!p) continue; addLabel(`hl charge ${text.includes('−') ? 'neg' : ''}`, text, p.clone().add(new THREE.Vector3(radius(id) * 0.9, radius(id) * 1.2, 0))); }
          break;
        }
        case 'label': { const p = pos(vis.id); if (!p) break; addLabel('hl', vis.text, p.clone().add(new THREE.Vector3(0, radius(vis.id) + 0.5, 0))); break; }
        default: break;
      }
    }
  }

  _tick(dt) {
    this.pulse += dt * 2.2;
    const s = 1 + 0.08 * Math.sin(this.pulse);
    for (const c of this.layers.highlights.children) if (c.userData.pulse && c.material) c.material.opacity = 0.2 + 0.14 * (0.5 + 0.5 * Math.sin(this.pulse));
    void s;
  }

  bounds() {
    const box = new THREE.Box3();
    for (const m of this.atomPool.items.values()) if (m.visible) box.expandByObject(m);
    return box;
  }

  clear() {
    this.frame = null; this.arrows = []; this.highlights = [];
    [this.atomPool, this.bondPool, this.lpPool, this.orbPool, this.labelPool].forEach((p) => p.clear());
    for (const key of ['arrows', 'highlights']) { const g = this.layers[key]; while (g.children.length) disposeObject(g.children.pop()); }
  }

  dispose() { this.clear(); this._offTick(); this.viewport.root.remove(this.group); }
}
