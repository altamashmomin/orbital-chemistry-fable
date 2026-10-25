// 2D overlays drawn from 3D coordinates: a Newman projection down a chosen bond and a textbook
// wedge/dash sketch. The projection math is pure (node-tested); drawNewman()/drawWedgeDash()
// paint the result on a <canvas> in the sage theme (tokens read from CSS custom properties).
import { v, DEG } from '../chem/geometry.js';
import { themeColors } from './levelDiagram.js';

const SUB = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
const subscript = (n) => String(n).split('').map((d) => SUB[+d]).join('');
/** Wrap an angle in degrees into (−180, 180]. */
export const norm180 = (a) => { const r = ((((a + 180) % 360) + 360) % 360) - 180; return r === -180 ? 180 : r; };

const atomMap = (frame) => new Map(frame.atoms.filter((a) => !a.ghost).map((a) => [a.id, a]));
const neighbours = (frame, id) => frame.bonds.filter((b) => !b.ghost && (b.a === id || b.b === id)).map((b) => ({ id: b.a === id ? b.b : b.a, order: b.order || 1, partial: b.partial ?? 1 }));

/** Right-handed screen basis for a viewer the molecule faces along `toward` (unit, molecule → viewer): right = up × toward. */
export function basisFacing(toward, upHint = null) {
  const t = v.norm(toward);
  let up = upHint ? v.perp(upHint, t) : null;
  if (!up || v.len(up) < 1e-6) up = v.anyPerp(t);
  up = v.norm(up);
  return { toward: t, up, right: v.norm(v.cross(up, t)) };
}

/** Principal axes of a point cloud (covariance eigenvectors, largest variance first) by cyclic Jacobi. */
export function principalAxes(points) {
  const center = v.centroid(points);
  const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const p of points) { const d = v.sub(p, center); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i][j] += d[i] * d[j]; }
  const A = C.map((r) => r.slice()), V = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let sweep = 0; sweep < 50; sweep++) {
    let off = 0;
    for (let p = 0; p < 3; p++) for (let q = p + 1; q < 3; q++) off += A[p][q] * A[p][q];
    if (off < 1e-22) break;
    for (let p = 0; p < 3; p++) for (let q = p + 1; q < 3; q++) {
      if (Math.abs(A[p][q]) < 1e-300) continue;
      const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < 3; k++) { const akp = A[k][p], akq = A[k][q]; A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq; }
      for (let k = 0; k < 3; k++) { const apk = A[p][k], aqk = A[q][k]; A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk; }
      for (let k = 0; k < 3; k++) { const vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; }
    }
  }
  const order = [0, 1, 2].sort((i, j) => A[j][j] - A[i][i]);
  const axes = order.map((i) => v.norm([V[0][i], V[1][i], V[2][i]]));
  // Keep the basis right-handed so axes[2] = axes[0] × axes[1].
  if (v.dot(v.cross(axes[0], axes[1]), axes[2]) < 0) axes[2] = v.neg(axes[2]);
  return { center, axes, values: order.map((i) => A[i][i]) };
}

/** Textbook group label for a substituent atom: H, CH₃, CH₂R, OH, NH₂, Br … (`labels` overrides by id). */
export function groupLabel(frame, id, { exclude = null, labels = {} } = {}) {
  if (labels[id]) return labels[id];
  const atoms = atomMap(frame);
  const a = atoms.get(id);
  if (!a) return id;
  if (a.el === 'H') return 'H';
  const nbrs = neighbours(frame, id).filter((n) => n.id !== exclude);
  const hs = nbrs.filter((n) => atoms.get(n.id)?.el === 'H').length;
  const heavy = nbrs.length - hs;
  const charge = a.charge ? (Math.abs(a.charge) >= 0.75 ? (a.charge > 0 ? '⁺' : '⁻') : '') : '';
  return `${a.el}${hs ? (hs > 1 ? `H${subscript(hs)}` : 'H') : ''}${heavy ? (heavy > 1 ? `R${subscript(heavy)}` : 'R') : ''}${charge}`;
}

/**
 * Newman projection down the front → back bond.
 * Returns { front, back, toward, up, right, substituents: { front: [{ id, el, x, y, r, angle }], back: [...] },
 *           dihedrals: [{ front, back, angle }], conformation: 'staggered' | 'eclipsed' | 'skew' | null, minDihedral }
 * x/y are projected Å in the screen basis (y up), angle in degrees from +x counter-clockwise;
 * dihedral(front sub, back sub) is the signed screen-angle difference, i.e. the torsion about the bond.
 */
export function newmanProjection(frame, frontId, backId, { up: upHint = null, hydrogens = true } = {}) {
  const atoms = atomMap(frame);
  const F = atoms.get(frontId), B = atoms.get(backId);
  if (!F || !B) throw new Error(`newmanProjection(): unknown atom ${!F ? frontId : backId}`);
  const toward = v.norm(v.sub(F.pos, B.pos));
  const keep = (n) => hydrogens || atoms.get(n.id)?.el !== 'H';
  const frontSubs = neighbours(frame, frontId).filter((n) => n.id !== backId && atoms.has(n.id) && keep(n));
  const backSubs = neighbours(frame, backId).filter((n) => n.id !== frontId && atoms.has(n.id) && keep(n));
  const hint = upHint || (frontSubs.length ? v.sub(atoms.get(frontSubs[0].id).pos, F.pos) : null);
  const { up, right } = basisFacing(toward, hint);
  const project = (centre, n) => { const d = v.sub(atoms.get(n.id).pos, centre); const x = v.dot(d, right), y = v.dot(d, up); return { id: n.id, el: atoms.get(n.id).el, order: n.order, partial: n.partial, x, y, r: Math.hypot(x, y), angle: Math.atan2(y, x) / DEG }; };
  const front = frontSubs.map((n) => project(F.pos, n)), back = backSubs.map((n) => project(B.pos, n));
  const dihedrals = [];
  for (const f of front) for (const b of back) dihedrals.push({ front: f.id, back: b.id, angle: norm180(b.angle - f.angle) });
  const minDihedral = dihedrals.length ? Math.min(...dihedrals.map((d) => Math.abs(d.angle))) : null;
  const conformation = minDihedral === null ? null : minDihedral < 15 ? 'eclipsed' : Math.abs(minDihedral - 60) < 15 ? 'staggered' : 'skew';
  return { front: { id: frontId, el: F.el, pos: F.pos }, back: { id: backId, el: B.el, pos: B.pos }, axis: v.neg(toward), toward, up, right, substituents: { front, back }, dihedrals, conformation, minDihedral };
}

/**
 * Wedge/dash sketch: project onto the plane facing `viewAxis` (molecule → viewer; default: the
 * normal of the heavy-atom principal plane, so the skeleton lies flat). Single bonds leaving the
 * plane by more than `threshold` × their length become 'wedge' (toward the viewer) or 'dash'
 * (away), narrow end (`from`) at the atom nearer the plane. Returns { atoms: [{ id, el, x, y, depth }],
 * bonds: [{ a, b, order, kind, from, to }], center, toward, up, right, bounds }.
 */
export function wedgeDashProjection(frame, { viewAxis = null, up: upHint = null, hydrogens = true, threshold = 0.3 } = {}) {
  const all = frame.atoms.filter((a) => !a.ghost);
  const atoms = all.filter((a) => hydrogens || a.el !== 'H');
  if (!atoms.length) return { atoms: [], bonds: [], center: [0, 0, 0], toward: [0, 0, 1], up: [0, 1, 0], right: [1, 0, 0], bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 } };
  const heavy = all.filter((a) => a.el !== 'H');
  const pa = principalAxes((heavy.length >= 3 ? heavy : all).map((a) => a.pos));
  const { toward, up, right } = basisFacing(viewAxis || pa.axes[2], upHint || pa.axes[1]);
  const center = pa.center;
  const proj = atoms.map((a) => { const d = v.sub(a.pos, center); return { id: a.id, el: a.el, charge: a.charge || 0, label: a.label || null, x: v.dot(d, right), y: v.dot(d, up), depth: v.dot(d, toward) }; });
  const map = new Map(proj.map((p) => [p.id, p]));
  const pos = new Map(atoms.map((a) => [a.id, a.pos]));
  const bonds = frame.bonds.filter((b) => !b.ghost && map.has(b.a) && map.has(b.b)).map((b) => {
    const A = map.get(b.a), Bq = map.get(b.b);
    const L = v.dist(pos.get(b.a), pos.get(b.b)) || 1;
    const dz = Bq.depth - A.depth;
    let kind = 'plain', from = b.a, to = b.b;
    if ((b.order || 1) === 1 && !b.aromatic && Math.abs(dz) / L > threshold) {
      const nearPlane = Math.abs(A.depth) <= Math.abs(Bq.depth) ? A : Bq, far = nearPlane === A ? Bq : A;
      from = nearPlane.id; to = far.id;
      kind = far.depth > nearPlane.depth ? 'wedge' : 'dash';
    }
    return { a: b.a, b: b.b, order: b.order || 1, partial: b.partial ?? 1, aromatic: !!b.aromatic, kind, from, to, length2d: Math.hypot(Bq.x - A.x, Bq.y - A.y) };
  });
  const xs = proj.map((p) => p.x), ys = proj.map((p) => p.y);
  return { atoms: proj, bonds, center, toward, up, right, bounds: { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) } };
}

// ---- canvas renderers -------------------------------------------------------------------------
function prepare(canvas, fallbackW = 280, fallbackH = 220) {
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const W = canvas.clientWidth || canvas.width / dpr || fallbackW, H = canvas.clientHeight || canvas.height / dpr || fallbackH;
  if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  return { ctx, W, H, T: themeColors(canvas), font: (px, weight = 400) => `${weight} ${px}px 'Helvetica Neue', -apple-system, system-ui, sans-serif` };
}

/**
 * Draw a Newman projection. opts: { up?, hydrogens?, labels?: { id: text }, title?: string | false }
 * Returns the projection used.
 */
export function drawNewman(canvas, frame, frontId, backId, opts = {}) {
  const P = newmanProjection(frame, frontId, backId, opts);
  const { ctx, W, H, T, font } = prepare(canvas);
  const cx = W / 2, cy = H / 2 - (opts.title === false ? 0 : 10);
  const R = Math.min(W, H) * (opts.title === false ? 0.24 : 0.21);
  const reach = R * 1.75, labelAt = R * 2.05;
  const lab = (id, exclude) => groupLabel(frame, id, { exclude, labels: opts.labels || {} });
  // back carbon = the circle; back bonds start at its rim
  ctx.lineCap = 'round';
  for (const s of P.substituents.back) {
    const a = s.angle * DEG, ux = Math.cos(a), uy = -Math.sin(a);
    ctx.strokeStyle = T.muted; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx + ux * R, cy + uy * R); ctx.lineTo(cx + ux * reach, cy + uy * reach); ctx.stroke();
    ctx.fillStyle = T.muted; ctx.font = font(12, 500); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(lab(s.id, backId), cx + ux * labelAt, cy + uy * labelAt);
  }
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI);
  ctx.fillStyle = T.panel; ctx.fill(); ctx.strokeStyle = T.line2; ctx.lineWidth = 1.5; ctx.stroke();
  // front carbon = the point; front bonds from the centre
  for (const s of P.substituents.front) {
    const a = s.angle * DEG, ux = Math.cos(a), uy = -Math.sin(a);
    ctx.strokeStyle = T.text; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + ux * reach, cy + uy * reach); ctx.stroke();
    ctx.fillStyle = T.text; ctx.font = font(12, 600); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(lab(s.id, frontId), cx + ux * labelAt, cy + uy * labelAt);
  }
  ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 2 * Math.PI); ctx.fillStyle = T.text; ctx.fill();
  if (opts.title !== false) {
    const title = opts.title ?? (P.conformation ? `${P.conformation}${P.minDihedral != null ? ` · ${Math.round(P.minDihedral)}°` : ''}` : '');
    if (title) { ctx.fillStyle = T.muted; ctx.font = font(11); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(`${lab(frontId, backId).replace(/R.*$/, '')}–${lab(backId, frontId).replace(/R.*$/, '')} bond, front to back · ${title}`, cx, H - 6); }
  }
  return P;
}

/**
 * Draw a wedge/dash sketch. opts: { viewAxis?, up?, hydrogens? (default true), threshold?, labelCarbons? (default false),
 * labels?: { id: text }, padding? } Returns the projection used (with screen coordinates added as sx/sy).
 */
export function drawWedgeDash(canvas, frame, opts = {}) {
  const P = wedgeDashProjection(frame, opts);
  const { ctx, W, H, T, font } = prepare(canvas);
  const pad = opts.padding ?? 26;
  const spanX = Math.max(P.bounds.maxX - P.bounds.minX, 1e-6), spanY = Math.max(P.bounds.maxY - P.bounds.minY, 1e-6);
  const scale = Math.min((W - 2 * pad) / spanX, (H - 2 * pad) / spanY, 46);
  const ox = W / 2 - ((P.bounds.minX + P.bounds.maxX) / 2) * scale, oy = H / 2 + ((P.bounds.minY + P.bounds.maxY) / 2) * scale;
  for (const a of P.atoms) { a.sx = ox + a.x * scale; a.sy = oy - a.y * scale; }
  const byId = new Map(P.atoms.map((a) => [a.id, a]));
  const labelled = (a) => (opts.labels?.[a.id]) || a.el !== 'C' || opts.labelCarbons;
  const labelText = (a) => opts.labels?.[a.id] || `${a.el}${a.charge ? (Math.abs(a.charge) >= 0.75 ? (a.charge > 0 ? '⁺' : '⁻') : '') : ''}`;
  const shrink = 7;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const b of P.bonds) {
    const A = byId.get(b.from), B = byId.get(b.to);
    let x1 = A.sx, y1 = A.sy, x2 = B.sx, y2 = B.sy;
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    if (labelled(A)) { x1 += ux * shrink; y1 += uy * shrink; }
    if (labelled(B)) { x2 -= ux * shrink; y2 -= uy * shrink; }
    const nx = -uy, ny = ux;
    ctx.strokeStyle = T.text; ctx.fillStyle = T.text; ctx.lineWidth = 1.6;
    if (b.partial < 0.999) ctx.setLineDash([4, 3]); else ctx.setLineDash([]);
    if (b.kind === 'wedge') {
      const w = 4.5;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 + nx * w, y2 + ny * w); ctx.lineTo(x2 - nx * w, y2 - ny * w); ctx.closePath(); ctx.fill();
    } else if (b.kind === 'dash') {
      const n = 6, len = Math.hypot(x2 - x1, y2 - y1);
      for (let i = 1; i <= n; i++) { const f = i / n, w = 1 + 4 * f; const px = x1 + ux * len * f, py = y1 + uy * len * f; ctx.beginPath(); ctx.moveTo(px + nx * w, py + ny * w); ctx.lineTo(px - nx * w, py - ny * w); ctx.stroke(); }
    } else {
      const offsets = b.order === 3 ? [-3.2, 0, 3.2] : b.order === 2 ? [-1.8, 1.8] : [0];
      for (const o of offsets) { ctx.beginPath(); ctx.moveTo(x1 + nx * o, y1 + ny * o); ctx.lineTo(x2 + nx * o, y2 + ny * o); ctx.stroke(); }
      if (b.aromatic && b.order === 1) { /* Kekulé rendering: aromatic single bonds stay single */ }
    }
    ctx.setLineDash([]);
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const a of P.atoms) {
    if (!labelled(a)) continue;
    const text = labelText(a);
    ctx.font = font(a.el === 'H' ? 11 : 12, 600);
    const wdt = ctx.measureText(text).width;
    ctx.fillStyle = T.panel; ctx.beginPath(); ctx.ellipse(a.sx, a.sy, wdt / 2 + 2, 7, 0, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = a.el === 'H' ? T.muted : a.el === 'C' ? T.text : T.accent;
    ctx.fillText(text, a.sx, a.sy);
  }
  return P;
}
