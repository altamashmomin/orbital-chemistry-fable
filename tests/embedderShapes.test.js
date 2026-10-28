import { test } from 'node:test';
import assert from 'node:assert/strict';
import { embed, relaxTorsions, lonePairSlots, vseprShape, ringTemplate, RING_SHAPES, mirror, dihedral, v, DEG, TEMPLATES, GEOMETRY_KINDS, lonePairAngleTargets, compressLonePairSlots } from '../src/chem/geometry.js';
import { toFrame, makeMolecule, buildMolecule } from '../src/chem/builder.js';
import { bondLength } from '../src/chem/elements.js';
import { LONE_PAIR_ANGLES, LONE_PAIR_COMPRESSION_PER_PAIR } from '../src/chem/references/textbook.js';
import { MEASURED_ANGLES } from '../src/chem/references/measured.js';
import { assertNoClashes } from './helpers.js';

const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, v.dot(v.norm(a), v.norm(b))))) / DEG;
const anglesAt = (center, pts) => { const out = []; for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) out.push(angle(v.sub(pts[i], center), v.sub(pts[j], center))); return out.sort((x, y) => x - y); };
const close = (a, b, tol = 1e-6) => a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) < tol);
const pos = (e, id) => e.positions.get(id);

/** AXn with lone pairs: central atom A, n fluorines (or `X`), embedded from `root`; `opts` go to embed(). */
function hypervalent(el, n, lonePairs, root = 'A', opts = {}, X = 'F') {
  const atoms = [{ id: 'A', el, lonePairs }], bonds = [];
  for (let i = 1; i <= n; i++) { atoms.push({ id: `F${i}`, el: X, lonePairs: X === 'H' ? 0 : 3 }); bonds.push({ a: 'A', b: `F${i}`, order: 1 }); }
  const graph = { atoms, bonds };
  const e = embed(graph, { root, ...opts });
  const a = pos(e, 'A');
  const F = Array.from({ length: n }, (_, i) => pos(e, `F${i + 1}`));
  return { graph, e, a, F, dirs: F.map((p) => v.norm(v.sub(p, a))), lp: e.lonePairDirs.get('A'), angles: anglesAt(a, F), frame: toFrame(graph, e.positions, e.lonePairDirs, e.orbitals) };
}

// Slot placement is checked on ideal slots; the measured angles the default embedding closes them to are tested below.
const IDEAL = { lonePairAngles: false };

test('lone pairs take equatorial tbp slots: SF4 is a seesaw and ClF3 is T-shaped', () => {
  for (const root of ['A', 'F1', 'F3']) {
    const sf4 = hypervalent('S', 4, 1, root, IDEAL);
    assert.equal(sf4.e.frames.get('A').kind, 'tbp');
    assert.ok(close(sf4.angles, [90, 90, 90, 90, 120, 180]), `SF4 (root ${root}) angles ${sf4.angles.map((x) => x.toFixed(1))}`);
    assert.equal(sf4.lp.length, 1);
    const axial = sf4.dirs.filter((d) => sf4.dirs.some((o) => Math.abs(angle(d, o) - 180) < 1e-6));
    assert.equal(axial.length, 2, 'two axial fluorines');
    assert.ok(Math.abs(v.dot(sf4.lp[0], axial[0])) < 1e-6, 'lone pair is perpendicular to the axis (equatorial)');
    const eq = sf4.dirs.filter((d) => !axial.includes(d));
    for (const d of eq) assert.ok(Math.abs(angle(sf4.lp[0], d) - 120) < 1e-6, 'lone pair at 120° to the equatorial fluorines');
    assertNoClashes(sf4.frame, `SF4 ${root}`);
  }
  const clf3 = hypervalent('Cl', 3, 2, 'A', IDEAL);
  assert.ok(close(clf3.angles, [90, 90, 180]), `ClF3 angles ${clf3.angles}`);
  assert.equal(clf3.lp.length, 2);
  assert.ok(Math.abs(angle(clf3.lp[0], clf3.lp[1]) - 120) < 1e-6, 'both lone pairs equatorial, 120° apart');
  const ax = clf3.dirs.find((d) => clf3.dirs.some((o) => Math.abs(angle(d, o) - 180) < 1e-6));
  for (const lp of clf3.lp) assert.ok(Math.abs(v.dot(lp, ax)) < 1e-6);
  const pf5 = hypervalent('P', 5, 0);
  assert.ok(close(pf5.angles, [90, 90, 90, 90, 90, 90, 120, 120, 120, 180]), 'PF5 is a full trigonal bipyramid');
});

test('lone pairs take trans octahedral slots: BrF5 is square pyramidal and XeF4 square planar', () => {
  for (const root of ['A', 'F2']) {
    const brf5 = hypervalent('Br', 5, 1, root, IDEAL);
    assert.equal(brf5.e.frames.get('A').kind, 'octahedral');
    assert.ok(close(brf5.angles, [90, 90, 90, 90, 90, 90, 90, 90, 180, 180]), `BrF5 (root ${root}) angles ${brf5.angles.map((x) => x.toFixed(1))}`);
    const apical = brf5.dirs.find((d) => !brf5.dirs.some((o) => Math.abs(angle(d, o) - 180) < 1e-6));
    assert.ok(apical, 'one fluorine has no trans partner');
    assert.ok(Math.abs(angle(brf5.lp[0], apical) - 180) < 1e-6, 'the lone pair is trans to the apical fluorine');
    const xef4 = hypervalent('Xe', 4, 2, root, IDEAL);
    assert.ok(close(xef4.angles, [90, 90, 90, 90, 180, 180]), `XeF4 (root ${root}) angles ${xef4.angles.map((x) => x.toFixed(1))}`);
    assert.equal(xef4.lp.length, 2);
    assert.ok(Math.abs(angle(xef4.lp[0], xef4.lp[1]) - 180) < 1e-6, 'lone pairs are trans');
    for (const d of xef4.dirs) assert.ok(Math.abs(v.dot(d, xef4.lp[0])) < 1e-6, 'all four fluorines lie in the plane perpendicular to the lone pairs');
    assertNoClashes(xef4.frame, `XeF4 ${root}`);
  }
  const sf6 = hypervalent('S', 6, 0);
  assert.equal(sf6.angles.filter((x) => Math.abs(x - 180) < 1e-6).length, 3);
});

test('lonePairSlots preferences and the VSEPR shape vocabulary', () => {
  assert.deepEqual(lonePairSlots('tbp', [0, 1, 2, 3, 4], 1), [4]);
  assert.deepEqual(lonePairSlots('tbp', [1, 2, 3, 4], 2), [4, 3]);
  assert.deepEqual(lonePairSlots('tbp', [0, 1, 3], 2), [3, 1], 'equatorial first, then axial');
  assert.deepEqual(lonePairSlots('octahedral', [0, 1, 2, 3, 4, 5], 1), [5]);
  assert.deepEqual(lonePairSlots('octahedral', [0, 1, 2, 3, 4, 5], 2), [5, 4]);
  assert.deepEqual(lonePairSlots('octahedral', [1, 2, 3, 5], 2), [3, 2], 'a free trans pair beats two cis slots');
  assert.deepEqual(lonePairSlots('octahedral', [1, 2, 5], 2), [5, 2], 'no trans pair free: last slots');
  assert.deepEqual(lonePairSlots('tetrahedral', [1, 2, 3], 2), [3, 2]);
  assert.deepEqual(lonePairSlots('tetrahedral', [1, 2, 3], 0), []);
  assert.deepEqual(lonePairSlots('trigonal', [], 1), []);
  assert.deepEqual(vseprShape(4, 1), { steric: 5, kind: 'tbp', shape: 'seesaw', angles: [90, 120, 180] });
  assert.equal(vseprShape(3, 2).shape, 'T-shaped');
  assert.equal(vseprShape(2, 3).shape, 'linear');
  assert.equal(vseprShape(5, 1).shape, 'square pyramidal');
  assert.equal(vseprShape(4, 2).shape, 'square planar');
  assert.equal(vseprShape(3, 1).shape, 'trigonal pyramidal');
  assert.deepEqual(vseprShape(2, 2), { steric: 4, kind: 'tetrahedral', shape: 'bent', angles: [109.5] });
  assert.deepEqual(vseprShape(2, 1), { steric: 3, kind: 'trigonal', shape: 'bent', angles: [120] });
  assert.equal(vseprShape(6, 0).shape, 'octahedral');
  // Templates and kinds are untouched: the new shapes come from lone-pair placement, not new templates.
  assert.deepEqual(GEOMETRY_KINDS, ['single', 'linear', 'trigonal', 'tetrahedral', 'tbp', 'octahedral', 'squarePlanar']);
  assert.equal(TEMPLATES.tbp.length, 5);
});

test('ammonia and water show the measured angles, the ideal slots stay one option away, and the library still embeds cleanly', () => {
  const nh3 = { atoms: [{ id: 'N', el: 'N', lonePairs: 1 }, { id: 'H1', el: 'H' }, { id: 'H2', el: 'H' }, { id: 'H3', el: 'H' }], bonds: [1, 2, 3].map((i) => ({ a: 'N', b: `H${i}`, order: 1 })) };
  const e = embed(nh3, { root: 'N' });
  const n = pos(e, 'N');
  // 1e-3: TEMPLATES.tetrahedral is built from TETRAHEDRAL = 109.4712° (rounded), so its three slots are not a perfect C₃ set.
  assert.ok(anglesAt(n, [1, 2, 3].map((i) => pos(e, `H${i}`))).every((x) => Math.abs(x - MEASURED_ANGLES.ammonia_HNH.value) < 1e-3), 'H–N–H = 106.7°');
  assert.equal(e.lonePairDirs.get('N').length, 1);
  const lpH = [1, 2, 3].map((i) => angle(e.lonePairDirs.get('N')[0], v.sub(pos(e, `H${i}`), n)));
  assert.ok(lpH.every((x) => Math.abs(x - lpH[0]) < 1e-3 && x > 109.47), `the lone pair stays on the C₃ axis, ${lpH[0].toFixed(2)}° from every H`);
  assert.equal(e.frames.get('N').compression.key, 'N/3/1/H,H,H');
  const ideal = embed(nh3, { root: 'N', lonePairAngles: false });
  assert.ok(anglesAt(pos(ideal, 'N'), [1, 2, 3].map((i) => pos(ideal, `H${i}`))).every((x) => Math.abs(x - 109.4712) < 1e-3), 'lonePairAngles: false keeps the ideal tetrahedral slots');
  assert.equal(ideal.frames.get('N').compression, null);
  const h2o = { atoms: [{ id: 'O', el: 'O', lonePairs: 2 }, { id: 'H1', el: 'H' }, { id: 'H2', el: 'H' }], bonds: [{ a: 'O', b: 'H1', order: 1 }, { a: 'O', b: 'H2', order: 1 }] };
  const w = embed(h2o, { root: 'H1' });
  assert.ok(Math.abs(angle(v.sub(pos(w, 'H1'), pos(w, 'O')), v.sub(pos(w, 'H2'), pos(w, 'O'))) - MEASURED_ANGLES.water_HOH.value) < 1e-6, 'H–O–H = 104.5°');
  assert.equal(w.lonePairDirs.get('O').length, 2);
  const lpAngle = angle(...w.lonePairDirs.get('O'));
  assert.ok(Math.abs(lpAngle - (2 * 109.4712 - MEASURED_ANGLES.water_HOH.value)) < 1e-3, `the lone pairs open by the bond compression (${lpAngle.toFixed(2)}°)`);
  const bondBis = v.norm(v.add(v.norm(v.sub(pos(w, 'H1'), pos(w, 'O'))), v.norm(v.sub(pos(w, 'H2'), pos(w, 'O')))));
  assert.ok(Math.abs(v.dot(bondBis, v.norm(v.add(...w.lonePairDirs.get('O')))) + 1) < 1e-9, 'lone-pair bisector stays anti to the bond bisector: compressed, not tilted');
  // A known explorer molecule still has every lone pair it had and no clashes.
  const { frame } = makeMolecule('alcohol', { R: { R1: 'tBu' } });
  assert.equal(frame.atoms.find((a) => a.id === 'O').lonePairDirs.length, 2);
  assertNoClashes(frame, 'tert-butanol');
});

test('lone-pair angle compression reproduces the measured hypervalent angles whichever atom is placed first', () => {
  const ax = MEASURED_ANGLES.SF4_axial_FSF.value, eq = MEASURED_ANGLES.SF4_equatorial_FSF.value;
  const axEq = Math.acos(Math.cos((ax / 2) * DEG) * Math.cos((eq / 2) * DEG)) / DEG;   // axial and equatorial bonds are 90° apart in azimuth
  for (const root of ['A', 'F1', 'F3']) {
    const sf4 = hypervalent('S', 4, 1, root);
    assert.ok(close(sf4.angles, [axEq, axEq, axEq, axEq, eq, ax], 1e-6), `SF4 (root ${root}) angles ${sf4.angles.map((x) => x.toFixed(2))}`);
    assert.equal(sf4.e.frames.get('A').compression.key, 'S/4/1');
    const resultant = v.norm(sf4.dirs.reduce((sum, d) => v.add(sum, d), [0, 0, 0]));
    assert.ok(Math.abs(v.dot(sf4.lp[0], resultant) + 1) < 1e-9, 'the lone pair points away from the resultant of the four bonds');
    assertNoClashes(sf4.frame, `SF4 ${root}`);
  }
  const clf3 = hypervalent('Cl', 3, 2);
  const clAx = MEASURED_ANGLES.ClF3_axial_FClF.value;
  assert.ok(close(clf3.angles, [clAx / 2, clAx / 2, clAx], 1e-6), `ClF3 angles ${clf3.angles}`);
  assert.ok(Math.abs(angle(clf3.lp[0], clf3.lp[1]) - (120 + 2 * (90 - clAx / 2))) < 1e-6, 'each equatorial lone pair opens by the axial compression');
  const ba = MEASURED_ANGLES.BrF5_basalApical_FBrF.value, cis = Math.acos(Math.cos(ba * DEG) ** 2) / DEG;
  for (const root of ['A', 'F2']) {
    const brf5 = hypervalent('Br', 5, 1, root);
    assert.ok(close(brf5.angles, [ba, ba, ba, ba, cis, cis, cis, cis, 2 * ba, 2 * ba], 1e-6), `BrF5 (root ${root}) angles ${brf5.angles.map((x) => x.toFixed(2))}`);
    const apical = brf5.dirs.find((d) => brf5.dirs.every((o) => o === d || Math.abs(angle(d, o) - ba) < 1e-6));
    assert.ok(apical && Math.abs(angle(brf5.lp[0], apical) - 180) < 1e-9, 'the apical fluorine stays on the axis, trans to the lone pair');
  }
  const xef4 = hypervalent('Xe', 4, 2);
  assert.ok(close(xef4.angles, [90, 90, 90, 90, 180, 180]), 'trans lone pairs cancel: XeF4 keeps the exact square');
  assert.equal(xef4.e.frames.get('A').compression, null);
  assert.equal(hypervalent('P', 5, 0).e.frames.get('A').compression, null, 'no lone pairs: nothing to compress');
});

test('lonePairAngleTargets: the most specific key wins, basis says what the number is, unlisted centres get the documented fallback', () => {
  assert.deepEqual(lonePairAngleTargets({ el: 'O', lonePairs: 2 }, ['H', 'C']), { targets: { 'bond-bond': 108.9 }, key: 'O/2/2/C,H', basis: 'exemplar', exemplar: 'CH₃OH', ref: 'methanol_COH', appliesTo: 'alcohols' });
  assert.equal(lonePairAngleTargets({ el: 'O', lonePairs: 2 }, ['C', 'C']).targets['bond-bond'], 111.2);
  const dflt = lonePairAngleTargets({ el: 'O', lonePairs: 2 }, ['Si', 'C']);
  assert.equal(dflt.key, 'O/2/2'); assert.equal(dflt.basis, 'class');
  // the physical lone-pair count is the key; a planar sp² oxygen with a p lone pair is a different row
  assert.equal(lonePairAngleTargets({ el: 'O', lonePairs: 2, hyb: 'sp2', pOrbital: 'lonePair' }, ['C', 'C']).key, 'O/2/2:sp2/C,C');
  assert.equal(lonePairAngleTargets({ el: 'O', lonePairs: 2, hyb: 'sp2', pOrbital: 'lonePair' }, ['C', 'H']).targets['bond-bond'], 106.3);
  assert.deepEqual(lonePairAngleTargets({ el: 'S', lonePairs: 1 }, ['F', 'F', 'F', 'F']).targets, { 'axial-axial': 173.1, 'equatorial-equatorial': 101.6 });
  const fb = lonePairAngleTargets({ el: 'Te', lonePairs: 2 }, ['H', 'H']);
  assert.equal(fb.targets, null); assert.equal(fb.basis, 'fallback'); assert.equal(fb.perPair, LONE_PAIR_COMPRESSION_PER_PAIR); assert.equal(fb.key, null);
  // every table row names a measurement in the oracle and agrees with it (the oracle is never read by the embedder)
  for (const [key, row] of Object.entries(LONE_PAIR_ANGLES)) {
    for (const [label, c] of row.classes ? Object.entries(row.classes).map(([k, c]) => [`${key} ${k}`, c]) : [[key, row]]) {
      const m = MEASURED_ANGLES[c.ref];
      assert.ok(m, `${label}: ref ${c.ref} exists in measured.js`);
      assert.ok(Math.abs(m.value - c.angle) < 0.05, `${label}: ${c.angle}° equals the cited ${m.value}°`);
      assert.ok(m.source && m.cas && m.molecule, `${label}: citation complete`);
    }
  }
  // fallback: every bonded angle closes by 2.5° per lone pair
  assert.ok(Math.abs(hypervalent('Te', 2, 2, 'A', {}, 'H').angles[0] - (109.4712 - 2 * LONE_PAIR_COMPRESSION_PER_PAIR)) < 1e-3, 'H–Te–H: two lone pairs, 5° off tetrahedral');
  const tecl4 = hypervalent('Te', 4, 1, 'A', {}, 'Cl');
  assert.ok(Math.abs(tecl4.angles[5] - (180 - LONE_PAIR_COMPRESSION_PER_PAIR)) < 1e-6 && Math.abs(tecl4.angles[4] - (120 - LONE_PAIR_COMPRESSION_PER_PAIR)) < 1e-6, `fallback seesaw ${tecl4.angles.map((x) => x.toFixed(1))}`);
  assert.equal(tecl4.e.frames.get('A').compression.basis, 'fallback');
  // the direct API: nothing to do without lone pairs, with one bond, or with lone pairs that cancel
  assert.equal(compressLonePairSlots('tetrahedral', TEMPLATES.tetrahedral, [0, 1, 2, 3], []), null);
  assert.equal(compressLonePairSlots('tetrahedral', TEMPLATES.tetrahedral, [0], [1, 2, 3], { 'bond-bond': 100 }), null);
  assert.equal(compressLonePairSlots('octahedral', TEMPLATES.octahedral, [0, 1, 2, 3], [4, 5]), null);
  const out = compressLonePairSlots('tetrahedral', TEMPLATES.tetrahedral, [0, 1], [2, 3], { 'bond-bond': 104.5 });
  assert.ok(Math.abs(angle(out[0], out[1]) - 104.5) < 1e-9 && out.every((d) => Math.abs(v.len(d) - 1) < 1e-12));
  assert.ok(Math.abs(angle(TEMPLATES.tetrahedral[0], TEMPLATES.tetrahedral[1]) - 109.4712) < 1e-3, 'the template itself is untouched');
  const wide = compressLonePairSlots('tetrahedral', TEMPLATES.tetrahedral, [0, 1], [2, 3], { 'bond-bond': 111.2 });
  assert.ok(Math.abs(angle(wide[0], wide[1]) - 111.2) < 1e-9 && angle(wide[2], wide[3]) < 109.47, 'an ether opens past tetrahedral ("compression" is signed) and its lone pairs close in');
});

test('boundaries: the hybridisation flag, not the neighbours, separates a phenol from an acid; pinned atoms never move', () => {
  // phenol: alcohol core with R1 = phenyl keeps an sp³ oxygen → the methanol row (measured phenol 109°)
  const phenol = buildMolecule('alcohol', { R: { R1: 'phenyl' } });
  const ep = embed(phenol, { root: 'O' });
  assert.equal(ep.frames.get('O').compression.key, 'O/2/2/C,H');
  assert.ok(Math.abs(angle(v.sub(pos(ep, 'H'), pos(ep, 'O')), v.sub(pos(ep, phenol.aliases.R1), pos(ep, 'O'))) - MEASURED_ANGLES.methanol_COH.value) < 1e-6);
  // carboxylic acid: the O–H oxygen is sp² with a p lone pair → the formic-acid row
  const acid = buildMolecule('carboxylicAcid');
  const ea = embed(acid, { root: 'C' });
  assert.equal(ea.frames.get('O2').compression.key, 'O/2/2:sp2/C,H');
  assert.ok(Math.abs(angle(v.sub(pos(ea, 'C'), pos(ea, 'O2')), v.sub(pos(ea, 'H'), pos(ea, 'O2'))) - MEASURED_ANGLES.formicAcid_COH.value) < 1e-6);
  assert.equal(ea.frames.get('O2').kind, 'trigonal', 'still planar: the compression happens inside the plane');
  const ester = buildMolecule('ester');
  const ee = embed(ester, { root: 'C' });
  assert.equal(ee.frames.get('O2').compression.key, 'O/2/2:sp2/C,C');
  // a centre with its first neighbour pinned: the pinned atom stays, the others close around it
  const nh3 = { atoms: [{ id: 'N', el: 'N', lonePairs: 1 }, { id: 'H1', el: 'H' }, { id: 'H2', el: 'H' }, { id: 'H3', el: 'H' }], bonds: [1, 2, 3].map((i) => ({ a: 'N', b: `H${i}`, order: 1 })) };
  const one = embed(nh3, { pinned: { N: [0, 0, 0], H1: [0, 0, 1.01] } });
  assert.deepEqual(pos(one, 'H1'), [0, 0, 1.01]);
  assert.ok(anglesAt(pos(one, 'N'), [1, 2, 3].map((i) => pos(one, `H${i}`))).every((x) => Math.abs(x - MEASURED_ANGLES.ammonia_HNH.value) < 1e-3), 'all three angles measured');
  // two pinned neighbours at ideal positions: neither moves; only the placed hydrogen takes a compressed slot
  const T = 109.4712 * DEG;
  const two = embed(nh3, { pinned: { N: [0, 0, 0], H1: [0, 0, 1.01], H2: [1.01 * Math.sin(T), 0, 1.01 * Math.cos(T)] } });
  const a12 = angle(pos(two, 'H1'), pos(two, 'H2')), a13 = angle(pos(two, 'H1'), pos(two, 'H3'));
  assert.ok(Math.abs(a12 - 109.4712) < 1e-3, 'pinned pair keeps its authored angle');
  assert.ok(Math.abs(a13 - MEASURED_ANGLES.ammonia_HNH.value) < 1e-3, 'the placed hydrogen sits on the compressed slot relative to the first neighbour');
  assert.ok(two.frames.get('N').compression, 'compression is recorded even when only one neighbour was placed');
});

test('compression keeps the first placed neighbour and the torsion; fully pinned centres stay ideal; the explorer shows the table values', () => {
  const ethanol = {
    atoms: [{ id: 'O', el: 'O', lonePairs: 2 }, { id: 'H', el: 'H' }, { id: 'C1', el: 'C' }, { id: 'H1a', el: 'H' }, { id: 'H1b', el: 'H' }, { id: 'C2', el: 'C' }, { id: 'H2a', el: 'H' }, { id: 'H2b', el: 'H' }, { id: 'H2c', el: 'H' }],
    bonds: [['O', 'H'], ['O', 'C1'], ['C1', 'H1a'], ['C1', 'H1b'], ['C1', 'C2'], ['C2', 'H2a'], ['C2', 'H2b'], ['C2', 'H2c']].map(([a, b]) => ({ a, b, order: 1 })),
  };
  for (const root of ['O', 'H', 'C1', 'C2']) {
    const e = embed(ethanol, { root });
    const p = (id) => pos(e, id);
    assert.ok(Math.abs(angle(v.sub(p('C1'), p('O')), v.sub(p('H'), p('O'))) - MEASURED_ANGLES.methanol_COH.value) < 1e-6, `C–O–H = 108.9° (root ${root})`);
    assert.ok(Math.abs(Math.abs(dihedral(p('C2'), p('C1'), p('O'), p('H')) / DEG) - 180) < 1e-6, `C–C–O–H stays anti (root ${root})`);
    assert.ok(anglesAt(p('C1'), [p('O'), p('H1a'), p('H1b'), p('C2')]).every((x) => Math.abs(x - 109.4712) < 1e-3), 'the carbon next door keeps ideal tetrahedral angles');
    const f = e.frames.get('O');
    const first = root === 'H' ? 'H' : root === 'O' ? null : 'C1';
    if (first) assert.ok(Math.abs(v.dot(f.slots[f.slotOf[first]], v.norm(v.sub(p(first), p('O'))))) - 1 < 1e-9, 'the slot of the first placed neighbour still points at it');
    assert.equal(f.compression.key, 'O/2/2/C,H');
  }
  // A centre whose neighbours are all pinned (mechanism frames) keeps its ideal slots and lone pairs.
  const T = 109.4712 * DEG;
  const water = { atoms: [{ id: 'O', el: 'O', lonePairs: 2 }, { id: 'H1', el: 'H' }, { id: 'H2', el: 'H' }], bonds: [{ a: 'O', b: 'H1', order: 1 }, { a: 'O', b: 'H2', order: 1 }] };
  const w = embed(water, { pinned: { O: [0, 0, 0], H1: [0, 0, 0.96], H2: [0.96 * Math.sin(T), 0, 0.96 * Math.cos(T)] } });
  assert.ok(Math.abs(angle(...w.lonePairDirs.get('O')) - 109.4712) < 1e-3);
  assert.equal(w.frames.get('O').compression, null);
  // The functional-group explorer's lone-pair centres show the table values.
  for (const [id, centre, expected] of [['alcohol', 'O', MEASURED_ANGLES.methanol_COH.value], ['ether', 'O', MEASURED_ANGLES.dimethylEther_COC.value], ['amine', 'N', MEASURED_ANGLES.ammonia_HNH.value], ['thiol', 'S', MEASURED_ANGLES.methanethiol_CSH.value], ['carboxylicAcid', 'O2', MEASURED_ANGLES.formicAcid_COH.value], ['ester', 'O2', MEASURED_ANGLES.methylFormate_COC.value]]) {
    const { frame } = makeMolecule(id);
    const byId = new Map(frame.atoms.map((a) => [a.id, a]));
    const nb = frame.bonds.filter((b) => b.a === centre || b.b === centre).map((b) => byId.get(b.a === centre ? b.b : b.a).pos);
    assert.ok(anglesAt(byId.get(centre).pos, nb).every((x) => Math.abs(x - expected) < 1e-3), `${id}: angle at ${centre} = ${expected}°`);
    assertNoClashes(frame, id);
  }
});

/** Embed a ring fragment as a standalone molecule and return positions + frame. */
function embedRing(tpl, extraAtoms = [], extraBonds = []) {
  const graph = { atoms: [...tpl.atoms, ...extraAtoms], bonds: [...tpl.bonds, ...extraBonds], rigid: [tpl.rigid] };
  const e = embed(graph, { root: tpl.ring[0] });
  relaxTorsions(graph, e.positions, e.lonePairDirs, e.orbitals, e.frames);
  return { graph, e, frame: toFrame(graph, e.positions, e.lonePairDirs, e.orbitals) };
}
const EXPECTED_CCC = { cyclopropane: [60, 60], cyclobutane: [88, 89.5], cyclopentane: [101, 107], cyclohexaneChair: [109.5, 110.5], cyclohexaneBoat: [110.5, 111.5] };

test('cycloalkane templates close exactly, keep C–H lengths and ring angles, and embed without clashes', () => {
  assert.deepEqual(RING_SHAPES, ['cyclopropane', 'cyclobutane', 'cyclopentane', 'cyclohexaneChair', 'cyclohexaneBoat']);
  for (const shape of RING_SHAPES) {
    const tpl = ringTemplate(shape);
    const n = tpl.ring.length;
    assert.equal(tpl.atoms.length, 3 * n, `${shape}: n carbons + 2n hydrogens`);
    assert.equal(tpl.bonds.length, 3 * n);
    const c = tpl.rigid.coords;
    for (let k = 0; k < n; k++) assert.ok(Math.abs(v.dist(c[tpl.ring[k]], c[tpl.ring[(k + 1) % n]]) - 1.54) < 1e-6, `${shape}: ring closure bond ${k}`);
    const [lo, hi] = EXPECTED_CCC[shape];
    for (let k = 0; k < n; k++) {
      const a = angle(v.sub(c[tpl.ring[(k + n - 1) % n]], c[tpl.ring[k]]), v.sub(c[tpl.ring[(k + 1) % n]], c[tpl.ring[k]]));
      assert.ok(a >= lo - 1e-6 && a <= hi + 1e-6, `${shape}: C–C–C at ${tpl.ring[k]} = ${a.toFixed(2)}° (expected ${lo}–${hi})`);
    }
    for (const b of tpl.bonds.filter((x) => x.b.startsWith('H'))) {
      assert.ok(Math.abs(v.dist(c[b.a], c[b.b]) - 1.09) < 1e-9, `${shape}: C–H length`);
      // Each H makes a (near-)tetrahedral angle with both ring bonds, never more than the 115° small-ring cap from the other H.
      const k = tpl.ring.indexOf(b.a);
      for (const nb of [tpl.ring[(k + n - 1) % n], tpl.ring[(k + 1) % n]]) { const a = angle(v.sub(c[b.b], c[b.a]), v.sub(c[nb], c[b.a])); assert.ok(a > 105 && a < 125, `${shape}: H–C–C ${a.toFixed(1)}`); }
    }
    for (const cid of tpl.ring) {
      const hs = tpl.bonds.filter((x) => x.a === cid && x.b.startsWith('H')).map((x) => x.b);
      const hch = angle(v.sub(c[hs[0]], c[cid]), v.sub(c[hs[1]], c[cid]));
      assert.ok(hch > 105 && hch < 115.01, `${shape}: H–C–H ${hch.toFixed(1)}`);
    }
    const { frame } = embedRing(tpl);
    assertNoClashes(frame, shape);
    const byId = new Map(frame.atoms.map((a) => [a.id, a]));
    for (const b of frame.bonds) assert.ok(Math.abs(v.dist(byId.get(b.a).pos, byId.get(b.b).pos) - bondLength(byId.get(b.a).el, byId.get(b.b).el)) < 0.08, `${shape}: embedded ${b.a}–${b.b}`);
    assert.equal(tpl.attach, 'C1');
    assert.ok(Math.abs(v.len(tpl.rigid.attachDir) - 1) < 1e-9 && Math.abs(v.len(tpl.rigid.planeAxis) - 1) < 1e-9);
  }
  const scaled = ringTemplate('cyclopropane', { ccLength: 1.51, chLength: 1.08, prefix: 'r.' });
  assert.ok(Math.abs(v.dist(scaled.rigid.coords['r.C1'], scaled.rigid.coords['r.C2']) - 1.51) < 1e-9);
  assert.ok(scaled.atoms.some((a) => a.id === 'r.H1up'));
  assert.throws(() => ringTemplate('cycloheptane'), /unknown ring shape/);
});

test('chair sites: axial bonds parallel to the ring axis and alternating, equatorial ones splayed; dihedrals 180° / 60°', () => {
  const tpl = ringTemplate('cyclohexaneChair');
  const c = tpl.rigid.coords;
  const z = [0, 0, 1];
  tpl.ring.forEach((cid, k) => {
    const s = tpl.sites[cid];
    assert.ok(s.axial && s.equatorial, 'chair carbons have axial and equatorial sites');
    assert.ok(Math.abs(v.dot(s.axial, z)) > 0.99, `${cid}: axial is parallel to the axis (${v.dot(s.axial, z).toFixed(3)})`);
    assert.ok(Math.abs(v.dot(s.equatorial, z)) < 0.35, `${cid}: equatorial is roughly in the mean plane`);
    assert.equal(Math.sign(v.dot(s.axial, z)), k % 2 ? -1 : 1, 'axial direction alternates up/down around the ring');
    assert.equal(Math.sign(v.dot(s.equatorial, z)), k % 2 ? 1 : -1, 'equatorial tilts the other way');
    assert.ok(s.up[2] > s.down[2]);
    assert.ok(tpl.atoms.some((a) => a.id === `H${k + 1}ax`) && tpl.atoms.some((a) => a.id === `H${k + 1}eq`));
  });
  const d = (a, b, cc, dd) => Math.abs(dihedral(c[a], c[b], c[cc], c[dd]) / DEG);
  assert.ok(Math.abs(d('H1ax', 'C1', 'C2', 'H2ax') - 180) < 3, `trans-diaxial H–C–C–H = ${d('H1ax', 'C1', 'C2', 'H2ax').toFixed(1)}°`);
  assert.ok(Math.abs(d('H1eq', 'C1', 'C2', 'H2eq') - 60) < 6, `diequatorial H–C–C–H ≈ 60° (${d('H1eq', 'C1', 'C2', 'H2eq').toFixed(1)}°)`);
  assert.ok(Math.abs(d('H1ax', 'C1', 'C2', 'H2eq') - 60) < 6, `axial–equatorial gauche (${d('H1ax', 'C1', 'C2', 'H2eq').toFixed(1)}°)`);
  assert.ok(Math.abs(d('C6', 'C1', 'C2', 'C3') - 55) < 6, `ring torsion ≈ 55° (${d('C6', 'C1', 'C2', 'C3').toFixed(1)}°)`);
  // 1,3-diaxial hydrogens on the same face sit ≈ 2.5 Å apart (the classic steric clash distance).
  const dax = v.dist(c.H1ax, c.H3ax);
  assert.ok(dax > 2.3 && dax < 2.7, `1,3-diaxial H···H = ${dax.toFixed(2)} Å`);
  // Boat: the bow and stern (C1, C4) 'up' sites are the flagpoles pointing at each other.
  const boat = ringTemplate('cyclohexaneBoat');
  const bc = boat.rigid.coords;
  assert.ok(v.dot(boat.sites.C1.up, v.sub(bc.C4, bc.C1)) > 0 && v.dot(boat.sites.C4.up, v.sub(bc.C1, bc.C4)) > 0, 'flagpole hydrogens lean toward each other');
  const flag = v.dist(bc.H1ax, bc.H4ax);
  assert.ok(flag < v.dist(bc.H1eq, bc.H4eq), 'flagpole H···H is the short contact');
  assert.ok(!ringTemplate('cyclopropane').sites.C1.axial, 'cyclopropane sites are only up/down');
});

test('substituents attach at a named site and replace that hydrogen; cis/trans follows up/down', () => {
  const methyl = (p) => ({ atoms: [{ id: `${p}H1`, el: 'H' }, { id: `${p}H2`, el: 'H' }, { id: `${p}H3`, el: 'H' }], bonds: [1, 2, 3].map((i) => ({ a: `${p}C`, b: `${p}H${i}`, order: 1 })) });
  for (const site of ['axial', 'equatorial']) {
    const tpl = ringTemplate('cyclohexaneChair', { substituents: { C1: { [site]: 'Me.C' } } });
    assert.ok(tpl.atoms.some((a) => a.id === 'Me.C' && a.el === 'C'));
    assert.ok(!tpl.atoms.some((a) => a.id === (site === 'axial' ? 'H1ax' : 'H1eq')), 'the substituted H is gone');
    assert.ok(tpl.atoms.some((a) => a.id === (site === 'axial' ? 'H1eq' : 'H1ax')), 'the other H stays');
    assert.equal(tpl.atoms.length, 18, '6 C + 11 H + the substituent');
    assert.deepEqual(tpl.substituted['Me.C'].site, site);
    assert.ok(v.dot(v.norm(v.sub(tpl.rigid.coords['Me.C'], tpl.rigid.coords.C1)), tpl.sites.C1[site]) > 0.999999, 'template places the methyl on the site');
    const me = methyl('Me.');
    const { e, frame } = embedRing(tpl, me.atoms, me.bonds);
    // The embedder rotates the rigid chair into world space, so compare with the embedded ring's own axis.
    const ringPts = tpl.ring.map((id) => pos(e, id)), ctr = v.centroid(ringPts);
    let axis = [0, 0, 0];
    ringPts.forEach((q, k) => { axis = v.add(axis, v.cross(v.sub(q, ctr), v.sub(ringPts[(k + 1) % 6], ctr))); });
    axis = v.norm(axis);
    const dir = v.norm(v.sub(pos(e, 'Me.C'), pos(e, 'C1')));
    if (site === 'axial') assert.ok(Math.abs(v.dot(dir, axis)) > 0.99, `axial methyl is parallel to the ring axis (${v.dot(dir, axis).toFixed(3)})`);
    else assert.ok(Math.abs(v.dot(dir, axis)) < 0.35, `equatorial methyl lies near the mean plane (${v.dot(dir, axis).toFixed(3)})`);
    assert.ok(Math.abs(v.dist(pos(e, 'Me.C'), pos(e, 'C1')) - bondLength('C', 'C')) < 1e-9);
    assertNoClashes(frame, `${site}-methylcyclohexane`);
    assert.ok(frame.atoms.every((a) => a.pos.every(Number.isFinite)));
  }
  // cis-1,2: one axial up on C1 and one equatorial up on C2 are on the same face.
  const cis = ringTemplate('cyclohexaneChair', { substituents: { C1: { axial: { id: 'X', el: 'Cl', length: 1.79 } }, C2: { equatorial: { id: 'Y', el: 'Cl', length: 1.79 } } } });
  assert.ok(cis.sites.C1.axial[2] > 0 && cis.sites.C2.equatorial[2] > 0, 'both substituents point up (cis)');
  assert.ok(cis.sites.C2.axial[2] < 0, 'the alternative on C2 would be trans');
  assert.ok(Math.abs(v.dist(cis.rigid.coords.X, cis.rigid.coords.C1) - 1.79) < 1e-9);
  assert.equal(cis.atoms.find((a) => a.id === 'X').el, 'Cl');
  // up/down names work on every ring and as an R-group attachment.
  const cp = ringTemplate('cyclopropane', { substituents: { C2: { up: 'R' } }, attachAt: 'C1' });
  assert.ok(cp.atoms.some((a) => a.id === 'R') && !cp.atoms.some((a) => a.id === 'H2up') && !cp.atoms.some((a) => a.id === 'H1up'), 'attachment drops the C1 up hydrogen');
  assert.ok(Math.abs(v.dot(cp.rigid.attachDir, cp.sites.C1.up) - 1) < 1e-9);
  const chairR = ringTemplate('cyclohexaneChair', { attachAt: 'C1' });
  assert.ok(Math.abs(v.dot(chairR.rigid.attachDir, chairR.sites.C1.equatorial) - 1) < 1e-9, 'an R-group cyclohexyl attaches equatorially by default');
  assert.throws(() => ringTemplate('cyclohexaneChair', { substituents: { C1: { sideways: 'Q' } } }), /unknown site/);
  assert.throws(() => ringTemplate('cyclopropane', { substituents: { C1: { axial: 'Q' } } }), /no axial site/);
  assert.throws(() => ringTemplate('cyclohexaneChair', { substituents: { C1: { equatorial: 'Q' } }, attachAt: 'C1' }), /both the attachment and substituted/);
  assert.throws(() => ringTemplate('cyclohexaneChair', { attachAt: 'C9' }), /no ring carbon/);
  // A cyclohexyl R group placed by the embedder through its rigid template keeps the chair intact.
  const rg = ringTemplate('cyclohexaneChair', { prefix: 'R.', attachAt: 'C1' });
  const graph = { atoms: [{ id: 'O', el: 'O', lonePairs: 2 }, { id: 'H', el: 'H' }, ...rg.atoms], bonds: [{ a: 'O', b: 'H', order: 1 }, { a: 'O', b: 'R.C1', order: 1 }, ...rg.bonds], rigid: [rg.rigid] };
  const e = embed(graph, { root: 'O' });
  const f = toFrame(graph, e.positions, e.lonePairDirs, e.orbitals);
  assertNoClashes(f, 'cyclohexanol');
  for (let k = 0; k < 6; k++) assert.ok(Math.abs(v.dist(pos(e, rg.ring[k]), pos(e, rg.ring[(k + 1) % 6])) - 1.54) < 1e-6, 'chair rides rigidly');
  assert.ok(Math.abs(v.dist(pos(e, 'O'), pos(e, 'R.C1')) - bondLength('C', 'O')) < 1e-9);
});

test('mirror() reflects every supported shape, preserves distances and inverts chirality', () => {
  const p = [1, 2, 3];
  assert.deepEqual(mirror(p), [-1, 2, 3]);
  assert.deepEqual(mirror(p, { normal: [0, 1, 0] }), [1, -2, 3]);
  assert.deepEqual(mirror(p, { normal: [0, 0, 2], point: [0, 0, 1] }), [1, 2, -1]);
  assert.deepEqual(mirror([[1, 0, 0], [0, 1, 0]]), [[-1, 0, 0], [0, 1, 0]]);
  const m = mirror(new Map([['a', [1, 1, 1]], ['b', [-2, 0, 0]]]));
  assert.ok(m instanceof Map); assert.deepEqual(m.get('a'), [-1, 1, 1]); assert.deepEqual(m.get('b'), [2, 0, 0]);
  assert.deepEqual(mirror({ a: [1, 0, 0] }), { a: [-1, 0, 0] });
  assert.deepEqual(mirror(mirror(p, { normal: [1, 1, 0] }), { normal: [1, 1, 0] }).map((x) => +x.toFixed(12)), p);
  // A chiral centre: (R)-like arrangement of four different substituents has a signed volume that flips sign.
  const { frame } = makeMolecule('alcohol', { R: { R1: 'ethyl' } });
  const mf = mirror(frame);
  const byId = (f) => new Map(f.atoms.map((a) => [a.id, a]));
  const A = byId(frame), B = byId(mf);
  for (const b of frame.bonds) assert.ok(Math.abs(v.dist(A.get(b.a).pos, A.get(b.b).pos) - v.dist(B.get(b.a).pos, B.get(b.b).pos)) < 1e-12, 'bond lengths preserved');
  assert.equal(mf.bonds.length, frame.bonds.length);
  assert.notEqual(mf.atoms, frame.atoms);
  const O = A.get('O'), c = O.pos;
  const vol = (f) => { const m = byId(f); const o = m.get('O').pos; const [a, b, d] = [m.get('R1.C1').pos, m.get('H').pos, v.add(o, m.get('O').lonePairDirs[0])]; return v.dot(v.sub(a, o), v.cross(v.sub(b, o), v.sub(d, o))); };
  assert.ok(Math.abs(vol(frame)) > 1e-3 && Math.sign(vol(mf)) === -Math.sign(vol(frame)), 'handedness inverts');
  assert.equal(B.get('O').lonePairDirs.length, 2);
  assert.ok(Math.abs(v.dot(B.get('O').lonePairDirs[0], [1, 0, 0]) + v.dot(O.lonePairDirs[0], [1, 0, 0])) < 1e-12, 'lone-pair directions are mirrored too');
  assert.deepEqual(c, O.pos, 'input is untouched');
  assert.throws(() => mirror(42), /expected/);
});
