import { RedoxPanel } from './panel.js';
import { COUPLES, FAMILIES, buildCouple } from '../../chem/redox.js';
import { INVARIANTS, GLOSSARY_TERMS } from './content.js';
import { ACTIVITIES } from './activities.js';
import { audienceOf } from '../../chem/audience.js';

export const redox = {
  id: 'redox',
  title: 'Redox',
  order: 38,
  summary: 'Oxidation states read off any Lewis structure by one rule, the carbon oxidation ladder on the Functional groups molecules, the Reaction lab reactions shown to move no electrons, and half-reactions balanced in acid or base and paired into overall equations.',
  audiences: ['refresher', 'learn'],
  workspace: { kind: '3d', label: 'Species workspace', badge: '3D interactive', hints: ['Drag to rotate', 'Scroll to zoom', 'Labels are oxidation states'] },
  copy: {
    eyebrow: 'Electrons, counted',
    headline: 'Give every bond to the <em>more electronegative atom.</em>',
    subtitle: 'That one rule assigns an oxidation state to every atom; the difference before and after is the number of electrons a half-reaction must show.',
    note: 'Counting, not potentials.',
    noteSub: 'Direction and E° come later.',
  },
  create: (ctx) => new RedoxPanel(ctx),
  index() {
    const out = [];
    for (const c of COUPLES) {
      const b = buildCouple(c.id);
      out.push({ kind: 'group', title: `${c.name}: ${b.kind === 'none' ? 'not a redox reaction' : `${b.n} e⁻ ${b.kind === 'oxidation' ? 'lost' : 'gained'}`}`, snippet: `${b.acid.text}. ${b.changeText}. ${FAMILIES[c.family].label}.`, href: `#redox/${c.id}`, keywords: [c.id, ...c.from.map((x) => x.sp), ...c.to.map((x) => x.sp), 'oxidation state', 'half-reaction', b.kind, ...c.key], audience: 'both' });
      for (const inv of INVARIANTS[c.id] || []) out.push({ kind: 'item', title: `${c.name}: ${inv.title}`, snippet: inv.detail, href: `#redox/${c.id}/${inv.id}`, audience: audienceOf(inv, 'invariants') });
    }
    for (const act of ACTIVITIES) out.push({ kind: 'item', title: `Predict: ${act.title}`, snippet: act.prompt, href: `#redox/${act.item}`, keywords: ['predict', 'activity'], audience: 'learn' });
    return out;
  },
  glossary: GLOSSARY_TERMS,
};
