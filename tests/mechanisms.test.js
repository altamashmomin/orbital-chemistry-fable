import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MECHANISMS, MECHANISM_ORDER, stepIndexAt, predict } from '../src/chem/mechanisms/index.js';
import { assertNoClashes } from './helpers.js';

const finite = (p) => p.every((x) => Number.isFinite(x));

test('every mechanism produces sane frames across t', () => {
  for (const id of MECHANISM_ORDER) {
    const m = MECHANISMS[id];
    let count = null;
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const f = m.frame(t);
      const nonGhost = f.atoms.filter((a) => !a.ghost);
      if (count === null) count = nonGhost.length;
      assert.equal(nonGhost.length, count, `${id} t=${t}: atom count constant`);
      for (const a of f.atoms) assert.ok(finite(a.pos), `${id} t=${t}: ${a.id} finite`);
      assertNoClashes(f, `${id} t=${t}`);
      assert.ok(Number.isFinite(m.energyAt(t)), `${id}: energy finite`);
    }
    assert.equal(m.steps[0].t, 0);
    assert.equal(m.steps[m.steps.length - 1].t, 1);
    assert.equal(m.energyAt(0), 0);
  }
});

test('SN2 inverts the substituent umbrella and swaps bonds', () => {
  const m = MECHANISMS.sn2;
  const start = m.frame(0), end = m.frame(1);
  const hx0 = start.atoms.find((a) => a.id === 'H').pos[0];
  const hx1 = end.atoms.find((a) => a.id === 'H').pos[0];
  assert.ok(hx0 > 0 && hx1 < 0, 'H flips from the nucleophile side to the leaving-group side');
  assert.ok(start.bonds.some((b) => b.a === 'C' && b.b === 'Br' && b.partial === 1));
  assert.ok(!end.bonds.some((b) => b.a === 'C' && b.b === 'Br'));
  assert.ok(end.bonds.some((b) => b.a === 'C' && b.b === 'Nu.O' && b.partial === 1));
  assert.equal(stepIndexAt(m, 0.49), 0);
  assert.equal(stepIndexAt(m, 0.5), 1);
});

test('SN1 carbocation is planar with an empty p orbital', () => {
  const f = MECHANISMS.sn1.frame(0.35);
  const c = f.atoms.find((a) => a.id === 'C');
  assert.equal(c.orbital?.kind, 'empty');
  const mes = ['Me1.C', 'Me2.C', 'Me3.C'].map((id) => f.atoms.find((a) => a.id === id).pos);
  for (const p of mes) assert.ok(Math.abs(p[0]) < 0.05, 'methyl carbons lie in the plane x = 0');
});

test('predictor reproduces the textbook table', () => {
  assert.equal(predict({ substrate: 'methyl', reagent: 'strongNuStrongBase' }).dominant, 'sn2');
  assert.equal(predict({ substrate: 'primary', reagent: 'strongNuWeakBase', solvent: 'polarAprotic' }).dominant, 'sn2');
  assert.equal(predict({ substrate: 'primary', reagent: 'bulkyBase' }).dominant, 'e2');
  assert.equal(predict({ substrate: 'secondary', reagent: 'strongNuStrongBase' }).dominant, 'e2');
  assert.equal(predict({ substrate: 'secondary', reagent: 'strongNuWeakBase', solvent: 'polarAprotic' }).dominant, 'sn2');
  assert.equal(predict({ substrate: 'tertiary', reagent: 'weakNuWeakBase', solvent: 'polarProtic', temperature: 'low' }).dominant, 'sn1');
  assert.equal(predict({ substrate: 'tertiary', reagent: 'weakNuWeakBase', solvent: 'polarProtic', temperature: 'high' }).dominant, 'e1');
  assert.equal(predict({ substrate: 'tertiary', reagent: 'strongNuStrongBase' }).dominant, 'e2');
  assert.equal(predict({ substrate: 'tertiary', reagent: 'strongNuStrongBase' }).pct.sn2, 0);
  assert.equal(predict({ substrate: 'primary', reagent: 'weakNuWeakBase' }).dominant, 'none');
  assert.equal(predict({ substrate: 'primary', reagent: 'weakNuWeakBase', allylicBenzylic: true }).dominant, 'sn1');
});
