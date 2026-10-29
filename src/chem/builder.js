// Assemble a functional-group core with chosen R groups into a molecular graph,
// then embed it in 3D and package it as a render "frame".
import { FUNCTIONAL_GROUPS } from './functionalGroups.js';
import { R_GROUPS } from './rGroups.js';
import { embed, alignPrincipal, rotateDirs, relaxTorsions, stericContacts } from './geometry.js';
import { formulaFromAtoms } from './elements.js';

const clone = (x) => JSON.parse(JSON.stringify(x));

/** Default R-group and variant choice for a functional group. */
export function defaultChoice(fg) {
  const R = {};
  for (const att of fg.attachments) R[att.id] = att.default;
  return { variant: fg.variants ? fg.defaultVariant || fg.variants[0].id : null, R };
}

function prefixGroup(rg, prefix) {
  const atoms = rg.atoms.map((a) => ({ ...clone(a), id: prefix + a.id }));
  const bonds = rg.bonds.map((b) => ({ ...clone(b), a: prefix + b.a, b: prefix + b.b, ring: b.ring ? b.ring.map((id) => prefix + id) : undefined }));
  let rigid = null;
  if (rg.rigid) {
    rigid = {
      atoms: rg.rigid.atoms.map((id) => prefix + id),
      coords: Object.fromEntries(Object.entries(rg.rigid.coords).map(([k, p]) => [prefix + k, [...p]])),
      attach: prefix + rg.rigid.attach,
      attachDir: [...rg.rigid.attachDir],
      planeAxis: rg.rigid.planeAxis ? [...rg.rigid.planeAxis] : undefined,
    };
  }
  return { atoms, bonds, rigid, attach: prefix + rg.attach };
}

/**
 * Build the molecular graph for a functional group with the given choice.
 * choice: { variant?: string, R?: { R1: 'ethyl', ... } }
 */
export function buildMolecule(fgId, choice = {}) {
  const fg = FUNCTIONAL_GROUPS[fgId];
  if (!fg) throw new Error(`Unknown functional group: ${fgId}`);
  const def = defaultChoice(fg);
  const variantId = choice.variant || def.variant;
  const variant = fg.variants ? fg.variants.find((x) => x.id === variantId) || fg.variants[0] : null;
  const R = { ...def.R, ...(choice.R || {}) };

  const atoms = clone(fg.core.atoms).map((a) => (a.el === '$X' ? { ...a, el: variant.el } : a));
  const bonds = clone(fg.core.bonds);
  const rigid = fg.core.rigid ? [clone(fg.core.rigid)] : [];
  const aliases = {};
  const attachInfo = {};

  for (const att of fg.attachments) {
    const rId = R_GROUPS[R[att.id]] ? R[att.id] : att.default;
    R[att.id] = rId;
    const rg = R_GROUPS[rId];
    const g = prefixGroup(rg, `${att.id}.`);
    atoms.push(...g.atoms);
    bonds.push(...g.bonds);
    if (g.rigid) rigid.push(g.rigid);
    bonds.push({ a: att.atom, b: g.attach, order: 1 });
    aliases[att.id] = g.attach;
  }

  // Attachment-atom descriptors used by classify().
  const adj = new Map(atoms.map((a) => [a.id, []]));
  for (const b of bonds) { adj.get(b.a).push(b.b); adj.get(b.b).push(b.a); }
  const byId = new Map(atoms.map((a) => [a.id, a]));
  for (const att of fg.attachments) {
    const id = aliases[att.id];
    const a = byId.get(id);
    const nbrs = adj.get(id).filter((n) => n !== att.atom).map((n) => byId.get(n));
    const carbonNbrs = nbrs.filter((n) => n.el === 'C');
    const allylicBenzylic = carbonNbrs.some((n) => n.hyb === 'sp2' || n.aromatic);
    attachInfo[att.id] = { el: a.el, degree: carbonNbrs.length, aromatic: !!a.aromatic, sp2: a.hyb === 'sp2' && !a.aromatic, allylicBenzylic, rId: R[att.id] };
  }

  const rIds = fg.attachments.map((att) => R[att.id]);
  const rNames = rIds.map((id) => R_GROUPS[id].name);
  let name = fg.nameFor ? fg.nameFor(rIds, variantId) : undefined;
  if (!name) {
    const parts = rIds.filter((id) => id !== 'H').map((id) => R_GROUPS[id].name);
    name = `${parts.join(' ') || 'parent'} ${fg.fallbackNoun}`;
    if (fg.id === 'haloalkane') name = `${parts.join(' ')} ${{ F: 'fluoride', Cl: 'chloride', Br: 'bromide', I: 'iodide' }[variantId]}`;
  }
  const classification = fg.classify ? fg.classify({ R, attach: attachInfo }) : null;

  return {
    fgId: fg.id, fg, variant, choice: { variant: variantId, R },
    atoms, bonds, rigid, aliases, attachInfo,
    meta: { name, formula: formulaFromAtoms(atoms), classification, rNames, rIds },
  };
}

/** Convert embedded coordinates into a renderer-friendly frame. */
export function toFrame(mol, positions, lonePairDirs, orbitals, extra = {}) {
  const atoms = mol.atoms.map((a) => ({
    id: a.id, el: a.el, charge: a.charge || 0, lonePairs: a.lonePairs || 0,
    pos: positions.get(a.id) || [0, 0, 0],
    lonePairDirs: lonePairDirs.get(a.id) || [],
    orbital: orbitals.get(a.id) || null,
    ghost: !!a.ghost, label: a.label || null, aromatic: !!a.aromatic,
  }));
  const bonds = mol.bonds.map((b) => ({ a: b.a, b: b.b, order: b.order || 1, partial: b.partial ?? 1, aromatic: !!b.aromatic, ring: b.ring || null, ghost: !!b.ghost, piOnly: !!b.piOnly, ...(b.length ? { length: b.length, ref: b.ref || null } : {}) }));
  return { atoms, bonds, aliases: mol.aliases || {}, ...extra };
}

/**
 * Embed a built molecule and return a frame, centred and aligned along x. `frame.crowding` is null, or
 * the hard steric contacts the torsion relaxer could not resolve ({ pairs, worst, groups }): the model
 * keeps class bond angles and only rotates bonds, so some simultaneous bulky substitutions cannot be
 * placed honestly. `groups` names the R-group attachments involved (ids like 'R1').
 */
export function embedMolecule(mol) {
  const rootId = mol.fg?.attachments?.[0]?.atom || mol.atoms[0].id;
  const { positions, lonePairDirs, orbitals, frames } = embed(mol, { root: rootId });
  relaxTorsions(mol, positions, lonePairDirs, orbitals, frames);
  const contacts = stericContacts(mol, positions);
  const groupOf = (id) => { const m = /^(R\d+)\./.exec(id); return m ? m[1] : null; };
  const crowding = contacts ? { ...contacts, groups: [...new Set(contacts.pairs.flatMap((p) => [groupOf(p.a), groupOf(p.b)]).filter(Boolean))] } : null;
  const aligned = alignPrincipal(positions);
  return toFrame(mol, aligned.positions, rotateDirs(lonePairDirs, aligned.rotation), rotateDirs(orbitals, aligned.rotation), { crowding });
}

/** Resolve 'R1' style aliases to concrete atom ids. */
export function resolveId(frame, ref) {
  return frame.aliases?.[ref] || ref;
}

/** Convenience: build + embed in one call. */
export function makeMolecule(fgId, choice) {
  const mol = buildMolecule(fgId, choice);
  return { mol, frame: embedMolecule(mol) };
}
