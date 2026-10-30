// Conformance suite: compares the model to textbook reference values (src/chem/references/textbook.js).
// Pure and dependency-free so it runs in `node --test` (tests/sweep.test.js) and in scripts/sweep.mjs.
// Each check: { category, id, status: 'pass' | 'fail' | 'note', detail, expected?, actual?, source? }.
// 'note' marks a known, accepted idealisation (see the register in docs/REVIEW_PROTOCOL.md).
import { FUNCTIONAL_GROUPS, FUNCTIONAL_GROUP_ORDER } from './functionalGroups.js';
import { makeMolecule, resolveId } from './builder.js';
import { bondLength, ELEMENTS } from './elements.js';
import { v, DEG, embed, geometryKind, ringTemplate, complexFrame, directionalLonePairs, lonePairAngleTargets } from './geometry.js';
import { MECHANISMS, MECHANISM_ORDER } from './mechanisms/index.js';
import { predict } from './mechanisms/predictor.js';
import { orbital, radial, ORBITALS } from './orbitals.js';
import { audienceOf, isValidAudience } from './audience.js';
import { BOND_LENGTHS, IDEAL_ANGLES, LONE_PAIR_ANGLES, LONE_PAIR_COMPRESSION_PER_PAIR, CONJUGATED_BOND_LENGTHS, ELECTRONEGATIVITY, MECHANISM_MATRIX, MECHANISM_FACTS, ORBITAL_FACTS } from './references/textbook.js';
import { MEASURED_ANGLES, MEASURED_BONDS } from './references/measured.js';
import { SHAPES, buildShape } from './shapes.js';
import { ROTORS, conformer, torsionEnergy } from './conformations.js';
import { CHAIR_SUBSTITUENTS, RING_FORMS, POSITIONS, RELATIONS, cyclohexaneFrame, chairEnergy, equatorialFraction, chairSiteRule, KCAL } from './cyclohexane.js';
import { TORSION_ENERGIES, A_VALUES, RING_CONFORMER_ENERGIES, DIAXIAL_PAIRS, HYDROGEN_ENERGY, GROUND_STATE_CONFIGURATIONS, AUFBAU_EXCEPTIONS } from './references/textbook.js';
import { ORBITAL_ITEMS, buildItem, hybridChecks, PERIODIC, electronConfiguration, configurationAscii } from './atomicOrbitals.js';
import { MO_ITEMS, buildMO, huckel, fillDiatomic, moProbe } from './molecularOrbitals.js';
import { PAIRS, FACTORS, pkaOf, equilibrium, acidFrame } from './acidsBases.js';
import { PKA, PKA_TABLE, RT_LN10_KJ } from './references/textbook.js';
import { DIATOMIC_MO, HUCKEL_PARAMETERS, SLATER_ZEFF } from './references/textbook.js';

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
  for (const [key, c] of Object.entries(CONJUGATED_BOND_LENGTHS)) {
    const m = MEASURED_BONDS[c.ref];
    add('tables', `conjugated-bond.${key}`, pf(!!m && Math.abs(m.value - c.length) < 0.005), `CONJUGATED_BOND_LENGTHS row equals the cited measurement${m ? ` (${m.molecule} ${m.atoms})` : ` (unknown ref ${c.ref})`}`, { expected: m && `${m.value} Å (listed ${m.listed})`, actual: `${c.length} Å`, source: m?.source });
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
      const measured = b.length && b.ref ? MEASURED_BONDS[b.ref] : null;   // a conjugated bond drawn at its cited length
      const ref = measured ? [measured.value, 0.02] : refFor(A.el, B.el, b.order, b.aromatic);
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

  // Conformations: the energy curve passes through the textbook values, the frames sit at the requested
  // dihedral with the embedder's bond lengths, and the E2 rotor's anti form is the Reaction lab's start.
  add('conformations', 'ethane.barrier', pf(Math.abs(torsionEnergy('ethane', 0) - TORSION_ENERGIES.ethane.barrier) < 1e-9 && Math.abs(torsionEnergy('ethane', 60)) < 1e-9), 'ethane: eclipsed − staggered = the textbook barrier', { expected: `${TORSION_ENERGIES.ethane.barrier} kJ/mol`, actual: `${fmt(torsionEnergy('ethane', 0), 1)} kJ/mol`, source: TORSION_ENERGIES.ethane.source });
  for (const [phi, key] of [[60, 'gauche'], [120, 'eclipsedCH3H'], [0, 'eclipsedCH3CH3']]) add('conformations', `butane.${key}`, pf(Math.abs(torsionEnergy('butane', phi) - TORSION_ENERGIES.butane[key]) < 1e-9 && Math.abs(torsionEnergy('butane', 180)) < 1e-9), `butane ${key} at ${phi}° above anti`, { expected: `${TORSION_ENERGIES.butane[key]} kJ/mol`, actual: `${fmt(torsionEnergy('butane', phi), 1)} kJ/mol`, source: TORSION_ENERGIES.butane.source });
  for (const r of ROTORS) {
    let worstD = 0, worstB = 0;
    for (const phi of [0, 37, 60, 120, 180, 245, 300]) {
      const c = conformer(r.id, phi);
      worstD = Math.max(worstD, Math.abs(((c.dihedral - phi + 540) % 360) - 180));
      const byId = new Map(c.frame.atoms.map((a) => [a.id, a]));
      for (const b of c.frame.bonds) worstB = Math.max(worstB, Math.abs(v.dist(byId.get(b.a).pos, byId.get(b.b).pos) - bondLength(byId.get(b.a).el, byId.get(b.b).el, b.order)));
    }
    add('conformations', `${r.id}.dihedral`, pf(worstD < 1e-6), `${r.name}: the frame's ${r.reference.join('–')} dihedral equals the requested value`, { expected: 'Δ 0°', actual: `Δ ${fmt(worstD, 4)}°` });
    add('conformations', `${r.id}.bonds`, pf(worstB < 1e-6), `${r.name}: turning the bond keeps every bond length`, { expected: 'Δ 0 Å', actual: `Δ ${fmt(worstB, 4)}` });
  }
  // cyclohexane chair lesson: A-values are a cited table (kJ = kcal × 4.184); the drawn chairs keep the
  // template ring; X sits axial in one chair, equatorial after the flip, flagpole in the boat; the energy
  // on the card is always the table value; crowding is flagged where the template cannot place X.
  {
    const badA = [];
    for (const s of CHAIR_SUBSTITUENTS) { const a = A_VALUES.values[s.id]; if (!a || Math.abs(a.kJ - a.kcal * KCAL) > 0.06) badA.push(s.id); }
    add('conformations', 'chair.a-values', pf(!badA.length && !!A_VALUES.source && A_VALUES.unit === 'kJ/mol'), `every chair substituent has an A-value row; kJ/mol = tabulated kcal/mol × 4.184 (rounded)`, { expected: 'all rows consistent', actual: badA.length ? badA.join(', ') : `${CHAIR_SUBSTITUENTS.length} rows`, source: A_VALUES.source });
    add('conformations', 'chair.methyl-vs-gauche', pf(Math.abs(2 * TORSION_ENERGIES.butane.gauche - A_VALUES.values.methyl.kJ) < 0.5), 'the methyl A-value equals two gauche-butane interactions within 0.5 kJ/mol (the textbook account, both numbers from the tables)', { expected: `${A_VALUES.values.methyl.kJ} kJ/mol`, actual: `2 × ${TORSION_ENERGIES.butane.gauche} = ${(2 * TORSION_ENERGIES.butane.gauche).toFixed(1)} kJ/mol`, source: 'CGW ch. 16; KLEIN ch. 4' });
    add('conformations', 'chair.methyl-equatorial-share', pf(Math.abs(equatorialFraction(A_VALUES.values.methyl.kJ) - 0.95) < 0.01), 'methylcyclohexane: K = e^(A/RT) at 298 K puts 95 % in the equatorial chair', { expected: '95 %', actual: `${(equatorialFraction(A_VALUES.values.methyl.kJ) * 100).toFixed(1)} %`, source: 'KLEIN ch. 4' });
    const badSite = [], badBond = [], badEnergy = []; let worstBond = 0, n = 0; const crowded = [];
    for (const s of CHAIR_SUBSTITUENTS) for (const f of RING_FORMS) {
      const r = cyclohexaneFrame(s.id, f.id); n++;
      const expect = { axial: 'axial', equatorial: 'equatorial', boat: 'flagpole' }[f.id];
      if (r.site !== expect || (f.id === 'axial' && r.tilt > 5) || (f.id === 'equatorial' && (r.tilt < 60 || r.tilt > 80))) badSite.push(`${s.id}/${f.id}: ${r.site} ${fmt(r.tilt, 1)}°`);
      const byId = new Map(r.frame.atoms.map((x) => [x.id, x]));
      for (const bd of r.frame.bonds) { const d = v.dist(byId.get(bd.a).pos, byId.get(bd.b).pos); const L = bd.length ?? bondLength(byId.get(bd.a).el, byId.get(bd.b).el, bd.aromatic ? 1.5 : bd.order); const dev = Math.abs(d - L); if (dev > worstBond) worstBond = dev; if (dev > 0.011) badBond.push(`${s.id}/${f.id} ${bd.a}–${bd.b}`); }
      if (r.energy.value !== chairEnergy(s.id, f.id).value || r.energy.basis !== 'table') badEnergy.push(`${s.id}/${f.id}`);
      if (r.crowding) crowded.push(`${s.id} ${f.id} (${fmt(r.crowding.worst.d)} Å)`);
    }
    add('conformations', 'chair.sites', pf(!badSite.length), `${n} substituent × form frames: X is axial (≤ 5° from the axis) in chair A, equatorial (60–80°) after the flip, flagpole in the boat`, { expected: 'axial / equatorial / flagpole', actual: badSite.length ? badSite.join('; ') : 'all as expected' });
    add('conformations', 'chair.bonds', pf(!badBond.length), 'every bond of every chair frame has its table length (benzene C–H 1.08 is the template\'s)', { expected: 'Δ ≤ 0.011 Å', actual: `worst Δ ${fmt(worstBond, 3)} Å` });
    add('conformations', 'chair.energies-from-table', pf(!badEnergy.length), 'the energy on every chair card is the tabulated value (A-value, 0, or the parent boat), never computed', { expected: 'table', actual: badEnergy.length ? badEnergy.join(', ') : `${n} lookups` });
    const meAx = cyclohexaneFrame('methyl', 'axial');
    add('conformations', 'chair.methyl-diaxial', pf(meAx.diaxial.length === 2 && meAx.contact && meAx.contact.d > 1.8 && meAx.contact.d < 2.0 && !meAx.crowding && !cyclohexaneFrame('methyl', 'equatorial').crowding), 'axial methyl faces the C3 and C5 axial hydrogens with a close but drawable contact; equatorial methyl faces none', { expected: '2 partners, 1.8–2.0 Å, no flag', actual: `${meAx.diaxial.length} partners, ${meAx.contact ? fmt(meAx.contact.d) : '-'} Å` });
    // disubstituted rings: the drawn sites follow the template rule for every position × face × chair, the
    // energies are the additive A-value estimate (pair value for diaxial cis-1,3 methyls), and the textbook
    // rule about which isomers have a diequatorial chair comes out of the frames.
    {
      const badSite = [], badE = []; let frames = 0; const dieq = [];
      for (const p of POSITIONS) for (const rel of RELATIONS) {
        const sites = [];
        for (const f of ['axial', 'equatorial']) {
          const r = cyclohexaneFrame('methyl', f, { sub: 'methyl', position: p.id, rel }); frames++;
          const flip = f === 'equatorial';
          const want = [chairSiteRule(flip, 1, 'up'), chairSiteRule(flip, p.id, rel === 'cis' ? 'up' : 'down')];
          if (r.groups[0].site !== want[0] || r.groups[1].site !== want[1]) badSite.push(`${rel}-1,${p.id} ${f}: ${r.groups.map((g) => g.site).join('/')}`);
          const axial = r.groups.filter((g) => g.site === 'axial').length;
          const expect = axial === 2 && p.id === 3 ? DIAXIAL_PAIRS.values['methyl/methyl'].kJ : axial * A_VALUES.values.methyl.kJ;
          if (Math.abs(r.energy.value - expect) > 1e-9 || r.energy.basis !== 'table') badE.push(`${rel}-1,${p.id} ${f}: ${r.energy.value} vs ${expect}`);
          sites.push(r.groups.map((g) => g.site).join('/'));
        }
        if (sites.includes('equatorial/equatorial')) dieq.push(`${rel}-1,${p.id}`);
      }
      add('conformations', 'chair.disubstituted-sites', pf(!badSite.length), `${frames} dimethyl frames (3 positions × cis/trans × 2 chairs): X and Y sit where the chair rule says (odd carbons: up site axial on the unflipped chair)`, { expected: 'rule = drawn', actual: badSite.length ? badSite.join('; ') : 'all 12 agree' });
      add('conformations', 'chair.disubstituted-energies', pf(!badE.length), 'each dimethyl chair carries the sum of the A-values of its axial methyls, or the tabulated 1,3-diaxial CH₃/CH₃ value when both are axial 1,3', { expected: 'additive (pair for diaxial cis-1,3)', actual: badE.length ? badE.join('; ') : '12 chairs from the tables', source: `${A_VALUES.source}; ${DIAXIAL_PAIRS.source}` });
      add('conformations', 'chair.diequatorial-isomers', pf(dieq.join(' ') === 'trans-1,2 cis-1,3 trans-1,4'), 'the isomers with a diequatorial chair are trans-1,2, cis-1,3 and trans-1,4', { expected: 'trans-1,2 cis-1,3 trans-1,4', actual: dieq.join(' '), source: 'CGW ch. 16; KLEIN ch. 4' });
      const pair = DIAXIAL_PAIRS.values['methyl/methyl'];
      add('tables', 'diaxial-pair.methyl', pf(Math.abs(pair.kJ - pair.kcal * KCAL) <= 0.06 && pair.kJ > 2 * A_VALUES.values.methyl.kJ), 'the 1,3-diaxial CH₃/CH₃ value is kcal × 4.184 and exceeds two methyl A-values', { expected: `${pair.kcal} kcal/mol × 4.184`, actual: `${pair.kJ} kJ/mol`, source: DIAXIAL_PAIRS.source });
    }
    add('simplifications', 'chair.additive-estimate', 'note', 'disubstituted chair energies are the textbook additive estimate (sum of A-values of the axial groups; the 1,3-diaxial CH₃/CH₃ pair value where it applies); gauche interactions between adjacent equatorial groups and other diaxial pairs are not tabulated and are neglected or flagged as a lower estimate', { source: 'register' });
    add('simplifications', 'chair.crowded-forms', 'note', `chair frames the template cannot place without overlap are flagged on the card, never relieved by bending the ring: ${crowded.join(', ') || 'none'}`, { source: 'register' });
  }
  { const e2 = MECHANISMS.e2.frame(0); const p = (id) => e2.atoms.find((a) => a.id === id).pos; const d = Math.abs(dihedralDeg(p('Br'), p('C2'), p('C3'), p('Hb'))); const c = conformer('bromobutane', 180); add('conformations', 'bromobutane.matches-e2', pf(Math.abs(d - 180) < 1 && Math.abs(Math.abs(c.dihedral) - 180) < 1e-6), 'the anti-periplanar rotor and the Reaction lab E2 start share the 180° Br–C–C–H dihedral', { expected: '180°', actual: `${fmt(d, 1)}° (E2) / ${fmt(Math.abs(c.dihedral), 1)}° (rotor)`, source: 'CGW ch. 17' }); }

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
  { // pinned lone-pair centres follow the embedder's measured angles (bentCentre), like the explorer
    const w = MECHANISMS.sn1.frame(0); const pw = (id) => w.atoms.find((a) => a.id === id).pos;
    add('mechanisms', 'sn1.water-angle', pf(Math.abs(angleDeg(pw('W.Ha'), pw('W.O'), pw('W.Hb')) - MEASURED_ANGLES.water_HOH.value) < 0.1 && Math.abs(angleDeg(pw('W2.Ha'), pw('W2.O'), pw('W2.Hb')) - MEASURED_ANGLES.water_HOH.value) < 0.1), 'both waters of the SN1 frame have the measured H–O–H angle', { expected: `${MEASURED_ANGLES.water_HOH.value}°`, actual: `${fmt(angleDeg(pw('W.Ha'), pw('W.O'), pw('W.Hb')), 1)}° / ${fmt(angleDeg(pw('W2.Ha'), pw('W2.O'), pw('W2.Hb')), 1)}°`, source: MEASURED_ANGLES.water_HOH.source });
    const e = MECHANISMS.e1.frame(0); const pe = (id) => e.atoms.find((a) => a.id === id).pos;
    add('mechanisms', 'e1.base-angle', pf(Math.abs(angleDeg(pe('B.H'), pe('B.O'), pe('B.C1')) - MEASURED_ANGLES.methanol_COH.value) < 0.1), 'the ethanol base of the E1 frame has the alcohol C–O–H angle', { expected: `${MEASURED_ANGLES.methanol_COH.value}°`, actual: `${fmt(angleDeg(pe('B.H'), pe('B.O'), pe('B.C1')), 1)}°`, source: MEASURED_ANGLES.methanol_COH.source });
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
  // Atomic orbitals topic: the gallery's nodes and most probable radii against the closed forms, the hybrid
  // lobe angles read off the drawn functions, and every configuration 1–36 against the NIST table.
  {
    const closed = { '2s': { nodes: [2], rmp: 3 + Math.sqrt(5) }, '2p': { nodes: [], rmp: 4 }, '3s': { nodes: [(9 - 3 * Math.sqrt(3)) / 2, (9 + 3 * Math.sqrt(3)) / 2] }, '3p': { nodes: [6], rmp: 12 }, '3dz2': { nodes: [], rmp: 9 }, '3dxy': { nodes: [], rmp: 9 }, '1s': { nodes: [], rmp: 1 } };
    for (const it of ORBITAL_ITEMS.filter((x) => x.kind === 'atomic')) {
      const b = buildItem(it.id), c = closed[it.id];
      const nodesOk = b.rdf.nodes.length === c.nodes.length && b.rdf.nodes.every((x, i) => Math.abs(x - c.nodes[i]) < 1e-3) && b.rdf.nodes.length === b.radialNodes;
      const rmpOk = c.rmp == null || Math.abs(b.rdf.rMostProbable - c.rmp) < 1e-3;
      add('orbitals', `gallery.${it.id}`, pf(nodesOk && rmpOk), `${b.label}: radial nodes found on R_nl match the closed-form roots (${c.nodes.map((x) => x.toFixed(3)).join(', ') || 'none'}) and n − l − 1; most probable radius ${c.rmp != null ? `= ${typeof c.rmp === 'number' ? c.rmp.toFixed(3) : c.rmp} a₀` : 'reported'}`, { expected: `${c.nodes.length} node(s)${c.rmp != null ? `, r = ${c.rmp.toFixed(3)} a₀` : ''}`, actual: `${b.rdf.nodes.map((x) => x.toFixed(3)).join(', ') || 'none'}; r = ${fmt(b.rdf.rMostProbable, 3)} a₀`, source: 'ATKINS ch. 8' });
    }
    add('tables', 'hydrogen-energy', pf(Math.abs(HYDROGEN_ENERGY.rydbergEV - HYDROGEN_ENERGY.listed) < 0.01 && !!HYDROGEN_ENERGY.source), 'the Rydberg energy shown equals the CODATA value to 0.01 eV', { expected: `${HYDROGEN_ENERGY.listed} eV`, actual: `${HYDROGEN_ENERGY.rydbergEV} eV`, source: HYDROGEN_ENERGY.source });
    for (const kind of ['sp', 'sp2', 'sp3']) {
      const c = hybridChecks(kind, { size: 32 });
      add('orbitals', `hybrid.${kind}`, pf(c.angles.every((a) => Math.abs(a - c.expected) < 0.5) && Math.abs(c.probability - 1) < 0.02), `${kind}: the main lobes read off the drawn hybrids are ${c.expected}° apart and the hybrid is normalised on the grid`, { expected: `${c.expected}°, ∫ψ² = 1`, actual: `${c.angles.map((a) => fmt(a, 2)).join(' / ')}°, ${fmt(c.probability, 3)}`, source: 'CGW ch. 4' });
    }
    {
      const bad = [];
      for (const e of PERIODIC) { const got = configurationAscii(electronConfiguration(e.Z)); if (got !== GROUND_STATE_CONFIGURATIONS.values[e.Z]) bad.push(`${e.symbol}: ${got}`); }
      add('orbitals', 'configurations.1-36', pf(!bad.length), `aufbau order + the tabulated exceptions (${Object.keys(AUFBAU_EXCEPTIONS.values).map((z) => PERIODIC[z - 1].symbol).join(', ')}) reproduce the NIST ground-state configuration of every element 1–36`, { expected: 'all 36 match', actual: bad.length ? bad.join('; ') : '36 / 36', source: GROUND_STATE_CONFIGURATIONS.source });
    }
  }
  // Acids and bases topic: every pKa is the table's, the five factors order as the textbooks say, the proton
  // frames conserve charge and atoms, and the equilibrium helper is the stated identity.
  {
    const badP = []; for (const p of PAIRS) if (!(p.pka in PKA) || pkaOf(p.id) !== PKA[p.pka]) badP.push(p.id);
    add('acids', 'pka.table', pf(!badP.length && PAIRS.every((p, i) => !i || pkaOf(p.id) >= pkaOf(PAIRS[i - 1].id))), `every conjugate pair carries its tabulated pKa and the ladder is sorted (${PAIRS.length} pairs)`, { expected: 'all from PKA, ascending', actual: badP.length ? badP.join(', ') : `${PAIRS.length} pairs`, source: PKA_TABLE.source });
    for (const [id, f] of Object.entries(FACTORS)) {
      const bad = f.orders.filter((o) => { const vals = o.map(pkaOf); return !vals.every((x, i) => !i || x > vals[i - 1]); });
      add('acids', `factor.${id}`, pf(!bad.length), `${f.label}: ${f.orders.map((o) => o.map((x) => `${x} ${pkaOf(x)}`).join(' < ')).join('; ')}`, { expected: 'pKa rises along each comparison', actual: bad.length ? bad.map((o) => o.join(' < ')).join('; ') : 'all ordered', source: 'CGW ch. 8; BRUICE ch. 2' });
    }
    {
      const bad = [];
      for (const p of PAIRS) { const a0 = acidFrame(p.id, 0), a1 = acidFrame(p.id, 1); const q = (f) => f.frame.atoms.reduce((s, a) => s + (a.charge || 0), 0); const at = (f, id) => f.frame.atoms.find((a) => a.id === id); const d0 = v.dist(at(a0, a0.acidH).pos, at(a0, a0.donor).pos), d1 = v.dist(at(a1, a1.acidH).pos, at(a1, a1.donor).pos); if (Math.abs(q(a0) - p.charge) > 1e-9 || Math.abs(q(a1) - p.charge) > 1e-9 || a0.frame.atoms.length !== a1.frame.atoms.length || Math.abs(d1 - d0 - 1.4) > 1e-9) bad.push(p.id); }
      add('acids', 'proton-frames', pf(!bad.length), 'sending the proton off conserves charge and atom count and moves the H 1.4 Å along its bond', { expected: 'conserved', actual: bad.length ? bad.join(', ') : `${PAIRS.length} frames` });
    }
    const e = equilibrium('aceticAcid', 'water');
    add('acids', 'equilibrium.identity', pf(Math.abs(e.logK - (PKA.water - PKA.aceticAcid)) < 1e-9 && Math.abs(e.deltaG + RT_LN10_KJ * e.logK) < 1e-9 && e.favoured === 'products' && equilibrium('acetylene', 'water').favoured === 'reactants' && Math.abs(RT_LN10_KJ - Math.LN10 * 8.314 * 298.15 / 1000) < 0.002), 'K = 10^(pKa(HB) − pKa(HA)) and ΔG° = −2.303RT log K with 2.303RT = 5.708 kJ/mol; acetate + water → products, acetylide + water ← reactants', { expected: 'log K = 10.94, ΔG° = −62.5 kJ/mol', actual: `log K = ${fmt(e.logK, 2)}, ΔG° = ${fmt(e.deltaG, 1)} kJ/mol`, source: 'thermodynamic identity on the tabulated values' });
  }
  // Molecular orbitals topic: fillings against the textbook bond orders, Hückel against the closed forms, the
  // drawn functions against their nodal structure, every frame at a cited measured length.
  {
    for (const [id, d] of Object.entries(DIATOMIC_MO.values)) {
      const f = fillDiatomic(id);
      add('mo', `diatomic.${id}`, pf(f.bondOrder === d.bondOrder && f.unpaired === d.unpaired), `${d.formula}: filling the textbook ladder with ${d.electrons} valence electrons gives bond order ${d.bondOrder} and ${d.unpaired} unpaired`, { expected: `bond order ${d.bondOrder}, ${d.unpaired} unpaired`, actual: `bond order ${f.bondOrder}, ${f.unpaired} unpaired`, source: DIATOMIC_MO.source.split(';')[0] });
    }
    add('tables', 'bde.ordering', pf(DIATOMIC_MO.values.n2.bde > DIATOMIC_MO.values.o2.bde && DIATOMIC_MO.values.o2.bde > DIATOMIC_MO.values.h2.bde && DIATOMIC_MO.unit === 'kJ/mol'), 'bond dissociation energies rank N₂ > O₂ > H₂ with the bond orders', { expected: '945 > 498 > 436', actual: `${DIATOMIC_MO.values.n2.bde} > ${DIATOMIC_MO.values.o2.bde} > ${DIATOMIC_MO.values.h2.bde} kJ/mol`, source: DIATOMIC_MO.source });
    const PHI = (1 + Math.sqrt(5)) / 2;
    const bd = huckel({ n: 4, bonds: [[0, 1], [1, 2], [2, 3]], electrons: 4 });
    add('mo', 'huckel.butadiene', pf([PHI, PHI - 1, 1 - PHI, -PHI].every((x, i) => Math.abs(bd.levels[i].x - x) < 1e-9) && Math.abs(bd.piEnergy - 4 - (2 * PHI + 2 * (PHI - 1) - 4)) < 1e-9 && bd.homo.id === 'psi2'), 'butadiene Hückel energies are x = ±(1 ± √5)/2 and the delocalisation energy 0.472 β', { expected: '+1.618, +0.618, −0.618, −1.618; 0.472 β', actual: `${bd.levels.map((l) => fmt(l.x, 3)).join(', ')}; ${fmt(bd.piEnergy - 4, 3)} β`, source: 'CGW ch. 4; ATKINS ch. 9' });
    const eth = huckel({ n: 2, bonds: [[0, 1]], electrons: 2 });
    add('mo', 'huckel.ethene', pf(Math.abs(eth.levels[0].x - 1) < 1e-9 && Math.abs(eth.levels[1].x + 1) < 1e-9), 'ethene π / π* at E = α ± β', { expected: '+1, −1', actual: eth.levels.map((l) => fmt(l.x, 3)).join(', '), source: 'CGW ch. 4' });
    const P = HUCKEL_PARAMETERS.values.O_carbonyl, co = huckel({ n: 2, bonds: [[0, 1, P.k]], h: { 1: P.h }, electrons: 2 });
    add('mo', 'huckel.carbonyl', pf(Math.abs(co.levels[0].x - PHI) < 1e-9 && Math.abs(co.levels[1].x - (1 - PHI)) < 1e-9 && Math.abs(co.levels[1].coefficients[0]) > Math.abs(co.levels[1].coefficients[1]) && Math.abs(co.levels[0].coefficients[1]) > Math.abs(co.levels[0].coefficients[0])), `carbonyl with h = ${P.h}, k = ${P.k}: x = (1 ± √5)/2, π larger on O, π* (LUMO) larger on C`, { expected: '+1.618 / −0.618; |c_C(π*)| > |c_O(π*)|', actual: `${fmt(co.levels[0].x, 3)} / ${fmt(co.levels[1].x, 3)}; π* ${co.levels[1].coefficients.map((c) => fmt(Math.abs(c), 3)).join(' / ')}`, source: HUCKEL_PARAMETERS.source });
    {
      const bad = []; let n = 0;
      for (const it of MO_ITEMS) { const b = buildMO(it.id); const byId = new Map(b.frame.atoms.map((a) => [a.id, a])); for (const bond of b.frame.bonds) { n++; const m = bond.ref && MEASURED_BONDS[bond.ref]; if (!m || Math.abs(v.dist(byId.get(bond.a).pos, byId.get(bond.b).pos) - m.value) > 1e-6) bad.push(`${it.id} ${bond.a}–${bond.b}`); } }
      add('mo', 'frames.measured', pf(!bad.length), 'every bond of every MO frame is drawn at a cited measured length', { expected: 'all cited', actual: bad.length ? bad.join(', ') : `${n} bonds`, source: 'NIST CCCBDB' });
    }
    {
      const h2 = moProbe('h2', 'sigma1s'), h2s = moProbe('h2', 'sigma1s*');
      const pi = buildMO('ethene', { mo: 'psi1' }).selected.psi, piS = buildMO('ethene', { mo: 'psi2' }).selected.psi;
      const c1 = buildMO('ethene').frame.atoms.find((a) => a.id === 'C1').pos, c2 = buildMO('ethene').frame.atoms.find((a) => a.id === 'C2').pos;
      const ok = h2.mid > 0.5 && Math.abs(h2s.mid) < 1e-9 && Math.abs(pi.psi(0, 0, 0)) < 1e-9 && pi.psi(c1[0], 0, 0.6) > 0 && pi.psi(c2[0], 0, 0.6) > 0 && piS.psi(c1[0], 0, 0.6) * piS.psi(c2[0], 0, 0.6) < 0;
      add('mo', 'phases', pf(ok), 'the drawn functions have the textbook nodal structure: σ(1s) > 0 at the midpoint, σ*(1s) = 0 there; ethene π vanishes in the plane and is in phase over both carbons, π* out of phase', { expected: 'σ > 0, σ* = 0, π in phase, π* out of phase', actual: `σ ${fmt(h2.mid, 2)}, σ* ${fmt(h2s.mid, 2)}, π ${fmt(pi.psi(c1[0], 0, 0.6), 2)}/${fmt(pi.psi(c2[0], 0, 0.6), 2)}, π* ${fmt(piS.psi(c1[0], 0, 0.6), 2)}/${fmt(piS.psi(c2[0], 0, 0.6), 2)}`, source: 'ATKINS ch. 9' });
    }
    add('tables', 'zeff', pf(SLATER_ZEFF.values.C_2p < SLATER_ZEFF.values.N_2p && SLATER_ZEFF.values.N_2p < SLATER_ZEFF.values.O_2p && SLATER_ZEFF.values.H_1s === 1 && !!SLATER_ZEFF.source), 'effective charges increase across the period (C < N < O) and H is 1', { expected: 'C 3.136 < N 3.834 < O 4.453', actual: `C ${SLATER_ZEFF.values.C_2p} < N ${SLATER_ZEFF.values.N_2p} < O ${SLATER_ZEFF.values.O_2p}`, source: SLATER_ZEFF.source });
  }
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
    'carbonyl-angles': `carbonyl and nitro centres keep ${IDEAL_ANGLES.trigonal}° (acetone C–C–C measured ${MEASURED_ANGLES.acetone_CCC.value}°, nitromethane O–N–O ${MEASURED_ANGLES.nitromethane_ONO.value}°; the cards state the measured value beside the drawn one)`,
    'lone-pair-fallback': `lone-pair centres without a LONE_PAIR_ANGLES row close every bonded angle by ${LONE_PAIR_COMPRESSION_PER_PAIR}° per lone pair (convention)`,
    'chair-energies': `A-values and ring-form energies are textbook compilation values (Eliel & Wilen 1994 as taught by Klein and CGW; compilations differ by 0.1–0.3 kcal/mol, OH is solvent dependent, tert-butyl is an estimate); the boat figure is cyclohexane's own; the equatorial share follows from K = e^(A/RT) at 298 K; the chair ring is the 110° template against the measured ${MEASURED_ANGLES.cyclohexaneChair_CCC.value}°`,
    'pka-estimates': 'pKa values below −2 (HCl, HBr, HI) and above ≈ 30 (ethene, ethane) are textbook estimates: water levels them, so the figures come from other solvents and extrapolation; the cards say so. The proton-departure frames move the H along its bond and shift formal charges linearly; the conjugate base is not re-optimised',
    'mo-pictures': 'molecular orbitals are ±1/√2 (diatomics) or Hückel combinations of hydrogen-like orbitals with Clementi–Raimondi exponents, overlap neglected; the 2s-based σ of N₂ / O₂ use the 2p exponent and the C–Cl σ / σ* equal weights (shapes and phases only); diatomic ladders are schematic and carry no energies; β is never given a number',
    'orbital-pictures': 'orbital pictures are hydrogen-like functions (Z = 1) drawn as the |ψ| surface enclosing a stated share of the probability; hybrids use hydrogen-like 2s/2p, so they show the shape, not a carbon\'s size; the configuration ladder is schematic and carries no energies',
    'methanethiol-source': `C–S–H ${LONE_PAIR_ANGLES['S/2/2/C,H'].angle}° follows the microwave structure tabulated by Landolt-Börnstein and the CRC gas-phase table; the CCCBDB listing quotes the older Herzberg (1966) compilation value 100.3°`,
  })) add('simplifications', k, 'note', detail);

  // ------------------------------------------------------------------ K. model boundary (docs/REVIEW_PROTOCOL.md §6)
  // The model is a cited-geometry template engine, never a physics engine. These checks hold that line
  // mechanically: every displayed angle, length and energy carries a basis, and no visible item reaches the
  // lone-pair fallback convention.
  {
    // 1. Lone-pair centres of every functional group, at every attachment-element combination the R menu can
    //    produce (H or carbon at each site: every non-H R group attaches through carbon), have a sourced row.
    const reps = ['H', 'methyl'];
    for (const id of FUNCTIONAL_GROUP_ORDER) {
      const fg = FUNCTIONAL_GROUPS[id];
      const atts = fg.attachments.map((a) => a.id);
      const variants = fg.variants ? fg.variants.map((x) => x.id) : [null];
      const bad = new Set(); let centres = 0, builds = 0;
      const rec = (k, R) => {
        if (k < atts.length) { for (const r of reps) rec(k + 1, { ...R, [atts[k]]: r }); return; }
        for (const variant of variants) {
          const { mol, frame } = makeMolecule(id, { variant, R });
          builds++;
          const byId = new Map(frame.atoms.map((a) => [a.id, a]));
          const adj = new Map(frame.atoms.map((a) => [a.id, []]));
          for (const b of frame.bonds) { adj.get(b.a).push(b.b); adj.get(b.b).push(b.a); }
          for (const def of mol.atoms) {
            const nb = adj.get(def.id) || [];
            if (nb.length < 2 || !directionalLonePairs(def)) continue;
            centres++;
            const els = nb.map((n) => byId.get(n).el);
            if (lonePairAngleTargets(def, els).basis === 'fallback') bad.add(`${def.el}/${nb.length}/${def.lonePairs}/${[...els].sort().join(',')}`);
          }
        }
      };
      rec(0, {});
      add('boundary', `${id}.lone-pair-basis`, pf(!bad.size), `${fg.name}: every lone-pair centre has a sourced LONE_PAIR_ANGLES row (exemplar or class) at all ${builds} attachment-element combinations; the fallback convention is never shown`, { expected: 'no fallback', actual: bad.size ? [...bad].join(' ') : `${centres} centres sourced`, source: 'REVIEW_PROTOCOL §6' });
    }
    // 2. Shape gallery: every displayed angle is ideal (by symmetry), measured or class, and a measured or
    //    class angle cites an oracle row that has a source.
    {
      const bad = []; let n = 0;
      for (const s of SHAPES) for (const a of buildShape(s.id).angles) {
        n++;
        const ok = a.status === 'ideal' || ((a.status === 'measured' || a.status === 'class') && !!a.ref && !!MEASURED_ANGLES[a.ref]?.source);
        if (!ok) bad.push(`${s.formula} ${a.label}: ${a.status}`);
      }
      add('boundary', 'shapes.angle-basis', pf(!bad.length), 'every angle in the Molecular shapes gallery is ideal, measured or class, each with its oracle source; none is drawn on the fallback convention', { expected: 'ideal / measured / class', actual: bad.length ? bad.join('; ') : `${n} angles`, source: 'REVIEW_PROTOCOL §6' });
    }
    // 3. Bond-length overrides: every bond drawn off the element/order table cites a measured row.
    {
      const bad = []; let n = 0;
      const scan = (where, frame) => { for (const b of frame.bonds) if (b.length != null) { n++; if (!b.ref || !MEASURED_BONDS[b.ref]) bad.push(`${where} ${b.a}–${b.b}`); } };
      for (const id of FUNCTIONAL_GROUP_ORDER) scan(id, makeMolecule(id).frame);
      for (const s of SHAPES) scan(s.id, buildShape(s.id).frame);
      for (const it of MO_ITEMS) scan(`mo:${it.id}`, buildMO(it.id).frame);
      add('boundary', 'bond-lengths.cited', pf(!bad.length), 'every bond drawn at a length other than the element/order table cites a MEASURED_BONDS row', { expected: 'all cited', actual: bad.length ? bad.join(', ') : `${n} overrides, all cited`, source: 'REVIEW_PROTOCOL §6' });
    }
    // 4. Energies: only tabulated textbook values with a unit and a source are shown; a rotor without a table
    //    row reports no energy; mechanism profiles are labelled illustrative. Nothing is computed from geometry.
    {
      const bad = [];
      for (const [k, row] of Object.entries(TORSION_ENERGIES)) if (!row.unit || !row.source) bad.push(`TORSION_ENERGIES.${k} lacks unit/source`);
      for (const [k, row] of Object.entries(RING_CONFORMER_ENERGIES)) if (!row.unit || !row.source) bad.push(`RING_CONFORMER_ENERGIES.${k} lacks unit/source`);
      if (!A_VALUES.unit || !A_VALUES.source) bad.push('A_VALUES lacks unit/source');
      if (!DIAXIAL_PAIRS.unit || !DIAXIAL_PAIRS.source) bad.push('DIAXIAL_PAIRS lacks unit/source');
      if (!HYDROGEN_ENERGY.unit || !HYDROGEN_ENERGY.source) bad.push('HYDROGEN_ENERGY lacks unit/source');
      if (!GROUND_STATE_CONFIGURATIONS.source || !AUFBAU_EXCEPTIONS.source) bad.push('configuration tables lack a source');
      if (!DIATOMIC_MO.unit || !DIATOMIC_MO.source) bad.push('DIATOMIC_MO lacks unit/source');
      if (!HUCKEL_PARAMETERS.source) bad.push('HUCKEL_PARAMETERS lacks a source');
      if (!PKA_TABLE.unit || !PKA_TABLE.source) bad.push('PKA_TABLE lacks unit/source');
      for (const p of POSITIONS) for (const rel of RELATIONS) for (const f of ['axial', 'equatorial']) if (chairEnergy('methyl', f, { sub: 'methyl', position: p.id, rel }).basis !== 'table') bad.push(`dimethyl ${rel}-1,${p.id} ${f} energy not from a table`);
      for (const s of CHAIR_SUBSTITUENTS) for (const f of RING_FORMS) if (chairEnergy(s.id, f.id).basis !== 'table') bad.push(`chair ${s.id}/${f.id} energy not from a table`);
      for (const r of ROTORS) {
        if (r.energy && !TORSION_ENERGIES[r.energy]) bad.push(`${r.id} names a missing energy table`);
        if (!r.energy && conformer(r.id, 0).energy !== null) bad.push(`${r.id} reports an energy with no table`);
      }
      for (const id of MECHANISM_ORDER) if (!/illustrative/.test(MECHANISMS[id].energy?.unit || '')) bad.push(`${id} energy profile not labelled illustrative`);
      add('boundary', 'energies.sourced', pf(!bad.length), 'energies are tabulated textbook values (unit + source) or profiles labelled illustrative; none is computed from the drawn geometry', { expected: 'all sourced or labelled', actual: bad.length ? bad.join('; ') : `${Object.keys(TORSION_ENERGIES).length + Object.keys(RING_CONFORMER_ENERGIES).length + 6} tables, ${ROTORS.length} rotors, ${CHAIR_SUBSTITUENTS.length * RING_FORMS.length} chair cards, ${MECHANISM_ORDER.length} profiles`, source: 'REVIEW_PROTOCOL §6' });
    }
    // 5. Card angle labels: a number printed on an angle visual is the drawn angle at default R, to the label's
    //    own precision (± 2° for "≈", ± 0.5° otherwise), or the label says what is drawn ("drawn 120°").
    {
      const bad = []; let n = 0;
      const nums = (t) => (t.match(/\d+(?:\.\d+)?/g) || []).map(Number);
      const walk = (frame, items, where) => {
        for (const it of items || []) for (const vis of it.visuals || []) {
          if (vis.type !== 'angle' || !vis.text) continue;
          n++;
          const P = (ref) => frame.atoms.find((a) => a.id === resolveId(frame, ref))?.pos;
          const a = P(vis.a), c = P(vis.center), b = P(vis.b);
          if (!a || !b || !c) { bad.push(`${where}/${it.id}: atoms not found`); continue; }
          const got = angleDeg(a, c, b);
          const drawn = vis.text.match(/drawn\s+(\d+(?:\.\d+)?)/);
          let ok;
          if (drawn) ok = Math.abs(got - Number(drawn[1])) <= 0.5;
          else { const xs = nums(vis.text); const tol = /≈|~|about/.test(vis.text) ? 2 : 0.5; ok = xs.length > 0 && got >= Math.min(...xs) - tol && got <= Math.max(...xs) + tol; }
          if (!ok) bad.push(`${where}/${it.id}: "${vis.text}" vs ${fmt(got, 1)}°`);
        }
      };
      for (const id of FUNCTIONAL_GROUP_ORDER) { const g = FUNCTIONAL_GROUPS[id]; walk(makeMolecule(id).frame, [...(g.invariants || []), ...(g.varies || []), ...(g.identify || [])], id); }
      for (const s of SHAPES) walk(buildShape(s.id).frame, s.invariants, s.id);
      add('boundary', 'card-angles.stated', pf(!bad.length), "every angle printed on a card is the drawn angle at default R (to the label's precision) or states the drawn value", { expected: 'label = model, or "drawn …"', actual: bad.length ? bad.join('; ') : `${n} labels`, source: 'REVIEW_PROTOCOL §6' });
    }
  }

  const summary = { pass: 0, fail: 0, note: 0 };
  for (const c of checks) summary[c.status]++;
  return { checks, summary };
}
