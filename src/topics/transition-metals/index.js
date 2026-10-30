import { MetalsPanel } from './panel.js';
import { COMPLEXES, FAMILIES, buildComplex } from '../../chem/transitionMetals.js';
import { INVARIANTS, GLOSSARY_TERMS } from './content.js';
import { ACTIVITIES } from './activities.js';
import { audienceOf } from '../../chem/audience.js';

export const transitionMetals = {
  id: 'transition-metals',
  title: 'Transition metals',
  order: 40,
  summary: 'Complexes of the first row as a counting exercise: d-electron count from the oxidation state, the crystal-field pattern of the geometry, high or low spin read from the tabulated magnetism, Δo from the spectrochemical series, and the cis / trans and fac / mer isomers of the octahedron.',
  audiences: ['refresher', 'learn'],
  workspace: { kind: '3d', label: 'Complex workspace', badge: '3D interactive', hints: ['Drag to rotate', 'Scroll to zoom', 'Click a level to draw the orbital'] },
  copy: {
    eyebrow: 'Five d orbitals, split',
    headline: 'Count the electrons, <em>fill the diagram.</em>',
    subtitle: 'Where the ligands sit decides which d orbitals rise; how strongly they bind decides whether the electrons pair.',
    note: 'Δo is measured, not derived.',
    noteSub: 'Every value here is a table entry.',
  },
  create: (ctx) => new MetalsPanel(ctx),
  index() {
    const out = [];
    for (const c of COMPLEXES) {
      const b = buildComplex(c.id);
      out.push({ kind: 'group', title: `${c.formula} (${c.name}): d${b.d === 10 ? '¹⁰' : ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'][b.d]} ${b.geometryLabel}`, snippet: `${b.oxidationText}; ${b.unpaired} unpaired electron${b.unpaired === 1 ? '' : 's'}${b.deltaO != null ? `; Δo ${b.deltaO.toLocaleString('en')} cm⁻¹` : ''}${b.colour ? `; ${b.colour}` : ''}. ${FAMILIES[c.family].label}.`, href: `#transition-metals/${c.id}`, keywords: [c.id, c.formula, c.name, c.metal, 'complex', 'crystal field', b.geometryLabel, ...(c.isomers || []), ...b.ligands.map((l) => l.formula)], audience: 'both' });
      for (const inv of INVARIANTS[c.id] || []) out.push({ kind: 'item', title: `${c.formula}: ${inv.title}`, snippet: inv.detail, href: `#transition-metals/${c.id}/${inv.id}`, audience: audienceOf(inv, 'invariants') });
    }
    for (const act of ACTIVITIES) out.push({ kind: 'item', title: `Predict: ${act.title}`, snippet: act.prompt, href: `#transition-metals/${act.item}`, keywords: ['predict', 'activity'], audience: 'learn' });
    return out;
  },
  glossary: GLOSSARY_TERMS,
};
