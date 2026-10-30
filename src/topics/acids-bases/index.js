import { AcidsPanel } from './panel.js';
import { PAIRS, FACTORS, buildPair } from '../../chem/acidsBases.js';
import { INVARIANTS, GLOSSARY_TERMS } from './content.js';
import { ACTIVITIES } from './activities.js';
import { audienceOf } from '../../chem/audience.js';

export const acidsBases = {
  id: 'acids-bases',
  title: 'Acids and bases',
  order: 18,
  summary: 'The pKa ladder as a working tool: every conjugate pair at its tabulated value, which way a proton transfer goes from one subtraction, and the five factors (element, size, resonance, induction, hybridisation) that put each acid where it is.',
  audiences: ['refresher', 'learn'],
  workspace: { kind: '3d', label: 'Proton workspace', badge: '3D interactive', hints: ['Drag to rotate', 'Scroll to zoom', 'Slide the proton off'] },
  copy: {
    eyebrow: 'Protons that move',
    headline: 'Lower pKa, <em>stronger acid.</em>',
    subtitle: 'Rank every acid on one ladder and a proton transfer becomes a subtraction: it goes toward the weaker acid.',
    note: 'Compare pKa, not charge.',
    noteSub: 'A base is its conjugate acid\'s pKa.',
  },
  create: (ctx) => new AcidsPanel(ctx),
  index() {
    const out = [];
    for (const p of PAIRS) {
      const b = buildPair(p.id);
      out.push({ kind: 'group', title: `${p.name} (${p.acid}): pKa ${b.pka}`, snippet: `Conjugate base ${p.base} (${p.baseName}); ${p.factors.map((f) => FACTORS[f].label.split(':')[0].toLowerCase()).join(', ')}.`, href: `#acids-bases/${p.id}`, keywords: [p.id, p.acid, p.base, p.baseName, 'pKa', 'acid', 'base', 'conjugate', ...p.factors], audience: p.audience || 'both' });
      for (const inv of INVARIANTS[p.id] || []) out.push({ kind: 'item', title: `${p.acid}: ${inv.title}`, snippet: inv.detail, href: `#acids-bases/${p.id}/${inv.id}`, audience: p.audience === 'learn' ? 'learn' : audienceOf(inv, 'invariants') });
    }
    for (const [id, f] of Object.entries(FACTORS)) out.push({ kind: 'item', title: `Acid strength: ${f.label}`, snippet: f.summary, href: `#acids-bases/${f.orders[0][0]}`, keywords: [id, 'acid strength', 'factor'] });
    for (const act of ACTIVITIES) out.push({ kind: 'item', title: `Predict: ${act.title}`, snippet: act.prompt, href: `#acids-bases/${act.item}`, keywords: ['predict', 'activity'], audience: 'learn' });
    return out;
  },
  glossary: GLOSSARY_TERMS,
};
