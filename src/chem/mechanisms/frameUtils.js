// Helpers for building parametric reaction frames.
// A mechanism's frame(t) places the reacting atoms explicitly ("pinned") as a
// function of t and lets the embedder fill in the spectator atoms.
import { embed, v, polar, segment, lerp, smoothstep, TETRAHEDRAL, DEG } from '../geometry.js';
import { toFrame } from '../builder.js';

export { v, polar, segment, lerp, smoothstep, TETRAHEDRAL, DEG };

/** Piecewise interpolation through [t, value] control points with smoothstep easing between them. */
export function sched(t, points) {
  if (t <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [t0, v0] = points[i - 1], [t1, v1] = points[i];
    if (t <= t1) return lerp(v0, v1, segment(t, t0, t1));
  }
  return points[points.length - 1][1];
}

/** Energy profile through control points, cosine-interpolated so maxima look like transition states. */
export function energyProfile(points) {
  return (t) => {
    if (t <= points[0].t) return points[0].E;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      if (t <= b.t) { const u = (t - a.t) / (b.t - a.t); const w = (1 - Math.cos(u * Math.PI)) / 2; return a.E + (b.E - a.E) * w; }
    }
    return points[points.length - 1].E;
  };
}

/** Accumulates atoms, bonds, pinned positions and hints for one frame. */
export class System {
  constructor() { this.atoms = []; this.bonds = []; this.pinned = {}; this.hints = {}; this.rigid = []; }
  atom(def) { this.atoms.push({ ...def }); return def.id; }
  /** Add a bond; partial < 0.04 is treated as "not yet a bond" and skipped. */
  bond(a, b, order = 1, partial = 1) { if (partial >= 0.04) this.bonds.push({ a, b, order, partial: Math.min(1, partial) }); return this; }
  pin(id, pos) { this.pinned[id] = pos; return this; }
  hint(id, dir) { this.hints[id] = dir; return this; }
  /** Add a prefixed fragment (atoms + bonds) and return the id of its root. */
  frag(f) { this.atoms.push(...f.atoms); this.bonds.push(...f.bonds); if (f.rigid) this.rigid.push(f.rigid); return f.root; }
  /** Embed and produce a render frame. Atoms with autoLP get lonePairs = 4 − (number of bonds). */
  frame(extra = {}) {
    const count = new Map();
    for (const b of this.bonds) { count.set(b.a, (count.get(b.a) || 0) + 1); count.set(b.b, (count.get(b.b) || 0) + 1); }
    for (const a of this.atoms) if (a.autoLP) a.lonePairs = Math.max(0, 4 - (count.get(a.id) || 0));
    const mol = { atoms: this.atoms, bonds: this.bonds, rigid: this.rigid };
    const { positions, lonePairDirs, orbitals } = embed(mol, { pinned: this.pinned, hints: this.hints });
    return toFrame(mol, positions, lonePairDirs, orbitals, extra);
  }
}

// ---- fragments ---------------------------------------------------------
export function methylFrag(p) {
  return {
    root: `${p}C`,
    atoms: [{ id: `${p}C`, el: 'C' }, { id: `${p}H1`, el: 'H' }, { id: `${p}H2`, el: 'H' }, { id: `${p}H3`, el: 'H' }],
    bonds: [1, 2, 3].map((i) => ({ a: `${p}C`, b: `${p}H${i}`, order: 1 })),
  };
}
export function ethylFrag(p) {
  return {
    root: `${p}C1`,
    atoms: [{ id: `${p}C1`, el: 'C' }, { id: `${p}H1`, el: 'H' }, { id: `${p}H2`, el: 'H' }, { id: `${p}C2`, el: 'C' }, { id: `${p}H3`, el: 'H' }, { id: `${p}H4`, el: 'H' }, { id: `${p}H5`, el: 'H' }],
    bonds: [
      { a: `${p}C1`, b: `${p}H1`, order: 1 }, { a: `${p}C1`, b: `${p}H2`, order: 1 }, { a: `${p}C1`, b: `${p}C2`, order: 1 },
      { a: `${p}C2`, b: `${p}H3`, order: 1 }, { a: `${p}C2`, b: `${p}H4`, order: 1 }, { a: `${p}C2`, b: `${p}H5`, order: 1 },
    ],
  };
}

/**
 * Unit direction for a tetrahedral substituent on the atom at `pos` (whose parent is at `parentPos`)
 * that points sideways relative to `axis` (never along it) on the side away from `awayFrom`.
 * Continuous in t, so chains stay put while the umbrella inverts.
 */
export function sidewaysDir(pos, parentPos, axis, awayFrom, theta = Math.PI - TETRAHEDRAL) {
  const u = v.norm(v.sub(pos, parentPos));
  const e1 = v.norm(v.perp(axis, u));
  let w = v.norm(v.cross(u, e1));
  if (v.dot(w, v.sub(awayFrom, pos)) > 0) w = v.neg(w);
  return v.add(v.scale(u, Math.cos(theta)), v.scale(w, Math.sin(theta)));
}

/** Unit direction for a tetrahedral substituent on `pos` (parent at `parentPos`) anti to `antiTo`. */
export function antiDir(pos, parentPos, antiTo, theta = Math.PI - TETRAHEDRAL) {
  const u = v.norm(v.sub(pos, parentPos));
  return polar(u, theta, Math.PI, 1, v.sub(antiTo, parentPos));
}

/** Display thresholds for numeric charges, shared with the renderer. */
export function chargeLabel(q) {
  const a = Math.abs(q);
  if (a < 0.12) return '';
  const sign = q > 0 ? '+' : '−';
  if (a < 0.75) return `δ${sign}`;
  if (a >= 1.75) return `${Math.round(a)}${sign}`;
  return sign;
}
