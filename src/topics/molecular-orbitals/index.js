import { MOPanel } from './panel.js';
import { MO_ITEMS, MO_FAMILIES, buildMO } from '../../chem/molecularOrbitals.js';
import { INVARIANTS, GLOSSARY_TERMS } from './content.js';
import { ACTIVITIES } from './activities.js';
import { audienceOf } from '../../chem/audience.js';

export const molecularOrbitals = {
  id: 'molecular-orbitals',
  title: 'Molecular orbitals',
  order: 35,
  summary: 'Bonding and antibonding orbitals you can see: H₂ and the missing He₂, the triple bond of N₂, the unpaired electrons of O₂, the π systems of ethene, butadiene and the carbonyl by Hückel, and the C–Cl σ* behind SN2.',
  audiences: ['refresher', 'learn'],
  workspace: { kind: '3d', label: 'MO workspace', badge: '3D interactive', hints: ['Drag to rotate', 'Scroll to zoom', 'Click a level in the diagram'] },
  copy: {
    eyebrow: 'Orbitals that bond',
    headline: 'In phase bonds, <em>out of phase breaks.</em>',
    subtitle: 'Combine two orbitals and you get two: one that holds the atoms together and one that pushes them apart. Count the electrons in each and the bond follows.',
    note: 'HOMO gives, LUMO takes.',
    noteSub: 'Every mechanism is one of these.',
  },
  create: (ctx) => new MOPanel(ctx),
  index() {
    const out = [];
    for (const it of MO_ITEMS) {
      const b = buildMO(it.id);
      const snippet = it.kind === 'diatomic' ? `${b.facts.electrons} valence electrons, bond order ${b.facts.bondOrder}, ${b.facts.unpaired} unpaired; HOMO ${b.facts.homo}, LUMO ${b.facts.lumo}.` : it.kind === 'huckel' ? `Hückel π MOs ${b.mos.map((m) => `${m.short} (x = ${m.x >= 0 ? '+' : '−'}${Math.abs(m.x).toFixed(3)})`).join(', ')}; HOMO ${b.facts.homo}, LUMO ${b.facts.lumo}.` : 'σ and σ* of the C–Cl bond: the σ* lobe behind carbon that SN2 attacks.';
      out.push({ kind: 'group', title: `${it.name} (${it.formula})`, snippet, href: `#molecular-orbitals/${it.id}`, keywords: [it.id, it.formula, 'molecular orbital', 'bonding', 'antibonding', 'HOMO', 'LUMO', MO_FAMILIES[it.family].label], audience: it.audience || 'both' });
      for (const inv of INVARIANTS[it.id] || []) out.push({ kind: 'item', title: `${it.formula}: ${inv.title}`, snippet: inv.detail, href: `#molecular-orbitals/${it.id}/${inv.id}`, audience: it.audience === 'learn' ? 'learn' : audienceOf(inv, 'invariants') });
    }
    for (const act of ACTIVITIES) out.push({ kind: 'item', title: `Predict: ${act.title}`, snippet: act.prompt, href: `#molecular-orbitals/${act.item}`, keywords: ['predict', 'activity'], audience: 'learn' });
    return out;
  },
  glossary: GLOSSARY_TERMS,
};
