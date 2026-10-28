import { ShapesPanel } from './panel.js';
import { SHAPES, SHAPE_FAMILIES } from '../../chem/shapes.js';
import { ACTIVITIES } from './activities.js';
import { audienceOf } from '../../chem/audience.js';

export const molecularShapes = {
  id: 'molecular-shapes',
  title: 'Molecular shapes',
  order: 15,
  summary: 'VSEPR from the inside: count the electron domains on the central atom, see the arrangement and the shape, and check each bond angle against the measured value.',
  audiences: ['refresher', 'learn'],
  workspace: { kind: '3d', label: 'Shape workspace', badge: '3D interactive', hints: ['Drag to rotate', 'Scroll to zoom', 'Pick a card to highlight an angle'] },
  copy: {
    eyebrow: 'Shapes and angles',
    headline: 'Count the domains, <em>see the shape.</em>',
    subtitle: 'Bonds and lone pairs spread out as far as they can. Predict the angle, then check it against the measured value.',
    note: 'Count domains, not atoms.',
    noteSub: 'Lone pairs count too.',
  },
  create: (ctx) => new ShapesPanel(ctx),
  /** Search entries: every shape, every invariant card and the activities. */
  index() {
    const out = [];
    for (const s of SHAPES) {
      out.push({ kind: 'group', title: `${s.name} (${s.formula}): ${s.shape}`, snippet: `${SHAPE_FAMILIES[s.family].label}, ${s.bonds} bond${s.bonds === 1 ? '' : 's'} + ${s.lonePairs} lone pair${s.lonePairs === 1 ? '' : 's'} → ${s.arrangement} arrangement, ${s.shape} shape`, href: `#molecular-shapes/${s.id}`, keywords: [s.id, s.formula, s.shape, s.arrangement, 'VSEPR', 'bond angle', 'geometry'], audience: s.audience || 'both' });
      for (const inv of s.invariants) out.push({ kind: 'item', title: `${s.formula}: ${inv.title}`, snippet: inv.detail, href: `#molecular-shapes/${s.id}/${inv.id}`, audience: s.audience === 'learn' ? 'learn' : audienceOf(inv, 'invariants') });
    }
    for (const act of ACTIVITIES) out.push({ kind: 'item', title: `Predict: ${act.title}`, snippet: act.prompt, href: `#molecular-shapes/${act.show?.item || SHAPES[0].id}`, keywords: ['predict', 'activity', 'quiz'], audience: 'learn' });
    return out;
  },
  glossary: [
    { id: 'electron-domain', term: 'Electron domain', definition: 'A region of electron density around an atom that repels other regions: one bond (single, double or triple alike) or one lone pair.', why: 'VSEPR counts domains, not atoms or electrons: CO₂ has two domains on carbon and is linear, SO₂ has three on sulfur and is bent.', links: [{ label: 'Molecular shapes', href: '#molecular-shapes' }, { label: 'VSEPR', href: '#glossary/vsepr' }] },
    { id: 'steric-number', term: 'Steric number', definition: 'The number of electron domains on an atom: bonds plus lone pairs. 2 linear, 3 trigonal, 4 tetrahedral, 5 trigonal bipyramidal, 6 octahedral arrangement.', why: 'The arrangement follows the steric number; the molecular shape is that arrangement with the lone pairs left unnamed.', links: [{ label: 'Molecular shapes', href: '#molecular-shapes' }] },
    { id: 'axial-equatorial', term: 'Axial and equatorial', definition: 'The two kinds of position in a trigonal bipyramid: two axial positions 180° apart on the axis, three equatorial ones 120° apart in the plane.', why: 'Lone pairs prefer equatorial positions (fewer 90° neighbours), which is why SF₄ is a seesaw; the same words name the two kinds of bond on a cyclohexane chair.', links: [{ label: 'SF₄', href: '#molecular-shapes/sulfur-tetrafluoride' }, { label: 'PF₅', href: '#molecular-shapes/phosphorus-pentafluoride' }] },
  ],
};
