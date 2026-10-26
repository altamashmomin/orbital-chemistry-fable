import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runConformance } from '../src/chem/conformance.js';

test('conformance sweep: the model matches the textbook reference values', () => {
  const { checks, summary } = runConformance();
  const fails = checks.filter((c) => c.status === 'fail');
  assert.ok(checks.length > 120, `sweep ran ${checks.length} checks`);
  assert.deepEqual(fails.map((f) => `${f.category}/${f.id}: expected ${f.expected ?? '-'} got ${f.actual ?? '-'} (${f.detail})`), [], `${summary.fail} failing check(s)`);
  assert.ok(summary.note >= 9, 'known simplifications are reported as notes');
  // Lone-pair angle compression (Phase 0e): the explorer's bent and pyramidal centres are real checks, not notes.
  for (const id of ['alcohol.lp-angle.O', 'ether.lp-angle.O', 'amine.lp-angle.N', 'thiol.lp-angle.S', 'carboxylicAcid.lp-angle.O2', 'ester.lp-angle.O2', 'SF4.measured', 'H2O.bent', 'NH3.pyramidal']) {
    const c = checks.find((x) => x.id === id);
    assert.ok(c && c.status === 'pass', `${id} is a passing check (${c?.status})`);
  }
  assert.ok(!checks.some((c) => /water_HOH|ammonia_HNH|methanethiol_CSH|lp-fallback/.test(c.id)), 'no lone-pair angle is reported as a simplification any more');
});
