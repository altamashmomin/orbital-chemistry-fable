import { MechanismPanel } from './panel.js';
import { MECHANISMS, FAMILIES, FAMILY_ORDER } from '../../chem/mechanisms/index.js';
import { audienceOf, textOf } from '../../chem/audience.js';

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
  /** Search entries: every family, each of its mechanisms with steps and key ideas, and each family predictor's vocabulary. */
  index() {
    const out = [];
    for (const fid of FAMILY_ORDER) {
      const fam = FAMILIES[fid];
      const names = fam.mechanisms.map((id) => MECHANISMS[id].name);
      out.push({ kind: 'group', title: fam.title, snippet: fam.summary || names.join(', '), href: `#mechanisms/${fid}`, keywords: [fid, 'family', ...names] });
      for (const id of fam.mechanisms) {
        const m = MECHANISMS[id];
        out.push({ kind: 'mechanism', title: `${m.name} · ${m.fullName}`, snippet: `${m.substrate} + ${m.reagent} → ${m.products}`, href: `#mechanisms/${id}`, keywords: [id, m.rateLaw, m.stereochemistry, m.equation] });
        for (const s of m.steps) out.push({ kind: 'step', title: `${m.name}: ${s.title}`, snippet: s.narration, href: `#mechanisms/${id}/${s.id}`, keywords: [s.cue] });
        for (const k of m.keyIdeas || []) out.push({ kind: 'item', title: `${m.name} key idea`, snippet: textOf(k), href: `#mechanisms/${id}`, audience: audienceOf(k, 'keyIdeas') });
      }
      const pred = fam.predictor;
      if (pred) {
        const vocab = pred.options.flatMap((o) => (o.choices || []).map((c) => `${c.label}${c.examples ? ` (${c.examples})` : ''}`));
        out.push({ kind: 'item', title: pred.title || `Which ${fam.title.toLowerCase()} mechanism will my reaction follow?`, snippet: vocab.join(' · '), href: `#mechanisms/${fid}`, keywords: ['predictor', 'conditions', ...pred.options.map((o) => o.label.toLowerCase()), ...names] });
      }
    }
    return out;
  },
};
