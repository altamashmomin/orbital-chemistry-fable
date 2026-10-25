import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEMPLATES, GEOMETRY_KINDS, geometryKind, embed, complexFrame, relaxTorsions, v, DEG } from '../src/chem/geometry.js';
import { bondLength, ELEMENTS } from '../src/chem/elements.js';
import { toFrame } from '../src/chem/builder.js';
import { assertNoClashes } from './helpers.js';

const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, v.dot(v.norm(a), v.norm(b))))) / DEG;
const pairAngles = (center, pts) => {
  const out = [];
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) out.push(angle(v.sub(pts[i], center), v.sub(pts[j], center)));
  return out;
};
const isRightOrStraight = (a) => Math.abs(a - 90) < 1e-6 || Math.abs(a - 180) < 1e-6;

test('coordination templates: octahedral and square planar slots are unit vectors at 90°/180°', () => {
  assert.ok(GEOMETRY_KINDS.includes('octahedral') && GEOMETRY_KINDS.includes('squarePlanar'));
  assert.equal(TEMPLATES.octahedral.length, 6);
  assert.equal(TEMPLATES.squarePlanar.length, 4);
  for (const kind of ['octahedral', 'squarePlanar']) {
    const slots = TEMPLATES[kind];
    for (const s of slots) assert.ok(Math.abs(v.len(s) - 1) < 1e-12);
    assert.ok(pairAngles([0, 0, 0], slots).every(isRightOrStraight), `${kind} angles are 90° or 180°`);
    // Trans pairs are consecutive.
    for (let i = 0; i < slots.length; i += 2) assert.ok(Math.abs(angle(slots[i], slots[i + 1]) - 180) < 1e-9, `${kind} slots ${i}/${i + 1} are trans`);
  }
  assert.ok(TEMPLATES.squarePlanar.every((s) => s[1] === 0), 'the square plane is xz');
  // Existing templates are untouched.
  assert.deepEqual(Object.keys(TEMPLATES).slice(0, 5), ['single', 'linear', 'trigonal', 'tetrahedral', 'tbp']);
});

test('geometryKind recognises coordination hybridisations and keeps the organic rules', () => {
  assert.equal(geometryKind({ hyb: 'oct' }, 6), 'octahedral');
  assert.equal(geometryKind({ hyb: 'sqp' }, 4), 'squarePlanar');
  assert.equal(geometryKind({ hyb: 'd2sp3' }, 6), 'octahedral');
  assert.equal(geometryKind({ hyb: 'dsp2' }, 4), 'squarePlanar');
  assert.equal(geometryKind({}, 6), 'octahedral', 'steric number 6 without a hint is octahedral');
  assert.equal(geometryKind({}, 5), 'tbp');
  assert.equal(geometryKind({ hyb: 'sp3' }, 4), 'tetrahedral');
  assert.equal(geometryKind({ hyb: 'sp2' }, 3), 'trigonal');
  assert.equal(geometryKind({ hyb: 'sp' }, 2), 'linear');
  assert.equal(geometryKind({ lonePairs: 2 }, 2), 'tetrahedral');
  assert.equal(geometryKind({ lonePairs: 1 }, 2), 'trigonal');
  assert.equal(geometryKind({}, 1), 'single');
});

test('an octahedral ML6 frame has six ligands at 90°/180°, correct bond lengths and no clashes', () => {
  const ids = ['N1', 'N2', 'N3', 'N4', 'N5', 'N6'];
  const frame = complexFrame({ metal: 'Fe', id: 'Fe', charge: 2, ligands: ids });
  assert.equal(frame.atoms.length, 7);
  assert.equal(frame.bonds.length, 6);
  assert.deepEqual(frame.atoms.slice(1).map((a) => a.id), ids, 'ligand ids are kept in slot order');
  assert.deepEqual(frame.slots, Object.fromEntries(ids.map((id, i) => [id, i])));
  const M = frame.atoms[0];
  assert.equal(M.el, 'Fe');
  assert.equal(M.charge, 2);
  const ligands = frame.atoms.slice(1);
  const angles = pairAngles(M.pos, ligands.map((a) => a.pos));
  assert.equal(angles.length, 15);
  assert.ok(angles.every(isRightOrStraight), `angles ${angles.map((a) => a.toFixed(1)).join(', ')}`);
  assert.equal(angles.filter((a) => Math.abs(a - 180) < 1e-6).length, 3, 'three trans pairs');
  for (const L of ligands) assert.ok(Math.abs(v.dist(L.pos, M.pos) - bondLength('Fe', 'N')) < 1e-9, 'M–L is the Fe–N covalent-radius sum');
  assert.ok(Math.abs(bondLength('Fe', 'N') - 2.03) < 0.01, 'Fe–N ≈ 2.03 Å');
  assertNoClashes(frame, 'ML6');
  for (const a of frame.atoms) { assert.ok(Array.isArray(a.lonePairDirs)); assert.equal(a.orbital, null); assert.ok(a.pos.every(Number.isFinite)); }
  for (const b of frame.bonds) assert.equal(b.a, 'Fe');
});

test('ML4 frames: square planar is coplanar, tetrahedral is not; options and errors behave', () => {
  const sq = complexFrame({ metal: 'Pt', geometry: 'squarePlanar', ligands: [{ id: 'Cl1', el: 'Cl' }, { id: 'Cl2', el: 'Cl' }, { id: 'N1', el: 'N' }, { id: 'N2', el: 'N' }] });
  const Pt = sq.atoms[0].pos;
  assert.ok(sq.atoms.every((a) => Math.abs(a.pos[1]) < 1e-12), 'all atoms in the xz plane');
  assert.ok(pairAngles(Pt, sq.atoms.slice(1).map((a) => a.pos)).every(isRightOrStraight));
  assert.ok(Math.abs(angle(v.sub(sq.atoms[1].pos, Pt), v.sub(sq.atoms[2].pos, Pt)) - 180) < 1e-9, 'slots 0 and 1 are trans (trans-PtCl₂)');
  assert.ok(Math.abs(v.dist(sq.atoms[1].pos, Pt) - bondLength('Pt', 'Cl')) < 1e-9);
  assert.ok(Math.abs(v.dist(sq.atoms[3].pos, Pt) - bondLength('Pt', 'N')) < 1e-9, 'per-element bond lengths');
  assertNoClashes(sq, 'PtCl2N2');

  const td = complexFrame({ metal: 'Zn', geometry: 'tetrahedral', ligands: ['A', 'B', 'C', 'D'], bondLength: 2.2, center: [1, 2, 3] });
  assert.deepEqual(td.atoms[0].pos, [1, 2, 3]);
  const tdAngles = pairAngles([1, 2, 3], td.atoms.slice(1).map((a) => a.pos));
  assert.ok(tdAngles.every((a) => Math.abs(a - 109.4712) < 1e-3), 'tetrahedral angles');
  assert.ok(td.atoms.slice(1).every((a) => Math.abs(v.dist(a.pos, [1, 2, 3]) - 2.2) < 1e-9), 'fixed bond length');

  const partial = complexFrame({ metal: 'Fe', ligands: [{ id: 'CO', el: 'C', length: 1.8, label: 'carbonyl' }] });
  assert.equal(partial.atoms.length, 2);
  assert.equal(partial.atoms[1].label, 'carbonyl');
  assert.ok(Math.abs(v.dist(partial.atoms[1].pos, partial.atoms[0].pos) - 1.8) < 1e-9);
  assert.throws(() => complexFrame({ geometry: 'cubic', ligands: [] }), /unknown geometry/);
  assert.throws(() => complexFrame({ geometry: 'squarePlanar', ligands: ['a', 'b', 'c', 'd', 'e'] }), /4 sites/);
  for (const el of ['Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn', 'Pd', 'Pt']) assert.ok(ELEMENTS[el]?.color && ELEMENTS[el].covalent > 1, `${el} is in the element table`);
});

test('the embedder places hyb: oct / sqp centres with substituted ligands and no clashes', () => {
  // [Co(NH3)6]3+: six ammines, each with three hydrogens.
  const atoms = [{ id: 'Co', el: 'Co', hyb: 'oct', charge: 3 }], bonds = [];
  for (let i = 1; i <= 6; i++) {
    atoms.push({ id: `N${i}`, el: 'N' }); bonds.push({ a: 'Co', b: `N${i}`, order: 1 });
    for (let h = 1; h <= 3; h++) { atoms.push({ id: `N${i}H${h}`, el: 'H' }); bonds.push({ a: `N${i}`, b: `N${i}H${h}`, order: 1 }); }
  }
  const mol = { atoms, bonds };
  const { positions, lonePairDirs, orbitals, frames } = embed(mol, { root: 'Co' });
  assert.equal(frames.get('Co').kind, 'octahedral');
  const co = positions.get('Co');
  const nPos = [1, 2, 3, 4, 5, 6].map((i) => positions.get(`N${i}`));
  const angles = pairAngles(co, nPos);
  assert.ok(angles.every((a) => Math.abs(a - 90) < 1e-6 || Math.abs(a - 180) < 1e-6), `N–Co–N angles ${angles.map((a) => a.toFixed(1)).join(', ')}`);
  for (const p of nPos) assert.ok(Math.abs(v.dist(p, co) - bondLength('Co', 'N')) < 1e-9);
  relaxTorsions(mol, positions, lonePairDirs, orbitals, frames);
  const frame = toFrame(mol, positions, lonePairDirs, orbitals);
  assertNoClashes(frame, '[Co(NH3)6]3+');
  for (let i = 1; i <= 6; i++) assert.equal(frames.get(`N${i}`).kind, 'tetrahedral', 'ammine N keeps its tetrahedral slots');

  // trans-[PtCl2(NH3)2]: square planar via hyb: 'sqp'.
  const sq = { atoms: [{ id: 'Pt', el: 'Pt', hyb: 'sqp' }, { id: 'Cl1', el: 'Cl', lonePairs: 3 }, { id: 'Cl2', el: 'Cl', lonePairs: 3 }, { id: 'N1', el: 'N' }, { id: 'N2', el: 'N' }], bonds: ['Cl1', 'Cl2', 'N1', 'N2'].map((x) => ({ a: 'Pt', b: x, order: 1 })) };
  const e = embed(sq, { root: 'Pt' });
  const f = e.frames.get('Pt');
  assert.equal(f.kind, 'squarePlanar');
  const pt = e.positions.get('Pt');
  const dirs = ['Cl1', 'Cl2', 'N1', 'N2'].map((x) => v.sub(e.positions.get(x), pt));
  assert.ok(dirs.every((d) => Math.abs(v.dot(d, f.normal)) < 1e-9), 'all four ligands lie in the plane');
  assert.ok(pairAngles(pt, dirs.map((d) => v.add(pt, d))).every(isRightOrStraight));
  assert.ok(Math.abs(v.len(f.normal) - 1) < 1e-9, 'frame normal is a unit vector');
});
