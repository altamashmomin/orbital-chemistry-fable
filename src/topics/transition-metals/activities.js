// Predict → fill the diagram → explain activities for the Transition metals topic; reveal text reads the module.
import { buildComplex } from '../../chem/transitionMetals.js';
import { DELTA_O } from '../../chem/references/textbook.js';

const mu = (n) => Math.sqrt(n * (n + 2)).toFixed(2);

export const ACTIVITIES = [
  {
    id: 'fe-cyanide-vs-water', item: 'feCyano', title: 'Which Fe(II) complex is diamagnetic?',
    prompt: '[Fe(H₂O)₆]²⁺ and [Fe(CN)₆]⁴⁻ are both d⁶. One has no unpaired electrons. Which, and why?',
    options: [{ id: 'water', label: '[Fe(H₂O)₆]²⁺: water is neutral' }, { id: 'both', label: 'Both: d⁶ is an even number' }, { id: 'cyanide', label: '[Fe(CN)₆]⁴⁻: a strong field pairs them in t₂g', correct: true }],
    reveal: () => { const a = buildComplex('feAqua'), b = buildComplex('feCyano'); return `[Fe(CN)₆]⁴⁻. Δo = ${DELTA_O.values.feCyano.toLocaleString('en')} cm⁻¹ with cyanide against ${DELTA_O.values.feAqua.toLocaleString('en')} with water (tabulated). A large Δo makes pairing in t₂g cheaper than promotion to e_g: t₂g⁶, ${b.unpaired} unpaired. With water the electrons spread out, t₂g⁴ e_g², ${a.unpaired} unpaired and μ = ${mu(a.unpaired)} μ_B. An even d count says nothing by itself: the ligand field decides.`; },
    show: { item: 'feCyano', invariant: 'low' },
  },
  {
    id: 'zinc-colourless', item: 'znAqua', title: 'Why is [Zn(H₂O)₆]²⁺ colourless when [Cu(H₂O)₆]²⁺ is blue?',
    prompt: 'Copper and zinc are neighbours, both +2, both with six waters. One solution is blue, the other has no colour at all.',
    options: [{ id: 'size', label: 'Zinc is smaller, so Δo is too big to see' }, { id: 'd10', label: 'Zn(II) is d¹⁰: no empty d orbital to excite into', correct: true }, { id: 'water', label: 'Water binds zinc more weakly' }],
    reveal: () => { const z = buildComplex('znAqua'), c = buildComplex('cuAqua'); return `d¹⁰. Zinc(II) is group 12 minus 2 = d${'¹⁰'}: all five d orbitals are full, so no d–d transition exists and visible light passes through. Cu(II) is d⁹ with one hole in e_g; the electron promoted into it absorbs orange-red light and the solution looks blue. The same count explains magnetism: ${z.unpaired} unpaired for zinc, ${c.unpaired} for copper (μ = ${mu(c.unpaired)} μ_B).`; },
    show: { item: 'znAqua', invariant: 'd10' },
  },
  {
    id: 'cobalt-fluoride', item: 'coFluoro', title: '[CoF₆]³⁻ is paramagnetic but [Co(NH₃)₆]³⁺ is not. What changed?',
    prompt: 'Same Co(III), same d⁶ count, same octahedron. Only the ligand differs.',
    options: [{ id: 'charge', label: 'Fluoride is charged, so it adds electrons' }, { id: 'field', label: 'F⁻ is a weak-field ligand: Δo < P, high spin', correct: true }, { id: 'size', label: 'Fluoride is too small to pair the electrons' }],
    reveal: () => { const f = buildComplex('coFluoro'), a = buildComplex('coAmmine'); return `The field strength. F⁻ sits low in the spectrochemical series: Δo = ${DELTA_O.values.coFluoro.toLocaleString('en')} cm⁻¹ (tabulated) is less than the pairing energy, so Co(III) stays high spin, t₂g⁴ e_g² with ${f.unpaired} unpaired electrons. Ammonia gives Δo = ${DELTA_O.values.coAmmine.toLocaleString('en')} cm⁻¹ and the ion pairs up: t₂g⁶, ${a.unpaired} unpaired, diamagnetic. A ligand's charge never adds to the d count; the oxidation state fixes that.`; },
    show: { item: 'coFluoro', invariant: 'high' },
  },
  {
    id: 'nickel-geometry', item: 'niCyano', title: '[NiCl₄]²⁻ is paramagnetic, [Ni(CN)₄]²⁻ is diamagnetic. Why?',
    prompt: 'Both are four-coordinate Ni(II), d⁸. Only one has unpaired electrons.',
    options: [{ id: 'shape', label: 'Different shapes: tetrahedral vs square planar', correct: true }, { id: 'charge', label: 'Chloride carries more charge than cyanide' }, { id: 'count', label: 'They have different d counts' }],
    reveal: () => { const t = buildComplex('niChloro'), s = buildComplex('niCyano'); return `Geometry. With weak-field chlorides Ni(II) is tetrahedral: e⁴ t₂⁴, ${t.unpaired} unpaired, blue. With cyanide it is square planar: dₓ²₋ᵧ² is pushed far above the other four, eight electrons fill those four, ${s.unpaired} unpaired, yellow. Both are d⁸ (group 10 − 2); the ligand decides the shape and the shape decides the filling.`; },
    show: { item: 'niCyano', invariant: 'sqp' },
  },
];

export const correctOption = (activity) => activity.options.find((o) => o.correct) || null;
