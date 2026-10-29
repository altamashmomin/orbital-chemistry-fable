// Dependency-free 3D vector helpers and a small molecular geometry embedder.
// Coordinates are plain [x, y, z] arrays (Å) so this module runs in Node tests
// and in the browser; the renderer converts to THREE.Vector3.
import { bondLength } from './elements.js';
import { LONE_PAIR_ANGLES, LONE_PAIR_COMPRESSION_PER_PAIR } from './references/textbook.js';

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

/** Number of lone pairs that occupy directional slots (a p-orbital lone pair on an sp² atom does not). */
export function directionalLonePairs(atom) {
  const lp = atom.lonePairs || 0;
  if (atom.hyb === 'sp2' && atom.pOrbital === 'lonePair') return Math.max(0, lp - 1);
  return lp;
}

/**
 * Slot indices lone pairs should occupy, chosen from the free slots of a template.
 * tbp: equatorial (slots 2–4) before axial; octahedral: a trans pair whenever two or more lone pairs
 * are present, otherwise the last free slot; every other kind: the last free slots (the slots
 * substituents would not have taken anyway, so existing molecules embed exactly as before).
 */
export function lonePairSlots(kind, free, n) {
  if (!(n > 0) || !free.length) return [];
  const out = [];
  const take = (i) => { if (out.length < n && free.includes(i) && !out.includes(i)) out.push(i); };
  if (kind === 'tbp') [4, 3, 2, 1, 0].forEach(take);
  else if (kind === 'octahedral') {
    if (n >= 2) for (const [a, b] of [[5, 4], [3, 2], [1, 0]]) if (out.length + 1 < n && free.includes(a) && free.includes(b)) { take(a); take(b); }
    [5, 4, 3, 2, 1, 0].forEach(take);
  } else [...free].reverse().forEach(take);
  return out;
}

/** VSEPR vocabulary: molecular shape from the numbers of bonded atoms and lone pairs on a centre. */
const SHAPES = {
  '1,0': 'linear', '2,0': 'linear', '3,0': 'trigonal planar', '2,1': 'bent', '4,0': 'tetrahedral', '3,1': 'trigonal pyramidal', '2,2': 'bent',
  '5,0': 'trigonal bipyramidal', '4,1': 'seesaw', '3,2': 'T-shaped', '2,3': 'linear',
  '6,0': 'octahedral', '5,1': 'square pyramidal', '4,2': 'square planar', '3,3': 'T-shaped', '2,4': 'linear',
};
const SHAPE_ANGLES = { linear: [180], 'trigonal planar': [120], bent: [], tetrahedral: [109.5], 'trigonal pyramidal': [109.5], 'trigonal bipyramidal': [90, 120, 180], seesaw: [90, 120, 180], 'T-shaped': [90, 180], octahedral: [90, 180], 'square pyramidal': [90, 180], 'square planar': [90, 180] };
export function vseprShape(nBonds, nLonePairs = 0) {
  const steric = nBonds + nLonePairs;
  const kind = geometryKind({ lonePairs: nLonePairs }, nBonds);
  const shape = SHAPES[`${nBonds},${nLonePairs}`] || (steric === 3 ? 'bent' : steric === 4 ? 'bent' : 'irregular');
  const angles = shape === 'bent' ? (steric === 3 ? [120] : [109.5]) : SHAPE_ANGLES[shape] || [];
  return { steric, kind, shape, angles };
}

// ---- Lone-pair angle compression (roadmap Phase 0e) ---------------------------------------------
const clamp1 = (x) => Math.max(-1, Math.min(1, x));

/**
 * Angle targets for a centre with lone pairs, looked up in LONE_PAIR_ANGLES (references/textbook.js) by
 * element, number of bonded atoms, the atom's lone-pair count, its p-orbital lone pair (`:sp2`) and,
 * when listed, the sorted neighbour elements. Returns
 *   { targets, key, basis, exemplar, ref, appliesTo }  with basis 'exemplar' (the row names the measured
 *     molecule for this centre) or 'class' (an element-level default row, `classDefault: true`, standing in),
 *     targets keyed by slot-class pair ('bond-bond' for bent and pyramidal centres; 'axial-axial',
 *     'equatorial-equatorial', 'basal-apical' for trigonal-bipyramidal and octahedral ones), or
 *   { targets: null, basis: 'fallback', perPair }  when no row exists: every bonded angle closes by
 *     LONE_PAIR_COMPRESSION_PER_PAIR degrees per lone pair.
 * `atom` is the graph atom ({ el, lonePairs, hyb, pOrbital }); `neighbourEls` its bonded elements.
 */
export function lonePairAngleTargets(atom, neighbourEls = []) {
  const planar = atom.pOrbital === 'lonePair' && atom.hyb ? `:${atom.hyb}` : '';
  const base = `${atom.el}/${neighbourEls.length}/${atom.lonePairs || 0}${planar}`;
  const sig = [...neighbourEls].sort().join(',');
  const key = sig && LONE_PAIR_ANGLES[`${base}/${sig}`] ? `${base}/${sig}` : LONE_PAIR_ANGLES[base] ? base : null;
  if (!key) return { targets: null, key: null, basis: 'fallback', perPair: LONE_PAIR_COMPRESSION_PER_PAIR, exemplar: null, ref: null, appliesTo: `${LONE_PAIR_COMPRESSION_PER_PAIR}° per lone pair` };
  const row = LONE_PAIR_ANGLES[key];
  const basis = row.classDefault ? 'class' : 'exemplar';
  if (row.classes) {
    const targets = {}, refs = {};
    for (const [k, c] of Object.entries(row.classes)) { targets[k] = c.angle; refs[k] = c.ref; }
    return { targets, key, basis, exemplar: row.exemplar, ref: refs, appliesTo: row.appliesTo || null };
  }
  return { targets: { 'bond-bond': row.angle }, key, basis, exemplar: row.exemplar, ref: row.ref, appliesTo: row.appliesTo || null };
}

/**
 * Move a centre's bonded slot directions toward the axis its lone pairs point away from
 * (c = −Σ lone-pair directions) until the bonded angles meet `targets`, and open the lone pairs by
 * the mean compression. Bonded slots are grouped into classes by their angle to c: one class for bent
 * and pyramidal centres, axial / equatorial in a trigonal bipyramid, apical / basal in an octahedron.
 * A class target is the angle between two of its bonds ('X-X') or its angle to the bond lying on the
 * axis ('X-apex'); without targets every class closes by `perPair` degrees per lone pair (a class with
 * an apical bond closes its angle to it). Symmetric by construction, so a centre is compressed the
 * same way whichever neighbour was placed first. Returns the new slot array, or null when nothing can
 * move: no lone pairs, fewer than two bonds, or lone pairs that cancel (XeF₄, trans lone pairs).
 */
export function compressLonePairSlots(kind, slots, bonded, lonePairs, targets = null, perPair = LONE_PAIR_COMPRESSION_PER_PAIR) {
  if (!lonePairs.length || bonded.length < 2) return null;
  let lpSum = [0, 0, 0];
  for (const k of lonePairs) lpSum = v.add(lpSum, slots[k]);
  if (v.len(lpSum) < 1e-6) return null;
  const c = v.norm(v.neg(lpSum));
  const e1 = v.anyPerp(c), e2 = v.cross(c, e1);
  const ON_AXIS = 1e-6;
  const className = (k, theta) => (kind === 'tbp' ? (k < 2 ? 'axial' : 'equatorial') : kind === 'octahedral' || kind === 'squarePlanar' ? (theta < ON_AXIS ? 'apical' : 'basal') : 'bond');
  const classes = new Map();
  for (const k of bonded) {
    const d = slots[k];
    const theta = Math.acos(clamp1(v.dot(d, c))), phi = Math.atan2(v.dot(d, e2), v.dot(d, e1));
    const name = className(k, theta);
    if (!classes.has(name)) classes.set(name, { name, members: [] });
    classes.get(name).members.push({ k, theta, phi });
  }
  for (const cl of classes.values()) cl.theta = cl.members.reduce((sum, m) => sum + m.theta, 0) / cl.members.length;
  const apex = [...classes.values()].find((cl) => cl.theta < ON_AXIS) || null;
  // Smallest angle between two bonds of a class when all of them sit at polar angle theta from c.
  const pairAngle = (cl, theta) => {
    let best = Infinity;
    for (let i = 0; i < cl.members.length; i++) for (let j = i + 1; j < cl.members.length; j++) {
      const a = Math.acos(clamp1(Math.cos(theta) ** 2 + Math.sin(theta) ** 2 * Math.cos(cl.members[i].phi - cl.members[j].phi)));
      if (a < best) best = a;
    }
    return best;
  };
  const thetaFor = (cl, alpha) => { // pairAngle grows monotonically with theta on [0, π/2]: bisect
    let lo = 0, hi = Math.PI / 2;
    for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (pairAngle(cl, mid) < alpha) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  };
  const moved = new Map();
  for (const cl of classes.values()) {
    if (cl.theta < ON_AXIS) continue;
    const pairKey = `${cl.name}-${cl.name}`, apexKey = apex ? `${cl.name}-${apex.name}` : null;
    let theta = null;
    if (targets) {
      if (targets[pairKey] !== undefined && cl.members.length >= 2) theta = thetaFor(cl, targets[pairKey] * DEG);
      else if (apexKey && targets[apexKey] !== undefined) theta = targets[apexKey] * DEG;
    } else {
      const d = perPair * lonePairs.length * DEG;
      theta = apex ? Math.max(0, cl.theta - d) : cl.members.length >= 2 ? thetaFor(cl, pairAngle(cl, cl.theta) - d) : null;
    }
    if (theta !== null) moved.set(cl.name, theta);
  }
  if (!moved.size) return null;
  const out = slots.map((d) => [...d]);
  let dSum = 0, dCount = 0;
  for (const cl of classes.values()) {
    if (!moved.has(cl.name)) continue;
    const theta = moved.get(cl.name);
    for (const m of cl.members) {
      const e = v.norm(v.perp(slots[m.k], c));
      out[m.k] = v.add(v.scale(c, Math.cos(theta)), v.scale(e, Math.sin(theta)));
      dSum += m.theta - theta; dCount++;
    }
  }
  const open = dSum / dCount;
  for (const k of lonePairs) {
    const l = slots[k];
    const psi = Math.acos(clamp1(-v.dot(l, c)));
    if (psi < ON_AXIS) continue;   // a lone pair on the axis (NH₃, SF₄, BrF₅) stays there
    const e = v.norm(v.perp(l, c));
    const psi2 = Math.max(0, Math.min(89 * DEG, psi + open));
    out[k] = v.add(v.scale(c, -Math.cos(psi2)), v.scale(e, Math.sin(psi2)));
  }
  return out;
}

/** Rotate compressed slots so slot i0 keeps its direction and the torsion reference slot keeps its azimuth about it. */
function realignSlots(kind, prev, next, i0) {
  const u = prev[i0], u2 = next[i0];
  const usable = (k) => k !== i0 && v.len(v.perp(prev[k], u)) > 1e-6 && v.len(v.perp(next[k], u2)) > 1e-6;
  let r = TORSION_REF[kind] ?? 1;
  if (!usable(r)) r = prev.findIndex((_, k) => usable(k));
  if (r < 0) { const R = m3.fromTo(u2, u); return next.map((d) => m3.apply(R, d)); }
  const e1 = v.norm(v.perp(prev[r], u)), f1 = v.norm(v.perp(next[r], u2));
  const R = m3.mul(m3.fromColumns(u, e1, v.cross(u, e1)), m3.transpose(m3.fromColumns(u2, f1, v.cross(u2, f1))));
  return next.map((d) => m3.apply(R, d));
}

function buildAdjacency(graph) {
  const adj = new Map();
  for (const a of graph.atoms) adj.set(a.id, []);
  for (const b of graph.bonds) {
    adj.get(b.a).push({ id: b.b, order: b.order || 1, length: b.length });
    adj.get(b.b).push({ id: b.a, order: b.order || 1, length: b.length });
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
 * graph: { atoms: [{id, el, lonePairs?, hyb?, pOrbital?, charge?}], bonds: [{a, b, order?, length?}], rigid?: [...] }
 * A bond's `length` (Å) overrides the element/order table (bondLength) for that bond.
 * opts:  { pinned: {id: [x,y,z]}, hints: {id: [x,y,z]}, root?: id, lonePairAngles = true }
 * Returns { positions: Map, lonePairDirs: Map<id, dir[]>, orbitals: Map<id, {kind, dirs}>, frames: Map }
 * frames.get(id) = { kind, slots, normal, slotOf, compression }: `compression` is the LONE_PAIR_ANGLES
 * lookup applied at that centre (null when its slots are ideal); `lonePairAngles: false` keeps every
 * centre at the ideal slot angles.
 */
export function embed(graph, opts = {}) {
  const { pinned = {}, hints = {}, root, lonePairAngles = true } = opts;
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
    // Lone pairs reserve their preferred slots first (equatorial in tbp, trans pairs in octahedral),
    // so SF4 is a seesaw, ClF3 T-shaped, BrF5 square pyramidal and XeF4 square planar.
    const lpSlots = lonePairSlots(kind, slots.map((_, k) => k).filter((k) => !used.has(k)), directionalLonePairs(a));
    for (const k of lpSlots) used.add(k);
    // Biggest substituent takes the anti slot, except on alkene-like atoms where definition order is kept.
    const ordered = isAlkeneLike(id) ? unplacedN : [...unplacedN].sort((x, y) => bulk(y.id, id) - bulk(x.id, id));
    const refNeighbor = placedN[0];
    const refVec = refNeighbor
      ? (() => { const q = pickRef(refNeighbor.id, id); return q ? v.sub(pos.get(q.id), pos.get(refNeighbor.id)) : null; })()
      : null;
    const assigned = [];
    for (const n of ordered) {
      let i = slots.findIndex((_, k) => !used.has(k));
      if (i < 0 && lpSlots.length) i = lpSlots.pop();   // more neighbours than slots: a lone pair gives way
      if (i < 0) i = slots.length - 1;
      used.add(i);
      slotOf[n.id] = i;
      assigned.push([n, i]);
    }
    // Lone-pair angle compression (Phase 0e): a centre that places at least one neighbour and keeps
    // lone pairs in directional slots gets the measured bonded angles (LONE_PAIR_ANGLES, or the per-pair
    // fallback), re-aligned so the first placed neighbour and the torsion stay where the ideal frame put
    // them. A centre whose neighbours are all pinned (mechanism frames) keeps its ideal slots.
    let dirs = slots, compression = null;
    if (lonePairAngles && lpSlots.length && assigned.length) {
      const lookup = lonePairAngleTargets(a, nbrs.map((n) => atoms.get(n.id).el));
      const next = compressLonePairSlots(kind, slots, Object.values(slotOf), lpSlots, lookup.targets, lookup.perPair);
      if (next) { dirs = realignSlots(kind, slots, next, placedN.length ? slotOf[placedN[0].id] : 0); compression = lookup; }
    }
    for (const [n, i] of assigned) {
      const nb = atoms.get(n.id);
      const L = n.length ?? bondLength(a.el, nb.el, n.order);   // a bond may carry its own measured length (conjugated C–N, C–O, N–O)
      const target = v.add(p, v.scale(dirs[i], L));
      const g = rigidOf.get(n.id);
      if (g && !placedRigid.has(g)) {
        const ref = placedN.length ? v.sub(pos.get(placedN[0].id), p) : refVec;
        placeRigid(g, n.id, target, dirs[i], kind, ref, pos);
        placedRigid.add(g);
        for (const x of g.atoms) queue.push(x);
      } else {
        pos.set(n.id, target);
        queue.push(n.id);
      }
    }
    lonePairDirs.set(id, lpSlots.map((k) => dirs[k]));
    let normal = null;
    if (kind === 'trigonal' || kind === 'linear' || kind === 'squarePlanar') {
      const s0 = dirs[0], s1 = kind === 'squarePlanar' ? dirs[2] : dirs[1] || v.anyPerp(s0);
      normal = v.norm(v.cross(s0, s1));
      if (v.len(normal) < 1e-6) normal = v.anyPerp(s0);
    }
    frames.set(id, { kind, slots: dirs, normal, slotOf, compression });
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
export function relaxTorsions(graph, positions, lonePairDirs, orbitals, frames, { steps = 12, passes = 2, rescue = true } = {}) {
  const adj = buildAdjacency(graph);
  const atoms = new Map(graph.atoms.map((a) => [a.id, a]));
  const rigidOf = new Map();
  for (const g of graph.rigid || []) for (const id of g.atoms) rigidOf.set(id, g);
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
    if (rigidOf.has(bd.a) && rigidOf.get(bd.a) === rigidOf.get(bd.b)) continue;   // inside one template; a bond between two templates (ring–aryl) may turn
    if (adj.get(bd.a).length < 2 || adj.get(bd.b).length < 2) continue;
    // Planar–planar single bonds (amide C–N, aryl–vinyl) only move when they actually clash: the
    // zero-penalty default below keeps conjugated systems coplanar otherwise.
    const sb = sideOf(bd.a, bd.b), sa = sideOf(bd.b, bd.a);
    if (!sb || !sa) continue;
    const planarKinds = ['trigonal', 'linear', 'squarePlanar'];
    const conjugated = planarKinds.includes(frames.get(bd.a)?.kind) && planarKinds.includes(frames.get(bd.b)?.kind);
    rotatable.push(sb.size <= sa.size ? { pivot: bd.a, moving: bd.b, set: sb, conjugated } : { pivot: bd.b, moving: bd.a, set: sa, conjugated });
  }
  // Soft thresholds express the staggered preference of sp3 bonds; hard thresholds are true clashes.
  // Conjugated (planar–planar) bonds such as ester C–O or amide C–N stay planar unless a HARD clash
  // exists, because syn O···H contacts of 2.3–2.5 Å in Z-esters and syn acids are normal.
  const RMIN = { soft: [2.2, 2.6, 3.0], hard: [1.8, 2.0, 2.5] };
  const penalty = (movers, others, pivot, moving, mode = 'soft') => {
    const nbrPivot = new Set(adj.get(pivot).map((n) => n.id)), nbrMoving = new Set(adj.get(moving).map((n) => n.id));
    let pen = 0;
    for (const i of movers) {
      const pi = positions.get(i), hi = atoms.get(i).el === 'H';
      for (const j of others) {
        if (j === pivot && (i === moving || nbrMoving.has(i))) continue;
        if (i === moving && nbrPivot.has(j)) continue;
        const hj = atoms.get(j).el === 'H';
        const [hh, hx, xx] = RMIN[mode];
        const rmin = hi && hj ? hh : hi || hj ? hx : xx;
        const d = v.dist(pi, positions.get(j));
        if (d < rmin) pen += (rmin - d) * (rmin - d);
      }
    }
    return pen;
  };
  const rotateSide = (movers, origin, R, original) => { for (const id of movers) positions.set(id, v.add(origin, m3.apply(R, v.sub(original.get(id), origin)))); };
  for (let pass = 0; pass < passes; pass++) {
    for (const { pivot, moving, set, conjugated } of rotatable) {
      const mode = conjugated ? 'hard' : 'soft';
      const movers = [...set], others = ids.filter((id) => !set.has(id));
      const origin = positions.get(pivot);
      const axis = v.norm(v.sub(positions.get(moving), origin));
      const original = new Map(movers.map((id) => [id, positions.get(id)]));
      let best = 0, bestPen = penalty(movers, others, pivot, moving, mode);
      if (bestPen < 1e-9) continue;
      for (let k = 1; k < steps; k++) {
        rotateSide(movers, origin, m3.axisAngle(axis, (2 * Math.PI * k) / steps), original);
        const pen = penalty(movers, others, pivot, moving, mode);
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
  if (rescue && rotatable.length) rescueClashes(graph, positions, lonePairDirs, orbitals, rotatable, adj);
}

/** Hard contact limits in Å (H···H, H···X, X···X) below which two non-bonded atoms overlap rather than touch. */
export const HARD_CONTACT = [1.8, 2.0, 2.5];

/**
 * Non-bonded, non-1,3 atom pairs closer than the hard contact limits: what the torsion relaxer could not
 * resolve. Returns null when there is none, else { pairs: [{ a, b, d, limit }] (worst first), worst }.
 */
export function stericContacts(graph, positions, limits = HARD_CONTACT) {
  const adj = buildAdjacency(graph);
  const atoms = new Map(graph.atoms.map((a) => [a.id, a]));
  const nbr = new Map(graph.atoms.map((a) => [a.id, new Set(adj.get(a.id).map((n) => n.id))]));
  const related = (x, y) => { if (nbr.get(x).has(y)) return true; for (const n of nbr.get(x)) if (nbr.get(n).has(y)) return true; return false; };
  const ids = graph.atoms.filter((a) => !a.ghost && positions.has(a.id)).map((a) => a.id);
  const pairs = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const a = ids[i], b = ids[j];
    if (related(a, b)) continue;
    const ha = atoms.get(a).el === 'H', hb = atoms.get(b).el === 'H';
    const limit = ha && hb ? limits[0] : ha || hb ? limits[1] : limits[2];
    const d = v.dist(positions.get(a), positions.get(b));
    if (d < limit) pairs.push({ a, b, d, limit });
  }
  if (!pairs.length) return null;
  pairs.sort((x, y) => (x.d - x.limit) - (y.d - y.limit));
  return { pairs, worst: pairs[0] };
}

/**
 * Rescue stage of relaxTorsions for crowded substituents: while hard contacts remain, take the worst
 * pair, pick the one or two rotatable bonds nearest each of its atoms that move one atom relative to the
 * other, and search those bonds jointly (30° grid, then 5° around the best), keeping a setting only when
 * it lowers the total hard-contact penalty. Clash-free molecules never enter this stage, so their
 * geometry is unchanged. Angles are never widened: what survives is reported by stericContacts().
 */
function rescueClashes(graph, positions, lonePairDirs, orbitals, rotatable, adj, { coarse = 12, fineStep = 5 * DEG, rounds = 4 } = {}) {
  const atoms = new Map(graph.atoms.map((a) => [a.id, a]));
  const ids = graph.atoms.filter((a) => !a.ghost && positions.has(a.id)).map((a) => a.id);
  const nbr = new Map(ids.map((id) => [id, new Set((adj.get(id) || []).map((n) => n.id))]));
  const related = (x, y) => { if (nbr.get(x).has(y)) return true; for (const n of nbr.get(x)) if (nbr.get(n)?.has(y)) return true; return false; };
  const allPairs = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const a = ids[i], b = ids[j];
    if (related(a, b)) continue;
    const ha = atoms.get(a).el === 'H', hb = atoms.get(b).el === 'H';
    allPairs.push({ a, b, limit: ha && hb ? HARD_CONTACT[0] : ha || hb ? HARD_CONTACT[1] : HARD_CONTACT[2] });
  }
  // Objective: the deepest overlap first (what a viewer sees and the notice reports), total overlap as tie-break.
  const overlap = (pairs) => { let worst = 0, sum = 0; for (const p of pairs) { const d = v.dist(positions.get(p.a), positions.get(p.b)); if (d < p.limit) { const x = p.limit - d; sum += x * x; if (x > worst) worst = x; } } return { worst, sum }; };
  const score = (...parts) => parts.reduce((w, o) => Math.max(w, o.worst), 0) * 1000 + parts.reduce((s, o) => s + o.sum, 0);
  const penaltyOver = (pairs) => score(overlap(pairs));
  const worstPair = () => { let w = null, wd = 0; for (const p of allPairs) { const d = v.dist(positions.get(p.a), positions.get(p.b)); const x = p.limit - d; if (x > wd) { wd = x; w = p; } } return w; };
  const snapshot = () => new Map(ids.map((id) => [id, positions.get(id)]));
  const restore = (snap) => { for (const [id, p] of snap) positions.set(id, p); };
  const turn = (bond, ang) => {
    const origin = positions.get(bond.pivot);
    const axis = v.norm(v.sub(positions.get(bond.moving), origin));
    const R = m3.axisAngle(axis, ang);
    for (const id of bond.set) positions.set(id, v.add(origin, m3.apply(R, v.sub(positions.get(id), origin))));
    return R;
  };
  const tried = new Set();
  for (let round = 0; round < rounds; round++) {
    const worst = worstPair();
    if (!worst || tried.has(`${worst.a}|${worst.b}`)) break;
    tried.add(`${worst.a}|${worst.b}`);
    const movesOne = (b) => b.set.has(worst.a) !== b.set.has(worst.b);
    const nearest = (x) => rotatable.filter((b) => b.set.has(x) && movesOne(b)).sort((p, q) => p.set.size - q.set.size).slice(0, 2);
    const cands = [...new Set([...nearest(worst.a), ...nearest(worst.b)])];
    if (!cands.length) continue;
    const combos = cands.length === 1 ? [[cands[0]]] : [];
    for (let i = 0; i < cands.length; i++) for (let j = i + 1; j < cands.length; j++) combos.push([cands[i], cands[j]]);
    const start = snapshot();
    let best = { pen: penaltyOver(allPairs), plan: null };
    for (const combo of combos) {
      const union = new Set(combo.flatMap((b) => [...b.set]));
      const relevant = allPairs.filter((p) => union.has(p.a) || union.has(p.b));
      const fixed = overlap(allPairs.filter((p) => !(union.has(p.a) || union.has(p.b))));   // pairs this combo cannot change
      const evaluate = (angles) => { restore(start); combo.forEach((b, k) => turn(b, angles[k])); return score(overlap(relevant), fixed); };
      const n = combo.length === 1 ? coarse * 2 : coarse, step = (2 * Math.PI) / n;
      let local = { pen: Infinity, angles: null };
      for (let kA = 0; kA < n; kA++) for (let kB = 0; kB < (combo[1] ? n : 1); kB++) {
        if (kA === 0 && kB === 0) continue;
        const angles = combo[1] ? [kA * step, kB * step] : [kA * step];
        const pen = evaluate(angles);
        if (pen < local.pen) local = { pen, angles };
      }
      if (local.angles) {   // refine around the coarse optimum
        const m = Math.round(step / 2 / fineStep);
        for (let dA = -m; dA <= m; dA++) for (let dB = -m; dB <= (combo[1] ? m : -m); dB++) {
          const angles = combo[1] ? [local.angles[0] + dA * fineStep, local.angles[1] + dB * fineStep] : [local.angles[0] + dA * fineStep];
          const pen = evaluate(angles);
          if (pen < local.pen - 1e-12) local = { pen, angles };
        }
      }
      if (local.pen < best.pen - 1e-9) best = { pen: local.pen, plan: combo.map((b, k) => [b, local.angles[k]]) };
    }
    restore(start);
    if (!best.plan) continue;
    for (const [bond, ang] of best.plan) {
      const R = turn(bond, ang);
      for (const id of bond.set) {
        if (lonePairDirs.has(id)) lonePairDirs.set(id, lonePairDirs.get(id).map((d) => m3.apply(R, d)));
        const o = orbitals.get(id);
        if (o) orbitals.set(id, { ...o, dirs: o.dirs.map((d) => m3.apply(R, d)) });
      }
    }
    if (best.pen < 1e-9) break;
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

/** Signed dihedral angle (radians) a–b–c–d: the torsion about b–c, in (−π, π]. */
export function dihedral(a, b, c, d) {
  const b1 = v.sub(b, a), b2 = v.sub(c, b), b3 = v.sub(d, c);
  const n1 = v.cross(b1, b2), n2 = v.cross(b2, b3);
  const m1 = v.cross(n1, v.norm(b2));
  return Math.atan2(v.dot(m1, n2), v.dot(n1, n2));
}

// ---- Mirror images ----------------------------------------------------------------------------
/**
 * Reflect through the plane with unit normal `normal` through `point` (default: the yz plane).
 * Accepts a vec3, an array of vec3, a Map<id, vec3>, a plain { id: vec3 } object, or a render
 * frame ({ atoms: [{ pos, lonePairDirs, orbital }] }) and returns the same kind of thing. Bond
 * lengths and angles are preserved; every stereocentre is inverted (R ↔ S).
 */
export function mirror(input, { normal = [1, 0, 0], point = [0, 0, 0] } = {}) {
  const n = v.norm(normal);
  const pt = (p) => { const d = v.dot(v.sub(p, point), n); return v.sub(p, v.scale(n, 2 * d)); };
  const dir = (d) => v.sub(d, v.scale(n, 2 * v.dot(d, n)));
  if (Array.isArray(input)) return input.length === 3 && typeof input[0] === 'number' ? pt(input) : input.map((p) => pt(p));
  if (input instanceof Map) { const out = new Map(); for (const [k, p] of input) out.set(k, pt(p)); return out; }
  if (input && Array.isArray(input.atoms)) {
    return {
      ...input,
      atoms: input.atoms.map((a) => ({ ...a, pos: pt(a.pos), lonePairDirs: (a.lonePairDirs || []).map(dir), orbital: a.orbital ? { ...a.orbital, dirs: a.orbital.dirs.map(dir) } : a.orbital })),
      bonds: (input.bonds || []).map((b) => ({ ...b })),
    };
  }
  if (input && typeof input === 'object') return Object.fromEntries(Object.entries(input).map(([k, p]) => [k, pt(p)]));
  throw new Error('mirror(): expected a vec3, an array, a Map, an object or a frame');
}

// ---- Cycloalkane ring templates -----------------------------------------------------------------
// Rigid templates in the format the embedder's `rigid` groups use (see rGroups.benzeneTemplate):
// ring carbons with exact closure, two substituent sites per carbon (axial / equatorial on the
// chair, pseudo-axial / pseudo-equatorial elsewhere, always up / down), hydrogens on every site
// not taken by a substituent. Coordinates are stored for C–C = 1.54 Å and scaled by `ccLength`.
const RING_L = 1.54;
const RING_COORDS = {
  cyclopropane: () => { const R = RING_L / Math.sqrt(3); return [0, 1, 2].map((k) => [R * Math.cos(k * 120 * DEG), R * Math.sin(k * 120 * DEG), 0]); },
  // Puckered square, fold angle ≈ 25°, C–C–C ≈ 88.6°.
  cyclobutane: () => { const d = 0.12, a = Math.sqrt((RING_L * RING_L - 4 * d * d) / 2); return [[a, 0, d], [0, a, -d], [-a, 0, d], [0, -a, -d]]; },
  // Envelope: C2–C5 coplanar, C1 is the flap; angles 101.7° (flap) and 106°.
  cyclopentane: () => [[1.219417, 0, 0.459566], [0.435317, 1.194482, -0.114891], [-1.045026, 0.77, -0.114891], [-1.045026, -0.77, -0.114891], [0.435317, -1.194482, -0.114891]],
  // Chair: carbons alternate ±0.25 Å about the mean plane (z), C–C–C = 110°.
  cyclohexaneChair: () => { const h = 0.25, r = Math.sqrt(RING_L * RING_L - 4 * h * h); return [0, 1, 2, 3, 4, 5].map((k) => [r * Math.cos(k * 60 * DEG), r * Math.sin(k * 60 * DEG), k % 2 ? -h : h]); },
  // Boat: C1 and C4 are the bow and stern (up), C2–C3 and C5–C6 lie in the plane, C–C–C = 111°.
  cyclohexaneBoat: () => [[1.321887, 0, 0.675476], [0.77, 1.269154, 0], [-0.77, 1.269154, 0], [-1.321887, 0, 0.675476], [-0.77, -1.269154, 0], [0.77, -1.269154, 0]],
};
export const RING_SHAPES = Object.keys(RING_COORDS);
const RING_LABELS = { cyclopropane: 'cyclopropane', cyclobutane: 'cyclobutane (puckered)', cyclopentane: 'cyclopentane (envelope)', cyclohexaneChair: 'cyclohexane (chair)', cyclohexaneBoat: 'cyclohexane (boat)' };
const SITE_KEYS = ['axial', 'equatorial', 'up', 'down'];

/**
 * Substituent sites on each ring carbon: the two directions that complete a (near-)tetrahedral
 * centre, symmetric about the local C–C–C plane, with H–C–H capped at 115° for small rings.
 * `axial` is the direction closer to the ring axis (z), `equatorial` the other; `up` has the
 * positive z component (cis substituents are both up or both down).
 */
function ringSites(coords) {
  const n = coords.length, sites = [];
  for (let k = 0; k < n; k++) {
    const c = coords[k], u1 = v.norm(v.sub(coords[(k + n - 1) % n], c)), u2 = v.norm(v.sub(coords[(k + 1) % n], c));
    const phi = Math.acos(Math.max(-1, Math.min(1, v.dot(u1, u2))));
    const alpha = Math.min(Math.acos(Math.min(1, (1 / 3) / Math.cos(phi / 2))), 57.5 * DEG);
    const b = v.norm(v.neg(v.add(u1, u2))), nrm = v.norm(v.cross(u1, u2));
    const d1 = v.add(v.scale(b, Math.cos(alpha)), v.scale(nrm, Math.sin(alpha)));
    const d2 = v.add(v.scale(b, Math.cos(alpha)), v.scale(nrm, -Math.sin(alpha)));
    const [up, down] = d1[2] >= d2[2] ? [d1, d2] : [d2, d1];
    const site = { up, down, dirs: [up, down] };
    if (Math.abs(Math.abs(up[2]) - Math.abs(down[2])) > 1e-6) { const axialIsUp = Math.abs(up[2]) > Math.abs(down[2]); site.axial = axialIsUp ? up : down; site.equatorial = axialIsUp ? down : up; }
    sites.push(site);
  }
  return sites;
}

/**
 * Build a cycloalkane fragment.
 * opts: {
 *   prefix = '',                 // id prefix (C1…Cn, H1up/H1dn or H1ax/H1eq)
 *   ccLength = 1.54, chLength = 1.09,
 *   substituents = { C1: { axial: 'Me' } | { up: { id: 'Cl', el: 'Cl', length? } } },  // replaces that site's H
 *   attachAt = null,             // 'C1' makes the fragment an R group: that carbon's `attachSite` H is dropped
 *   attachSite = null,           // 'equatorial' (default when defined) | 'axial' | 'up' | 'down'
 *   flip = false,                // mirror the ring through its mean plane (z → −z): the ring-flipped chair, so a
 *                                // carbon's 'up' site changes from axial to equatorial (or back)
 * }
 * Returns { shape, label, atoms, bonds, rigid: { atoms, coords, attach, attachDir, planeAxis }, ring, sites, attach, substituted }.
 */
export function ringTemplate(shape, { prefix = '', ccLength = RING_L, chLength = 1.09, substituents = {}, attachAt = null, attachSite = null, flip = false } = {}) {
  const make = RING_COORDS[shape];
  if (!make) throw new Error(`ringTemplate(): unknown ring shape ${shape}; expected one of ${RING_SHAPES.join(', ')}`);
  const coords0 = make().map((p) => v.scale(flip ? [p[0], p[1], -p[2]] : p, ccLength / RING_L));
  const n = coords0.length;
  const siteList = ringSites(coords0);
  const atoms = [], bonds = [], coords = {}, sites = {}, substituted = {};
  const ring = [];
  for (let k = 0; k < n; k++) { const id = `${prefix}C${k + 1}`; ring.push(id); atoms.push({ id, el: 'C' }); coords[id] = coords0[k]; sites[id] = siteList[k]; }
  for (let k = 0; k < n; k++) bonds.push({ a: ring[k], b: ring[(k + 1) % n], order: 1, ring });
  const siteName = (site, key) => (site.axial ? (site.axial === site[key] ? 'ax' : 'eq') : key === 'up' ? 'up' : 'dn');
  const resolve = (site, key) => { if (!SITE_KEYS.includes(key)) throw new Error(`ringTemplate(): unknown site ${key}`); const d = site[key]; if (!d) throw new Error(`ringTemplate(): ${shape} has no ${key} site`); return d; };
  const attachCarbon = attachAt ? `${prefix}${attachAt}` : null;
  if (attachAt && !sites[attachCarbon]) throw new Error(`ringTemplate(): no ring carbon ${attachAt}`);
  let attachDir = null, planeAxis = null;
  for (let k = 0; k < n; k++) {
    const cid = ring[k], site = sites[cid];
    const subs = substituents[`C${k + 1}`] || substituents[cid] || {};
    const taken = new Set();
    for (const [key, spec] of Object.entries(subs)) {
      const d = resolve(site, key);
      const S = typeof spec === 'string' ? { id: spec } : spec;
      const el = S.el || 'C';
      const len = S.length ?? bondLength('C', el, 1);
      const id = `${prefix}${S.id}`;
      atoms.push({ id, el, ...(S.atom || {}) });
      coords[id] = v.add(coords0[k], v.scale(d, len));
      bonds.push({ a: cid, b: id, order: 1 });
      substituted[id] = { carbon: cid, site: key, dir: d };
      for (const kk of SITE_KEYS) if (site[kk] === d) taken.add(kk);
    }
    if (cid === attachCarbon) {
      const key = attachSite || (site.equatorial ? 'equatorial' : 'up');
      const d = resolve(site, key);
      if ([...taken].some((kk) => site[kk] === d)) throw new Error(`ringTemplate(): ${attachAt} ${key} site is both the attachment and substituted`);
      attachDir = d; planeAxis = site.up === d ? site.down : site.up;
      for (const kk of SITE_KEYS) if (site[kk] === d) taken.add(kk);
    }
    for (const key of ['up', 'down']) {
      if (taken.has(key)) continue;
      const d = site[key];
      const hid = `${prefix}H${k + 1}${siteName(site, key)}`;
      atoms.push({ id: hid, el: 'H' });
      coords[hid] = v.add(coords0[k], v.scale(d, chLength));
      bonds.push({ a: cid, b: hid, order: 1 });
    }
  }
  const attach = attachCarbon || ring[0];
  if (!attachDir) { const site = sites[attach]; attachDir = site.equatorial || site.up; planeAxis = site.up === attachDir ? site.down : site.up; }
  return {
    shape, label: RING_LABELS[shape], atoms, bonds, ring, sites, attach, substituted,
    rigid: { atoms: atoms.map((a) => a.id), coords, attach, attachDir, planeAxis },
  };
}
