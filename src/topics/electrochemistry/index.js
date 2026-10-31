import { ElectrochemistryPanel } from './panel.js';
import { POTENTIAL_COUPLES, buildCell, halfCell, potentialOf, signed } from '../../chem/electrochemistry.js';
import { INVARIANTS, GLOSSARY_TERMS } from './content.js';
import { ACTIVITIES } from './activities.js';
import { audienceOf } from '../../chem/audience.js';

export const electrochemistry = {
  id: 'electrochemistry',
  title: 'Electrochemistry',
  order: 39,
  summary: 'Twenty couples on the E° ladder, the galvanic cell any two of them make (the higher potential is the cathode), E°cell, ΔG° = −nFE°, K, the Nernst equation with concentrations and pH you set, and the cell notation, drawn as a cell you can read.',
  audiences: ['refresher', 'learn'],
  workspace: { kind: 'canvas', label: 'Cell workspace', badge: 'Interactive', hints: ['Pick a partner couple', 'Set concentrations and pH', 'Click a rung of the ladder'] },
  copy: {
    eyebrow: 'Which way, and how far',
    headline: 'The higher couple <em>takes the electrons.</em>',
    subtitle: 'Standard potentials rank every couple; subtracting two of them gives the cell voltage, and the voltage gives ΔG° and K.',
    note: 'E° is tabulated, E is Nernst.',
    noteSub: 'Nothing here is fitted.',
  },
  create: (ctx) => new ElectrochemistryPanel(ctx),
  index() {
    const out = [];
    for (const c of POTENTIAL_COUPLES) {
      const hc = halfCell(c.id), b = buildCell(c.id);
      out.push({ kind: 'group', title: `${hc.formula}: E° = ${signed(potentialOf(c.id))} V`, snippet: `${hc.text}. Against ${halfCell(b.partner).formula}: ${b.cell.notation}, E° = ${signed(b.cell.E0)} V.`, href: `#electrochemistry/${c.id}`, keywords: [c.id, hc.formula, 'standard potential', 'E°', 'cell', 'anode', 'cathode', ...c.from.map((x) => x.sp), ...c.to.map((x) => x.sp)], audience: 'both' });
      for (const inv of INVARIANTS[c.id] || []) out.push({ kind: 'item', title: `${hc.formula}: ${inv.title}`, snippet: inv.detail, href: `#electrochemistry/${c.id}/${inv.id}`, audience: audienceOf(inv, 'invariants') });
    }
    for (const act of ACTIVITIES) out.push({ kind: 'item', title: `Predict: ${act.title}`, snippet: act.prompt, href: `#electrochemistry/${act.item}`, keywords: ['predict', 'activity'], audience: 'learn' });
    return out;
  },
  glossary: GLOSSARY_TERMS,
};
