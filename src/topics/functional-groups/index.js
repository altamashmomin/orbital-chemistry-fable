import { ExplorerPanel } from './panel.js';
import { FUNCTIONAL_GROUPS, FUNCTIONAL_GROUP_ORDER } from '../../chem/functionalGroups.js';
import { R_GROUPS, R_GROUP_ORDER } from '../../chem/rGroups.js';
import { audienceOf, textOf } from '../../chem/audience.js';

export const functionalGroups = {
  id: 'functional-groups',
  title: 'Functional groups',
  order: 10,
  aliases: ['explorer'],
  summary: 'Fifteen functional groups with swappable R groups: what never changes, what the R group tunes, and how to recognise each one.',
  audiences: ['refresher', 'learn'],
  workspace: { kind: '3d', label: 'Molecule workspace', badge: '3D interactive', hints: ['Drag to rotate', 'Scroll to zoom', 'Right-drag to pan'] },
  copy: {
    eyebrow: 'Your organic chemistry workspace',
    headline: 'Get to know your <em>functional groups.</em>',
    subtitle: 'Turn the molecule. Change the R group. Find the chemistry that connects them.',
    note: 'Start with structure.',
    noteSub: 'Build your chemical intuition.',
  },
  create: (ctx) => new ExplorerPanel(ctx),
  /** Search entries: every group, invariant, recognition note and R group. */
  index() {
    const out = [];
    for (const id of FUNCTIONAL_GROUP_ORDER) {
      const g = FUNCTIONAL_GROUPS[id];
      const names = g.attachments.length === 1 ? R_GROUP_ORDER.map((r) => g.nameFor?.([r], g.defaultVariant)).filter(Boolean) : [];
      out.push({ kind: 'group', title: `${g.name} (${g.pattern})`, snippet: g.invariants[0]?.title || '', href: `#functional-groups/${id}`, keywords: [id, g.pattern, g.suffix, g.family, ...names] });
      for (const inv of g.invariants) out.push({ kind: 'item', title: `${g.name}: ${inv.title}`, snippet: inv.detail, href: `#functional-groups/${id}/${inv.id}`, audience: audienceOf(inv, 'invariants') });
      for (const x of g.varies) out.push({ kind: 'item', title: `${g.name}: ${x.title}`, snippet: x.detail, href: `#functional-groups/${id}`, audience: audienceOf(x, 'varies') });
      out.push({ kind: 'item', title: `${g.name}: how to recognise it`, snippet: g.identify.map(textOf).join(' · '), href: `#functional-groups/${id}`, keywords: ['IR', 'NMR', 'spectroscopy', 'test'] });
    }
    for (const r of R_GROUP_ORDER) { const rg = R_GROUPS[r]; out.push({ kind: 'item', title: `R group: ${rg.name} (${rg.label})`, snippet: `${rg.electronic}. ${rg.note}`, href: '#functional-groups', keywords: [r, rg.formula] }); }
    return out;
  },
};
