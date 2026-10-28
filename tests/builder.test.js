import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FUNCTIONAL_GROUPS, FUNCTIONAL_GROUP_ORDER } from '../src/chem/functionalGroups.js';
import { R_GROUP_ORDER } from '../src/chem/rGroups.js';
import { buildMolecule, embedMolecule, defaultChoice } from '../src/chem/builder.js';
import { bondLength } from '../src/chem/elements.js';
import { assertNoClashes } from './helpers.js';
import { v } from '../src/chem/geometry.js';

const finite = (p) => p.every((x) => Number.isFinite(x));

function checkFrame(frame, label) {
  const byId = new Map(frame.atoms.map((a) => [a.id, a]));
  for (const a of frame.atoms) assert.ok(finite(a.pos), `${label}: ${a.id} has finite position`);
  for (const b of frame.bonds) {
    const d = v.dist(byId.get(b.a).pos, byId.get(b.b).pos);
    const expected = bondLength(byId.get(b.a).el, byId.get(b.b).el, b.aromatic ? 1.5 : b.order);
    assert.ok(Math.abs(d - expected) < 0.08, `${label}: bond ${b.a}-${b.b} length ${d.toFixed(2)} ≈ ${expected}`);
  }
  assertNoClashes(frame, label);
}

test('every functional group builds and embeds with default R groups', () => {
  for (const id of FUNCTIONAL_GROUP_ORDER) {
    const fg = FUNCTIONAL_GROUPS[id];
    assert.equal(typeof fg.name, 'string', `${id}: display name is a string`);
    assert.equal(typeof fg.nameFor, 'function', `${id}: nameFor is a function`);
    assert.ok(fg.invariants.length >= 4 && fg.varies.length >= 2 && fg.identify.length >= 2, `${id}: has teaching content`);
    for (const inv of fg.invariants) assert.ok(Array.isArray(inv.visuals) && inv.visuals.length, `${id}/${inv.id}: has visuals`);
    const mol = buildMolecule(id);
    assert.ok(mol.meta.name, `${id} has a name`);
    assert.ok(mol.meta.formula, `${id} has a formula`);
    checkFrame(embedMolecule(mol), id);
  }
});

test('every R group fits on every attachment point', () => {
  for (const id of FUNCTIONAL_GROUP_ORDER) {
    const fg = FUNCTIONAL_GROUPS[id];
    for (const att of fg.attachments) {
      for (const r of R_GROUP_ORDER) {
        const choice = defaultChoice(fg);
        choice.R[att.id] = r;
        const mol = buildMolecule(id, choice);
        checkFrame(embedMolecule(mol), `${id}/${att.id}=${r}`);
      }
    }
  }
});

/** Closest non-bonded, non-1,3 distance in a frame. */
function closestContact(frame) {
  const atoms = frame.atoms.filter((a) => !a.ghost);
  const adj = new Map(atoms.map((a) => [a.id, new Set()]));
  for (const b of frame.bonds) { adj.get(b.a)?.add(b.b); adj.get(b.b)?.add(b.a); }
  const related = (x, y) => { if (adj.get(x).has(y)) return true; for (const n of adj.get(x)) if (adj.get(n)?.has(y)) return true; return false; };
  let m = Infinity;
  for (let i = 0; i < atoms.length; i++) for (let j = i + 1; j < atoms.length; j++) { if (related(atoms[i].id, atoms[j].id)) continue; m = Math.min(m, v.dist(atoms[i].pos, atoms[j].pos)); }
  return m;
}

test('simultaneous bulky substitutions never clash silently: every combination is clean or flagged as crowded', () => {
  // Every combination of the two-attachment groups; the three-attachment groups with any R on the first
  // attachment and a bulky-biased set on the others; the alkene with any two positions substituted.
  const BULKY_BIASED = ['H', 'methyl', 'isopropyl', 'tBu', 'phenyl'];
  const plan = { ether: null, ketone: null, ester: null, alkyne: null, amide: BULKY_BIASED, amine: BULKY_BIASED };
  let combos = 0, flagged = 0;
  const check = (id, R) => {
    combos++;
    const frame = embedMolecule(buildMolecule(id, { R }));
    const d = closestContact(frame);
    if (frame.crowding) {
      flagged++;
      assert.ok(frame.crowding.worst.d < frame.crowding.worst.limit, `${id} ${JSON.stringify(R)}: a flagged contact is below its limit`);
      assert.ok(frame.crowding.groups.length >= 1 && frame.crowding.groups.every((g) => g in R), `${id} ${JSON.stringify(R)}: crowding names the R groups involved`);
    } else {
      assert.ok(d >= 1.6, `${id} ${JSON.stringify(R)}: unflagged frame has atoms ${d.toFixed(2)} Å apart`);
    }
  };
  for (const [id, rest] of Object.entries(plan)) {
    const atts = FUNCTIONAL_GROUPS[id].attachments.map((a) => a.id);
    const rec = (k, R) => { if (k === atts.length) return check(id, R); for (const r of (k === 0 || !rest ? R_GROUP_ORDER : rest)) rec(k + 1, { ...R, [atts[k]]: r }); };
    rec(0, {});
  }
  const alk = FUNCTIONAL_GROUPS.alkene.attachments.map((a) => a.id);
  for (let i = 0; i < alk.length; i++) for (let j = i + 1; j < alk.length; j++) for (const ri of R_GROUP_ORDER) for (const rj of R_GROUP_ORDER) {
    const R = Object.fromEntries(alk.map((a) => [a, 'H'])); R[alk[i]] = ri; R[alk[j]] = rj; check('alkene', R);
  }
  check('alkene', { R1: 'tBu', R2: 'tBu', R3: 'tBu', R4: 'tBu' });
  assert.ok(combos > 1400 && flagged > 0, `${combos} combinations, ${flagged} flagged`);
  // Defaults are never crowded; known crowded combinations are flagged with the right groups; the rescue search helps.
  for (const id of FUNCTIONAL_GROUP_ORDER) assert.equal(embedMolecule(buildMolecule(id)).crowding, null, `${id}: default build is clean`);
  const ether = embedMolecule(buildMolecule('ether', { R: { R1: 'tBu', R2: 'tBu' } }));
  assert.ok(ether.crowding && ether.crowding.groups.includes('R1') && ether.crowding.groups.includes('R2'), 'di-tert-butyl ether is flagged on both groups');
  assert.ok(ether.crowding.worst.d > 1.5, `the rescue search leaves the worst contact at ${ether.crowding.worst.d.toFixed(2)} Å (was 1.34 Å with the greedy passes alone)`);
  const amine = embedMolecule(buildMolecule('amine', { R: { R1: 'tBu', R2: 'tBu', R3: 'tBu' } }));
  assert.ok(amine.crowding && amine.crowding.worst.d > 1.1 && amine.crowding.groups.length === 3, 'tri-tert-butylamine is flagged on all three groups');
  const fixed = embedMolecule(buildMolecule('alkene', { R: { R1: 'tBu', R2: 'methyl', R3: 'isopropyl', R4: 'H' } }));
  assert.equal(fixed.crowding, null, 'a combination the joint search can untangle is clean');
  assert.ok(closestContact(fixed) >= 1.6);
});

test('valence sanity: carbon never exceeds four bonds, hydrogen exactly one', () => {
  for (const id of FUNCTIONAL_GROUP_ORDER) {
    const mol = buildMolecule(id);
    const sum = new Map();
    for (const b of mol.bonds) { sum.set(b.a, (sum.get(b.a) || 0) + b.order); sum.set(b.b, (sum.get(b.b) || 0) + b.order); }
    for (const a of mol.atoms) {
      const s = sum.get(a.id) || 0;
      if (a.el === 'C') assert.ok(s <= 4 && s >= 3, `${id}: ${a.id} has ${s} bonds`);
      if (a.el === 'H') assert.equal(s, 1, `${id}: ${a.id} has ${s} bonds`);
    }
  }
});

test('names and classification respond to R groups', () => {
  assert.match(buildMolecule('alcohol', { R: { R1: 'methyl' } }).meta.name, /methanol/);
  assert.match(buildMolecule('alcohol', { R: { R1: 'tBu' } }).meta.classification, /tertiary/);
  assert.match(buildMolecule('alcohol', { R: { R1: 'phenyl' } }).meta.classification, /PHENOL/);
  assert.match(buildMolecule('haloalkane', { variant: 'I', R: { R1: 'methyl' } }).meta.name, /iodomethane/);
  assert.match(buildMolecule('amine', { R: { R1: 'ethyl', R2: 'ethyl', R3: 'ethyl' } }).meta.name, /triethylamine/);
  assert.equal(buildMolecule('ketone').meta.formula, 'C₃H₆O');
});
