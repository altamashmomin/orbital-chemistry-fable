import { MechanismPanel } from './panel.js';

export const mechanisms = {
  id: 'mechanisms',
  title: 'Reaction lab',
  badge: 'BETA',
  order: 20,
  summary: 'SN2, SN1, E2 and E1 as step-by-step 3D animations with electron-pushing arrows, energy profiles and a which-mechanism predictor.',
  audiences: ['refresher', 'learn'],
  workspace: { kind: '3d', label: 'Reaction studio', badge: '3D interactive', hints: ['Drag to rotate', 'Scroll to zoom', 'Right-drag to pan'] },
  copy: {
    eyebrow: 'The reaction studio',
    headline: 'Chemistry, <em>in motion.</em>',
    subtitle: 'See atoms move, bonds change, and a mechanism come together.',
    note: 'A closer look at change.',
    noteSub: 'Build your chemical intuition.',
  },
  create: (ctx) => new MechanismPanel(ctx),
};
