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
