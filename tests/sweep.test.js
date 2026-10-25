import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runConformance } from '../src/chem/conformance.js';

test('conformance sweep: the model matches the textbook reference values', () => {
  const { checks, summary } = runConformance();
  const fails = checks.filter((c) => c.status === 'fail');
  assert.ok(checks.length > 120, `sweep ran ${checks.length} checks`);
  assert.deepEqual(fails.map((f) => `${f.category}/${f.id}: expected ${f.expected ?? '-'} got ${f.actual ?? '-'} (${f.detail})`), [], `${summary.fail} failing check(s)`);
  assert.ok(summary.note >= 10, 'known simplifications are reported as notes');
});
