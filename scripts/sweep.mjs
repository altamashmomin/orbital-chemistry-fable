#!/usr/bin/env node
// Suite sweep report: runs the conformance suite and prints it; with --write, creates
// docs/reviews/<date>-sweep-NN.md with the automated results and the manual review template.
import { readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { runConformance } from '../src/chem/conformance.js';
import { TOPICS } from '../src/topics/index.js';

const write = process.argv.includes('--write');
const { checks, summary } = runConformance();

// repo-level checks that need the file system
for (const t of TOPICS) {
  const has = existsSync(`src/topics/${t.id}/references.md`);
  checks.push({ category: 'content', id: `${t.id}.references`, status: has ? 'pass' : 'fail', detail: 'topic ships a references.md', actual: has ? 'present' : 'missing' });
  summary[has ? 'pass' : 'fail']++;
}

const byCat = new Map();
for (const c of checks) { if (!byCat.has(c.category)) byCat.set(c.category, []); byCat.get(c.category).push(c); }
const icon = { pass: '✓', fail: '✗', note: '·' };
console.log(`Suite sweep: ${summary.pass} pass, ${summary.fail} fail, ${summary.note} notes (${checks.length} checks)`);
for (const [cat, list] of byCat) {
  const f = list.filter((c) => c.status === 'fail').length, n = list.filter((c) => c.status === 'note').length;
  console.log(`  ${cat.padEnd(16)} ${String(list.length - f - n).padStart(3)} pass ${String(f).padStart(2)} fail ${String(n).padStart(2)} note`);
}
for (const c of checks.filter((c) => c.status === 'fail')) console.log(`  ✗ ${c.category}/${c.id}: ${c.detail} — expected ${c.expected ?? '-'}, got ${c.actual ?? '-'}`);

if (write) {
  let commit = 'uncommitted';
  try { commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { /* not a repo */ }
  const date = new Date().toLocaleDateString('sv-SE'); // local YYYY-MM-DD
  mkdirSync('docs/reviews', { recursive: true });
  const n = readdirSync('docs/reviews').filter((f) => /-sweep-\d+\.md$/.test(f)).length + 1;
  const file = `docs/reviews/${date}-sweep-${String(n).padStart(2, '0')}.md`;
  const row = (c) => `| ${icon[c.status]} ${c.status} | \`${c.id}\` | ${c.detail} | ${c.expected ?? ''} | ${c.actual ?? ''} | ${c.source ?? ''} |`;
  const lines = [
    `# Suite sweep ${String(n).padStart(2, '0')} — ${date}`, '',
    `Commit: \`${commit}\` · Checks: **${summary.pass} pass, ${summary.fail} fail, ${summary.note} notes** (${checks.length} total) · Protocol: [REVIEW_PROTOCOL.md](../REVIEW_PROTOCOL.md)`, '',
    '## Scope of this sweep', '', '_What was added since the previous sweep (PRs, commits, topics)._', '',
    '## Automated conformance', '',
  ];
  for (const [cat, list] of byCat) {
    lines.push(`### ${cat}`, '', '| status | check | what | expected | actual | source |', '| --- | --- | --- | --- | --- | --- |');
    for (const c of list) lines.push(row(c));
    lines.push('');
  }
  lines.push(
    '## Manual chemistry review', '',
    '- [ ] Structure: connectivity, formal charges, lone pairs, hybridisation, stereochemistry in 3D',
    '- [ ] Electron bookkeeping: arrows start at lone pairs/bonds, end at atoms/bonds; charges balance per step',
    '- [ ] Energetics: TS and intermediate counts match steps; rate-determining step highest; Hammond-consistent',
    '- [ ] Kinetics and selectivity: rate law, molecularity, regio- and stereochemical outcome as the textbook states',
    '- [ ] Numbers trace to `src/chem/references/textbook.js` or the topic `references.md`, with units',
    '- [ ] Names (IUPAC and common) correct, special cases handled',
    '- [ ] Audience tags: facts for both depths, reasoning for Learn',
    '- [ ] Rendering honesty: nothing implies more than the model knows',
    '- [ ] Links and glossary: terms added, cross-links resolve, deep links tested', '',
    '## Findings', '',
    '| # | severity | area | finding | status |', '| --- | --- | --- | --- | --- |', '| 1 | | | | |', '',
    '## Decision', '', '**proceed** / **hold** — _one sentence of justification._', '',
  );
  writeFileSync(file, lines.join('\n'));
  console.log(`report written: ${file}`);
}
process.exitCode = summary.fail ? 1 : 0;
