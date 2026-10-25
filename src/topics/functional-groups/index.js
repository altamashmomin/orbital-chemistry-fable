import { ExplorerPanel } from './panel.js';

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
};
