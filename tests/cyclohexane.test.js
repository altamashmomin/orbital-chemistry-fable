import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHAIR, CHAIR_SUBSTITUENTS, RING_FORMS, substituentById, formById, cyclohexaneFrame, chairEnergy, equatorialFraction, KCAL } from '../src/chem/cyclohexane.js';
import { A_VALUES, RING_CONFORMER_ENERGIES, TORSION_ENERGIES } from '../src/chem/references/textbook.js';
import { MEASURED_ANGLES } from '../src/chem/references/measured.js';
import { ringTemplate, v } from '../src/chem/geometry.js';
import { bondLength } from '../src/chem/elements.js';
import { ACTIVITIES, correctOption } from '../src/topics/conformations/activities.js';
import { ITEMS } from '../src/topics/conformations/panel.js';

const ang = (a, c, b) => Math.acos(Math.max(-1, Math.min(1, v.dot(v.norm(v.sub(a, c)), v.norm(v.sub(b, c)))))) * 180 / Math.PI;

test('A-values and ring energies are a cited table: kJ = kcal × 4.184, unit and source present', () => {
  assert.equal(A_VALUES.unit, 'kJ/mol'); assert.match(A_VALUES.source, /Eliel/);
  for (const s of CHAIR_SUBSTITUENTS) {
    const a = A_VALUES.values[s.id];
    assert.ok(a, `${s.id} has an A-value row`);
    assert.ok(Math.abs(a.kJ - a.kcal * KCAL) <= 0.06, `${s.id}: ${a.kJ} kJ/mol is ${a.kcal} kcal/mol × 4.184 rounded`);
    assert.ok(s.name && s.label && s.formula);
  }
  assert.equal(A_VALUES.values.H.kJ, 0);
  assert.ok(A_VALUES.values.tBu.kJ > A_VALUES.values.isopropyl.kJ && A_VALUES.values.isopropyl.kJ > A_VALUES.values.methyl.kJ && A_VALUES.values.methyl.kJ > A_VALUES.values.OH.kJ && A_VALUES.values.OH.kJ > A_VALUES.values.F.kJ, 'the textbook ordering tBu > iPr > Me > OH > F');
  const r = RING_CONFORMER_ENERGIES.cyclohexane;
  assert.ok(r.chair === 0 && r.twistBoat < r.boat && r.boat < r.halfChair && r.unit === 'kJ/mol' && r.source);
  // two gauche-butane interactions ≈ the methyl A-value (the textbook explanation, both numbers from the tables)
  assert.ok(Math.abs(2 * TORSION_ENERGIES.butane.gauche - A_VALUES.values.methyl.kJ) < 0.5);
  // the energy shown is always a table lookup
  for (const s of CHAIR_SUBSTITUENTS) {
    assert.equal(chairEnergy(s.id, 'axial').value, A_VALUES.values[s.id].kJ);
    assert.equal(chairEnergy(s.id, 'equatorial').value, 0);
    assert.equal(chairEnergy(s.id, 'boat').value, r.boat);
    for (const f of RING_FORMS) { const e = chairEnergy(s.id, f.id); assert.equal(e.basis, 'table'); assert.ok(e.unit && e.source && e.note); }
  }
  assert.throws(() => chairEnergy('nope', 'axial'), /no A-value/);
  assert.throws(() => chairEnergy('methyl', 'twist'), /unknown form/);
  // K = exp(A/RT) at 25 °C: methyl ≈ 95 % equatorial, tert-butyl > 99.9 %, H 50 %
  assert.ok(Math.abs(equatorialFraction(A_VALUES.values.methyl.kJ) - 0.95) < 0.01);
  assert.ok(equatorialFraction(A_VALUES.values.tBu.kJ) > 0.999);
  assert.equal(equatorialFraction(0), 0.5);
});

test('ring flip: the flipped template mirrors the chair through its mean plane and swaps the C1 sites', () => {
  const a = ringTemplate('cyclohexaneChair'), b = ringTemplate('cyclohexaneChair', { flip: true });
  for (const id of a.ring) { assert.ok(Math.abs(a.rigid.coords[id][2] + b.rigid.coords[id][2]) < 1e-12, `${id} z mirrored`); assert.ok(Math.abs(a.rigid.coords[id][0] - b.rigid.coords[id][0]) < 1e-12); }
  const sa = a.sites.C1, sb = b.sites.C1;
  assert.ok(sa.axial === sa.up && sa.equatorial === sa.down, 'C1 (up carbon) has its axial site up');
  assert.ok(sb.axial === sb.down && sb.equatorial === sb.up, 'after the flip C1 is a down carbon: its up site is equatorial');
  assert.ok(a.atoms.some((x) => x.id === 'H1ax') && b.atoms.some((x) => x.id === 'H1eq'), 'hydrogen names follow the site');
});

test('every substituent in every ring form: template geometry kept, X on the right site, diaxial partners found, honest crowding', () => {
  const chairAngle = MEASURED_ANGLES.cyclohexaneChair_CCC.value;
  for (const s of CHAIR_SUBSTITUENTS) {
    const contacts = {};
    for (const f of RING_FORMS) {
      const r = cyclohexaneFrame(s.id, f.id);
      assert.equal(r.sub.id, s.id); assert.equal(r.form.id, f.id);
      const byId = new Map(r.frame.atoms.map((x) => [x.id, x]));
      assert.ok(r.frame.atoms.every((x) => x.pos.every(Number.isFinite)));
      // bond lengths are the tables' (benzene template C–H 1.08 is its own convention)
      for (const bd of r.frame.bonds) {
        const d = v.dist(byId.get(bd.a).pos, byId.get(bd.b).pos);
        const L = bd.length ?? bondLength(byId.get(bd.a).el, byId.get(bd.b).el, bd.aromatic ? 1.5 : bd.order);
        assert.ok(Math.abs(d - L) < 0.011, `${s.id}/${f.id} ${bd.a}–${bd.b}: ${d.toFixed(3)} vs ${L}`);
      }
      // ring in template coordinates: axis vertical, chair carbons alternating ±0.25 Å, C–C–C as the template
      const c = r.ring.map((id) => byId.get(id).pos);
      const chair = f.shape === 'cyclohexaneChair';
      for (let k = 0; k < 6; k++) {
        const a = ang(c[(k + 5) % 6], c[k], c[(k + 1) % 6]);
        assert.ok(Math.abs(a - (chair ? 110 : 111)) < 0.05, `${s.id}/${f.id} C–C–C ${a.toFixed(2)}`);
        if (chair) assert.ok(Math.abs(Math.abs(c[k][1]) - 0.25) < 1e-6 && Math.sign(c[k][1]) === (k % 2 ? -1 : 1) * (f.flip ? -1 : 1), `${s.id}/${f.id} C${k + 1} y = ${c[k][1].toFixed(3)}`);
      }
      if (chair) assert.ok(Math.abs(chairAngle - 110) < 2, 'template C–C–C within 2° of the measured chair (register)');
      // site of X
      const expectSite = { axial: 'axial', equatorial: 'equatorial', boat: 'flagpole' }[f.id];
      assert.equal(r.site, expectSite, `${s.id}/${f.id} site`);
      if (f.id === 'axial') assert.ok(r.tilt < 5, `axial C1–X ${r.tilt.toFixed(1)}° from the axis`);
      if (f.id === 'equatorial') assert.ok(r.tilt > 60 && r.tilt < 80, `equatorial C1–X ${r.tilt.toFixed(1)}° from the axis`);
      if (f.id === 'boat') assert.ok(r.tilt < 25, `flagpole C1–X ${r.tilt.toFixed(1)}°`);
      // the hydrogens X faces
      assert.deepEqual(r.diaxial, f.id === 'axial' ? ['ring.H3ax', 'ring.H5ax'] : f.id === 'boat' ? ['ring.H4ax'] : []);
      assert.equal(!!r.contact, r.diaxial.length > 0);
      contacts[f.id] = r.contact?.d ?? null;
      // crowding is reported from the drawn frame, never hidden
      if (r.crowding) assert.ok(r.crowding.worst.d < 2.5 && r.frame.crowding === r.crowding);
      assert.equal(r.energy.value, chairEnergy(s.id, f.id).value);
      assert.ok(r.group.includes(r.attach) && r.group.every((id) => id.startsWith('X.')));
    }
    // the axial chair brings X closer to the ring hydrogens than the boat flagpole does not; what matters: axial has a 1,3 contact, equatorial none
    assert.ok(contacts.axial != null && contacts.equatorial === null);
  }
  // the cases a learner meets first
  const meAx = cyclohexaneFrame('methyl', 'axial'), meEq = cyclohexaneFrame('methyl', 'equatorial'), tBuAx = cyclohexaneFrame('tBu', 'axial'), tBuEq = cyclohexaneFrame('tBu', 'equatorial'), phAx = cyclohexaneFrame('phenyl', 'axial');
  assert.ok(meAx.contact.d < 2.0 && meAx.contact.d > 1.8 && !meAx.crowding, 'axial methyl: a close 1,3-diaxial H···H contact, drawable');
  assert.equal(meEq.crowding, null);
  assert.ok(tBuAx.crowding && tBuAx.crowding.worst.d < 1.5, 'axial tert-butyl is too crowded for the model and says so');
  assert.equal(tBuEq.crowding, null, 'equatorial tert-butyl is fine');
  assert.ok(!phAx.crowding && phAx.contact.d > 2.3, 'axial phenyl turns its ring out of the 1,3-diaxial clash (the bond between two rigid templates rotates)');
  assert.throws(() => cyclohexaneFrame('nope', 'axial'), /unknown substituent/);
  assert.throws(() => cyclohexaneFrame('methyl', 'nope'), /unknown form/);
  assert.equal(substituentById('nope'), null); assert.equal(formById('nope'), null);
  assert.ok(cyclohexaneFrame('methyl', 'axial') === meAx, 'frames are cached');
});

test('the chair lesson item, its activities and the panel item list', () => {
  assert.equal(CHAIR.id, 'cyclohexane');
  assert.ok(CHAIR.facts.length >= 5 && CHAIR.links.length >= 3 && CHAIR.landmarks.length === RING_FORMS.length);
  assert.equal(ITEMS[ITEMS.length - 1], CHAIR);
  const chairActs = ACTIVITIES.filter((a) => a.rotor === 'cyclohexane');
  assert.ok(chairActs.length >= 3);
  for (const act of chairActs) {
    assert.equal(act.options.filter((o) => o.correct).length, 1); assert.ok(correctOption(act));
    assert.ok(act.reveal().length > 80);
    assert.ok(formById(act.show.form) && substituentById(act.show.substituent), `${act.id}: show target`);
  }
  assert.match(chairActs.find((a) => a.id === 'chair-prefer').reveal(), /7\.3 kJ\/mol.*95 %/);
  assert.match(chairActs.find((a) => a.id === 'diaxial-gauche').reveal(), /3\.8.*7\.6.*7\.3/);
});
