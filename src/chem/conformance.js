// Conformance suite: compares the model to textbook reference values (src/chem/references/textbook.js).
// Pure and dependency-free so it runs in `node --test` (tests/sweep.test.js) and in scripts/sweep.mjs.
// Each check: { category, id, status: 'pass' | 'fail' | 'note', detail, expected?, actual?, source? }.
// 'note' marks a known, accepted idealisation (see the register in docs/REVIEW_PROTOCOL.md).
import { FUNCTIONAL_GROUPS, FUNCTIONAL_GROUP_ORDER } from './functionalGroups.js';
import { makeMolecule } from './builder.js';
import { bondLength, ELEMENTS } from './elements.js';
import { v, DEG, embed, geometryKind, ringTemplate, complexFrame, directionalLonePairs, lonePairAngleTargets } from './geometry.js';
import { MECHANISMS, MECHANISM_ORDER } from './mechanisms/index.js';
import { predict } from './mechanisms/predictor.js';
import { orbital, radial, ORBITALS } from './orbitals.js';
import { audienceOf, isValidAudience } from './audience.js';
import { BOND_LENGTHS, IDEAL_ANGLES, LONE_PAIR_ANGLES, LONE_PAIR_COMPRESSION_PER_PAIR, ELECTRONEGATIVITY, MECHANISM_MATRIX, MECHANISM_FACTS, ORBITAL_FACTS } from './references/textbook.js';
import { MEASURED_ANGLES } from './references/measured.js';
import { SHAPES, buildShape } from './shapes.js';

const ORDER_SYM = { 1: '-', 2: '=', 3: '#', 1.5: ':' };
const angleDeg = (a, c, b) => Math.acos(Math.max(-1, Math.min(1, v.dot(v.norm(v.sub(a, c)), v.norm(v.sub(b, c)))))) / DEG;
function dihedralDeg(p1, p2, p3, p4) {
  const b1 = v.sub(p2, p1), b2 = v.sub(p3, p2), b3 = v.sub(p4, p3);
  const n1 = v.cross(b1, b2), n2 = v.cross(b2, b3);
  const m1 = v.cross(n1, v.norm(b2));
  return Math.atan2(v.dot(m1, n2), v.dot(n1, n2)) / DEG;
}
/** Max distance of points from their best-fit plane (normal = sum of pairwise cross products). */
function planeDeviation(pts) {
  const c = v.centroid(pts);
  let n = [0, 0, 0];
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const cr = v.cross(v.sub(pts[i], c), v.sub(pts[j], c)); if (v.dot(cr, n) < 0) n = v.sub(n, cr); else n = v.add(n, cr); }
  n = v.norm(n);
  return Math.max(...pts.map((p) => Math.abs(v.dot(v.sub(p, c), n))));
}
const refFor = (e1, e2, order, aromatic) => {
  const sym = aromatic ? ':' : ORDER_SYM[order] || '-';
  return BOND_LENGTHS[`${e1}${sym}${e2}`] || BOND_LENGTHS[`${e2}${sym}${e1}`] || null;
};
const fmt = (x, d = 2) => (typeof x === 'number' ? x.toFixed(d) : String(x));

export function runConformance() {
  const checks = [];
  const add = (category, id, status, detail, extra = {}) => checks.push({ category, id, status, detail, ...extra });
  const pf = (cond) => (cond ? 'pass' : 'fail');

  // ------------------------------------------------------------------ A. tables
  for (const [el, en] of Object.entries(ELECTRONEGATIVITY)) {
    const have = ELEMENTS[el]?.en;
    add('tables', `en.${el}`, pf(have !== undefined && Math.abs(have - en) <= 0.01), `Pauling electronegativity of ${el}`, { expected: en, actual: have, source: 'CRC' });
  }
  for (const [key, [ref, tol]] of Object.entries(BOND_LENGTHS)) {
    const m = key.match(/^([A-Z][a-z]?)([-=#:])([A-Z][a-z]?)$/);
    const order = { '-': 1, '=': 2, '#': 3, ':': 1.5 }[m[2]];
    const have = bondLength(m[1], m[3], order);
    add('tables', `bond.${key}`, pf(Math.abs(have - ref) <= tol), `bond-length table ${key}`, { expected: `${ref} ± ${tol} Å`, actual: fmt(have), source: 'CRC' });
  }
  // The embedder's lone-pair angle table carries literal numbers; each must still equal the cited measurement
  // in references/measured.js (the oracle, which the embedder never reads).
  for (const [key, row] of Object.entries(LONE_PAIR_ANGLES)) {
    const cells = row.classes ? Object.entries(row.classes).map(([k, c]) => [`${key} ${k}`, c]) : [[key, row]];
    for (const [label, c] of cells) {
      const m = MEASURED_ANGLES[c.ref];
      add('tables', `lp-table.${label}`, pf(!!m && Math.abs(m.value - c.angle) < 0.05), `LONE_PAIR_ANGLES row equals the cited measurement${m ? ` (${m.molecule} ${m.atoms})` : ` (unknown ref ${c.ref})`}`, { expected: m && `${m.value}° (listed ${m.listed}°)`, actual: `${c.angle}°`, source: m?.source });
    }
  }

  // ------------------------------------------------------------------ B. built molecules
  for (const id of FUNCTIONAL_GROUP_ORDER) {
    const { mol, frame } = makeMolecule(id);
    const byId = new Map(frame.atoms.map((a) => [a.id, a]));
    const atomDef = new Map(mol.atoms.map((a) => [a.id, a]));
    let worstBond = { dev: 0 }, bondCount = 0;
    for (const b of frame.bonds) {
      const A = byId.get(b.a), B = byId.get(b.b);
      const ref = refFor(A.el, B.el, b.order, b.aromatic);
      const d = v.dist(A.pos, B.pos);
      const expected = ref ? ref[0] : bondLength(A.el, B.el, b.aromatic ? 1.5 : b.order);
      const tol = ref ? ref[1] : 0.03;
      const dev = Math.abs(d - expected);
      bondCount++;
      if (dev > worstBond.dev) worstBond = { dev, key: `${b.a}–${b.b}`, d, expected, tol };
    }
    add('molecules', `${id}.bonds`, pf(worstBond.dev <= (worstBond.tol ?? 0.03)), `${bondCount} bonds of ${mol.meta.name} within textbook tolerance (worst ${worstBond.key ?? '-'})`, { expected: worstBond.expected && `${worstBond.expected} ± ${worstBond.tol} Å`, actual: worstBond.d && fmt(worstBond.d), source: 'CRC' });
    // angles: ideal VSEPR at centres without directional lone pairs, the measured LONE_PAIR_ANGLES value
    // at centres with them (lone-pair angle compression, roadmap Phase 0e)
    const adj = new Map(frame.atoms.map((a) => [a.id, []]));
    for (const b of frame.bonds) { adj.get(b.a).push(b.b); adj.get(b.b).push(b.a); }
    let worstAngle = { dev: 0 };
    for (const a of frame.atoms) {
      const nb = adj.get(a.id);
      if (nb.length < 2 || a.aromatic) continue;
      const def = atomDef.get(a.id);
      const kind = geometryKind(def, nb.length);
      const angles = [];
      for (let i = 0; i < nb.length; i++) for (let j = i + 1; j < nb.length; j++) angles.push(angleDeg(byId.get(nb[i]).pos, a.pos, byId.get(nb[j]).pos));
      const nLP = directionalLonePairs(def);
      if (nLP > 0) {
        const els = nb.map((n) => byId.get(n).el);
        const lookup = lonePairAngleTargets(def, els);
        const [e1, e2] = [...els].sort();
        const what = nb.length === 2 ? `${e1}–${a.el}–${e2}` : `angles at ${a.el}`;
        const actual = `${angles.map((x) => fmt(x, 1)).join('/')}°`;
        if (lookup.targets?.['bond-bond'] !== undefined) {
          // The expectation is the oracle's measurement of the exemplar, not the embedder's own table.
          const m = MEASURED_ANGLES[lookup.ref];
          const expected = m ? m.value : lookup.targets['bond-bond'];
          const worst = Math.max(...angles.map((x) => Math.abs(x - expected)));
          const how = lookup.basis === 'exemplar'
            ? `the measured ${lookup.exemplar} value${lookup.appliesTo ? ` (class approximation for ${lookup.appliesTo})` : ''}`
            : `the ${lookup.exemplar} class default (${lookup.appliesTo})`;
          add('molecules', `${id}.lp-angle.${a.id}`, pf(!!m && worst <= 0.5), `${mol.meta.name}: ${what} follows ${how}`, { expected: `${expected}° (${lookup.key})`, actual, source: m?.source });
        } else {
          add('simplifications', `${id}.lp-fallback.${a.id}`, 'note', `${mol.meta.name}: ${what} has no LONE_PAIR_ANGLES row; every bonded angle closed by ${LONE_PAIR_COMPRESSION_PER_PAIR}° per lone pair (convention)`, { actual, source: 'register' });
        }
        continue;
      }
      const ideal = kind === 'tetrahedral' ? IDEAL_ANGLES.tetrahedral : kind === 'trigonal' ? IDEAL_ANGLES.trigonal : kind === 'linear' ? IDEAL_ANGLES.linear : null;
      if (ideal === null) continue;
      for (const ang of angles) {
        const dev = Math.abs(ang - ideal);
        if (dev > worstAngle.dev) worstAngle = { dev, at: a.id, ang, ideal };
      }
    }
    add('molecules', `${id}.angles`, pf(worstAngle.dev <= 1.5), `bond angles at centres without lone pairs match the idealised VSEPR value (worst at ${worstAngle.at ?? '-'})`, { expected: worstAngle.ideal && `${worstAngle.ideal}°`, actual: worstAngle.ang && `${fmt(worstAngle.ang, 1)}°`, source: 'VSEPR' });
    // clashes
    const related = (x, y) => adj.get(x).includes(y) || adj.get(x).some((n) => adj.get(n).includes(y));
    let minNb = Infinity, pair = '';
    const atoms = frame.atoms.filter((a) => !a.ghost);
    for (let i = 0; i < atoms.length; i++) for (let j = i + 1; j < atoms.length; j++) {
      if (related(atoms[i].id, atoms[j].id)) continue;
      const d = v.dist(atoms[i].pos, atoms[j].pos);
      if (d < minNb) { minNb = d; pair = `${atoms[i].id}/${atoms[j].id}`; }
    }
    add('molecules', `${id}.clashes`, pf(minNb > 1.6), `closest non-bonded pair ${pair}`, { expected: '> 1.60 Å', actual: fmt(minNb) });
    // ring planarity
    for (const g of mol.rigid || []) {
      const pts = g.atoms.filter((x) => byId.get(x)?.el === 'C').map((x) => byId.get(x).pos);
      if (pts.length >= 6) add('molecules', `${id}.ring-planarity`, pf(planeDeviation(pts) < 0.01), 'benzene ring carbons coplanar', { expected: '< 0.01 Å', actual: fmt(planeDeviation(pts), 3) });
    }
  }

  // crowded R-group combinations: every bulky-only combination of each multi-attachment group is built; the
  // ones the torsion relaxer cannot untangle must carry frame.crowding (the card then says so). Reported
  // as a register note with the counts, so each sweep records how many combinations the model cannot place.
  {
    const bulky = ['tBu', 'isopropyl', 'phenyl'];
    for (const id of FUNCTIONAL_GROUP_ORDER) {
      const atts = FUNCTIONAL_GROUPS[id].attachments.map((a) => a.id);
      if (atts.length < 2) continue;
      let combos = 0, flagged = 0, silent = 0, worst = null;
      const visit = (R) => {
          combos++;
          const { frame } = makeMolecule(id, { R });
          if (frame.crowding) { flagged++; if (!worst || frame.crowding.worst.d < worst.d) worst = { ...frame.crowding.worst, R: atts.map((a) => R[a]).join('/') }; }
          else {
            const adj2 = new Map(frame.atoms.map((a) => [a.id, []]));
            for (const b of frame.bonds) { adj2.get(b.a).push(b.b); adj2.get(b.b).push(b.a); }
            const rel = (x, y) => adj2.get(x).includes(y) || adj2.get(x).some((n) => adj2.get(n).includes(y));
            const atoms2 = frame.atoms.filter((a) => !a.ghost);
            for (let i = 0; i < atoms2.length && !silent; i++) for (let j = i + 1; j < atoms2.length; j++) if (!rel(atoms2[i].id, atoms2[j].id) && v.dist(atoms2[i].pos, atoms2[j].pos) < 1.6) { silent++; break; }
          }
      };
      if (atts.length <= 3) {   // every bulky-only combination
        const rec = (k, R) => { if (k === atts.length) return visit(R); for (const r of bulky) rec(k + 1, { ...R, [atts[k]]: r }); };
        rec(0, {});
      } else {                  // four attachments (alkene): every pair of positions with bulky groups, plus all-tert-butyl
        for (let i = 0; i < atts.length; i++) for (let j = i + 1; j < atts.length; j++) for (const ri of bulky) for (const rj of bulky) { const R = Object.fromEntries(atts.map((a) => [a, 'H'])); R[atts[i]] = ri; R[atts[j]] = rj; visit(R); }
        visit(Object.fromEntries(atts.map((a) => [a, 'tBu'])));
      }
      add('molecules', `${id}.crowding-flagged`, pf(silent === 0), `${combos} bulky-only R combinations: overlapping atoms are always flagged as crowding, never drawn silently`, { expected: '0 silent clashes', actual: `${silent} silent; ${flagged} flagged` });
      if (flagged) add('simplifications', `${id}.crowded-combinations`, 'note', `${FUNCTIONAL_GROUPS[id].name}: ${flagged} of ${combos} bulky-only combinations are too crowded for the model (class angles, bond rotation only) and say so on the card; worst ${worst.R} ${worst.a}/${worst.b} ${fmt(worst.d)} Å`, { expected: `≥ ${worst.limit} Å`, actual: `${fmt(worst.d)} Å`, source: 'register' });
    }
  }

  // preferred conformers that textbooks draw: Z (syn) esters and syn carboxylic acids
  for (const [id, atoms, label] of [['ester', ['O1', 'C', 'O2', 'R2'], 'ester: alkoxy group Z (syn) to the carbonyl oxygen'], ['carboxylicAcid', ['O1', 'C', 'O2', 'H'], 'carboxylic acid: O–H syn to the carbonyl oxygen']]) {
    const { frame } = makeMolecule(id);
    const P = atoms.map((a) => frame.atoms.find((x) => x.id === (frame.aliases[a] || a)).pos);
    const d = Math.abs(dihedralDeg(...P));
    add('molecules', `${id}.syn-conformer`, pf(d < 5), label, { expected: '0° (Z / syn)', actual: `${fmt(d, 1)}°`, source: 'CGW ch. 16 (ester conformation)' });
  }

  // ------------------------------------------------------------------ C. ring templates
  const ringAngles = (coords, ring) => ring.map((id, k) => angleDeg(coords[ring[(k + ring.length - 1) % ring.length]], coords[id], coords[ring[(k + 1) % ring.length]]));
  for (const [shape, exp, tol, src] of [['cyclopropane', 60, 0.2, 'geometry'], ['cyclobutane', 88, 3, 'CRC (puckered 88°)'], ['cyclopentane', 104, 4, 'CRC (envelope 102–106°)'], ['cyclohexaneChair', MEASURED_ANGLES.cyclohexaneChair_CCC.value, 2, MEASURED_ANGLES.cyclohexaneChair_CCC.source], ['cyclohexaneBoat', 111.4, 3, 'CGW']]) {
    const t = ringTemplate(shape);
    const c = t.rigid.coords;
    const closure = t.ring.map((id, k) => v.dist(c[id], c[t.ring[(k + 1) % t.ring.length]]));
    const worst = Math.max(...closure.map((d) => Math.abs(d - 1.54)));
    add('rings', `${shape}.closure`, pf(worst <= 0.01), 'ring C–C bonds close at 1.54 Å', { expected: '1.54 ± 0.01 Å', actual: `worst Δ ${fmt(worst, 3)}` });
    const angs = ringAngles(c, t.ring);
    const mean = angs.reduce((s, x) => s + x, 0) / angs.length;
    add('rings', `${shape}.ccc-angle`, pf(Math.abs(mean - exp) <= tol), `mean C–C–C angle of ${t.label}`, { expected: `${exp} ± ${tol}°`, actual: `${fmt(mean, 1)}°`, source: src });
  }
  {
    const t = ringTemplate('cyclohexaneChair');
    const z = t.ring.map((id) => t.rigid.coords[id][2]);
    const alternating = z.every((zz, k) => Math.sign(zz) === (k % 2 ? -1 : 1) * Math.sign(z[0])) && z.every((zz) => Math.abs(Math.abs(zz) - 0.25) < 0.03);
    add('rings', 'chair.puckering', pf(alternating), 'chair carbons alternate ±0.25 Å about the mean plane', { expected: '±0.25 Å alternating', actual: z.map((x) => fmt(x)).join(', '), source: 'CGW ch. 16' });
    const ax = t.sites.C1?.axial;
    const tilt = ax ? angleDeg(v.add([0, 0, 0], ax), [0, 0, 0], [0, 0, Math.sign(ax[2]) || 1]) : 999;
    add('rings', 'chair.axial-parallel', pf(tilt < 8), 'axial C–H bonds parallel to the ring axis', { expected: '< 8° from axis', actual: `${fmt(tilt, 1)}°` });
  }

  // ------------------------------------------------------------------ D. VSEPR shapes with lone pairs
  const hyper = (el, n, lp, X = 'F', opts = {}, { xLonePairs = X === 'H' ? 0 : 3, order = 1 } = {}) => {
    const atoms = [{ id: 'A', el, lonePairs: lp }], bonds = [];
    for (let i = 1; i <= n; i++) { atoms.push({ id: `X${i}`, el: X, lonePairs: xLonePairs }); bonds.push({ a: 'A', b: `X${i}`, order }); }
    const e = embed({ atoms, bonds }, { root: 'A', ...opts });
    const a = e.positions.get('A'); const P = bonds.map((b) => e.positions.get(b.b));
    const angs = []; for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) angs.push(angleDeg(P[i], a, P[j]));
    return { angles: angs.sort((x, y) => x - y), lp: e.lonePairDirs.get('A') || [] };
  };
  const expectAngles = (id, label, got, exp, source, tol = 0.5) => {
    const ok = got.length === exp.length && got.every((x, i) => Math.abs(x - exp[i]) <= tol);
    add('shapes', id, pf(ok), label, { expected: exp.map((x) => (Number.isInteger(x) ? x : fmt(x, 1))).join('/'), actual: got.map((x) => fmt(x, 1)).join('/'), source });
  };
  // Qualitative shapes come from lone-pair slot placement alone (ideal slots, `lonePairAngles: false`) …
  const ideal = { lonePairAngles: false };
  expectAngles('SF4.seesaw', 'SF₄: seesaw from ideal slots (lone pair equatorial)', hyper('S', 4, 1, 'F', ideal).angles, [90, 90, 90, 90, 120, 180], 'VSEPR');
  expectAngles('ClF3.T', 'ClF₃: T-shaped from ideal slots (two equatorial lone pairs)', hyper('Cl', 3, 2, 'F', ideal).angles, [90, 90, 180], 'VSEPR');
  expectAngles('BrF5.square-pyramid', 'BrF₅: square pyramidal from ideal slots', hyper('Br', 5, 1, 'F', ideal).angles, [90, 90, 90, 90, 90, 90, 90, 90, 180, 180], 'VSEPR');
  expectAngles('XeF4.square-planar', 'XeF₄: square planar (trans lone pairs)', hyper('Xe', 4, 2).angles, [90, 90, 90, 90, 180, 180], 'VSEPR');
  expectAngles('PF5.tbp', 'PF₅: trigonal bipyramid', hyper('P', 5, 0).angles, [90, 90, 90, 90, 90, 90, 120, 120, 120, 180], 'VSEPR');
  expectAngles('SF6.octahedral', 'SF₆: octahedral', hyper('S', 6, 0).angles, [90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 180, 180, 180], 'VSEPR');
  // … and the default embedding closes them to the measured angles (lone-pair angle compression, Phase 0e).
  // Expectations come from references/measured.js, not from the embedder's table. BrF₅'s trans basal angle
  // is not listed there; it is twice the basal–apical angle by symmetry.
  const M = MEASURED_ANGLES;
  const sf4 = [M.SF4_axialEquatorial_FSF, M.SF4_axialEquatorial_FSF, M.SF4_axialEquatorial_FSF, M.SF4_axialEquatorial_FSF, M.SF4_equatorial_FSF, M.SF4_axial_FSF];
  expectAngles('SF4.measured', 'SF₄: F–S–F closed by the equatorial lone pair (4 × axial–equatorial, equatorial, axial)', hyper('S', 4, 1).angles, sf4.map((m) => m.value), M.SF4_axial_FSF.source);
  expectAngles('ClF3.measured', 'ClF₃: axial F–Cl–F closed by the two equatorial lone pairs (2 × axial–equatorial, axial)', hyper('Cl', 3, 2).angles, [M.ClF3_axialEquatorial_FClF.value, M.ClF3_axialEquatorial_FClF.value, M.ClF3_axial_FClF.value], M.ClF3_axial_FClF.source);
  const ba = M.BrF5_basalApical_FBrF.value, cis = M.BrF5_basalCis_FBrF.value;
  expectAngles('BrF5.measured', 'BrF₅: basal fluorines lean toward the apical one, away from the lone pair (4 × basal–apical, 4 × cis, 2 × trans = 2 × basal–apical)', hyper('Br', 5, 1).angles, [ba, ba, ba, ba, cis, cis, cis, cis, 2 * ba, 2 * ba], M.BrF5_basalApical_FBrF.source);
  expectAngles('H2O.bent', 'H₂O: bent, H–O–H at the measured value', hyper('O', 2, 2, 'H').angles, [M.water_HOH.value], M.water_HOH.source, 0.1);
  expectAngles('NH3.pyramidal', 'NH₃: trigonal pyramidal, H–N–H at the measured value', hyper('N', 3, 1, 'H').angles, Array(3).fill(M.ammonia_HNH.value), M.ammonia_HNH.source, 0.1);
  expectAngles('PH3.pyramidal', 'PH₃: trigonal pyramidal, H–P–H at the measured value', hyper('P', 3, 1, 'H').angles, Array(3).fill(M.phosphine_HPH.value), M.phosphine_HPH.source, 0.1);
  expectAngles('H2S.bent', 'H₂S: bent, H–S–H at the measured value', hyper('S', 2, 2, 'H').angles, [M.hydrogenSulfide_HSH.value], M.hydrogenSulfide_HSH.source, 0.1);
  expectAngles('H2Se.bent', 'H₂Se: bent, H–Se–H at the measured value', hyper('Se', 2, 2, 'H').angles, [M.hydrogenSelenide_HSeH.value], M.hydrogenSelenide_HSeH.source, 0.1);
  expectAngles('SO2.bent', 'SO₂: bent (trigonal, one lone pair), O–S–O at the measured value', hyper('S', 2, 1, 'O', {}, { xLonePairs: 2, order: 2 }).angles, [M.sulfurDioxide_OSO.value], M.sulfurDioxide_OSO.source, 0.1);

  // The Molecular shapes gallery: every displayed angle is either the ideal value symmetry fixes (and says so)
  // or the oracle's measured value (and names the exemplar); lone-pair counts shown are the drawn ones.
  for (const s of SHAPES) {
    const b = buildShape(s.id);
    const centre = s.graph.atoms.find((a) => a.id === s.centre);
    add('shapes', `gallery.${s.id}.bookkeeping`, pf(b.lonePairs === (centre.lonePairs || 0) && b.domains === s.bonds + b.lonePairs && b.bonds === s.graph.bonds.filter((x) => x.a === s.centre || x.b === s.centre).length), `${s.formula}: ${b.bonds} bonds + ${b.lonePairs} lone pairs = ${b.domains} domains, from the drawn atom data`, { expected: `${s.bonds} + ${centre.lonePairs || 0}`, actual: `${b.bonds} + ${b.lonePairs}` });
    for (const a of b.angles) {
      if (a.status === 'ideal') add('shapes', `gallery.${s.id}.${a.id}`, pf(Math.abs(a.value - a.ideal) <= 0.1), `${s.formula} ${a.label}: ideal VSEPR value${a.measured != null ? ` (measured ${a.measured}° declared on the card)` : ' (fixed by symmetry)'}`, { expected: `${a.ideal}°`, actual: `${fmt(a.value, 2)}°`, source: a.source || 'symmetry' });
      else if (a.ref) add('shapes', `gallery.${s.id}.${a.id}`, pf(Math.abs(a.value - MEASURED_ANGLES[a.ref].value) <= 0.5), `${s.formula} ${a.label}: ${a.status === 'class' ? 'class value' : 'measured value'} of ${a.exemplar}`, { expected: `${MEASURED_ANGLES[a.ref].value}°`, actual: `${fmt(a.value, 2)}°`, source: a.source });
      else add('shapes', `gallery.${s.id}.${a.id}`, 'fail', `${s.formula} ${a.label}: unexpected status ${a.status}`, { actual: `${fmt(a.value, 2)}°` });
    }
    add('shapes', `gallery.${s.id}.clean`, pf(!b.frame.crowding), `${s.formula}: no steric contacts in the drawn frame`, { actual: b.frame.crowding ? 'crowded' : 'clean' });
  }

  // ------------------------------------------------------------------ E. coordination
  const lmL = (frame, metal) => {
    const m = frame.atoms.find((a) => a.id === metal).pos;
    const L = frame.atoms.filter((a) => a.id !== metal && !a.ghost).map((a) => a.pos);
    const angs = []; for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) angs.push(angleDeg(L[i], m, L[j]));
    return angs.sort((x, y) => x - y);
  };
  const oct = complexFrame({ metal: 'Fe', id: 'Fe', charge: 2, ligands: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'] });
  expectAngles('ML6.octahedral', '[ML₆] octahedral: 12 × 90°, 3 × 180°', lmL(oct, 'Fe'), [...Array(12).fill(90), 180, 180, 180], 'crystal field geometry');
  const sq = complexFrame({ metal: 'Pt', id: 'Pt', geometry: 'squarePlanar', ligands: ['L1', 'L2', 'L3', 'L4'] });
  expectAngles('ML4.square-planar', '[ML₄] square planar: 4 × 90°, 2 × 180°', lmL(sq, 'Pt'), [90, 90, 90, 90, 180, 180], 'd⁸ complexes');
  const td = complexFrame({ metal: 'Zn', id: 'Zn', geometry: 'tetrahedral', ligands: ['L1', 'L2', 'L3', 'L4'] });
  expectAngles('ML4.tetrahedral', '[ML₄] tetrahedral: 6 × 109.47°', lmL(td, 'Zn'), Array(6).fill(IDEAL_ANGLES.tetrahedral), 'VSEPR', 0.1);

  // ------------------------------------------------------------------ F. mechanisms
  const T = Array.from({ length: 41 }, (_, i) => i / 40);
  for (const id of MECHANISM_ORDER) {
    const m = MECHANISMS[id];
    const facts = MECHANISM_FACTS[id] || {};
    const frames = T.map((t) => m.frame(t));
    const counts = new Set(frames.map((f) => f.atoms.filter((a) => !a.ghost).length));
    add('mechanisms', `${id}.atom-count`, pf(counts.size === 1), 'atom count constant along the reaction coordinate', { expected: 'constant', actual: [...counts].join(',') });
    const charges = m.steps.map((s) => m.frame(s.t).atoms.filter((a) => !a.ghost).reduce((sum, a) => sum + (a.charge || 0), 0));
    add('mechanisms', `${id}.charge-conservation`, pf(charges.every((q) => Math.abs(q - charges[0]) < 0.05)), 'total charge (formal + partial) identical at every step keyframe', { expected: 'constant', actual: charges.map((q) => fmt(q, 2)).join(' → ') });
    const series = new Map();
    for (const f of frames) for (const b of f.bonds) { if (b.ghost) continue; const k = `${b.a}~${b.b}~${b.order}`; if (!series.has(k)) series.set(k, []); series.get(k).push(b.partial ?? 1); }
    let nonMono = [];
    for (const [k, s] of series) {
      if (s.length < 3) continue;
      const up = s.every((x, i) => i === 0 || x >= s[i - 1] - 1e-9), down = s.every((x, i) => i === 0 || x <= s[i - 1] + 1e-9);
      if (!up && !down) nonMono.push(k);
    }
    add('mechanisms', `${id}.partial-monotonic`, pf(!nonMono.length), 'each forming/breaking bond changes monotonically', { expected: 'monotonic', actual: nonMono.length ? nonMono.join(', ') : 'all monotonic' });
    for (const [t, label] of [[0, 'reactants'], [1, 'products']]) {
      const f = m.frame(t); const byId = new Map(f.atoms.map((a) => [a.id, a]));
      const pi = new Map(f.bonds.filter((b) => b.piOnly).map((b) => [`${b.a}~${b.b}`, b.partial ?? 1]));
      let worst = { dev: 0 };
      for (const b of f.bonds) { if ((b.partial ?? 1) < 1 || b.ghost || b.piOnly) continue; const A = byId.get(b.a), B = byId.get(b.b); const piP = pi.get(`${b.a}~${b.b}`) ?? pi.get(`${b.b}~${b.a}`) ?? 0; const order = b.order === 1 && piP > 0 ? (piP >= 0.999 ? 2 : null) : b.order; if (order === null) continue; const ref = refFor(A.el, B.el, order, b.aromatic); const exp = ref ? ref[0] : bondLength(A.el, B.el, order); const tol = (ref ? ref[1] : 0.03) + 0.01; const dev = Math.abs(v.dist(A.pos, B.pos) - exp); if (dev - tol > worst.dev - (worst.tol ?? 0)) worst = { dev, tol, key: `${b.a}–${b.b}`, exp, d: v.dist(A.pos, B.pos) }; }
      add('mechanisms', `${id}.${label}-geometry`, pf(worst.dev <= (worst.tol ?? 0.03)), `full bonds at ${label} have textbook lengths (worst ${worst.key ?? '-'})`, { expected: worst.exp && `${worst.exp} ± ${worst.tol} Å`, actual: worst.d && fmt(worst.d), source: 'CRC' });
    }
    // energy topology
    const N = 400, E = Array.from({ length: N + 1 }, (_, i) => m.energyAt(i / N));
    const maxima = [], minima = [];
    for (let i = 1; i < N; i++) { if (E[i] > E[i - 1] && E[i] >= E[i + 1]) maxima.push(i / N); if (E[i] < E[i - 1] && E[i] <= E[i + 1]) minima.push(i / N); }
    add('mechanisms', `${id}.energy-maxima`, pf(maxima.length === facts.maxima), `number of transition states = ${facts.steps} step(s)`, { expected: facts.maxima, actual: maxima.length, source: 'CGW' });
    add('mechanisms', `${id}.energy-intermediates`, pf(minima.length === (facts.steps || 1) - 1), 'number of intermediates = steps − 1', { expected: (facts.steps || 1) - 1, actual: minima.length });
    add('mechanisms', `${id}.exergonic`, pf(E[N] < E[0]), 'worked example is downhill overall', { expected: 'E(products) < E(reactants)', actual: `${fmt(E[0], 0)} → ${fmt(E[N], 0)}` });
    if (facts.rateDeterminingIsFirst) add('mechanisms', `${id}.rds-first`, pf(maxima.length && m.energyAt(maxima[0]) === Math.max(...maxima.map((t) => m.energyAt(t)))), 'ionisation is the highest barrier (rate-determining)', { expected: 'first TS highest', actual: maxima.map((t) => fmt(m.energyAt(t), 0)).join(' / ') });
    // arrows reference real atoms
    let badArrow = null;
    for (const s of m.steps) { const f = m.frame(s.t); const ids = new Set(f.atoms.map((a) => a.id)); for (const ar of s.arrows || []) for (const end of [ar.from, ar.to]) { for (const key of ['atom', 'a', 'b']) if (end[key] && !ids.has(end[key])) badArrow = `${s.id}: ${end[key]}`; } }
    add('mechanisms', `${id}.arrows-anchored`, pf(!badArrow), 'every electron-pushing arrow starts and ends on atoms present in that step', { actual: badArrow || 'all anchored' });
  }
  { // SN2 specifics
    const m = MECHANISMS.sn2; const tri = (t) => { const f = m.frame(t); const p = (id) => f.atoms.find((a) => a.id === id).pos; const c = p('C'); return v.dot(v.sub(p('H'), c), v.cross(v.sub(p('Me.C'), c), v.sub(p('Et.C1'), c))); };
    add('mechanisms', 'sn2.walden-inversion', pf(Math.sign(tri(0)) !== Math.sign(tri(1))), 'configuration at carbon inverts (signed volume of H, Me, Et flips)', { expected: 'sign flip', actual: `${fmt(tri(0))} → ${fmt(tri(1))}`, source: 'CGW ch. 15' });
    const f = m.frame(0.5); const p = (id) => f.atoms.find((a) => a.id === id).pos;
    add('mechanisms', 'sn2.ts-planar', pf(planeDeviation([p('C'), p('H'), p('Me.C'), p('Et.C1')]) < 0.02), 'transition state: carbon and its three spectators coplanar, Nu–C–LG collinear', { actual: `${fmt(angleDeg(p('Nu.O'), p('C'), p('Br')), 1)}° Nu–C–Br` });
  }
  { // SN1 specifics
    const f = MECHANISMS.sn1.frame(0.35); const p = (id) => f.atoms.find((a) => a.id === id).pos; const c = f.atoms.find((a) => a.id === 'C');
    const sum = angleDeg(p('Me1.C'), p('C'), p('Me2.C')) + angleDeg(p('Me2.C'), p('C'), p('Me3.C')) + angleDeg(p('Me1.C'), p('C'), p('Me3.C'));
    add('mechanisms', 'sn1.cation-planar', pf(Math.abs(sum - 360) < 0.5 && c.orbital?.kind === 'empty'), 'carbocation is trigonal planar with an empty p orbital', { expected: '360° (sum of angles)', actual: `${fmt(sum, 1)}°, orbital=${c.orbital?.kind}`, source: 'CGW ch. 15' });
  }
  { // E2 specifics
    const m = MECHANISMS.e2; const f0 = m.frame(0), f1 = m.frame(1);
    const p0 = (id) => f0.atoms.find((a) => a.id === id).pos, p1 = (id) => f1.atoms.find((a) => a.id === id).pos;
    const dih = Math.abs(dihedralDeg(p0('Hb'), p0('C3'), p0('C2'), p0('Br')));
    add('mechanisms', 'e2.anti-periplanar', pf(Math.abs(dih - 180) < 1), 'H–C–C–Br dihedral at the start', { expected: '180°', actual: `${fmt(dih, 1)}°`, source: 'CGW ch. 17' });
    const dihMe = Math.abs(dihedralDeg(p1('MeA.C'), p1('C2'), p1('C3'), p1('MeB.C')));
    add('mechanisms', 'e2.E-alkene', pf(Math.abs(dihMe - 180) < 3), 'product is the E (trans) alkene: methyls anti', { expected: '180°', actual: `${fmt(dihMe, 1)}°` });
    add('mechanisms', 'e2.alkene-planar', pf(planeDeviation(['C2', 'C3', 'H2', 'MeA.C', 'H3', 'MeB.C'].map(p1)) < 0.05), 'six atoms of the C=C unit coplanar', { expected: '< 0.05 Å', actual: fmt(planeDeviation(['C2', 'C3', 'H2', 'MeA.C', 'H3', 'MeB.C'].map(p1)), 3) });
  }
  { // E1 specifics
    const f1 = MECHANISMS.e1.frame(1); const p1 = (id) => f1.atoms.find((a) => a.id === id).pos;
    add('mechanisms', 'e1.proton-transferred', pf(Math.abs(v.dist(p1('B.O'), p1('Me1.Hu')) - 0.96) < 0.03), 'β-hydrogen ends on the base oxygen', { expected: '0.96 Å O–H', actual: fmt(v.dist(p1('B.O'), p1('Me1.Hu'))) });
    add('mechanisms', 'e1.alkene-planar', pf(planeDeviation(['C', 'Me1.C', 'Me1.Ha', 'Me1.Hb', 'Me2.C', 'Me3.C'].map(p1)) < 0.05), 'C=CH₂ unit and the two methyl carbons coplanar', { expected: '< 0.05 Å', actual: fmt(planeDeviation(['C', 'Me1.C', 'Me1.Ha', 'Me1.Hb', 'Me2.C', 'Me3.C'].map(p1)), 3) });
  }

  // ------------------------------------------------------------------ G. predictor vs textbook table
  for (const row of MECHANISM_MATRIX) {
    const env = { substrate: row.substrate, reagent: row.reagent, solvent: row.solvent || 'polarProtic', temperature: row.temperature || 'low', leavingGroup: 'good', allylicBenzylic: !!row.allylicBenzylic };
    const r = predict(env);
    const key = `${row.substrate}.${row.reagent}${row.solvent ? '.' + row.solvent : ''}${row.temperature ? '.' + row.temperature : ''}${row.allylicBenzylic ? '.allylic' : ''}`;
    add('predictor', key, pf(r.dominant === row.expect), `dominant pathway for ${key.replace(/\./g, ' / ')}`, { expected: row.expect, actual: `${r.dominant} (${r.ranked.slice(0, 2).map((x) => `${x.id} ${x.pct}%`).join(', ')})`, source: 'KLEIN ch. 8' });
  }

  // ------------------------------------------------------------------ H. orbitals
  for (const [name, exp] of Object.entries(ORBITAL_FACTS.radialNodes)) {
    const { n, l } = ORBITALS[name]; let nodes = 0, prev = null;
    for (let r = 0.05; r < 60; r += 0.01) { const val = radial(n, l, r); if (prev !== null && Math.sign(val) !== Math.sign(prev) && val !== 0) nodes++; prev = val; }
    add('orbitals', `${name}.radial-nodes`, pf(nodes === exp), `radial nodes of ${name} = n − l − 1`, { expected: exp, actual: nodes, source: 'ATKINS ch. 8' });
  }
  for (const name of ['1s', '2s', '2pz', '3s', '3dz2']) {
    const o = orbital(name); const L = o.extent, N = 72, h = (2 * L) / N; let sum = 0;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) for (let k = 0; k < N; k++) { const x = -L + (i + 0.5) * h, y = -L + (j + 0.5) * h, z = -L + (k + 0.5) * h; const p = o.psi(x, y, z); sum += p * p; }
    const integral = sum * h * h * h;
    add('orbitals', `${name}.normalised`, pf(Math.abs(integral - 1) < 0.03), `∫ψ² dV over the sampling box`, { expected: '1.00 ± 0.03', actual: fmt(integral, 3), source: 'ATKINS ch. 8' });
  }
  { const o = orbital('2pz'); add('orbitals', '2pz.antisymmetric', pf(Math.abs(o.psi(0, 0, 2) + o.psi(0, 0, -2)) < 1e-12 && o.psi(0, 0, 2) > 0), 'p orbital changes sign through its nodal plane', { expected: 'ψ(z) = −ψ(−z)', actual: `${o.psi(0, 0, 2).toExponential(2)} / ${o.psi(0, 0, -2).toExponential(2)}` }); }
  { const o = orbital('3dz2'); add('orbitals', '3dz2.symmetry', pf(Math.abs(o.psi(0, 0, 3) - o.psi(0, 0, -3)) < 1e-12 && o.psi(3, 0, 0) < 0 && o.psi(0, 0, 3) > 0), 'd_z² positive along z, negative torus in the xy plane', { actual: `z: ${o.psi(0, 0, 3).toExponential(2)}, x: ${o.psi(3, 0, 0).toExponential(2)}` }); }

  // ------------------------------------------------------------------ I. content integrity
  let badAud = [];
  for (const id of FUNCTIONAL_GROUP_ORDER) { const g = FUNCTIONAL_GROUPS[id]; for (const [coll, items] of [['invariants', g.invariants], ['varies', g.varies], ['identify', g.identify]]) for (const it of items) if (!isValidAudience(audienceOf(it, coll))) badAud.push(`${id}/${coll}`); }
  for (const id of MECHANISM_ORDER) { const m = MECHANISMS[id]; for (const k of m.keyIdeas) if (!isValidAudience(audienceOf(k, 'keyIdeas'))) badAud.push(`${id}/keyIdeas`); for (const s of m.steps) for (const k of s.keyPoints) if (!isValidAudience(audienceOf(k, 'keyPoints'))) badAud.push(`${id}/${s.id}`); }
  add('content', 'audience-tags', pf(!badAud.length), 'every data item has a valid audience', { actual: badAud.length ? badAud.join(', ') : 'all valid' });

  // ------------------------------------------------------------------ J. register (static notes)
  for (const [k, detail] of Object.entries({
    'energies-illustrative': 'energy profiles are illustrative kcal/mol shapes, not measured activation energies',
    'predictor-heuristic': 'predictor percentages are teaching tendencies, not yields',
    'sn2-symmetric-ts': 'SN2 transition state drawn exactly symmetric (both partial bonds 0.5)',
    'no-solvent-shell': 'only reacting species are shown; solvation shells and counter-ions omitted',
    'linear-partials': 'bond order and charge interpolate linearly along t',
    'schematic-lobes': 'lone pairs and p orbitals drawn as fixed-size schematic lobes; lone-pair lobes open by the mean bond compression at their centre (water LP–O–LP 114.4°), a drawing convention with no measured counterpart',
    'class-angles': `alcohols, ethers, thiols, sulfides, acids and esters take the angle of one measured exemplar each (methanol, dimethyl ether, methanethiol, dimethyl sulfide, formic acid, methyl formate): a class approximation, not a measurement of the displayed molecule`,
    'amine-angles': `amines use the ammonia value (${LONE_PAIR_ANGLES['N/3/1'].angle}°) for all three angles at N; measured: methylamine H–N–H ${MEASURED_ANGLES.methylamine_HNH.value}° / C–N–H ${MEASURED_ANGLES.methylamine_CNH.value}°, dimethylamine C–N–C ${MEASURED_ANGLES.dimethylamine_CNC.value}°, trimethylamine ${MEASURED_ANGLES.trimethylamine_CNC.value}°`,
    'carbonyl-angles': `carbonyl centres keep ${IDEAL_ANGLES.trigonal}° (acetone C–C–C measured ${MEASURED_ANGLES.acetone_CCC.value}°)`,
    'lone-pair-fallback': `lone-pair centres without a LONE_PAIR_ANGLES row close every bonded angle by ${LONE_PAIR_COMPRESSION_PER_PAIR}° per lone pair (convention)`,
    'pinned-centres-ideal': 'reaction frames pin their reacting centres: the water, alcohol and alkoxide nucleophiles and bases of SN1/SN2/E1/E2 keep ideal 109.47° slots while the explorer shows the measured angles',
    'methanethiol-source': `C–S–H ${LONE_PAIR_ANGLES['S/2/2/C,H'].angle}° follows the microwave structure tabulated by Landolt-Börnstein and the CRC gas-phase table; the CCCBDB listing quotes the older Herzberg (1966) compilation value 100.3°`,
  })) add('simplifications', k, 'note', detail);

  const summary = { pass: 0, fail: 0, note: 0 };
  for (const c of checks) summary[c.status]++;
  return { checks, summary };
}
