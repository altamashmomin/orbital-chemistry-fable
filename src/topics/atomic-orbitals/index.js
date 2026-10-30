import { OrbitalsPanel } from './panel.js';
import { ORBITAL_ITEMS, HYBRIDS, PERIODIC, electronConfiguration } from '../../chem/atomicOrbitals.js';
import { ORBITAL_LABELS } from '../../chem/orbitals.js';
import { INVARIANTS, GLOSSARY_TERMS } from './content.js';
import { ACTIVITIES } from './activities.js';
import { audienceOf } from '../../chem/audience.js';

export const atomicOrbitals = {
  id: 'atomic-orbitals',
  title: 'Atomic orbitals',
  order: 30,
  summary: 'The hydrogen-like orbitals as the surfaces they really are: nodes, quantum numbers, the radial distribution, the sp / sp² / sp³ hybrids built from them, and the electron configuration of every element up to krypton.',
  audiences: ['refresher', 'learn'],
  workspace: { kind: '3d', label: 'Orbital workspace', badge: '3D interactive', hints: ['Drag to rotate', 'Scroll to zoom', 'Tighten the contour to see inside'] },
  copy: {
    eyebrow: 'Where electrons live',
    headline: 'Orbitals, <em>as surfaces.</em>',
    subtitle: 'Each one is a function with a shape, a size and a set of nodes. Fill them in order and the periodic table follows.',
    note: 'Amber positive, fuchsia negative.',
    noteSub: 'The surface holds 90 % of the electron.',
  },
  create: (ctx) => new OrbitalsPanel(ctx),
  index() {
    const out = [];
    for (const it of ORBITAL_ITEMS) {
      const kw = it.kind === 'atomic' ? [it.id, ORBITAL_LABELS[it.orbital], 'orbital', 'node', 'quantum number'] : it.kind === 'hybrid' ? [it.id, HYBRIDS[it.hybrid].label, 'hybrid', 'hybridisation', String(HYBRIDS[it.hybrid].angle)] : ['electron configuration', 'aufbau', 'Hund', 'Pauli', 'valence electrons', 'noble gas core'];
      out.push({ kind: 'group', title: it.kind === 'configurations' ? 'Electron configurations (H to Kr)' : `${it.name} orbital`, snippet: it.kind === 'atomic' ? `The hydrogen-like ${it.name} orbital: shape, nodes, radial distribution, energy.` : it.kind === 'hybrid' ? `${HYBRIDS[it.hybrid].label}: ${HYBRIDS[it.hybrid].count} lobes at ${HYBRIDS[it.hybrid].angle}°, ${Math.round(HYBRIDS[it.hybrid].sCharacter * 100)} % s character.` : 'Aufbau order, Hund boxes, noble-gas cores and the Cr / Cu exceptions for every element 1–36.', href: `#atomic-orbitals/${it.id}`, keywords: kw, audience: it.audience || 'both' });
      for (const inv of INVARIANTS[it.id] || []) out.push({ kind: 'item', title: `${it.name}: ${inv.title}`, snippet: inv.detail, href: `#atomic-orbitals/${it.id}/${inv.id}`, audience: it.audience === 'learn' ? 'learn' : audienceOf(inv, 'invariants') });
    }
    for (const e of PERIODIC) { const c = electronConfiguration(e.Z); out.push({ kind: 'item', title: `${e.name} (${e.symbol}, Z = ${e.Z}): ${c.nobleGasString}`, snippet: `${c.string}; ${c.valence} valence electron${c.valence === 1 ? '' : 's'}, ${c.unpaired} unpaired${c.exception ? '; an aufbau exception' : ''}.`, href: `#atomic-orbitals/configurations`, keywords: [e.symbol, e.name, 'electron configuration'] }); }
    for (const act of ACTIVITIES) out.push({ kind: 'item', title: `Predict: ${act.title}`, snippet: act.prompt, href: `#atomic-orbitals/${act.item}`, keywords: ['predict', 'activity'], audience: 'learn' });
    return out;
  },
  glossary: GLOSSARY_TERMS,
};
