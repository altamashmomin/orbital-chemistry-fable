import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROTORS, rotorById, conformer, torsionEnergy, conformationName, periplanarity } from '../src/chem/conformations.js';
import { TORSION_ENERGIES } from '../src/chem/references/textbook.js';
import { newmanProjection } from '../src/ui/overlays.js';
import { conformations } from '../src/topics/conformations/index.js';
import { ACTIVITIES, correctOption } from '../src/topics/conformations/activities.js';
import { drawTorsionDiagram } from '../src/topics/conformations/panel.js';
import { validateTopic } from '../src/topics/registry.js';
import { GLOSSARY } from '../src/nexus/glossary.js';
import { FUNCTIONAL_GROUPS } from '../src/chem/functionalGroups.js';
import { MECHANISMS } from '../src/chem/mechanisms/index.js';
import { shapeById } from '../src/chem/shapes.js';
import { bondLength } from '../src/chem/elements.js';
import { v } from '../src/chem/geometry.js';
import { assertNoClashes } from './helpers.js';

test('torsional energies pass through the textbook points and are periodic', () => {
  assert.ok(Math.abs(torsionEnergy('ethane', 60)) < 1e-12 && Math.abs(torsionEnergy('ethane', 0) - 12) < 1e-12);
  assert.ok(Math.abs(torsionEnergy('ethane', 120) - torsionEnergy('ethane', 0)) < 1e-9, 'three-fold');
  const b = TORSION_ENERGIES.butane;
  assert.ok(Math.abs(torsionEnergy('butane', 180)) < 1e-12);
  assert.ok(Math.abs(torsionEnergy('butane', 60) - b.gauche) < 1e-9 && Math.abs(torsionEnergy('butane', 300) - b.gauche) < 1e-9);
  assert.ok(Math.abs(torsionEnergy('butane', 120) - b.eclipsedCH3H) < 1e-9 && Math.abs(torsionEnergy('butane', 240) - b.eclipsedCH3H) < 1e-9);
  assert.ok(Math.abs(torsionEnergy('butane', 0) - b.eclipsedCH3CH3) < 1e-9);
  for (let d = 0; d <= 360; d += 5) { assert.ok(torsionEnergy('butane', d) >= -1e-9, `butane ${d}° not below anti`); assert.ok(torsionEnergy('ethane', d) >= -1e-9); }
  assert.ok(torsionEnergy('butane', 0) > torsionEnergy('butane', 120) && torsionEnergy('butane', 120) > torsionEnergy('butane', 60) && torsionEnergy('butane', 60) > 0, 'ordering: fully eclipsed > CH3/H eclipsed > gauche > anti');
  assert.equal(torsionEnergy('bromobutane', 180), null);
  assert.equal(conformationName('ethane', 185), 'Staggered'); assert.equal(conformationName('butane', 170), 'Anti'); assert.equal(conformationName('butane', 90), 'Skew');
  assert.ok(Math.abs(periplanarity(180) - 1) < 1e-12 && Math.abs(periplanarity(90)) < 1e-12 && Math.abs(periplanarity(60) - 0.5) < 1e-12);
});

test('conformer frames sit at the requested dihedral with the embedder bond lengths, and Newman agrees', () => {
  for (const r of ROTORS) {
    for (const phi of [0, 30, 60, 120, 180, 200, 300, 359]) {
      const c = conformer(r.id, phi);
      const diff = Math.abs(((c.dihedral - phi + 540) % 360) - 180);
      assert.ok(diff < 1e-6, `${r.id} ${phi}°: measured ${c.dihedral.toFixed(3)}`);
      const byId = new Map(c.frame.atoms.map((a) => [a.id, a]));
      for (const bd of c.frame.bonds) assert.ok(Math.abs(v.dist(byId.get(bd.a).pos, byId.get(bd.b).pos) - bondLength(byId.get(bd.a).el, byId.get(bd.b).el, bd.order)) < 1e-9, `${r.id} ${phi}°: bond ${bd.a}-${bd.b}`);
      assert.ok(c.frame.atoms.every((a) => a.pos.every(Number.isFinite)));
      // the looked-down bond lies on x with the front carbon toward +x
      assert.ok(Math.abs(byId.get(r.axis[0]).pos[1]) < 1e-9 && Math.abs(byId.get(r.axis[0]).pos[2]) < 1e-9 && byId.get(r.axis[0]).pos[0] > 0);
      const P = newmanProjection(c.frame, r.axis[0], r.axis[1]);
      if (phi % 60 === 0) assert.equal(P.conformation, phi % 120 === 0 ? 'eclipsed' : 'staggered', `${r.id} ${phi}°: Newman reads ${P.conformation}`);
      if (phi === 30) assert.equal(P.conformation, 'skew');
    }
    assertNoClashes(conformer(r.id, 180).frame, `${r.id} anti`);
    assert.ok(r.landmarks.length >= 2 && r.facts.length >= 2 && r.links.length >= 1);
  }
  // the E2 rotor's anti landmark is the Reaction lab's starting geometry
  const e2 = MECHANISMS.e2.frame(0); const p = (id) => e2.atoms.find((a) => a.id === id).pos;
  const anti = conformer('bromobutane', 180);
  assert.ok(Math.abs(Math.abs(anti.dihedral) - 180) < 1e-6);
  const dih = (a, b, c, d) => { const b1 = v.sub(b, a), b2 = v.sub(c, b), b3 = v.sub(d, c); const n1 = v.cross(b1, b2), n2 = v.cross(b2, b3); return Math.atan2(v.dot(v.cross(n1, v.norm(b2)), n2), v.dot(n1, n2)) * 180 / Math.PI; };
  assert.ok(Math.abs(Math.abs(dih(p('Br'), p('C2'), p('C3'), p('Hb'))) - 180) < 1, 'E2 starts anti-periplanar');
  assert.throws(() => conformer('nope', 0), /unknown rotor/);
  assert.equal(rotorById('nope'), null);
});

function resolves(href) {
  const [head, a, b] = href.replace(/^#/, '').split('/');
  const terms = new Set([...GLOSSARY.map((t) => t.id), ...conformations.glossary.map((t) => t.id)]);
  if (head === 'glossary') return !a || terms.has(a);
  if (head === 'functional-groups') return (!a || !!FUNCTIONAL_GROUPS[a]) && (!b || FUNCTIONAL_GROUPS[a].invariants.some((x) => x.id === b));
  if (head === 'mechanisms') return (!a || !!MECHANISMS[a]) && (!b || MECHANISMS[a].steps.some((x) => x.id === b));
  if (head === 'molecular-shapes') return (!a || !!shapeById(a)) && (!b || shapeById(a).invariants.some((x) => x.id === b));
  if (head === 'conformations') return (!a || !!rotorById(a)) && (!b || rotorById(a).landmarks.some((l) => l.id === b));
  return false;
}

test('the topic, its search entries, glossary, links and activities satisfy the contracts', () => {
  assert.deepEqual(validateTopic(conformations), []);
  assert.ok(conformations.order > 15 && conformations.order < 20, 'between Molecular shapes and the Reaction lab');
  for (const e of conformations.index()) { assert.ok(e.title && e.href); assert.ok(resolves(e.href), `index href ${e.href}`); }
  const core = new Set(GLOSSARY.map((t) => t.id));
  for (const t of conformations.glossary) { assert.ok(!core.has(t.id), `${t.id} is new`); for (const l of t.links) assert.ok(resolves(l.href), l.href); }
  for (const r of ROTORS) for (const l of r.links) assert.ok(resolves(l.href), `${r.id}: ${l.href}`);
  for (const act of ACTIVITIES) {
    assert.equal(act.options.filter((o) => o.correct).length, 1); assert.ok(correctOption(act)); assert.ok(rotorById(act.rotor));
    assert.ok(act.reveal().length > 80);
    assert.ok(rotorById(act.show.rotor).landmarks.some((l) => l.id === act.show.landmark), `${act.id}: show landmark`);
  }
  assert.match(ACTIVITIES[0].reveal(), /12 kJ\/mol/);
  assert.match(ACTIVITIES[1].reveal(), /3\.8 kJ\/mol.*20 kJ\/mol.*16 kJ\/mol/);
  // the diagram drawer tolerates a canvas without a 2D context (node, or a blocked canvas)
  assert.doesNotThrow(() => drawTorsionDiagram({ getContext: () => null }, ROTORS[0], 60));
});
