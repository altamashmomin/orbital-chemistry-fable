import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lobeGeometry, PHASE_COLORS } from '../src/render/orbitalView.js';
import { isosurface, sampleField } from '../src/chem/marchingCubes.js';

const sphereMesh = (opts) => isosurface(sampleField((x, y, z) => 1 - Math.hypot(x, y, z), { size: 20, extent: 1.5 }), 0, opts);

const outwardFraction = (geo) => {
  const p = geo.attributes.position, n = geo.attributes.normal;
  let ok = 0;
  for (let i = 0; i < p.count; i++) {
    const r = Math.hypot(p.getX(i), p.getY(i), p.getZ(i)) || 1;
    const dot = (n.getX(i) * p.getX(i) + n.getY(i) * p.getY(i) + n.getZ(i) * p.getZ(i)) / r;
    if (dot > 0.9) ok++;
  }
  return ok / p.count;
};

test('lobeGeometry keeps the mesh index and gradient normals', () => {
  const mesh = sphereMesh();
  const geo = lobeGeometry(mesh);
  assert.equal(geo.index.count, mesh.indices.length, 'triangle index is attached');
  assert.equal(geo.attributes.position.count, mesh.vertexCount);
  assert.equal(geo.attributes.normal.array, mesh.normals, 'gradient normals are used as given');
  assert.ok(outwardFraction(geo) > 0.99, 'normals point outward');
  assert.ok(geo.boundingSphere.radius > 0.9 && geo.boundingSphere.radius < 1.2);
  assert.equal(lobeGeometry({ triangleCount: 0 }), null, 'empty meshes give null');
  assert.deepEqual(Object.keys(PHASE_COLORS), ['positive', 'negative']);
});

test('lobeGeometry computes fallback normals from the indexed faces when the mesh has none', () => {
  const mesh = sphereMesh({ normals: false });
  assert.equal(mesh.normals, null);
  const geo = lobeGeometry(mesh);
  assert.equal(geo.index.count, mesh.indices.length);
  assert.ok(geo.attributes.normal, 'normals were computed');
  // Smooth, outward normals only come out right when the index is set before computeVertexNormals().
  assert.ok(outwardFraction(geo) > 0.99, `fallback normals follow the mesh topology (${(outwardFraction(geo) * 100).toFixed(1)} % outward)`);
});
