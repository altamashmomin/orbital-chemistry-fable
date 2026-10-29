import { ConformationsPanel } from './panel.js';
import { ROTORS } from '../../chem/conformations.js';
import { ACTIVITIES } from './activities.js';

export const conformations = {
  id: 'conformations',
  title: 'Conformations',
  order: 17,
  summary: 'Turn a single bond and watch the 3D model, the Newman projection and the torsional energy move together: ethane, butane, and the anti-periplanar geometry E2 depends on.',
  audiences: ['refresher', 'learn'],
  workspace: { kind: '3d', label: 'Rotor workspace', badge: '3D interactive', hints: ['Drag to rotate', 'Scroll to zoom', 'Use the slider to turn the bond'] },
  copy: {
    eyebrow: 'Bonds that turn',
    headline: 'One bond, <em>every angle.</em>',
    subtitle: 'Single bonds rotate. Some angles cost energy, some are free, and one of them is the only place E2 can happen.',
    note: 'Staggered, eclipsed, anti, gauche.',
    noteSub: 'Same molecule, different shapes.',
  },
  create: (ctx) => new ConformationsPanel(ctx),
  index() {
    const out = [];
    for (const r of ROTORS) {
      out.push({ kind: 'group', title: `${r.name} (${r.formula}): rotation about ${r.axis.join('–')}`, snippet: r.landmarks.map((l) => `${l.label} ${l.phi}°`).join(' · '), href: `#conformations/${r.id}`, keywords: [r.id, 'conformation', 'Newman', 'dihedral', 'torsion', ...r.landmarks.map((l) => l.id)] });
      for (const l of r.landmarks) out.push({ kind: 'item', title: `${r.name}: ${l.label} (${l.phi}°)`, snippet: `Jump the ${r.reference.join('–')} dihedral to ${l.phi}°.`, href: `#conformations/${r.id}/${l.id}` });
      for (const f of r.facts || []) out.push({ kind: 'item', title: `${r.name}: ${f.title}`, snippet: f.detail, href: `#conformations/${r.id}`, audience: f.audience || 'both' });
    }
    for (const act of ACTIVITIES) out.push({ kind: 'item', title: `Predict: ${act.title}`, snippet: act.prompt, href: `#conformations/${act.rotor}`, keywords: ['predict', 'activity'], audience: 'learn' });
    return out;
  },
  glossary: [
    { id: 'conformation', term: 'Conformation', definition: 'One of the shapes a molecule can take by rotating about its single bonds, without breaking any. Conformations interconvert quickly at room temperature.', why: 'Staggered vs eclipsed and anti vs gauche are conformations; so are the cyclohexane chairs. They decide which hydrogen E2 can remove.', links: [{ label: 'Conformations', href: '#conformations' }, { label: 'Anti-periplanar', href: '#glossary/anti-periplanar' }] },
    { id: 'dihedral-angle', term: 'Dihedral (torsion) angle', definition: 'The angle between two bonds seen down the bond that joins them: the A–B–C–D angle between the A–B and C–D bonds projected on a plane perpendicular to B–C.', why: '0° is eclipsed, 60° staggered (gauche), 180° anti. It is the one number a Newman projection shows.', links: [{ label: 'Conformations', href: '#conformations/ethane' }] },
    { id: 'newman-projection', term: 'Newman projection', definition: 'A drawing looking straight down one bond: the front carbon is a point with its three bonds, the back carbon a circle with its bonds starting at the rim.', why: 'It makes the dihedral angle visible and is how staggered, eclipsed, gauche and anti are usually drawn.', links: [{ label: 'Conformations', href: '#conformations/butane' }] },
    { id: 'torsional-strain', term: 'Torsional and steric strain', definition: 'Torsional strain is the energy cost of eclipsed bonds; steric strain the cost of two groups being too close, as in gauche butane or 1,3-diaxial groups on a chair.', why: 'Both show up on the butane energy curve: the eclipsed hills are torsional, the gauche step above anti is steric.', links: [{ label: 'Butane', href: '#conformations/butane' }] },
  ],
};
