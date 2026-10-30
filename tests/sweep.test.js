import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runConformance } from '../src/chem/conformance.js';

test('conformance sweep: the model matches the textbook reference values', () => {
  const { checks, summary } = runConformance();
  const fails = checks.filter((c) => c.status === 'fail');
  assert.ok(checks.length > 120, `sweep ran ${checks.length} checks`);
  assert.deepEqual(fails.map((f) => `${f.category}/${f.id}: expected ${f.expected ?? '-'} got ${f.actual ?? '-'} (${f.detail})`), [], `${summary.fail} failing check(s)`);
  assert.ok(summary.note >= 12, 'known simplifications are reported as notes');
  const table = checks.filter((c) => c.id.startsWith('lp-table.'));
  assert.ok(table.length >= 18 && table.every((c) => c.status === 'pass'), 'every LONE_PAIR_ANGLES row agrees with the independent oracle');
  // Lone-pair angle compression (Phase 0e): the explorer's bent and pyramidal centres are real checks, not notes.
  for (const id of ['alcohol.lp-angle.O', 'ether.lp-angle.O', 'amine.lp-angle.N', 'thiol.lp-angle.S', 'carboxylicAcid.lp-angle.O2', 'ester.lp-angle.O2', 'SF4.measured', 'ClF3.measured', 'BrF5.measured', 'H2O.bent', 'NH3.pyramidal', 'PH3.pyramidal', 'H2S.bent', 'H2Se.bent', 'SO2.bent']) {
    const c = checks.find((x) => x.id === id);
    assert.ok(c && c.status === 'pass', `${id} is a passing check (${c?.status})`);
  }
  assert.ok(!checks.some((c) => /water_HOH|ammonia_HNH|methanethiol_CSH|lp-fallback/.test(c.id)), 'no lone-pair angle is reported as a simplification any more');
  // Model boundary (REVIEW_PROTOCOL §6): the line between cited geometry and invented physics is a set of checks.
  const boundary = checks.filter((c) => c.category === 'boundary');
  assert.ok(boundary.length >= 16 && boundary.every((c) => c.status === 'pass'), `boundary checks all pass (${boundary.length})`);
  const complexes = checks.filter((c) => c.category === 'complexes');
  assert.ok(complexes.length >= 40 && complexes.every((c) => c.status === 'pass'), `transition-metal checks all pass (${complexes.length})`);
  for (const id of ['barycentre', 'spectrochemical', 'frames', 'd1-band', 'filling.feCyano', 'filling.coFluoro', 'd-count.cisplatin']) assert.ok(complexes.some((c) => c.id === id), `${id} is a complexes check`);
  for (const id of ['shapes.angle-basis', 'bond-lengths.cited', 'energies.sourced', 'card-angles.stated', 'alcohol.lone-pair-basis', 'amine.lone-pair-basis', 'ester.lone-pair-basis']) assert.ok(boundary.some((c) => c.id === id), `${id} is a boundary check`);
});
