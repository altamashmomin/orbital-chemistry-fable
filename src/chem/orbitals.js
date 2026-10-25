// Hydrogen-like atomic orbitals (n ≤ 3) and simple two-centre molecular orbitals as real functions
// ψ(x, y, z), plus grid sampling for the isosurface renderer (src/render/orbitalView.js).
// Dependency-free so it runs under `node --test`.
//
// Units: lengths are in Bohr radii unless `a0` is given. Pass a0 = A0_ANGSTROM to work in Å next
// to a molecule frame. Z is the (effective) nuclear charge; larger Z contracts the orbital as a0/Z.
// Sign convention: ψ carries its phase. Positive and negative lobes are rendered in different
// colours; |ψ| = c isosurfaces are the usual textbook pictures.
// Sources: see src/chem/references.md (hydrogen-atom wavefunction tables, real spherical harmonics).

export const A0_ANGSTROM = 0.529177; // Å per Bohr radius

const SQRT_PI = Math.sqrt(Math.PI);

/** Real spherical harmonics (normalised over the sphere), as functions of a direction (x, y, z). */
export const ANGULAR = {
  s: () => 1 / (2 * SQRT_PI),
  pz: (x, y, z, r) => Math.sqrt(3 / (4 * Math.PI)) * z / r,
  px: (x, y, z, r) => Math.sqrt(3 / (4 * Math.PI)) * x / r,
  py: (x, y, z, r) => Math.sqrt(3 / (4 * Math.PI)) * y / r,
  dz2: (x, y, z, r) => 0.25 * Math.sqrt(5 / Math.PI) * (3 * z * z - r * r) / (r * r),
  dxz: (x, y, z, r) => 0.5 * Math.sqrt(15 / Math.PI) * x * z / (r * r),
  dyz: (x, y, z, r) => 0.5 * Math.sqrt(15 / Math.PI) * y * z / (r * r),
  dx2y2: (x, y, z, r) => 0.25 * Math.sqrt(15 / Math.PI) * (x * x - y * y) / (r * r),
  dxy: (x, y, z, r) => 0.5 * Math.sqrt(15 / Math.PI) * x * y / (r * r),
};

const L_OF = { s: 0, p: 1, d: 2 };

/** Orbital catalogue: name → quantum numbers and the real angular function. */
export const ORBITALS = {
  '1s': { n: 1, l: 0, m: 's' },
  '2s': { n: 2, l: 0, m: 's' },
  '2px': { n: 2, l: 1, m: 'px' }, '2py': { n: 2, l: 1, m: 'py' }, '2pz': { n: 2, l: 1, m: 'pz' },
  '3s': { n: 3, l: 0, m: 's' },
  '3px': { n: 3, l: 1, m: 'px' }, '3py': { n: 3, l: 1, m: 'py' }, '3pz': { n: 3, l: 1, m: 'pz' },
  '3dz2': { n: 3, l: 2, m: 'dz2' }, '3dxz': { n: 3, l: 2, m: 'dxz' }, '3dyz': { n: 3, l: 2, m: 'dyz' },
  '3dx2y2': { n: 3, l: 2, m: 'dx2y2' }, '3dxy': { n: 3, l: 2, m: 'dxy' },
};
export const ORBITAL_NAMES = Object.keys(ORBITALS);

/** Display labels with Unicode sub/superscripts, e.g. '3d_z²' → '3dz²'. */
export const ORBITAL_LABELS = {
  '1s': '1s', '2s': '2s', '2px': '2pₓ', '2py': '2pᵧ', '2pz': '2p𝓏', '3s': '3s', '3px': '3pₓ', '3py': '3pᵧ', '3pz': '3p𝓏',
  '3dz2': '3d𝓏²', '3dxz': '3dₓ𝓏', '3dyz': '3dᵧ𝓏', '3dx2y2': '3dₓ²₋ᵧ²', '3dxy': '3dₓᵧ',
};

/** Number of radial nodes (spheres where ψ = 0) and angular nodes (planes/cones). */
export const radialNodes = (n, l) => n - l - 1;
export const angularNodes = (l) => l;

/**
 * Normalised hydrogen-like radial function R_nl(r) for n ≤ 3, with ∫ R² r² dr = 1.
 * r in the same unit as a0; Z scales the orbital as a0/Z.
 */
export function radial(n, l, r, Z = 1, a0 = 1) {
  const k = Z / a0;                 // inverse length scale
  const rho = k * r;
  const N = Math.pow(k, 1.5);
  if (n === 1 && l === 0) return 2 * N * Math.exp(-rho);
  if (n === 2) {
    const e = Math.exp(-rho / 2);
    if (l === 0) return (N / (2 * Math.SQRT2)) * (2 - rho) * e;
    if (l === 1) return (N / (2 * Math.sqrt(6))) * rho * e;
  }
  if (n === 3) {
    const e = Math.exp(-rho / 3);
    if (l === 0) return ((2 * N) / (81 * Math.sqrt(3))) * (27 - 18 * rho + 2 * rho * rho) * e;
    if (l === 1) return ((4 * N) / (81 * Math.sqrt(6))) * (6 - rho) * rho * e;
    if (l === 2) return ((4 * N) / (81 * Math.sqrt(30))) * rho * rho * e;
  }
  throw new Error(`radial(): unsupported n=${n}, l=${l} (only n ≤ 3)`);
}

/** Real angular factor Y(x, y, z) for the labels in ANGULAR ('s', 'px', …, 'dxy'). Zero at the origin for l > 0. */
export function angular(m, x, y, z) {
  const f = ANGULAR[m];
  if (!f) throw new Error(`angular(): unknown label ${m}`);
  if (m === 's') return f();
  const r = Math.hypot(x, y, z);
  if (r < 1e-12) return 0;
  return f(x, y, z, r);
}

// Half-width of a sampling box (in units of a0/Z) that contains the 90 % probability surface with margin.
const EXTENT = { 1: 4.5, 2: 12, 3: 24 };
const EXTENT_3D = 20;

/**
 * A hydrogen-like orbital as an object with ψ(x, y, z).
 * opts: { Z = 1, a0 = 1, center = [0, 0, 0] }
 * Returns { name, label, n, l, m, Z, a0, center, extent, psi(x, y, z), density(x, y, z) }.
 */
export function orbital(name, { Z = 1, a0 = 1, center = [0, 0, 0] } = {}) {
  const def = ORBITALS[name];
  if (!def) throw new Error(`orbital(): unknown orbital ${name}; expected one of ${ORBITAL_NAMES.join(', ')}`);
  const { n, l, m } = def;
  const [cx, cy, cz] = center;
  const psi = (x, y, z) => {
    const dx = x - cx, dy = y - cy, dz = z - cz;
    const r = Math.hypot(dx, dy, dz);
    if (l === 0) return radial(n, 0, r, Z, a0) * ANGULAR.s();
    if (r < 1e-12) return 0;
    return radial(n, l, r, Z, a0) * ANGULAR[m](dx, dy, dz, r);
  };
  const extent = ((n === 3 && l === 2 ? EXTENT_3D : EXTENT[n]) * a0) / Z;
  return { name, label: ORBITAL_LABELS[name] || name, n, l, m, Z, a0, center: [cx, cy, cz], extent, psi, density: (x, y, z) => { const p = psi(x, y, z); return p * p; } };
}

/** Linear combination Σ cᵢ ψᵢ of functions ψᵢ(x, y, z). terms: [{ psi, c }]. */
export function lcao(terms) {
  return (x, y, z) => { let s = 0; for (const t of terms) s += t.c * t.psi(x, y, z); return s; };
}

const AXES = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
const norm3 = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const anyPerp3 = (a) => {
  const ax = Math.abs(a[0]), ay = Math.abs(a[1]), az = Math.abs(a[2]);
  const o = ax <= ay && ax <= az ? [1, 0, 0] : ay <= az ? [0, 1, 0] : [0, 0, 1];
  return norm3(cross3(a, o));
};

/**
 * Two-centre molecular orbital from identical hydrogen-like orbitals on atoms A and B.
 * spec: {
 *   type: 'sigma' | 'sigma*' | 'pi' | 'pi*',
 *   basis: '1s' | '2s' | '2p' | '3s' | '3p'          // 's' bases give σ/σ* only; 'p' bases give all four
 *   centers: [[xA,yA,zA], [xB,yB,zB]]                 // explicit atom positions, or
 *   separation = 2, axis = 'z' | [x,y,z], center = [0,0,0],
 *   piDirection?: [x,y,z]                             // lobe direction for π (any perpendicular by default)
 *   Z = 1, a0 = 1
 * }
 * Sign convention: σ from p uses the p lobes pointing along the bond, so the bonding σ has the
 * same sign on both centres between the nuclei; σ* has a node at the midpoint. π is the in-phase
 * combination of two parallel p orbitals above/below the axis; π* has a nodal plane through the
 * midpoint. Coefficients are ±1/√2 (overlap neglected), which is fine for shapes and signs.
 * Returns { type, label, bonding, basis, centers, axis, extent, center, psi(x,y,z), parts: [{ center, c }] }.
 */
export function molecularOrbital(spec = {}) {
  const { type = 'sigma', basis = '1s', Z = 1, a0 = 1 } = spec;
  const star = type.endsWith('*');
  const kind = star ? type.slice(0, -1) : type;
  if (kind !== 'sigma' && kind !== 'pi') throw new Error(`molecularOrbital(): type must be sigma, sigma*, pi or pi*, got ${type}`);
  const n = Number(basis[0]);
  const shell = basis.slice(1);
  if (!(n >= 1 && n <= 3) || !(shell in L_OF) || shell === 'd') throw new Error(`molecularOrbital(): basis must be 1s, 2s, 2p, 3s or 3p, got ${basis}`);
  if (kind === 'pi' && shell !== 'p') throw new Error('molecularOrbital(): π orbitals need a p basis');

  let A, B, axis;
  if (spec.centers) {
    [A, B] = spec.centers.map((p) => [p[0], p[1], p[2]]);
    axis = norm3([B[0] - A[0], B[1] - A[1], B[2] - A[2]]);
  } else {
    const d = spec.separation ?? 2;
    const c = spec.center || [0, 0, 0];
    axis = typeof spec.axis === 'string' ? AXES[spec.axis] : norm3(spec.axis || AXES.z);
    if (!axis) throw new Error(`molecularOrbital(): unknown axis ${spec.axis}`);
    A = [c[0] - axis[0] * d / 2, c[1] - axis[1] * d / 2, c[2] - axis[2] * d / 2];
    B = [c[0] + axis[0] * d / 2, c[1] + axis[1] * d / 2, c[2] + axis[2] * d / 2];
  }
  const separation = Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]);
  const center = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2];
  // Lobe direction: along the bond for σ(p), perpendicular for π.
  let lobe = axis;
  if (kind === 'pi') {
    lobe = spec.piDirection ? norm3(spec.piDirection) : anyPerp3(axis);
    const along = dot3(lobe, axis);
    lobe = norm3([lobe[0] - axis[0] * along, lobe[1] - axis[1] * along, lobe[2] - axis[2] * along]);
  }
  const c = 1 / Math.SQRT2;
  // p orbital whose positive lobe points along `lobe`, centred at p0: R(r) · Y_p(dir·lobe)
  const pAlong = (p0) => (x, y, z) => {
    const dx = x - p0[0], dy = y - p0[1], dz = z - p0[2];
    const r = Math.hypot(dx, dy, dz);
    if (r < 1e-12) return 0;
    return radial(n, 1, r, Z, a0) * Math.sqrt(3 / (4 * Math.PI)) * (dx * lobe[0] + dy * lobe[1] + dz * lobe[2]) / r;
  };
  const sAt = (p0) => orbital(`${n}s`, { Z, a0, center: p0 }).psi;
  let parts, label;
  if (shell === 's') {
    parts = [{ center: A, c, psi: sAt(A) }, { center: B, c: star ? -c : c, psi: sAt(B) }];
    label = `${star ? 'σ*' : 'σ'}(${basis})`;
  } else if (kind === 'sigma') {
    // p_A points toward B (+lobe); p_B points along +lobe too, so between the nuclei p_B is negative:
    // the bonding combination is p_A − p_B.
    parts = [{ center: A, c, psi: pAlong(A) }, { center: B, c: star ? c : -c, psi: pAlong(B) }];
    label = `${star ? 'σ*' : 'σ'}(${basis})`;
  } else {
    parts = [{ center: A, c, psi: pAlong(A) }, { center: B, c: star ? -c : c, psi: pAlong(B) }];
    label = `${star ? 'π*' : 'π'}(${basis})`;
  }
  const psi = lcao(parts);
  const atomic = orbital(shell === 's' ? `${n}s` : `${n}pz`, { Z, a0 });
  return {
    type, label, bonding: !star, basis, centers: [A, B], axis, lobe, separation, center,
    extent: atomic.extent + separation / 2, psi, parts: parts.map(({ center: p, c: coef }) => ({ center: p, c: coef })),
  };
}

/**
 * Sample ψ on a cubic grid. opts: { size = 32, extent, center = [0,0,0] } (extent = half-width).
 * Returns { size: [n,n,n], origin, step: [d,d,d], values: Float32Array, min, max, extent, center }
 * with values[i + n*(j + n*k)] = ψ(origin + step·[i, j, k]). Keep size ≤ 48 for smooth interaction.
 */
export function sampleGrid(psi, { size = 32, extent, center = [0, 0, 0] } = {}) {
  if (!(extent > 0)) throw new Error('sampleGrid(): extent (half-width) is required');
  const n = Math.max(2, Math.floor(size));
  const step = (2 * extent) / (n - 1);
  const origin = [center[0] - extent, center[1] - extent, center[2] - extent];
  const values = new Float32Array(n * n * n);
  let min = Infinity, max = -Infinity;
  let idx = 0;
  for (let k = 0; k < n; k++) {
    const z = origin[2] + k * step;
    for (let j = 0; j < n; j++) {
      const y = origin[1] + j * step;
      for (let i = 0; i < n; i++) {
        const val = psi(origin[0] + i * step, y, z);
        values[idx++] = val;
        if (val < min) min = val;
        if (val > max) max = val;
      }
    }
  }
  return { size: [n, n, n], origin, step: [step, step, step], values, min, max, extent, center: [center[0], center[1], center[2]] };
}

/**
 * |ψ| threshold c such that the region |ψ| ≥ c holds `probability` of the density sampled on the grid
 * (the usual "90 % contour"). Falls back to `fractionOfMax` × max|ψ| when the grid has no density.
 */
export function isoValue(grid, { probability = 0.9, fractionOfMax = 0.1 } = {}) {
  const vals = grid.values;
  const dens = new Float32Array(vals.length);
  let total = 0, maxAbs = 0;
  for (let i = 0; i < vals.length; i++) { const d = vals[i] * vals[i]; dens[i] = d; total += d; if (d > maxAbs) maxAbs = d; }
  if (!(total > 0)) return 0;
  const p = Math.min(0.999, Math.max(0.001, probability));
  dens.sort();                                   // ascending
  let acc = 0;
  for (let i = dens.length - 1; i >= 0; i--) {
    acc += dens[i];
    if (acc >= p * total) return Math.sqrt(dens[i]);
  }
  return Math.sqrt(maxAbs) * fractionOfMax;
}

/** Count sign changes along a sequence, ignoring values with |v| < eps (nodes sampled exactly). */
export function countSignChanges(values, eps = 1e-9) {
  let last = 0, changes = 0;
  for (const val of values) {
    if (!(Math.abs(val) >= eps)) continue;
    const s = val > 0 ? 1 : -1;
    if (last && s !== last) changes++;
    last = s;
  }
  return changes;
}

/** Total probability captured by a grid (Σ ψ² · cell volume); ≈ 1 when the box holds the whole orbital. */
export function gridProbability(grid) {
  const dv = grid.step[0] * grid.step[1] * grid.step[2];
  let s = 0;
  for (let i = 0; i < grid.values.length; i++) s += grid.values[i] * grid.values[i];
  return s * dv;
}
