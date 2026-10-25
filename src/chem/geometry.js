// Dependency-free 3D vector helpers and a small molecular geometry embedder.
// Coordinates are plain [x, y, z] arrays (Å) so this module runs in Node tests
// and in the browser; the renderer converts to THREE.Vector3.
import { bondLength } from './elements.js';

export const DEG = Math.PI / 180;
export const TETRAHEDRAL = 109.4712 * DEG;

export const v = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
  neg: (a) => [-a[0], -a[1], -a[2]],
  mid: (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2],
  /** Component of a perpendicular to unit vector u. */
  perp: (a, u) => { const d = v.dot(a, u); return [a[0] - u[0] * d, a[1] - u[1] * d, a[2] - u[2] * d]; },
  /** Any unit vector perpendicular to a. */
  anyPerp: (a) => {
    const ax = Math.abs(a[0]), ay = Math.abs(a[1]), az = Math.abs(a[2]);
    const other = ax <= ay && ax <= az ? [1, 0, 0] : ay <= az ? [0, 1, 0] : [0, 0, 1];
    return v.norm(v.cross(a, other));
  },
  /** Signed angle from a to b about unit axis n. */
  signedAngle: (a, b, n) => Math.atan2(v.dot(v.cross(a, b), n), v.dot(a, b)),
  centroid: (pts) => {
    const c = [0, 0, 0];
    for (const p of pts) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; }
    return pts.length ? v.scale(c, 1 / pts.length) : c;
  },
};

// ---- 3x3 rotation matrices (row-major nested arrays) ----
export const m3 = {
  identity: () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  apply: (m, p) => [
    m[0][0] * p[0] + m[0][1] * p[1] + m[0][2] * p[2],
    m[1][0] * p[0] + m[1][1] * p[1] + m[1][2] * p[2],
    m[2][0] * p[0] + m[2][1] * p[1] + m[2][2] * p[2],
  ],
  mul: (A, B) => {
    const R = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) R[i][j] = A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j];
    return R;
  },
  transpose: (A) => [[A[0][0], A[1][0], A[2][0]], [A[0][1], A[1][1], A[2][1]], [A[0][2], A[1][2], A[2][2]]],
  /** Rotation about unit axis k by angle (Rodrigues). */
  axisAngle: (k, ang) => {
    const c = Math.cos(ang), s = Math.sin(ang), t = 1 - c;
    const [x, y, z] = k;
    return [
      [t * x * x + c, t * x * y - s * z, t * x * z + s * y],
      [t * x * y + s * z, t * y * y + c, t * y * z - s * x],
      [t * x * z - s * y, t * y * z + s * x, t * z * z + c],
    ];
  },
  /** Rotation that maps unit vector a onto unit vector b. */
  fromTo: (a, b) => {
    const d = Math.max(-1, Math.min(1, v.dot(a, b)));
    if (d > 1 - 1e-9) return m3.identity();
    if (d < -1 + 1e-9) return m3.axisAngle(v.anyPerp(a), Math.PI);
    return m3.axisAngle(v.norm(v.cross(a, b)), Math.acos(d));
  },
  /** Matrix whose columns are the given basis vectors. */
  fromColumns: (e1, e2, e3) => [[e1[0], e2[0], e3[0]], [e1[1], e2[1], e3[1]], [e1[2], e2[2], e3[2]]],
};

// ---- Ideal slot directions (unit vectors) in a local frame; slot 0 is +z ----
const S120 = Math.sin(120 * DEG), C120 = Math.cos(120 * DEG);
const ST = Math.sin(TETRAHEDRAL), CT = Math.cos(TETRAHEDRAL);
export const TEMPLATES = {
  single: [[0, 0, 1]],
  linear: [[0, 0, 1], [0, 0, -1]],
  trigonal: [[0, 0, 1], [S120, 0, C120], [-S120, 0, C120]],
  tetrahedral: [[0, 0, 1], [ST, 0, CT], [ST * C120, ST * S120, CT], [ST * C120, -ST * S120, CT]],
  tbp: [[0, 0, 1], [0, 0, -1], [1, 0, 0], [C120, S120, 0], [C120, -S120, 0]],
  // Coordination geometries. Slots (0,1), (2,3) and (4,5) are trans pairs; the square plane is xz, its normal y.
  octahedral: [[0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]],
  squarePlanar: [[0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0]],
};
// Template slot that fixes the torsion about slot 0 (the first slot not collinear with it).
const TORSION_REF = { octahedral: 2, squarePlanar: 2 };
export const GEOMETRY_KINDS = Object.keys(TEMPLATES);

/** Decide the slot geometry for an atom given its explicit hybridization or steric number. */
export function geometryKind(atom, nNeighbors) {
  if (atom.hyb === 'sp') return 'linear';
  if (atom.hyb === 'sp2') return 'trigonal';
  if (atom.hyb === 'sp3') return 'tetrahedral';
  if (atom.hyb === 'oct' || atom.hyb === 'd2sp3' || atom.hyb === 'sp3d2') return 'octahedral';
  if (atom.hyb === 'sqp' || atom.hyb === 'dsp2') return 'squarePlanar';
  const lp = atom.lonePairs || 0;
  const s = nNeighbors + lp;
  if (s <= 1) return 'single';
  if (s === 2) return 'linear';
  if (s === 3) return 'trigonal';
  if (s === 4) return 'tetrahedral';
  if (s === 6) return 'octahedral';
  return 'tbp';
}

/** Number of lone pairs that occupy directional slots (p-orbital lone pairs do not). */
function slotLonePairs(atom) {
  const lp = atom.lonePairs || 0;
  if (atom.hyb === 'sp2' && atom.pOrbital === 'lonePair') return Math.max(0, lp - 1);
  return lp;
}

function buildAdjacency(graph) {
  const adj = new Map();
  for (const a of graph.atoms) adj.set(a.id, []);
  for (const b of graph.bonds) {
    adj.get(b.a).push({ id: b.b, order: b.order || 1 });
    adj.get(b.b).push({ id: b.a, order: b.order || 1 });
  }
  return adj;
}

/**
 * Orient slot directions for atom at p.
 * - Slot 0 aligns with the first already-placed neighbor.
 * - The torsion about that axis is chosen so slot 1 is anti (180°) to a reference
 *   bond on the neighbor (gives staggered sp3 and planar sp2–sp2 conformations),
 *   or best-matches a second placed neighbor, or points toward `hint`.
 */
function orientSlots(kind, id, p, placedN, pos, adj, hint, pickRef, synRef) {
  const tmpl = TEMPLATES[kind];
  if (placedN.length === 0) {
    const u = hint ? v.norm(hint) : [0, 0, 1];
    const R = m3.fromTo([0, 0, 1], u);
    return tmpl.map((s) => m3.apply(R, s));
  }
  const u = v.norm(v.sub(pos.get(placedN[0].id), p));
  let R = m3.fromTo([0, 0, 1], u);
  if (tmpl.length > 2) {
    let target = null;
    if (placedN.length >= 2) {
      const u2 = v.norm(v.sub(pos.get(placedN[1].id), p));
      target = v.perp(u2, u);
    } else if (synRef) {
      // Double bond between two planar atoms: slot 1 goes syn to the parent's first substituent,
      // so R1/R3 and R2/R4 of an alkene are cis pairs by construction.
      target = v.perp(v.sub(synRef, pos.get(placedN[0].id)), u);
    } else {
      const pId = placedN[0].id;
      const q = pickRef(pId, id);
      if (q) target = v.neg(v.perp(v.sub(pos.get(q.id), pos.get(pId)), u));
      else if (hint) target = v.perp(hint, u);
    }
    if (target && v.len(target) > 1e-6) {
      const e1w = v.norm(m3.apply(R, v.perp(tmpl[TORSION_REF[kind] ?? 1], [0, 0, 1])));
      const ang = v.signedAngle(e1w, v.norm(target), u);
      R = m3.mul(m3.axisAngle(u, ang), R);
    }
  }
  return tmpl.map((s) => m3.apply(R, s));
}

/** Place a rigid template (e.g. a benzene ring) so its attach atom sits at `target`. */
function placeRigid(group, attachId, target, dirFromParent, parentKind, refVec, pos) {
  const local = group.coords;
  const aLocal = local[attachId];
  const outLocal = v.norm(group.attachDir);          // local: from attach atom toward the parent
  const planeLocal = v.norm(v.perp(group.planeAxis || v.anyPerp(outLocal), outLocal));
  const nLocal = v.cross(outLocal, planeLocal);
  const outWorld = v.neg(dirFromParent);
  let planeWorld;
  if (refVec && v.len(v.perp(refVec, outWorld)) > 1e-6) {
    planeWorld = v.norm(v.perp(refVec, outWorld));
    // Conjugated attachment (parent is planar): keep the ring coplanar with the reference bond.
    // Otherwise twist 90° so the ring bisects the parent's other substituents.
    if (parentKind === 'tetrahedral') planeWorld = v.norm(v.cross(outWorld, planeWorld));
  } else {
    planeWorld = v.anyPerp(outWorld);
  }
  const nWorld = v.cross(outWorld, planeWorld);
  const L = m3.fromColumns(outLocal, planeLocal, nLocal);
  const W = m3.fromColumns(outWorld, planeWorld, nWorld);
  const R = m3.mul(W, m3.transpose(L));
  for (const id of group.atoms) {
    const rel = v.sub(local[id], aLocal);
    pos.set(id, v.add(target, m3.apply(R, rel)));
  }
}

/**
 * Embed a molecular graph in 3D.
 * graph: { atoms: [{id, el, lonePairs?, hyb?, pOrbital?, charge?}], bonds: [{a, b, order?}], rigid?: [...] }
 * opts:  { pinned: {id: [x,y,z]}, hints: {id: [x,y,z]}, root?: id }
 * Returns { positions: Map, lonePairDirs: Map<id, dir[]>, orbitals: Map<id, {kind, dirs}>, frames: Map }
 */
export function embed(graph, opts = {}) {
  const { pinned = {}, hints = {}, root } = opts;
  const atoms = new Map(graph.atoms.map((a) => [a.id, a]));
  const adj = buildAdjacency(graph);
  const pos = new Map(Object.entries(pinned).map(([k, p]) => [k, [p[0], p[1], p[2]]]));
  const lonePairDirs = new Map();
  const frames = new Map();
  const rigidOf = new Map();
  for (const g of graph.rigid || []) for (const id of g.atoms) rigidOf.set(id, g);
  const placedRigid = new Set();

  const queue = [];
  if (root) queue.push(root);
  for (const id of pos.keys()) if (!queue.includes(id)) queue.push(id);
  if (!queue.length) queue.push(graph.atoms[0].id);
  if (!pos.has(queue[0])) {
    const g = rigidOf.get(queue[0]);
    if (g) { placeRigid(g, queue[0], [0, 0, 0], [0, 0, -1], 'trigonal', null, pos); placedRigid.add(g); }
    else pos.set(queue[0], [0, 0, 0]);
  }
  const visited = new Set();
  let offsetX = 0;

  // Size of the branch hanging off `q` when the bond p–q is cut (memoised).
  const bulkMemo = new Map();
  const bulk = (q, p) => {
    const key = `${q}|${p}`;
    if (bulkMemo.has(key)) return bulkMemo.get(key);
    const seen = new Set([q]); const stack = [q];
    while (stack.length) { const x = stack.pop(); for (const n of adj.get(x) || []) if (n.id !== p && !seen.has(n.id)) { seen.add(n.id); stack.push(n.id); } }
    bulkMemo.set(key, seen.size);
    return seen.size;
  };
  // Reference neighbour for torsions: the bulkiest already-placed neighbour of pId other than id,
  // so each new substituent goes anti to the biggest group (Z esters, syn acids, zigzag chains).
  const pickRef = (pId, id) => {
    let best = null, bb = -1;
    for (const n of adj.get(pId) || []) {
      if (n.id === id || !pos.has(n.id)) continue;
      const b = bulk(n.id, pId);
      if (b > bb) { bb = b; best = n; }
    }
    return best;
  };
  const kindOf = (aId) => geometryKind(atoms.get(aId), (adj.get(aId) || []).length);
  // A planar atom double-bonded to another planar atom (C=C, C=N): slots follow definition order.
  const isAlkeneLike = (aId) => kindOf(aId) === 'trigonal' && (adj.get(aId) || []).some((n) => n.order >= 2 && kindOf(n.id) === 'trigonal');

  for (;;) {
    if (!queue.length) {
      const next = graph.atoms.find((a) => !visited.has(a.id));
      if (!next) break;
      if (!pos.has(next.id)) { offsetX += 4; pos.set(next.id, [offsetX, 0, 0]); }
      queue.push(next.id);
    }
    const id = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    const a = atoms.get(id);
    const p = pos.get(id);
    const nbrs = adj.get(id) || [];
    const placedN = nbrs.filter((n) => pos.has(n.id));
    const unplacedN = nbrs.filter((n) => !pos.has(n.id));
    const kind = geometryKind(a, nbrs.length);
    let synRef = null;
    if (placedN.length === 1 && placedN[0].order >= 2 && kind === 'trigonal' && kindOf(placedN[0].id) === 'trigonal') {
      const pf = frames.get(placedN[0].id);
      if (pf?.slotOf) {
        const first = Object.entries(pf.slotOf).filter(([nid]) => nid !== id).sort((x, y) => x[1] - y[1])[0];
        if (first && pos.has(first[0])) synRef = pos.get(first[0]);
      }
    }
    const slots = orientSlots(kind, id, p, placedN, pos, adj, hints[id], pickRef, synRef);
    const used = new Set();
    const slotOf = {};
    for (const n of placedN) {
      const d = v.norm(v.sub(pos.get(n.id), p));
      let best = -1, bd = -2;
      slots.forEach((s, i) => { if (!used.has(i)) { const dd = v.dot(d, s); if (dd > bd) { bd = dd; best = i; } } });
      if (best >= 0) { used.add(best); slotOf[n.id] = best; }
    }
    // Biggest substituent takes the anti slot, except on alkene-like atoms where definition order is kept.
    const ordered = isAlkeneLike(id) ? unplacedN : [...unplacedN].sort((x, y) => bulk(y.id, id) - bulk(x.id, id));
    const refNeighbor = placedN[0];
    const refVec = refNeighbor
      ? (() => { const q = pickRef(refNeighbor.id, id); return q ? v.sub(pos.get(q.id), pos.get(refNeighbor.id)) : null; })()
      : null;
    for (const n of ordered) {
      let i = slots.findIndex((_, k) => !used.has(k));
      if (i < 0) i = slots.length - 1;
      used.add(i);
      slotOf[n.id] = i;
      const nb = atoms.get(n.id);
      const L = bondLength(a.el, nb.el, n.order);
      const target = v.add(p, v.scale(slots[i], L));
      const g = rigidOf.get(n.id);
      if (g && !placedRigid.has(g)) {
        const parentKind = kind;
        const ref = placedN.length ? v.sub(pos.get(placedN[0].id), p) : refVec;
        placeRigid(g, n.id, target, slots[i], parentKind, ref, pos);
        placedRigid.add(g);
        for (const x of g.atoms) queue.push(x);
      } else {
        pos.set(n.id, target);
        queue.push(n.id);
      }
    }
    const free = slots.filter((_, i) => !used.has(i));
    lonePairDirs.set(id, free.slice(0, slotLonePairs(a)));
    let normal = null;
    if (kind === 'trigonal' || kind === 'linear' || kind === 'squarePlanar') {
      const s0 = slots[0], s1 = kind === 'squarePlanar' ? slots[2] : slots[1] || v.anyPerp(s0);
      normal = v.norm(v.cross(s0, s1));
      if (v.len(normal) < 1e-6) normal = v.anyPerp(s0);
    }
    frames.set(id, { kind, slots, normal, slotOf });
    for (const n of placedN) if (!visited.has(n.id)) queue.push(n.id);
  }

  const orbitals = new Map();
  for (const a of graph.atoms) {
    if (!a.pOrbital) continue;
    const f = frames.get(a.id);
    const n = f?.normal || [0, 1, 0];
    orbitals.set(a.id, { kind: a.pOrbital, dirs: [n, v.neg(n)] });
  }
  return { positions: pos, lonePairDirs, orbitals, frames };
}

/**
 * Cheap conformational clean-up for the explorer: for every rotatable single bond, try a set
 * of torsion offsets for the smaller side and keep the one with the fewest steric clashes
 * (the staggered/planar default wins whenever it is clash-free). Mutates the maps in place.
 */
export function relaxTorsions(graph, positions, lonePairDirs, orbitals, frames, { steps = 12, passes = 2 } = {}) {
  const adj = buildAdjacency(graph);
  const atoms = new Map(graph.atoms.map((a) => [a.id, a]));
  const inRigid = new Set();
  for (const g of graph.rigid || []) for (const id of g.atoms) inRigid.add(id);
  const ids = graph.atoms.map((a) => a.id);
  // Atoms on the `b` side of bond a–b, or null when a–b is in a ring.
  const sideOf = (a, b) => {
    const seen = new Set([b]); const q = [b];
    while (q.length) {
      const x = q.shift();
      for (const n of adj.get(x)) {
        if (x === b && n.id === a) continue;
        if (n.id === a) return null;
        if (!seen.has(n.id)) { seen.add(n.id); q.push(n.id); }
      }
    }
    return seen;
  };
  const rotatable = [];
  for (const bd of graph.bonds) {
    if ((bd.order || 1) !== 1 || bd.aromatic) continue;
    if (inRigid.has(bd.a) && inRigid.has(bd.b)) continue;
    if (adj.get(bd.a).length < 2 || adj.get(bd.b).length < 2) continue;
    // Planar–planar single bonds (amide C–N, aryl–vinyl) only move when they actually clash: the
    // zero-penalty default below keeps conjugated systems coplanar otherwise.
    const sb = sideOf(bd.a, bd.b), sa = sideOf(bd.b, bd.a);
    if (!sb || !sa) continue;
    rotatable.push(sb.size <= sa.size ? { pivot: bd.a, moving: bd.b, set: sb } : { pivot: bd.b, moving: bd.a, set: sa });
  }
  const penalty = (movers, others, pivot, moving) => {
    const nbrPivot = new Set(adj.get(pivot).map((n) => n.id)), nbrMoving = new Set(adj.get(moving).map((n) => n.id));
    let pen = 0;
    for (const i of movers) {
      const pi = positions.get(i), hi = atoms.get(i).el === 'H';
      for (const j of others) {
        if (j === pivot && (i === moving || nbrMoving.has(i))) continue;
        if (i === moving && nbrPivot.has(j)) continue;
        const hj = atoms.get(j).el === 'H';
        const rmin = hi && hj ? 2.2 : hi || hj ? 2.6 : 3.0;
        const d = v.dist(pi, positions.get(j));
        if (d < rmin) pen += (rmin - d) * (rmin - d);
      }
    }
    return pen;
  };
  const rotateSide = (movers, origin, R, original) => { for (const id of movers) positions.set(id, v.add(origin, m3.apply(R, v.sub(original.get(id), origin)))); };
  for (let pass = 0; pass < passes; pass++) {
    for (const { pivot, moving, set } of rotatable) {
      const movers = [...set], others = ids.filter((id) => !set.has(id));
      const origin = positions.get(pivot);
      const axis = v.norm(v.sub(positions.get(moving), origin));
      const original = new Map(movers.map((id) => [id, positions.get(id)]));
      let best = 0, bestPen = penalty(movers, others, pivot, moving);
      if (bestPen < 1e-9) continue;
      for (let k = 1; k < steps; k++) {
        rotateSide(movers, origin, m3.axisAngle(axis, (2 * Math.PI * k) / steps), original);
        const pen = penalty(movers, others, pivot, moving);
        if (pen < bestPen - 1e-9) { bestPen = pen; best = k; }
      }
      const R = m3.axisAngle(axis, (2 * Math.PI * best) / steps);
      rotateSide(movers, origin, R, original);
      for (const id of movers) {
        if (lonePairDirs.has(id)) lonePairDirs.set(id, lonePairDirs.get(id).map((d) => m3.apply(R, d)));
        const o = orbitals.get(id);
        if (o) orbitals.set(id, { ...o, dirs: o.dirs.map((d) => m3.apply(R, d)) });
      }
    }
  }
}

/** Translate positions so the centroid is at the origin and the longest axis lies along x. */
export function alignPrincipal(positions) {
  const ids = [...positions.keys()];
  const pts = ids.map((id) => positions.get(id));
  const c = v.centroid(pts);
  let best = [0, 1], bd = -1;
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    const d = v.dist(pts[i], pts[j]);
    if (d > bd) { bd = d; best = [i, j]; }
  }
  let R = m3.identity();
  if (pts.length > 1 && bd > 1e-6) {
    const axis = v.norm(v.sub(pts[best[1]], pts[best[0]]));
    R = m3.fromTo(axis, [1, 0, 0]);
    const rotated = pts.map((p) => m3.apply(R, v.sub(p, c)));
    let far = null, fd = -1;
    for (const p of rotated) { const d = Math.hypot(p[1], p[2]); if (d > fd) { fd = d; far = p; } }
    if (far && fd > 1e-6) {
      const ang = Math.atan2(far[2], far[1]);
      R = m3.mul(m3.axisAngle([1, 0, 0], -ang), R);
    }
  }
  const out = new Map();
  ids.forEach((id, i) => out.set(id, m3.apply(R, v.sub(pts[i], c))));
  return { positions: out, rotation: R, center: c };
}

/** Apply a rotation matrix to every vector in a Map<id, vec[]> or Map<id, {dirs}>. */
export function rotateDirs(map, R) {
  const out = new Map();
  for (const [id, val] of map) {
    if (Array.isArray(val)) out.set(id, val.map((d) => m3.apply(R, d)));
    else out.set(id, { ...val, dirs: val.dirs.map((d) => m3.apply(R, d)) });
  }
  return out;
}

export const smoothstep = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
/** Map t in [t0, t1] to [0, 1] with smoothstep easing. */
export const segment = (t, t0, t1) => smoothstep((t - t0) / (t1 - t0));
/** Vector at polar angle `theta` from `axis`, azimuth `phi` about it (measured from `ref`), length r. */
export function polar(axis, theta, phi, r, ref) {
  const u = v.norm(axis);
  const e1 = ref ? v.norm(v.perp(ref, u)) : v.anyPerp(u);
  const e2 = v.cross(u, e1);
  const s = Math.sin(theta);
  return v.scale(v.add(v.scale(u, Math.cos(theta)), v.add(v.scale(e1, s * Math.cos(phi)), v.scale(e2, s * Math.sin(phi)))), r);
}

// ---- Coordination complexes -------------------------------------------------------------------
/**
 * Build a render frame for an MLn complex with explicit ligand ids, ready for MoleculeView.setFrame().
 * opts: {
 *   metal = 'Fe', id = 'M', charge = 0, label?, center = [0, 0, 0],
 *   geometry = 'octahedral' | 'squarePlanar' | 'tetrahedral' | 'tbp' | 'trigonal' | 'linear',
 *   ligands: ['N1', 'N2', …] or [{ id, el = 'N', length?, charge?, lonePairs?, label? }],   // ligand i → slot i
 *   bondLength?: number   // default per ligand: bondLength(metal, el) from elements.js
 * }
 * Octahedral slots: 0/1 along ±z (axial), 2/3 along ±x, 4/5 along ±y, so (0,1), (2,3), (4,5) are trans pairs.
 * Returns { atoms, bonds, aliases: {}, geometry, slots } in the frame format of builder.js/toFrame.
 */
export function complexFrame({ metal = 'Fe', id = 'M', charge = 0, label = null, center = [0, 0, 0], geometry = 'octahedral', ligands = [], bondLength: fixedLength } = {}) {
  const tmpl = TEMPLATES[geometry];
  if (!tmpl) throw new Error(`complexFrame(): unknown geometry ${geometry}; expected one of ${GEOMETRY_KINDS.join(', ')}`);
  if (ligands.length > tmpl.length) throw new Error(`complexFrame(): ${geometry} has ${tmpl.length} sites, got ${ligands.length} ligands`);
  const atom = (a) => ({ id: a.id, el: a.el, charge: a.charge || 0, lonePairs: a.lonePairs || 0, pos: a.pos, lonePairDirs: [], orbital: null, ghost: false, label: a.label || null, aromatic: false });
  const atoms = [atom({ id, el: metal, charge, label, pos: [center[0], center[1], center[2]] })];
  const bonds = [];
  const slots = {};
  ligands.forEach((lig, i) => {
    const L = typeof lig === 'string' ? { id: lig } : lig;
    const el = L.el || 'N';
    const len = L.length ?? fixedLength ?? bondLength(metal, el, 1);
    const pos = v.add(center, v.scale(tmpl[i], len));
    atoms.push(atom({ ...L, el, pos }));
    bonds.push({ a: id, b: L.id, order: 1, partial: 1, aromatic: false, ring: null, ghost: false, piOnly: false });
    slots[L.id] = i;
  });
  return { atoms, bonds, aliases: {}, geometry, slots };
}
