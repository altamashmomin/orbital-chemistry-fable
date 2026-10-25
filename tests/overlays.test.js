import { test } from 'node:test';
import assert from 'node:assert/strict';
import { basisFacing, principalAxes, groupLabel, newmanProjection, wedgeDashProjection, norm180 } from '../src/ui/overlays.js';
import { embed, m3, v, DEG } from '../src/chem/geometry.js';
import { toFrame, makeMolecule } from '../src/chem/builder.js';

const close = (a, b, tol = 1e-6) => Math.abs(a - b) < tol;

/** Alkane CnH2n+2 as a graph, embedded (the embedder gives the staggered, anti zigzag). */
function alkane(n) {
  const atoms = [], bonds = [];
  for (let i = 1; i <= n; i++) {
    atoms.push({ id: `C${i}`, el: 'C' });
    if (i > 1) bonds.push({ a: `C${i - 1}`, b: `C${i}`, order: 1 });
    const hs = i === 1 || i === n ? 3 : 2;
    for (let h = 1; h <= hs; h++) { atoms.push({ id: `C${i}H${h}`, el: 'H' }); bonds.push({ a: `C${i}`, b: `C${i}H${h}`, order: 1 }); }
  }
  const graph = { atoms, bonds };
  const e = embed(graph, { root: 'C1' });
  return { graph, e, frame: toFrame(graph, e.positions, e.lonePairDirs, e.orbitals) };
}

test('basisFacing and principalAxes give right-handed, sensible frames', () => {
  const b = basisFacing([0, 0, 2], [0, 5, 0]);
  assert.deepEqual(b.toward, [0, 0, 1]); assert.deepEqual(b.up, [0, 1, 0]); assert.deepEqual(b.right, [1, 0, 0]);
  const c = basisFacing([0, 0, 1], [0, 0, 3]);   // up hint parallel to the axis: a perpendicular is chosen
  assert.ok(close(v.dot(c.up, c.toward), 0) && close(v.dot(c.right, c.up), 0) && close(v.len(c.right), 1));
  const d = basisFacing([1, 0, 0]);
  assert.ok(close(v.dot(v.cross(d.up, d.toward), d.right), 1), 'right = up × toward');
  const flat = [[0, 0, 0], [3, 0, 0], [0, 1, 0], [3, 1, 0], [1.5, 0.5, 0]];
  const pa = principalAxes(flat);
  assert.ok(close(Math.abs(pa.axes[2][2]), 1), 'minor axis of a flat cloud is its normal');
  assert.ok(close(Math.abs(pa.axes[0][0]), 1), 'major axis is the long direction');
  assert.ok(pa.values[0] >= pa.values[1] && pa.values[1] >= pa.values[2]);
  assert.ok(close(v.dot(v.cross(pa.axes[0], pa.axes[1]), pa.axes[2]), 1), 'right-handed');
  assert.deepEqual(principalAxes([[1, 2, 3]]).center, [1, 2, 3]);
  assert.equal(norm180(270), -90); assert.equal(norm180(-180), 180); assert.equal(norm180(60), 60);
});

test('Newman projection of ethane is staggered, and eclipsed after a 60° twist', () => {
  const { graph, e, frame } = alkane(2);
  const P = newmanProjection(frame, 'C1', 'C2');
  assert.equal(P.substituents.front.length, 3); assert.equal(P.substituents.back.length, 3);
  assert.equal(P.front.el, 'C'); assert.equal(P.back.id, 'C2');
  assert.ok(close(v.dot(P.toward, v.norm(v.sub(frame.atoms[0].pos, frame.atoms.find((a) => a.id === 'C2').pos))), 1), 'viewer looks from the front carbon toward the back one');
  assert.ok(close(P.substituents.front[0].angle, 90, 1e-6), 'the first front substituent points up by default');
  const fa = P.substituents.front.map((s) => s.angle).sort((x, y) => x - y);
  for (let i = 1; i < 3; i++) assert.ok(close(fa[i] - fa[i - 1], 120, 1e-6), 'front hydrogens 120° apart');
  assert.ok(P.substituents.front.every((s) => close(s.r, 1.09 * Math.sin(109.4712 * DEG), 1e-3)), 'projected C–H length = L·sin(109.5°)');
  assert.equal(P.dihedrals.length, 9);
  assert.ok(P.dihedrals.every((d) => close(Math.abs(d.angle), 60, 1e-6) || close(Math.abs(d.angle), 180, 1e-6)), `dihedrals ${P.dihedrals.map((d) => d.angle.toFixed(1))}`);
  assert.equal(P.conformation, 'staggered'); assert.ok(close(P.minDihedral, 60, 1e-6));
  // Twist the back methyl by 60° about the C–C axis: eclipsed.
  const axis = v.norm(v.sub(e.positions.get('C2'), e.positions.get('C1')));
  const R = m3.axisAngle(axis, 60 * DEG), c2 = e.positions.get('C2');
  const twisted = { ...frame, atoms: frame.atoms.map((a) => (/^C2H/.test(a.id) ? { ...a, pos: v.add(c2, m3.apply(R, v.sub(a.pos, c2))) } : a)) };
  const Q = newmanProjection(twisted, 'C1', 'C2');
  assert.equal(Q.conformation, 'eclipsed'); assert.ok(close(Q.minDihedral, 0, 1e-6));
  assert.ok(Q.dihedrals.every((d) => close(Math.abs(d.angle), 0, 1e-6) || close(Math.abs(d.angle), 120, 1e-6)));
  // A 30° twist is neither.
  const R30 = m3.axisAngle(axis, 30 * DEG);
  const skew = { ...frame, atoms: frame.atoms.map((a) => (/^C2H/.test(a.id) ? { ...a, pos: v.add(c2, m3.apply(R30, v.sub(a.pos, c2))) } : a)) };
  assert.equal(newmanProjection(skew, 'C1', 'C2').conformation, 'skew');
  // Swapping front and back flips the view direction and keeps the geometry.
  const S = newmanProjection(frame, 'C2', 'C1');
  assert.ok(close(v.dot(S.toward, P.toward), -1));
  assert.equal(S.conformation, 'staggered');
  // Options: hide hydrogens, custom up, unknown atoms.
  assert.equal(newmanProjection(frame, 'C1', 'C2', { hydrogens: false }).substituents.front.length, 0);
  const U = newmanProjection(frame, 'C1', 'C2', { up: v.sub(e.positions.get('C1H2'), e.positions.get('C1')) });
  assert.ok(close(U.substituents.front.find((s) => s.id === 'C1H2').angle, 90, 1e-6));
  assert.throws(() => newmanProjection(frame, 'C1', 'nope'), /unknown atom/);
  assert.equal(groupLabel(graph, 'C1', { exclude: 'C2' }), 'CH₃');
  assert.equal(groupLabel(graph, 'C1H1'), 'H');
});

test('butane down C2–C3 reports the anti C–C–C–C torsion; group labels read like a textbook', () => {
  const { frame } = alkane(4);
  const P = newmanProjection(frame, 'C2', 'C3');
  const cc = P.dihedrals.find((d) => d.front === 'C1' && d.back === 'C4');
  assert.ok(cc && close(Math.abs(cc.angle), 180, 1e-3), `C1–C2–C3–C4 = ${cc?.angle}`);
  assert.equal(P.conformation, 'staggered');
  assert.equal(groupLabel(frame, 'C1', { exclude: 'C2' }), 'CH₃');
  assert.equal(groupLabel(frame, 'C2', { exclude: 'C3' }), 'CH₂R');
  assert.equal(groupLabel(frame, 'C2', { exclude: 'C3', labels: { C2: 'Et' } }), 'Et');
  const { frame: ethanol } = makeMolecule('alcohol', { R: { R1: 'ethyl' } });
  assert.equal(groupLabel(ethanol, 'O', { exclude: 'R1.C1' }), 'OH');
  const { frame: amine } = makeMolecule('amine');
  assert.equal(groupLabel(amine, 'N', { exclude: 'R1.C1' }), 'NH₂');
});

test('wedge/dash projection: in-plane bonds are plain, out-of-plane ones wedge toward and dash away from the viewer', () => {
  // Methane with two hydrogens in the xz plane: viewed along y, those two are plain, one wedge, one dash.
  const T = 109.4712 * DEG, s = Math.sin(T), c = Math.cos(T);
  const frame = {
    atoms: [
      { id: 'C', el: 'C', pos: [0, 0, 0] }, { id: 'H1', el: 'H', pos: [0, 0, 1.09] }, { id: 'H2', el: 'H', pos: [1.09 * s, 0, 1.09 * c] },
      { id: 'H3', el: 'H', pos: [1.09 * s * Math.cos(120 * DEG), 1.09 * s * Math.sin(120 * DEG), 1.09 * c] }, { id: 'H4', el: 'H', pos: [1.09 * s * Math.cos(120 * DEG), -1.09 * s * Math.sin(120 * DEG), 1.09 * c] },
    ].map((a) => ({ ...a, lonePairDirs: [], orbital: null, charge: 0, ghost: false })),
    bonds: ['H1', 'H2', 'H3', 'H4'].map((h) => ({ a: 'C', b: h, order: 1, partial: 1 })),
  };
  const P = wedgeDashProjection(frame, { viewAxis: [0, 1, 0], up: [0, 0, 1] });
  const kind = (h) => P.bonds.find((b) => b.b === h);
  assert.equal(kind('H1').kind, 'plain'); assert.equal(kind('H2').kind, 'plain');
  assert.equal(kind('H3').kind, 'wedge'); assert.equal(kind('H4').kind, 'dash');
  assert.equal(kind('H3').from, 'C', 'narrow end at the in-plane carbon'); assert.equal(kind('H3').to, 'H3');
  assert.ok(close(P.atoms.find((a) => a.id === 'H1').depth, 0, 1e-9) && P.atoms.find((a) => a.id === 'H3').depth > 0 && P.atoms.find((a) => a.id === 'H4').depth < 0);
  assert.ok(close(kind('H1').length2d, 1.09, 1e-9), 'in-plane bond keeps its length');
  assert.ok(kind('H3').length2d < 1.09, 'tilted bond is foreshortened');
  assert.ok(P.bounds.maxY > P.bounds.minY && P.bounds.maxX > P.bounds.minX);
  // The opposite view swaps wedge and dash.
  const Q = wedgeDashProjection(frame, { viewAxis: [0, -1, 0], up: [0, 0, 1] });
  assert.equal(Q.bonds.find((b) => b.b === 'H3').kind, 'dash'); assert.equal(Q.bonds.find((b) => b.b === 'H4').kind, 'wedge');
  // Threshold and hydrogens options.
  assert.ok(wedgeDashProjection(frame, { viewAxis: [0, 1, 0], threshold: 0.99 }).bonds.every((b) => b.kind === 'plain'));
  assert.equal(wedgeDashProjection(frame, { hydrogens: false }).atoms.length, 1);
  assert.deepEqual(wedgeDashProjection({ atoms: [], bonds: [] }).atoms, []);
});

test('wedge/dash defaults: a flat molecule lies in the page with every bond plain; a tetrahedral centre gets one wedge and one dash', () => {
  const { frame: benzene } = makeMolecule('arene', { R: { R1: 'H' } });
  const P = wedgeDashProjection(benzene);
  assert.ok(P.bonds.length >= 12);
  assert.ok(P.bonds.every((b) => b.kind === 'plain'), `benzene bonds ${P.bonds.map((b) => b.kind).join(',')}`);
  assert.ok(P.atoms.every((a) => Math.abs(a.depth) < 1e-6), 'the ring is the drawing plane');
  assert.ok(P.bonds.filter((b) => b.order === 2).length === 3, 'Kekulé double bonds are kept');
  const { frame: bromoethane } = makeMolecule('haloalkane', { variant: 'Br', R: { R1: 'ethyl' } });
  const W = wedgeDashProjection(bromoethane);
  const heavy = W.bonds.filter((b) => !/H/.test(b.a) && !/H\d*$/.test(b.b) && b.a !== 'H' && b.b !== 'H');
  assert.ok(heavy.every((b) => b.kind === 'plain'), 'the Br–C–C skeleton lies in the page');
  const ch = W.bonds.filter((b) => b.a === 'R1.C1' && b.b.startsWith('R1.H'));
  assert.deepEqual(ch.map((b) => b.kind).sort(), ['dash', 'wedge'], 'the CH₂ hydrogens come toward and away from the viewer');
  assert.ok(ch.every((b) => b.from === 'R1.C1'));
  // Partial bonds (mechanism frames) survive with their partial strength.
  const partial = wedgeDashProjection({ atoms: benzene.atoms, bonds: benzene.bonds.map((b, i) => (i === 0 ? { ...b, partial: 0.5 } : b)) });
  assert.equal(partial.bonds[0].partial, 0.5);
});
