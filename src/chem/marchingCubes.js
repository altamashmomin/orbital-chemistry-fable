// Small, dependency-free isosurface extraction for scalar grids (orbitals, densities).
//
// Marching cubes via tetrahedral decomposition: each grid cube is split into six tetrahedra that
// share the cube's main diagonal, and each tetrahedron is cut by the plane f = iso. Because
// neighbouring cubes split their shared face along the same diagonal, the triangles of adjacent
// cells meet edge to edge and the mesh is watertight, without the 256-entry marching-cubes tables
// and their ambiguous cases. The price is ~2× more triangles than classic marching cubes, which
// is fine for grids up to 48³.
//
// Grid format (see sampleGrid in orbitals.js):
//   { size: [nx, ny, nz] | n, origin: [x, y, z], step: [dx, dy, dz] | d, values: Float32Array | number[] }
//   values[i + nx * (j + ny * k)] is the sample at origin + step · [i, j, k].
// The "inside" of the surface is the region values > iso; triangle winding is counter-clockwise
// seen from outside and vertex normals point outward (toward decreasing values).

// Cube corners (unit cube) and the six tetrahedra around the 0–6 diagonal.
const CORNER = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
const TETS = [[0, 1, 2, 6], [0, 2, 3, 6], [0, 3, 7, 6], [0, 7, 4, 6], [0, 4, 5, 6], [0, 5, 1, 6]];
const TET_EDGES = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];

function normaliseGrid(grid) {
  const size = Array.isArray(grid.size) ? grid.size : [grid.size, grid.size, grid.size];
  const step = Array.isArray(grid.step) ? grid.step : [grid.step, grid.step, grid.step];
  const origin = grid.origin || [0, 0, 0];
  const [nx, ny, nz] = size;
  if (grid.values.length < nx * ny * nz) throw new Error(`isosurface(): grid has ${grid.values.length} values, expected ${nx * ny * nz}`);
  return { size, step, origin, values: grid.values };
}

/** Copy of a grid with every value negated (to extract the ψ = −c lobe with isosurface(…, c)). */
export function negateGrid(grid) {
  const values = new Float32Array(grid.values.length);
  for (let i = 0; i < values.length; i++) values[i] = -grid.values[i];
  return { ...grid, values, min: grid.max != null ? -grid.max : undefined, max: grid.min != null ? -grid.min : undefined };
}

/**
 * Extract the surface f = iso from a scalar grid.
 * opts: { normals = true }
 * Returns { positions: Float32Array(3·V), normals: Float32Array(3·V) | null, indices: Uint32Array(3·F),
 *           vertexCount, triangleCount } with shared (indexed) vertices.
 */
export function isosurface(grid, iso, { normals: wantNormals = true } = {}) {
  const { size, step, origin, values } = normaliseGrid(grid);
  const [nx, ny, nz] = size;
  const [dx, dy, dz] = step;
  const N = nx * ny * nz;
  const index = (i, j, k) => i + nx * (j + ny * k);

  const positions = [];
  const normals = [];
  const indices = [];
  const cache = new Map();          // edge key → vertex index

  // Central-difference gradient at a grid node (one-sided at the borders).
  const grad = (i, j, k, out) => {
    const i0 = Math.max(0, i - 1), i1 = Math.min(nx - 1, i + 1);
    const j0 = Math.max(0, j - 1), j1 = Math.min(ny - 1, j + 1);
    const k0 = Math.max(0, k - 1), k1 = Math.min(nz - 1, k + 1);
    out[0] = (values[index(i1, j, k)] - values[index(i0, j, k)]) / ((i1 - i0) * dx);
    out[1] = (values[index(i, j1, k)] - values[index(i, j0, k)]) / ((j1 - j0) * dy);
    out[2] = (values[index(i, j, k1)] - values[index(i, j, k0)]) / ((k1 - k0) * dz);
  };
  const gA = [0, 0, 0], gB = [0, 0, 0];

  // Vertex on the grid edge between nodes a and b (flat indices), interpolated to f = iso.
  const vertexOn = (a, b, fa, fb) => {
    const key = a < b ? a * N + b : b * N + a;
    let vi = cache.get(key);
    if (vi !== undefined) return vi;
    const t = fb === fa ? 0.5 : Math.min(1, Math.max(0, (iso - fa) / (fb - fa)));
    const ai = a % nx, aj = Math.floor(a / nx) % ny, ak = Math.floor(a / (nx * ny));
    const bi = b % nx, bj = Math.floor(b / nx) % ny, bk = Math.floor(b / (nx * ny));
    vi = positions.length / 3;
    positions.push(
      origin[0] + (ai + (bi - ai) * t) * dx,
      origin[1] + (aj + (bj - aj) * t) * dy,
      origin[2] + (ak + (bk - ak) * t) * dz,
    );
    if (wantNormals) {
      grad(ai, aj, ak, gA); grad(bi, bj, bk, gB);
      let gx = -(gA[0] + (gB[0] - gA[0]) * t), gy = -(gA[1] + (gB[1] - gA[1]) * t), gz = -(gA[2] + (gB[2] - gA[2]) * t);
      const l = Math.hypot(gx, gy, gz) || 1;
      gx /= l; gy /= l; gz /= l;
      normals.push(gx, gy, gz);
    }
    cache.set(key, vi);
    return vi;
  };

  const P = (vi) => [positions[3 * vi], positions[3 * vi + 1], positions[3 * vi + 2]];
  // Emit triangle (a, b, c) wound so its normal has a positive component along `outward`.
  const emit = (a, b, c, outward) => {
    const pa = P(a), pb = P(b), pc = P(c);
    const ux = pb[0] - pa[0], uy = pb[1] - pa[1], uz = pb[2] - pa[2];
    const vx = pc[0] - pa[0], vy = pc[1] - pa[1], vz = pc[2] - pa[2];
    const nx_ = uy * vz - uz * vy, ny_ = uz * vx - ux * vz, nz_ = ux * vy - uy * vx;
    if (nx_ * outward[0] + ny_ * outward[1] + nz_ * outward[2] >= 0) indices.push(a, b, c);
    else indices.push(a, c, b);
  };

  const corner = new Array(8), fv = new Array(8);
  const cornerPos = (c) => [origin[0] + c[0] * dx, origin[1] + c[1] * dy, origin[2] + c[2] * dz];
  for (let k = 0; k < nz - 1; k++) {
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        let anyIn = false, anyOut = false;
        for (let c = 0; c < 8; c++) {
          const ci = index(i + CORNER[c][0], j + CORNER[c][1], k + CORNER[c][2]);
          corner[c] = ci; fv[c] = values[ci];
          if (fv[c] > iso) anyIn = true; else anyOut = true;
        }
        if (!anyIn || !anyOut) continue;
        for (const tet of TETS) {
          const inside = [], outside = [];
          for (let t = 0; t < 4; t++) (fv[tet[t]] > iso ? inside : outside).push(t);
          if (!inside.length || !outside.length) continue;
          const cell = [i, j, k];
          const posOf = (t) => cornerPos([cell[0] + CORNER[tet[t]][0], cell[1] + CORNER[tet[t]][1], cell[2] + CORNER[tet[t]][2]]);
          const vOn = (s, t) => vertexOn(corner[tet[s]], corner[tet[t]], fv[tet[s]], fv[tet[t]]);
          if (inside.length === 1 || outside.length === 1) {
            const lone = inside.length === 1 ? inside[0] : outside[0];
            const others = [0, 1, 2, 3].filter((t) => t !== lone);
            const va = vOn(lone, others[0]), vb = vOn(lone, others[1]), vc = vOn(lone, others[2]);
            const pl = posOf(lone);
            const pa = P(va), pb = P(vb), pc = P(vc);
            const cen = [(pa[0] + pb[0] + pc[0]) / 3, (pa[1] + pb[1] + pc[1]) / 3, (pa[2] + pb[2] + pc[2]) / 3];
            // Outward points away from the lone vertex when it is inside, toward it when it is outside.
            const sgn = inside.length === 1 ? 1 : -1;
            emit(va, vb, vc, [sgn * (cen[0] - pl[0]), sgn * (cen[1] - pl[1]), sgn * (cen[2] - pl[2])]);
          } else {
            const [a, b] = inside, [c, d] = outside;
            const vac = vOn(a, c), vad = vOn(a, d), vbd = vOn(b, d), vbc = vOn(b, c);
            const pa = posOf(a), pb = posOf(b), pc = posOf(c), pd = posOf(d);
            const outward = [(pc[0] + pd[0] - pa[0] - pb[0]) / 2, (pc[1] + pd[1] - pa[1] - pb[1]) / 2, (pc[2] + pd[2] - pa[2] - pb[2]) / 2];
            emit(vac, vad, vbd, outward);
            emit(vac, vbd, vbc, outward);
          }
        }
      }
    }
  }
  void TET_EDGES;
  return {
    positions: Float32Array.from(positions),
    normals: wantNormals ? Float32Array.from(normals) : null,
    indices: Uint32Array.from(indices),
    vertexCount: positions.length / 3,
    triangleCount: indices.length / 3,
  };
}

export const marchingCubes = isosurface;

/**
 * Edge statistics for a triangle mesh, used to check that an isosurface is closed:
 * a closed manifold has every edge in exactly two triangles (boundaryEdges = nonManifoldEdges = 0)
 * and Euler characteristic V − E + F = 2 per sphere-like component.
 */
export function meshStats(mesh) {
  const { indices } = mesh;
  const counts = new Map();
  const V = mesh.vertexCount ?? mesh.positions.length / 3;
  const key = (a, b) => (a < b ? a * V + b : b * V + a);
  for (let t = 0; t < indices.length; t += 3) {
    const [a, b, c] = [indices[t], indices[t + 1], indices[t + 2]];
    for (const k of [key(a, b), key(b, c), key(c, a)]) counts.set(k, (counts.get(k) || 0) + 1);
  }
  let boundary = 0, nonManifold = 0;
  for (const n of counts.values()) { if (n === 1) boundary++; else if (n > 2) nonManifold++; }
  const E = counts.size, F = indices.length / 3;
  return { vertices: V, edges: E, faces: F, euler: V - E + F, boundaryEdges: boundary, nonManifoldEdges: nonManifold, closed: boundary === 0 && nonManifold === 0 };
}

/** Sample an arbitrary scalar field on a grid (same format as sampleGrid in orbitals.js). */
export function sampleField(fn, { size = 32, extent, center = [0, 0, 0] } = {}) {
  const n = Math.max(2, Math.floor(size));
  const step = (2 * extent) / (n - 1);
  const origin = [center[0] - extent, center[1] - extent, center[2] - extent];
  const values = new Float32Array(n * n * n);
  let idx = 0;
  for (let k = 0; k < n; k++) for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) values[idx++] = fn(origin[0] + i * step, origin[1] + j * step, origin[2] + k * step);
  return { size: [n, n, n], origin, step: [step, step, step], values };
}
