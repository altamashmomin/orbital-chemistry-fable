import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fakeDom.js';
import { assertNoClashes } from './helpers.js';
import { COMPLEXES, LIGANDS, SLOTS, ISOMERS, D_ORBITALS, complexById, dCount, fillD, levelPattern, freeIonFilling, spinOnlyMoment, splittingSpec, slotAssignment, complexFrame, dOrbitalPsi, buildComplex, seriesComparisons, seriesRank, KJ_PER_WAVENUMBER } from '../src/chem/transitionMetals.js';
import { CRYSTAL_FIELD, DELTA_O, SPECTROCHEMICAL_SERIES, COMPLEX_MAGNETISM, COMPLEX_COLOURS, D_ORBITAL_ZEFF, METAL_GROUPS } from '../src/chem/references/textbook.js';
import { bondLength } from '../src/chem/elements.js';
import { v, DEG } from '../src/chem/geometry.js';
import { layoutLevels } from '../src/ui/levelDiagram.js';
import { validateCollection } from '../src/ui/collectionExplorer.js';
import { validateTopic } from '../src/topics/registry.js';
import { transitionMetals } from '../src/topics/transition-metals/index.js';
import { atomicOrbitals } from '../src/topics/atomic-orbitals/index.js';
import { INVARIANTS, GLOSSARY_TERMS } from '../src/topics/transition-metals/content.js';
import { ACTIVITIES, correctOption } from '../src/topics/transition-metals/activities.js';
import { makeMetalsCollection, configurationText } from '../src/topics/transition-metals/panel.js';
import { GLOSSARY } from '../src/nexus/glossary.js';
import { isValidAudience, audienceOf } from '../src/chem/audience.js';

const angle = (a, c, b) => Math.acos(Math.max(-1, Math.min(1, v.dot(v.norm(v.sub(a, c)), v.norm(v.sub(b, c)))))) / DEG;
const near = (x, y, tol = 1e-6) => Math.abs(x - y) < tol;

test('tables: every complex has a stated oxidation state that the charges reproduce, a d count 0–10, magnetism and colour rows', () => {
  assert.ok(COMPLEXES.length >= 20);
  for (const c of COMPLEXES) {
    const k = dCount(c);
    assert.equal(k.oxidation, c.oxidation, `${c.id}: charge − ligand charges = oxidation state`);
    assert.ok(k.d >= 0 && k.d <= 10 && k.group === METAL_GROUPS.values[c.metal], `${c.id}: d${k.d}`);
    assert.ok(COMPLEX_MAGNETISM.values[c.id] && Number.isInteger(COMPLEX_MAGNETISM.values[c.id].unpaired), `${c.id} has a tabulated unpaired count`);
    assert.ok(c.id in COMPLEX_COLOURS.values, `${c.id} has a colour entry`);
    assert.ok(c.ligands.every(({ lig, n }) => LIGANDS[lig] && n > 0) && c.ligands.reduce((s, l) => s + l.n, 0) === SLOTS[c.geometry].length, `${c.id}: ligands fill the template`);
    if (c.isomers) { assert.equal(c.ligands.length, 2); for (const iso of c.isomers) assert.equal(ISOMERS[c.geometry][iso].length, c.ligands[1].n, `${c.id} ${iso}`); }
    if (DELTA_O.values[c.id] != null) assert.equal(c.geometry, 'octahedral', `${c.id}: Δo is octahedral only`);
  }
  for (const id of Object.keys(DELTA_O.values)) assert.ok(complexById(id), `DELTA_O.${id} names a complex`);
  for (const id of Object.keys(COMPLEX_MAGNETISM.values)) assert.ok(complexById(id), `COMPLEX_MAGNETISM.${id} names a complex`);
  assert.ok(DELTA_O.unit === 'cm⁻¹' && DELTA_O.source && CRYSTAL_FIELD.source && SPECTROCHEMICAL_SERIES.source && COMPLEX_MAGNETISM.source && COMPLEX_COLOURS.source && D_ORBITAL_ZEFF.source && METAL_GROUPS.source);
  // the spectrochemical series: halides below water below ammonia below cyanide
  assert.ok(seriesRank('chloro') < seriesRank('fluoro') && seriesRank('fluoro') < seriesRank('aqua') && seriesRank('aqua') < seriesRank('ammine') && seriesRank('ammine') < seriesRank('cyano'));
  for (const lig of Object.keys(LIGANDS)) assert.ok(seriesRank(lig) >= 0, `${lig} is in the series`);
  assert.ok(near(D_ORBITAL_ZEFF.value, 26 - (18 + 5 * 0.35), 1e-9), "Slater's rules for Fe 3d");
  assert.ok(near(KJ_PER_WAVENUMBER, 6.62607015e-34 * 2.99792458e10 * 6.02214076e23 / 1000, 1e-5), '1 cm⁻¹ in kJ/mol');
});

test('crystal field: barycentre rule, high / low spin fillings match the textbook unpaired counts, free-ion Hund filling', () => {
  const oct = levelPattern('octahedral'), tet = levelPattern('tetrahedral'), sqp = levelPattern('squarePlanar');
  assert.ok(near(oct.reduce((s, l) => s + l.E, 0), 0) && near(tet.reduce((s, l) => s + l.E, 0), 0), 'barycentre');
  assert.deepEqual(oct.map((l) => l.set), ['t2g', 't2g', 't2g', 'eg', 'eg']);
  assert.deepEqual(tet.map((l) => l.set), ['e', 'e', 't2', 't2', 't2']);
  assert.deepEqual(sqp.map((l) => l.id), ['dyz', 'dxz', 'dz2', 'dxy', 'dx2y2'], 'square planar: d(x²−y²) on top');
  assert.ok(near(CRYSTAL_FIELD.tetrahedral.ratio, 4 / 9));
  // textbook table: unpaired electrons for d1–d10 octahedral, high and low spin
  const high = [1, 2, 3, 4, 5, 4, 3, 2, 1, 0], low = [1, 2, 3, 2, 1, 0, 1, 2, 1, 0];
  for (let n = 1; n <= 10; n++) { assert.equal(fillD(n, 'octahedral', 'high').unpaired, high[n - 1], `d${n} high spin`); assert.equal(fillD(n, 'octahedral', 'low').unpaired, low[n - 1], `d${n} low spin`); }
  // CFSE (units of Δo): d6 low −2.4 + 2P, d6 high −0.4, d3 −1.2, d5 high 0, d8 −1.2
  assert.ok(near(fillD(6, 'octahedral', 'low').cfse.delta, -2.4) && fillD(6, 'octahedral', 'low').cfse.pairing === 2 && fillD(6, 'octahedral', 'low').cfse.text === '−2.4 Δo + 2P');
  assert.ok(near(fillD(6, 'octahedral', 'high').cfse.delta, -0.4) && fillD(6, 'octahedral', 'high').cfse.pairing === 0);
  assert.ok(near(fillD(3, 'octahedral').cfse.delta, -1.2) && near(fillD(5, 'octahedral', 'high').cfse.delta, 0) && near(fillD(8, 'octahedral').cfse.delta, -1.2));
  assert.equal(fillD(4, 'octahedral', 'low').cfse.text, '−1.6 Δo + P');
  // tetrahedral always high spin, square planar d8 all paired
  assert.equal(fillD(8, 'tetrahedral', 'low').unpaired, 2); assert.ok(near(fillD(8, 'tetrahedral').cfse.delta, -0.8) && fillD(8, 'tetrahedral').cfse.text === '−0.8 Δt');
  assert.equal(fillD(8, 'squarePlanar', 'high').unpaired, 0); assert.equal(fillD(8, 'squarePlanar').levels.find((l) => l.id === 'dx2y2').electrons, 0);
  assert.deepEqual(freeIonFilling(7).map((l) => l.electrons), [2, 2, 1, 1, 1]);
  assert.ok(near(spinOnlyMoment(5), Math.sqrt(35)) && near(spinOnlyMoment(0), 0));
  assert.throws(() => fillD(11, 'octahedral'), /out of range/); assert.throws(() => levelPattern('cubic'), /unknown geometry/);
  for (const c of COMPLEXES) { const b = buildComplex(c.id); const m = COMPLEX_MAGNETISM.values[c.id]; assert.equal(b.unpaired, m.unpaired, `${c.id}: ${b.spin} spin filling gives the tabulated unpaired count`); if (m.spin) assert.equal(b.spin, m.spin); }
  assert.equal(configurationText(fillD(6, 'octahedral', 'high')), 't₂g⁴ e_g²'); assert.equal(configurationText(fillD(8, 'tetrahedral')), 'e⁴ t₂⁴');
  const spec = splittingSpec(complexById('feAqua'), fillD(6, 'octahedral', 'high'), 6);
  assert.equal(spec.levels.length, 10); assert.equal(spec.connections.length, 5);
  assert.ok(layoutLevels(spec, { width: 320, height: 250 }).levels.every((l) => Number.isFinite(l.y)));
  for (const id of D_ORBITALS) assert.ok(spec.levels.some((l) => l.id === id && l.column === 'field'), `${id} is a clickable level`);
});

test('frames: donors on the template at the table length, ideal ligand angles, no clashes, isomer angles as named', () => {
  for (const c of COMPLEXES) for (const iso of c.isomers || [null]) {
    const { frame, donors, metalId } = complexFrame(c.id, iso);
    const at = (id) => frame.atoms.find((a) => a.id === id);
    const M = at(metalId);
    assert.equal(M.el, c.metal); assert.ok(M.label.includes(c.metal));
    assert.equal(donors.length, SLOTS[c.geometry].length);
    for (const d of donors) {
      const p = at(d.id).pos;
      assert.ok(near(v.dist(p, M.pos), bondLength(c.metal, d.el, 1), 1e-9), `${c.id}: ${c.metal}–${d.el} at the table length`);
      assert.ok(v.dist(v.norm(v.sub(p, M.pos)), SLOTS[c.geometry][d.slot]) < 1e-9, `${c.id}: ${d.id} on slot ${d.slot}`);
    }
    const ideal = c.geometry === 'tetrahedral' ? [109.4712] : [90, 180];
    for (let i = 0; i < donors.length; i++) for (let j = i + 1; j < donors.length; j++) { const a = angle(at(donors[i].id).pos, M.pos, at(donors[j].id).pos); assert.ok(ideal.some((x) => near(a, x, 1e-3)), `${c.id}: donor angle ${a.toFixed(2)}°`); }
    assertNoClashes(frame, `${iso ? `${iso}-` : ''}${c.formula}`, 1.9);
    assert.ok(frame.atoms.every((a) => a.pos.every(Number.isFinite)) && !frame.crowding);
    // ligand internal geometry: ideal templates (no lone-pair compression), N–H / O–H / C≡N at the table lengths
    for (const a of frame.atoms) if (a.el === 'O' || a.el === 'N') {
      const hs = frame.bonds.filter((b) => (b.a === a.id || b.b === a.id)).map((b) => (b.a === a.id ? b.b : b.a)).filter((x) => at(x).el === 'H');
      for (let i = 0; i < hs.length; i++) for (let j = i + 1; j < hs.length; j++) assert.ok(near(angle(at(hs[i]).pos, a.pos, at(hs[j]).pos), 109.4712, 0.01), `${c.id}: H–${a.el}–H ideal`);
      for (const hId of hs) assert.ok(near(v.dist(at(hId).pos, a.pos), bondLength(a.el, 'H', 1), 1e-6));
    }
    if (iso) {
      const sec = donors.filter((d) => d.lig === c.ligands[1].lig).map((d) => at(d.id).pos);
      const angs = []; for (let i = 0; i < sec.length; i++) for (let j = i + 1; j < sec.length; j++) angs.push(angle(sec[i], M.pos, sec[j]));
      if (iso === 'cis') assert.ok(angs.length === 1 && near(angs[0], 90, 1e-6), `${c.id} cis`);
      if (iso === 'trans') assert.ok(angs.length === 1 && near(angs[0], 180, 1e-6), `${c.id} trans`);
      if (iso === 'fac') assert.ok(angs.length === 3 && angs.every((a) => near(a, 90, 1e-6)), `${c.id} fac`);
      if (iso === 'mer') assert.ok(angs.length === 3 && angs.filter((a) => near(a, 180, 1e-6)).length === 1, `${c.id} mer`);
    }
  }
  assert.throws(() => complexFrame('nope'), /unknown complex/);
  assert.throws(() => slotAssignment(complexById('cisplatin'), 'fac'), /no fac arrangement/);
  const f1 = complexFrame('tiAqua'); f1.frame.atoms[0].pos[0] = 99; assert.equal(complexFrame('tiAqua').frame.atoms[0].pos[0], 0, 'the cache is not mutated');
  // the drawn d orbitals: d(z²) positive along z, d(x²−y²) positive on x and negative on y, d(xy) between the axes
  const z2 = dOrbitalPsi('dz2'), x2 = dOrbitalPsi('dx2y2'), xy = dOrbitalPsi('dxy');
  assert.ok(z2.psi(0, 0, 1) > 0 && z2.psi(1, 0, 0) < 0 && x2.psi(1, 0, 0) > 0 && x2.psi(0, 1, 0) < 0 && near(xy.psi(1, 0, 0), 0, 1e-12) && xy.psi(0.7, 0.7, 0) > 0);
  assert.equal(z2.Z, D_ORBITAL_ZEFF.value);
});

test('build: Δo rises along the spectrochemical series for every same-ion pair, the d¹ band is in the visible, what-if spins are labelled', () => {
  const cmp = seriesComparisons();
  assert.ok(cmp.length >= 6 && cmp.every((x) => x.ok), cmp.filter((x) => !x.ok).map((x) => `${x.weaker} ${x.deltaWeaker} ≥ ${x.stronger} ${x.deltaStronger}`).join('; '));
  const ti = buildComplex('tiAqua');
  assert.ok(ti.d === 1 && ti.deltaO === DELTA_O.values.tiAqua && near(ti.lambdaNm, 1e7 / 20300, 1e-9) && ti.lambdaNm > 400 && ti.lambdaNm < 700 && near(ti.deltaKJ, 20300 * KJ_PER_WAVENUMBER, 1e-9));
  const fe = buildComplex('feAqua'), feLow = buildComplex('feAqua', { spin: 'low' });
  assert.ok(fe.spin === 'high' && !fe.isWhatIf && fe.unpaired === 4 && feLow.spin === 'low' && feLow.isWhatIf && feLow.unpaired === 0 && feLow.tabulatedSpin === 'high');
  assert.ok(!buildComplex('crAqua', { spin: 'low' }).spinChoice, 'd³ has no spin choice');
  assert.equal(buildComplex('niChloro', { spin: 'low' }).spin, 'high'); assert.equal(buildComplex('niCyano', { spin: 'high' }).spin, 'low');
  const cis = buildComplex('coAmmineChloro'), trans = buildComplex('coAmmineChloro', { isomer: 'trans' });
  assert.ok(cis.isomer === 'cis' && cis.title === 'cis-[Co(NH₃)₄Cl₂]⁺' && cis.colour === 'violet' && trans.colour === 'green' && trans.name.startsWith('trans-'));
  assert.equal(buildComplex('znAqua').colour, 'colourless'); assert.equal(buildComplex('coAmmineTrichloro').colour, null);
  const o = buildComplex('coAmmine', { orbital: 'dz2' });
  assert.ok(o.psi && o.orbital === 'dz2' && o.orbitalLabel === 'd𝓏²' && o.psi.psi(o.metalPos[0], o.metalPos[1], o.metalPos[2] + 0.8) > 0);
  assert.equal(buildComplex('coAmmine', { orbital: 'nope' }).psi, null);
  assert.throws(() => buildComplex('nope'), /unknown complex/);
});

function resolves(href) {
  const [head, a, b] = href.replace(/^#/, '').split('/');
  const terms = new Set([...GLOSSARY.map((t) => t.id), ...GLOSSARY_TERMS.map((t) => t.id)]);
  if (head === 'glossary') return !a || terms.has(a);
  if (head === 'transition-metals') return (!a || !!complexById(a)) && (!b || (INVARIANTS[a] || []).some((x) => x.id === b));
  if (head === 'atomic-orbitals') return !a || atomicOrbitals.index().some((e) => e.href === `#atomic-orbitals/${a}` || e.href.startsWith(`#atomic-orbitals/${a}/`));
  return false;
}

test('the topic, its collection, content, activities and links satisfy the contracts', () => {
  const restore = installFakeDom();
  try {
    assert.deepEqual(validateTopic(transitionMetals), []);
    assert.ok(transitionMetals.order > 35, 'after Molecular orbitals');
    const coll = makeMetalsCollection({ activityBlock: () => null });
    assert.deepEqual(validateCollection(coll), []);
    for (const c of COMPLEXES) {
      const invs = INVARIANTS[c.id]; assert.ok(invs && invs.length >= 1, `${c.id} cards`);
      const ids = new Set();
      for (const inv of invs) {
        assert.ok(inv.id && inv.title && inv.detail && !ids.has(inv.id)); ids.add(inv.id);
        assert.ok(isValidAudience(audienceOf(inv, 'invariants')));
        for (const l of inv.links || []) assert.ok(resolves(l.href), `${c.id}/${inv.id}: ${l.href}`);
        if (inv.show?.orbital) assert.ok(D_ORBITALS.includes(inv.show.orbital), `${c.id}/${inv.id} orbital`);
        if (inv.show?.spin) assert.ok(buildComplex(c.id).spinChoice, `${c.id}/${inv.id}: spin what-if only where there is a choice`);
        if (inv.show?.isomer) assert.ok(c.isomers?.includes(inv.show.isomer), `${c.id}/${inv.id} isomer`);
      }
      const state = coll.initialState(c); const built = coll.build(c, state);
      const liveRows = []; const controls = coll.controls(c, state, { setState() {}, live: (fn) => { liveRows.push(...fn(state, built)); return { live: true }; } });
      assert.ok(coll.card(c, state, built).length && controls.length >= 4 && liveRows.length >= 1);
      if (c.isomers || built.spinChoice) assert.ok(liveRows.length >= 2, `${c.id}: landmark buttons are live`);
      const chip = coll.chips(c); assert.ok(chip.pattern && chip.name && chip.color);
    }
    const core = new Set(GLOSSARY.map((t) => t.id));
    for (const t of GLOSSARY_TERMS) { assert.ok(!core.has(t.id), `${t.id} is new`); for (const l of t.links) assert.ok(resolves(l.href), `glossary ${t.id}: ${l.href}`); }
    for (const e of transitionMetals.index()) { assert.ok(e.title && e.href); assert.ok(resolves(e.href), `index ${e.href}`); }
    for (const act of ACTIVITIES) { assert.equal(act.options.filter((o) => o.correct).length, 1); assert.ok(correctOption(act) && complexById(act.item)); assert.ok(act.reveal().length > 80); assert.ok(INVARIANTS[act.show.item].some((x) => x.id === act.show.invariant)); }
    assert.match(ACTIVITIES[0].reveal(), /33,800 cm⁻¹ with cyanide against 9,400/);
    assert.match(ACTIVITIES[2].reveal(), /13,100 cm⁻¹/);
    assert.match(ACTIVITIES[3].reveal(), /e⁴ t₂⁴, 2 unpaired/);
  } finally { restore(); }
});
