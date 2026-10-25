import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ORBITAL_NAMES, orbital, radial, angular, radialNodes, angularNodes, molecularOrbital, lcao,
  sampleGrid, isoValue, countSignChanges, gridProbability, A0_ANGSTROM,
} from '../src/chem/orbitals.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

test('radial functions are normalised and have n − l − 1 nodes', () => {
  const dr = 0.005, rs = [];
  for (let r = dr / 2; r < 60; r += dr) rs.push(r);
  for (const [n, l] of [[1, 0], [2, 0], [2, 1], [3, 0], [3, 1], [3, 2]]) {
    const R = rs.map((r) => radial(n, l, r));
    const norm = R.reduce((s, x, i) => s + x * x * rs[i] * rs[i] * dr, 0);
    close(norm, 1, 0.01, `∫R²r²dr for n=${n} l=${l}`);
    assert.equal(countSignChanges(R), radialNodes(n, l), `radial nodes of n=${n} l=${l}`);
  }
  assert.equal(radialNodes(2, 0), 1, '2s has one radial node');
  assert.equal(radialNodes(2, 1), 0, '2p has no radial node');
  // Z contracts the orbital: the 2s node sits at r = 2 a0/Z.
  close(radial(2, 0, 2 / 3, 3), 0, 1e-12, '2s node for Z = 3');
  close(radial(2, 0, 2 * A0_ANGSTROM, 1, A0_ANGSTROM), 0, 1e-12, '2s node in Å with a0 = 0.529');
});

test('angular parts are normalised on the sphere and p/d have l angular nodes', () => {
  // Quadrature over the sphere.
  const N = 180;
  const integrate = (f) => {
    let s = 0;
    for (let i = 0; i < N; i++) {
      const th = ((i + 0.5) / N) * Math.PI;
      for (let j = 0; j < 2 * N; j++) {
        const ph = ((j + 0.5) / (2 * N)) * 2 * Math.PI;
        const x = Math.sin(th) * Math.cos(ph), y = Math.sin(th) * Math.sin(ph), z = Math.cos(th);
        s += f(x, y, z) ** 2 * Math.sin(th) * (Math.PI / N) * (Math.PI / N);
      }
    }
    return s;
  };
  for (const m of ['s', 'px', 'py', 'pz', 'dz2', 'dxz', 'dyz', 'dx2y2', 'dxy']) close(integrate((x, y, z) => angular(m, x, y, z)), 1, 0.01, `∫|Y_${m}|² dΩ`);
  // Along a meridian (φ = 0, θ from 0 to π) p_z changes sign once and d_z² twice.
  const meridian = (m) => countSignChanges(Array.from({ length: 361 }, (_, i) => { const th = (i / 360) * Math.PI; return angular(m, Math.sin(th), 0, Math.cos(th)); }));
  assert.equal(meridian('pz'), angularNodes(1), '2p has one angular node (the xy plane)');
  assert.equal(meridian('dz2'), angularNodes(2), 'd_z² crosses zero twice along a meridian (two nodal cones)');
  // Once around the equator (starting off a node) d_xy changes sign four times: two nodal planes, crossed twice each.
  const equator = countSignChanges(Array.from({ length: 721 }, (_, i) => { const ph = 0.1 + (i / 720) * 2 * Math.PI; return angular('dxy', Math.cos(ph), Math.sin(ph), 0); }));
  assert.equal(equator, 4, 'd_xy has two nodal planes');
  const equatorPx = countSignChanges(Array.from({ length: 721 }, (_, i) => { const ph = 0.1 + (i / 720) * 2 * Math.PI; return angular('px', Math.cos(ph), Math.sin(ph), 0); }));
  assert.equal(equatorPx, 2, 'p_x has one nodal plane');
});

test('p orbitals are antisymmetric across their nodal plane and symmetric otherwise', () => {
  const pz = orbital('2pz'), px = orbital('2px'), py = orbital('3py');
  for (const [x, y, z] of [[0.3, 0.7, 1.1], [2, -1, 0.5], [-1.5, 2.5, -3]]) {
    close(pz.psi(x, y, z), -pz.psi(x, y, -z), 1e-12, '2pz odd in z');
    close(pz.psi(x, y, z), pz.psi(-x, -y, z), 1e-12, '2pz even in x, y');
    close(px.psi(x, y, z), -px.psi(-x, y, z), 1e-12, '2px odd in x');
    close(py.psi(x, y, z), -py.psi(x, -y, z), 1e-12, '3py odd in y');
    assert.ok(pz.psi(x, y, Math.abs(z) + 0.1) > 0, '2pz positive lobe is +z');
  }
  assert.equal(pz.psi(0.4, 0.2, 0), 0, '2pz vanishes on the xy plane');
  assert.equal(orbital('3dxy').psi(0.5, 0, 0.3), 0, 'd_xy vanishes on the xz plane');
});

test('every catalogued orbital samples to a normalised grid with a sensible 90 % contour', () => {
  for (const name of ORBITAL_NAMES) {
    const o = orbital(name);
    const grid = sampleGrid(o.psi, { size: 40, extent: o.extent * 1.3 });
    assert.ok(grid.values.every(Number.isFinite), `${name}: finite samples`);
    close(gridProbability(grid), 1, 0.03, `${name}: Σψ²dV`);
    const iso = isoValue(grid, { probability: 0.9 });
    assert.ok(iso > 0 && iso < Math.max(Math.abs(grid.min), Math.abs(grid.max)), `${name}: iso inside the sampled range`);
  }
  const he = orbital('1s', { Z: 2 });
  assert.ok(he.extent < orbital('1s').extent, 'higher Z contracts the suggested extent');
  const inAngstrom = orbital('2pz', { a0: A0_ANGSTROM, center: [1, 2, 3] });
  close(inAngstrom.psi(1, 2, 3 + 0.6) / orbital('2pz').psi(0, 0, 0.6 / A0_ANGSTROM), Math.pow(1 / A0_ANGSTROM, 1.5), 1e-9, 'a0 rescales ψ consistently');
});

test('two-centre MOs carry the right phase pattern', () => {
  const d = 3;
  const s = molecularOrbital({ type: 'sigma', basis: '1s', separation: d });
  const sStar = molecularOrbital({ type: 'sigma*', basis: '1s', separation: d });
  assert.deepEqual(s.centers, [[0, 0, -1.5], [0, 0, 1.5]]);
  assert.ok(s.bonding && !sStar.bonding);
  assert.ok(s.psi(0, 0, 0) > orbital('1s', { center: [0, 0, -1.5] }).psi(0, 0, 0), 'σ(1s) builds up density between the nuclei');
  close(sStar.psi(0, 0, 0), 0, 1e-12, 'σ*(1s) has a node at the midpoint');
  close(sStar.psi(0.2, 0.1, 0.7), -sStar.psi(0.2, 0.1, -0.7), 1e-12, 'σ* is odd under reflection through the midplane');

  const sp = molecularOrbital({ type: 'sigma', basis: '2p', separation: d });
  const spStar = molecularOrbital({ type: 'sigma*', basis: '2p', separation: d });
  assert.ok(sp.psi(0, 0, 0) > 0 && sp.psi(0, 0, 0.5) > 0 && sp.psi(0, 0, -0.5) > 0, 'σ(2p) is single-signed between the nuclei');
  close(spStar.psi(0, 0, 0), 0, 1e-12, 'σ*(2p) node at the midpoint');
  assert.ok(sp.psi(0, 0, -3.5) < 0, 'σ(2p) keeps the small outer lobe of opposite sign');

  const pi = molecularOrbital({ type: 'pi', basis: '2p', separation: d, piDirection: [1, 0, 0] });
  const piStar = molecularOrbital({ type: 'pi*', basis: '2p', separation: d, piDirection: [1, 0, 0] });
  assert.deepEqual(pi.lobe, [1, 0, 0]);
  assert.ok(pi.psi(1.2, 0, 0) > 0 && pi.psi(-1.2, 0, 0) < 0, 'π has a positive lobe above and negative below the axis');
  close(pi.psi(0, 0.3, 0.4), 0, 1e-12, 'π vanishes on the nodal plane containing the axis');
  close(pi.psi(1, 0, 0.6), pi.psi(1, 0, -0.6), 1e-12, 'π is even through the midplane');
  close(piStar.psi(1, 0, 0.6), -piStar.psi(1, 0, -0.6), 1e-12, 'π* is odd through the midplane');
  close(piStar.psi(1.2, 0, 0), 0, 1e-12, 'π* node at the midplane');
  assert.ok(pi.extent > orbital('2pz').extent, 'MO extent grows with the separation');

  const explicit = molecularOrbital({ type: 'pi', basis: '2p', centers: [[1, 0, 0], [1, 0, 2.5]], piDirection: [0, 1, 0] });
  assert.deepEqual(explicit.axis, [0, 0, 1]);
  assert.deepEqual(explicit.center, [1, 0, 1.25]);
  assert.throws(() => molecularOrbital({ type: 'pi', basis: '1s' }), /p basis/);
  assert.throws(() => molecularOrbital({ type: 'delta' }), /type/);
  const combo = lcao([{ psi: orbital('1s').psi, c: 2 }]);
  close(combo(0.5, 0, 0), 2 * orbital('1s').psi(0.5, 0, 0), 1e-12, 'lcao scales');
});
