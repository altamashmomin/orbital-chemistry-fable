// R-group fragments. Atom ids are local; the builder prefixes them per attachment point.
// `attach` is the atom that bonds to the functional group core.
import { DEG } from './geometry.js';

const H3 = (c, ...hs) => hs.map((h) => ({ a: c, b: h, order: 1 }));

/** Benzene ring template: 6 carbons at 1.39 Å, hydrogens at 2.47 Å, ring in the xy plane. */
export function benzeneTemplate(prefix = '', { attachIndex = 1, skipH = [1] } = {}) {
  const atoms = [], bonds = [], coords = {};
  for (let i = 1; i <= 6; i++) {
    const ang = (i - 1) * 60 * DEG;
    const cid = `${prefix}C${i}`;
    atoms.push({ id: cid, el: 'C', hyb: 'sp2', aromatic: true });
    coords[cid] = [1.39 * Math.cos(ang), 1.39 * Math.sin(ang), 0];
    if (!skipH.includes(i)) {
      const hid = `${prefix}H${i}`;
      atoms.push({ id: hid, el: 'H' });
      coords[hid] = [2.47 * Math.cos(ang), 2.47 * Math.sin(ang), 0];
      bonds.push({ a: cid, b: hid, order: 1 });
    }
  }
  const ring = atoms.filter((a) => a.el === 'C').map((a) => a.id);
  for (let i = 1; i <= 6; i++) {
    const j = (i % 6) + 1;
    bonds.push({ a: `${prefix}C${i}`, b: `${prefix}C${j}`, order: i % 2 ? 2 : 1, aromatic: true, ring });
  }
  const attach = `${prefix}C${attachIndex}`;
  const ang = (attachIndex - 1) * 60 * DEG;
  return {
    atoms, bonds,
    rigid: { atoms: atoms.map((a) => a.id), coords, attach, attachDir: [Math.cos(ang), Math.sin(ang), 0], planeAxis: [-Math.sin(ang), Math.cos(ang), 0] },
    attach, ring,
  };
}

const phenyl = benzeneTemplate('');

export const R_GROUPS = {
  H: {
    id: 'H', name: 'hydrogen', label: 'H', formula: 'H',
    steric: 0, electronic: 'reference (no alkyl donation)',
    note: 'Not really an R group: using H shows the parent (smallest) member of the class.',
    atoms: [{ id: 'H', el: 'H' }], bonds: [], attach: 'H',
  },
  methyl: {
    id: 'methyl', name: 'methyl', label: 'CH₃', formula: 'CH3',
    steric: 1, electronic: 'weak σ-donor (hyperconjugation)',
    note: 'Smallest alkyl group; a methyl-bearing carbon is the least hindered.',
    atoms: [{ id: 'C', el: 'C' }, { id: 'H1', el: 'H' }, { id: 'H2', el: 'H' }, { id: 'H3', el: 'H' }],
    bonds: H3('C', 'H1', 'H2', 'H3'), attach: 'C',
  },
  ethyl: {
    id: 'ethyl', name: 'ethyl', label: 'CH₂CH₃', formula: 'C2H5',
    steric: 2, electronic: 'σ-donor',
    note: 'Attachment carbon has one carbon neighbour: makes a primary (1°) centre.',
    atoms: [{ id: 'C1', el: 'C' }, { id: 'H1', el: 'H' }, { id: 'H2', el: 'H' }, { id: 'C2', el: 'C' }, { id: 'H3', el: 'H' }, { id: 'H4', el: 'H' }, { id: 'H5', el: 'H' }],
    bonds: [...H3('C1', 'H1', 'H2'), { a: 'C1', b: 'C2', order: 1 }, ...H3('C2', 'H3', 'H4', 'H5')], attach: 'C1',
  },
  isopropyl: {
    id: 'isopropyl', name: 'isopropyl', label: 'CH(CH₃)₂', formula: 'C3H7',
    steric: 3, electronic: 'σ-donor (two methyls)',
    note: 'Attachment carbon has two carbon neighbours: a secondary (2°) centre.',
    atoms: [
      { id: 'C1', el: 'C' }, { id: 'H1', el: 'H' },
      { id: 'C2', el: 'C' }, { id: 'H2', el: 'H' }, { id: 'H3', el: 'H' }, { id: 'H4', el: 'H' },
      { id: 'C3', el: 'C' }, { id: 'H5', el: 'H' }, { id: 'H6', el: 'H' }, { id: 'H7', el: 'H' },
    ],
    bonds: [
      { a: 'C1', b: 'H1', order: 1 }, { a: 'C1', b: 'C2', order: 1 }, { a: 'C1', b: 'C3', order: 1 },
      ...H3('C2', 'H2', 'H3', 'H4'), ...H3('C3', 'H5', 'H6', 'H7'),
    ], attach: 'C1',
  },
  tBu: {
    id: 'tBu', name: 'tert-butyl', label: 'C(CH₃)₃', formula: 'C4H9',
    steric: 4, electronic: 'σ-donor (three methyls)',
    note: 'Attachment carbon has three carbon neighbours: a tertiary (3°) centre. Very bulky.',
    atoms: [
      { id: 'C1', el: 'C' },
      { id: 'C2', el: 'C' }, { id: 'H1', el: 'H' }, { id: 'H2', el: 'H' }, { id: 'H3', el: 'H' },
      { id: 'C3', el: 'C' }, { id: 'H4', el: 'H' }, { id: 'H5', el: 'H' }, { id: 'H6', el: 'H' },
      { id: 'C4', el: 'C' }, { id: 'H7', el: 'H' }, { id: 'H8', el: 'H' }, { id: 'H9', el: 'H' },
    ],
    bonds: [
      { a: 'C1', b: 'C2', order: 1 }, { a: 'C1', b: 'C3', order: 1 }, { a: 'C1', b: 'C4', order: 1 },
      ...H3('C2', 'H1', 'H2', 'H3'), ...H3('C3', 'H4', 'H5', 'H6'), ...H3('C4', 'H7', 'H8', 'H9'),
    ], attach: 'C1',
  },
  phenyl: {
    id: 'phenyl', name: 'phenyl', label: 'C₆H₅', formula: 'C6H5',
    steric: 3, electronic: 'π-conjugating; inductively withdrawing, resonance donating',
    note: 'An aromatic ring attached directly: the group becomes "aryl" and often behaves differently (phenol, aniline).',
    atoms: phenyl.atoms, bonds: phenyl.bonds, rigid: phenyl.rigid, attach: phenyl.attach, aromaticAttach: true,
  },
  benzyl: (() => {
    const ring = benzeneTemplate('');
    return {
      id: 'benzyl', name: 'benzyl', label: 'CH₂C₆H₅', formula: 'C7H7',
      steric: 3, electronic: 'σ-donor; the benzylic carbon is stabilised as cation/radical/anion',
      note: 'A CH₂ between the group and a ring: the benzylic position is unusually reactive.',
      atoms: [{ id: 'C0', el: 'C' }, { id: 'Ha', el: 'H' }, { id: 'Hb', el: 'H' }, ...ring.atoms],
      bonds: [...H3('C0', 'Ha', 'Hb'), { a: 'C0', b: ring.attach, order: 1 }, ...ring.bonds],
      rigid: ring.rigid, attach: 'C0',
    };
  })(),
  vinyl: {
    id: 'vinyl', name: 'vinyl', label: 'CH=CH₂', formula: 'C2H3',
    steric: 2, electronic: 'π-conjugating; sp² carbon is inductively withdrawing',
    note: 'An sp² carbon attached directly: vinyl halides/alcohols (enols) behave very differently from alkyl ones.',
    atoms: [{ id: 'C1', el: 'C', hyb: 'sp2' }, { id: 'H1', el: 'H' }, { id: 'C2', el: 'C', hyb: 'sp2' }, { id: 'H2', el: 'H' }, { id: 'H3', el: 'H' }],
    bonds: [{ a: 'C1', b: 'H1', order: 1 }, { a: 'C1', b: 'C2', order: 2 }, ...H3('C2', 'H2', 'H3')], attach: 'C1',
  },
  allyl: {
    id: 'allyl', name: 'allyl', label: 'CH₂CH=CH₂', formula: 'C3H5',
    steric: 2, electronic: 'σ-donor; allylic position stabilised by the adjacent π bond',
    note: 'A CH₂ next to a C=C: allylic cations/radicals are resonance-stabilised (fast SN1 and SN2).',
    atoms: [
      { id: 'C0', el: 'C' }, { id: 'Ha', el: 'H' }, { id: 'Hb', el: 'H' },
      { id: 'C1', el: 'C', hyb: 'sp2' }, { id: 'H1', el: 'H' }, { id: 'C2', el: 'C', hyb: 'sp2' }, { id: 'H2', el: 'H' }, { id: 'H3', el: 'H' },
    ],
    bonds: [...H3('C0', 'Ha', 'Hb'), { a: 'C0', b: 'C1', order: 1 }, { a: 'C1', b: 'H1', order: 1 }, { a: 'C1', b: 'C2', order: 2 }, ...H3('C2', 'H2', 'H3')],
    attach: 'C0',
  },
  CF3: {
    id: 'CF3', name: 'trifluoromethyl', label: 'CF₃', formula: 'CF3',
    steric: 2, electronic: 'strong σ-acceptor (three C–F dipoles)',
    note: 'Strongly electron-withdrawing: raises acidity of nearby O–H/N–H and lowers basicity.',
    atoms: [{ id: 'C', el: 'C' }, { id: 'F1', el: 'F', lonePairs: 3 }, { id: 'F2', el: 'F', lonePairs: 3 }, { id: 'F3', el: 'F', lonePairs: 3 }],
    bonds: H3('C', 'F1', 'F2', 'F3'), attach: 'C',
  },
};

export const R_GROUP_ORDER = ['H', 'methyl', 'ethyl', 'isopropyl', 'tBu', 'phenyl', 'benzyl', 'vinyl', 'allyl', 'CF3'];
