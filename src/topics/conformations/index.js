import { ConformationsPanel } from './panel.js';
import { ROTORS } from '../../chem/conformations.js';
import { CHAIR, CHAIR_SUBSTITUENTS, RING_FORMS } from '../../chem/cyclohexane.js';
import { ACTIVITIES } from './activities.js';

export const conformations = {
  id: 'conformations',
  title: 'Conformations',
  order: 17,
  summary: 'Turn a single bond and watch the 3D model, the Newman projection and the torsional energy move together: ethane, butane, the anti-periplanar geometry E2 depends on, and the cyclohexane chair with its ring flip and A-values.',
  audiences: ['refresher', 'learn'],
  workspace: { kind: '3d', label: 'Rotor workspace', badge: '3D interactive', hints: ['Drag to rotate', 'Scroll to zoom', 'Use the slider to turn the bond'] },
  copy: {
    eyebrow: 'Bonds that turn',
    headline: 'One bond, <em>every angle.</em>',
    subtitle: 'Single bonds rotate. Some angles cost energy, some are free, and one of them is the only place E2 can happen.',
    note: 'Staggered, eclipsed, anti, gauche, axial, equatorial.',
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
    out.push({ kind: 'group', title: `${CHAIR.name} (${CHAIR.formula}): chair, ring flip, boat`, snippet: RING_FORMS.map((f) => f.label).join(' · '), href: `#conformations/${CHAIR.id}`, keywords: ['cyclohexane', 'chair', 'boat', 'ring flip', 'axial', 'equatorial', 'A-value', '1,3-diaxial'] });
    for (const f of RING_FORMS) out.push({ kind: 'item', title: `${CHAIR.name}: ${f.label}`, snippet: `Draw the ${f.short.toLowerCase()} with the chosen substituent on C1.`, href: `#conformations/${CHAIR.id}/${f.id}` });
    for (const s of CHAIR_SUBSTITUENTS) if (s.id !== 'H') out.push({ kind: 'item', title: `${s.name}: A-value`, snippet: `Axial vs equatorial ${s.formula} on the chair; the tabulated A-value and the share of molecules in the equatorial chair.`, href: `#conformations/${CHAIR.id}/axial/${s.id}`, keywords: [s.id, 'A-value'] });
    for (const f of CHAIR.facts) out.push({ kind: 'item', title: `${CHAIR.name}: ${f.title}`, snippet: f.detail, href: `#conformations/${CHAIR.id}`, audience: f.audience || 'both' });
    for (const act of ACTIVITIES) out.push({ kind: 'item', title: `Predict: ${act.title}`, snippet: act.prompt, href: `#conformations/${act.rotor}`, keywords: ['predict', 'activity'], audience: 'learn' });
    return out;
  },
  glossary: [
    { id: 'conformation', term: 'Conformation', definition: 'One of the shapes a molecule can take by rotating about its single bonds, without breaking any. Conformations interconvert quickly at room temperature.', why: 'Staggered vs eclipsed and anti vs gauche are conformations; so are the cyclohexane chairs. They decide which hydrogen E2 can remove.', links: [{ label: 'Conformations', href: '#conformations' }, { label: 'Anti-periplanar', href: '#glossary/anti-periplanar' }] },
    { id: 'dihedral-angle', term: 'Dihedral (torsion) angle', definition: 'The angle between two bonds seen down the bond that joins them: the A–B–C–D angle between the A–B and C–D bonds projected on a plane perpendicular to B–C.', why: '0° is eclipsed, 60° staggered (gauche), 180° anti. It is the one number a Newman projection shows.', links: [{ label: 'Conformations', href: '#conformations/ethane' }] },
    { id: 'newman-projection', term: 'Newman projection', definition: 'A drawing looking straight down one bond: the front carbon is a point with its three bonds, the back carbon a circle with its bonds starting at the rim.', why: 'It makes the dihedral angle visible and is how staggered, eclipsed, gauche and anti are usually drawn.', links: [{ label: 'Conformations', href: '#conformations/butane' }] },
    { id: 'ring-flip', term: 'Ring flip (chair inversion)', definition: 'The rotation about the ring bonds that turns one cyclohexane chair into the other, through a half-chair and a twist-boat. No bond breaks; every axial substituent becomes equatorial and vice versa, while up stays up.', why: 'It is why a substituent on a chair spends its time in the position its A-value prefers, and why tert-butyl "locks" a ring.', links: [{ label: 'Cyclohexane chair', href: '#conformations/cyclohexane' }, { label: 'Axial and equatorial', href: '#glossary/axial-equatorial' }] },
    { id: 'a-value', term: 'A-value', definition: 'The free-energy difference (kJ/mol or kcal/mol) between the chair with a substituent axial and the chair with it equatorial; positive means equatorial is preferred. Methyl 7.3, isopropyl 9.0, tert-butyl ≈ 20 kJ/mol.', why: 'A single tabulated number that ranks the effective size of groups on a ring and predicts which chair dominates.', links: [{ label: 'Cyclohexane chair', href: '#conformations/cyclohexane/axial/methyl' }, { label: 'Torsional and steric strain', href: '#glossary/torsional-strain' }] },
    { id: 'diaxial-interaction', term: '1,3-Diaxial interaction', definition: 'The steric crowding between an axial substituent on a chair carbon and the axial hydrogens (or groups) on the two carbons across from it (positions 3 and 5), which point the same way.', why: 'Each one is a gauche-butane interaction, so an axial methyl pays two of them: the origin of its A-value.', links: [{ label: 'Axial methyl', href: '#conformations/cyclohexane/axial/methyl' }, { label: 'Gauche butane', href: '#conformations/butane/gauche' }] },
    { id: 'torsional-strain', term: 'Torsional and steric strain', definition: 'Torsional strain is the energy cost of eclipsed bonds; steric strain the cost of two groups being too close, as in gauche butane or 1,3-diaxial groups on a chair.', why: 'Both show up on the butane energy curve: the eclipsed hills are torsional, the gauche step above anti is steric.', links: [{ label: 'Butane', href: '#conformations/butane' }] },
  ],
};
