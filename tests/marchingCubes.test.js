import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isosurface, marchingCubes, meshStats, negateGrid, sampleField } from '../src/chem/marchingCubes.js';
import { orbital, sampleGrid, isoValue } from '../src/chem/orbitals.js';

const vertex = (mesh, i) => [mesh.positions[3 * i], mesh.positions[3 * i + 1], mesh.positions[3 * i + 2]];

test('marching cubes on a sphere gives a closed mesh with outward normals and winding', () => {
  const R = 1;
  const grid = sampleField((x, y, z) => R - Math.hypot(x, y, z), { size: 24, extent: 1.6 });
  const mesh = isosurface(grid, 0);
  assert.equal(marchingCubes, isosurface);
  assert.ok(mesh.triangleCount > 1000, 'non-trivial mesh');
  const stats = meshStats(mesh);
  assert.equal(stats.boundaryEdges, 0, 'no boundary edges');
  assert.equal(stats.nonManifoldEdges, 0, 'no non-manifold edges');
  assert.ok(stats.closed);
  assert.equal(stats.euler, 2, 'V − E + F = 2 for a sphere');
  for (let i = 0; i < mesh.vertexCount; i++) {
    const p = vertex(mesh, i);
    const r = Math.hypot(...p);
    assert.ok(Math.abs(r - R) < 0.02, `vertex ${i} lies on the sphere (r = ${r})`);
    const n = [mesh.normals[3 * i], mesh.normals[3 * i + 1], mesh.normals[3 * i + 2]];
    assert.ok((n[0] * p[0] + n[1] * p[1] + n[2] * p[2]) / r > 0.95, `normal ${i} points outward`);
  }
  for (let t = 0; t < mesh.indices.length; t += 3) {
    const a = vertex(mesh, mesh.indices[t]), b = vertex(mesh, mesh.indices[t + 1]), c = vertex(mesh, mesh.indices[t + 2]);
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const cen = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
    assert.ok(n[0] * cen[0] + n[1] * cen[1] + n[2] * cen[2] > 0, `triangle ${t / 3} is wound counter-clockwise from outside`);
  }
});

test('empty and degenerate inputs', () => {
  const grid = sampleField(() => 1, { size: 6, extent: 1 });
  assert.equal(isosurface(grid, 0).triangleCount, 0, 'all inside: nothing to draw');
  assert.equal(isosurface(grid, 5).triangleCount, 0, 'all outside: nothing to draw');
  const noNormals = isosurface(sampleField((x, y, z) => 1 - Math.hypot(x, y, z), { size: 8, extent: 1.5 }), 0, { normals: false });
  assert.equal(noNormals.normals, null);
  assert.ok(noNormals.triangleCount > 0);
  assert.throws(() => isosurface({ size: 4, origin: [0, 0, 0], step: 1, values: new Float32Array(3) }, 0), /values/);
});

test('orbital lobes: the ±iso surfaces of 2p and 3d_z² are closed with the expected topology', () => {
  const pz = orbital('2pz');
  const g = sampleGrid(pz.psi, { size: 32, extent: pz.extent });
  const iso = isoValue(g, { probability: 0.9 });
  const pos = isosurface(g, iso), neg = isosurface(negateGrid(g), iso);
  assert.ok(pos.triangleCount > 0 && neg.triangleCount > 0, 'both phases present');
  assert.equal(pos.triangleCount, neg.triangleCount, 'the two 2p lobes are mirror images');
  assert.ok(meshStats(pos).closed && meshStats(neg).closed);
  assert.equal(meshStats(pos).euler, 2, 'one positive lobe');
  for (let i = 0; i < pos.vertexCount; i++) assert.ok(pos.positions[3 * i + 2] > 0, 'positive lobe lies at z > 0');
  for (let i = 0; i < neg.vertexCount; i++) assert.ok(neg.positions[3 * i + 2] < 0, 'negative lobe lies at z < 0');

  const dz2 = orbital('3dz2');
  const g2 = sampleGrid(dz2.psi, { size: 40, extent: dz2.extent });
  const iso2 = isoValue(g2, { probability: 0.9 });
  const lobes = meshStats(isosurface(g2, iso2)), ring = meshStats(isosurface(negateGrid(g2), iso2));
  assert.ok(lobes.closed && ring.closed);
  assert.equal(lobes.euler, 4, 'd_z²: two positive lobes (two spheres)');
  assert.equal(ring.euler, 0, 'd_z²: the negative phase is a torus');
});

test('a 48³ grid extracts quickly enough for interactive use', () => {
  const o = orbital('3dxy');
  const g = sampleGrid(o.psi, { size: 48, extent: o.extent });
  const t0 = performance.now();
  const mesh = isosurface(g, isoValue(g));
  const ms = performance.now() - t0;
  assert.ok(mesh.triangleCount > 0 && mesh.triangleCount < 120000, `triangle budget (${mesh.triangleCount})`);
  assert.ok(ms < 1500, `extraction took ${ms.toFixed(0)} ms`);
});
