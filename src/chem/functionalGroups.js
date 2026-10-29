// Functional-group definitions.
// Each group has a small "core" graph plus attachment points for R groups.
// `invariants` are the properties that hold for EVERY member of the class, no matter what R is.
// `varies` lists the things the R group DOES change, so students can separate the two.
// Visual specs reference core atom ids, or 'R1', 'R2', ... which the builder resolves to the
// attachment atom of that R group.
import { benzeneTemplate } from './rGroups.js';
import { CONJUGATED_BOND_LENGTHS } from './references/textbook.js';

const bond = (a, b, order = 1) => ({ a, b, order });

const sp2O = (id) => ({ id, el: 'O', hyb: 'sp2', lonePairs: 2 });
/** A conjugated single bond drawn at its measured length (CONJUGATED_BOND_LENGTHS, cited in references/measured.js). */
const cbond = (a, b, key, order = 1) => ({ a, b, order, length: CONJUGATED_BOND_LENGTHS[key].length, ref: CONJUGATED_BOND_LENGTHS[key].ref });

export const FUNCTIONAL_GROUPS = {
  // ---------------------------------------------------------------- alcohol
  alcohol: {
    id: 'alcohol', name: 'Alcohol', pattern: 'R–OH', suffix: '-ol', color: '#f87171', family: 'oxygen',
    core: { atoms: [{ id: 'O', el: 'O', lonePairs: 2 }, { id: 'H', el: 'H' }], bonds: [bond('O', 'H')] },
    attachments: [{ id: 'R1', atom: 'O', default: 'ethyl', label: 'R' }],
    fallbackNoun: 'alcohol',
    nameFor: (r) => ({ H: 'water (the parent: H–OH)', methyl: 'methanol', ethyl: 'ethanol', isopropyl: 'propan-2-ol (isopropyl alcohol)', tBu: '2-methylpropan-2-ol (tert-butanol)', phenyl: 'phenol', benzyl: 'benzyl alcohol', vinyl: 'ethenol (vinyl alcohol: an enol, tautomerises to acetaldehyde)', allyl: 'prop-2-en-1-ol (allyl alcohol)', CF3: 'trifluoromethanol (unstable: loses HF)' }[r[0]]),
    classify: ({ attach }) => degreeLabel(attach.R1, { aromatic: 'aryl alcohol = a PHENOL (pKa ≈ 10, not 16): its own class', sp2: 'enol (vinyl alcohol): tautomerises to the carbonyl', H: 'water' }),
    invariants: [
      { id: 'oh', title: 'An O–H bond on an sp³ oxygen', detail: 'The defining feature. The oxygen is sp³ and bent: the C–O–H angle is always about 104–109°, never linear or planar.', visuals: [{ type: 'bond', a: 'O', b: 'H' }, { type: 'angle', center: 'O', a: 'R1', b: 'H', text: '≈ 105–109°' }] },
      { id: 'lp', links: [{ label: 'Watch SN1 (water leaves)', href: '#mechanisms/sn1' }, { label: 'Leaving group', href: '#glossary/leaving-group' }], title: 'Two lone pairs on oxygen', detail: 'They make every alcohol a nucleophile and a Lewis/Brønsted base. Strong acid protonates O to give R–OH₂⁺, which converts the terrible leaving group HO⁻ into the good leaving group H₂O.', visuals: [{ type: 'lonePairs', id: 'O' }] },
      { id: 'polar', title: 'Polar O–H and C–O bonds', detail: 'O (EN 3.44) is far more electronegative than H (2.20) or C (2.55): δ− on O, δ+ on the H and on the α-carbon. This fixed dipole is why alcohols dissolve ionic things and why the α-carbon is electrophilic once OH is activated.', visuals: [{ type: 'dipole', from: 'H', to: 'O' }, { type: 'charges', map: { O: 'δ−', H: 'δ+', R1: 'δ+' } }] },
      { id: 'hbond', title: 'Hydrogen-bond donor AND acceptor', detail: 'The O–H donates and the lone pairs accept. Consequence for every alcohol: boiling point far above alkanes/ethers of similar mass, and the smallest ones are miscible with water.', visuals: [{ type: 'label', id: 'H', text: 'H-bond donor' }, { type: 'lonePairs', id: 'O' }] },
      { id: 'acid', links: [{ label: 'pKa', href: '#glossary/pka' }], title: 'Weakly acidic O–H (pKa ≈ 16–18)', detail: 'About as acidic as water. Deprotonated by Na metal, NaH, or very strong bases to give an alkoxide RO⁻ (a strong base and good nucleophile). Hydroxide alone only partly deprotonates it. (Phenols are the exception at pKa ≈ 10, because the ring delocalises the negative charge.)', visuals: [{ type: 'label', id: 'H', text: 'pKa ≈ 16–18' }, { type: 'atom', id: 'H' }] },
      { id: 'ox', title: 'Oxidisable only if the α-carbon has an H', detail: 'Oxidation removes H from the carbon bearing O: 1° → aldehyde → carboxylic acid; 2° → ketone; 3° → no oxidation (no α-H). You can read the outcome straight off the structure.', visuals: [{ type: 'atom', id: 'R1' }, { type: 'bond', a: 'R1', b: 'O' }] },
    ],
    varies: [
      { title: 'Degree (1°, 2°, 3°)', audience: 'both', detail: 'Set by how many carbons are on the α-carbon. Controls oxidation products and whether substitution/elimination goes SN2/E2 (1°) or SN1/E1 (3°).' },
      { title: 'Boiling point & solubility', detail: 'Longer or bulkier R lowers water solubility (methanol/ethanol/propanol miscible; butanol only ~8 g/100 mL; octanol insoluble).' },
      { title: 'Acidity fine-tuning', detail: 'Electron-withdrawing groups (CF₃) raise acidity; alkyl bulk lowers it slightly; an aryl ring raises it by a million-fold (phenol).' },
      { title: 'Allylic / benzylic activation', detail: 'A C=C or ring next to the α-carbon stabilises carbocations, so these alcohols ionise (SN1) far more readily.' },
    ],
    identify: ['IR: broad O–H stretch 3200–3600 cm⁻¹ (H-bonded), C–O 1050–1150 cm⁻¹', '¹H NMR: O–H singlet 1–5 ppm, broad, disappears on D₂O shake; α-H at 3.4–4.0 ppm', '¹³C NMR: α-carbon 50–80 ppm', 'Lucas test (ZnCl₂/HCl): 3° turbid instantly, 2° in minutes, 1° slowly or not at all'],
  },

  // ---------------------------------------------------------------- ether
  ether: {
    id: 'ether', name: 'Ether', pattern: 'R–O–R′', suffix: 'alkoxy-', color: '#fb923c', family: 'oxygen',
    core: { atoms: [{ id: 'O', el: 'O', lonePairs: 2 }], bonds: [] },
    attachments: [{ id: 'R1', atom: 'O', default: 'ethyl', label: 'R' }, { id: 'R2', atom: 'O', default: 'ethyl', label: 'R′' }],
    symmetric: true, fallbackNoun: 'ether',
    nameFor: (r) => ({ 'ethyl|ethyl': 'diethyl ether', 'methyl|methyl': 'dimethyl ether', 'ethyl|methyl': 'ethyl methyl ether (methoxyethane)', 'methyl|phenyl': 'anisole (methoxybenzene)', 'methyl|tBu': 'MTBE (methyl tert-butyl ether)', 'phenyl|phenyl': 'diphenyl ether', 'H|methyl': 'methanol (one R = H makes it an alcohol!)', 'H|H': 'water' }[r.slice().sort().join('|')]),
    classify: ({ R }) => (R.R1 === 'H' || R.R2 === 'H' ? 'With an H on oxygen this is an alcohol, not an ether.' : R.R1 === R.R2 ? 'symmetrical ether (small net dipole)' : 'unsymmetrical ether'),
    invariants: [
      { id: 'bent', title: 'C–O–C is bent, oxygen is sp³', detail: 'The angle is about 110–112°, so ethers are never linear and always have a net dipole (unless the two R groups are identical and the conformation cancels it).', visuals: [{ type: 'angle', center: 'O', a: 'R1', b: 'R2', text: '≈ 110°' }] },
      { id: 'lp', title: 'Two lone pairs: acceptor only', detail: 'Ethers accept hydrogen bonds and act as Lewis bases (they coordinate Li⁺, Mg²⁺ in Grignard reagents, BF₃). But with no O–H they cannot donate, so they boil far below alcohols of the same mass.', visuals: [{ type: 'lonePairs', id: 'O' }] },
      { id: 'inert', title: 'No acidic H, and inert to bases, nucleophiles and mild oxidants', detail: 'This is why ethers (Et₂O, THF) are solvents: nothing in a typical reaction attacks them. Only strong acids (HBr, HI) cleave the C–O bond.', visuals: [{ type: 'bond', a: 'R1', b: 'O' }, { type: 'bond', a: 'R2', b: 'O' }] },
      { id: 'polar', title: 'Polar C–O bonds', detail: 'δ+ carbons, δ− oxygen, dipole ~1.2 D. Enough polarity to dissolve many organics, not enough to dissolve salts well.', visuals: [{ type: 'charges', map: { O: 'δ−', R1: 'δ+', R2: 'δ+' } }] },
      { id: 'perox', title: 'α-C–H bonds autoxidise to peroxides', detail: 'Air slowly converts R–O–CH– into hydroperoxides at the carbon next to oxygen: the reason old ether bottles are explosion hazards.', visuals: [{ type: 'atom', id: 'R1' }, { type: 'atom', id: 'R2' }] },
    ],
    varies: [
      { title: 'Symmetry and dipole', audience: 'both', detail: 'Identical R groups give a smaller net dipole; different ones give a larger one.' },
      { title: 'Lewis basicity', detail: 'Bulky R groups shield the oxygen (Et₂O is a weaker donor than THF, whose ring pins the lone pairs open).' },
      { title: 'Ring strain (epoxides)', detail: 'A three-membered cyclic ether is highly reactive: that is ring strain, not "ether-ness".' },
    ],
    identify: ['IR: strong C–O 1070–1150 cm⁻¹ and NO O–H band', '¹H NMR: α-H 3.3–4.0 ppm', 'Low boiling point for its mass (Et₂O 35 °C vs butan-1-ol 118 °C)'],
  },

  // ---------------------------------------------------------------- aldehyde
  aldehyde: {
    id: 'aldehyde', name: 'Aldehyde', pattern: 'R–CHO', suffix: '-al', color: '#fbbf24', family: 'carbonyl',
    core: { atoms: [{ id: 'C', el: 'C', hyb: 'sp2' }, sp2O('O'), { id: 'H', el: 'H' }], bonds: [bond('C', 'O', 2), bond('C', 'H')] },
    attachments: [{ id: 'R1', atom: 'C', default: 'methyl', label: 'R' }],
    fallbackNoun: 'aldehyde',
    nameFor: (r) => ({ H: 'methanal (formaldehyde)', methyl: 'ethanal (acetaldehyde)', ethyl: 'propanal', isopropyl: '2-methylpropanal', tBu: '2,2-dimethylpropanal (pivaldehyde)', phenyl: 'benzaldehyde', benzyl: 'phenylacetaldehyde', vinyl: 'propenal (acrolein)', allyl: 'but-3-enal', CF3: 'trifluoroacetaldehyde (fluoral)' }[r[0]]),
    classify: ({ attach }) => (attach.R1.el === 'H' ? 'formaldehyde: both substituents are H (most reactive aldehyde)' : attach.R1.aromatic ? 'aromatic aldehyde (conjugated, no α-H, does Cannizzaro)' : 'aliphatic aldehyde'),
    invariants: [
      { id: 'co', title: 'C=O double bond, trigonal planar carbon', detail: 'The carbonyl carbon is sp² with 120° angles; C, O, H and the R attachment atom all lie in one plane. The bond is short (1.21 Å) and strong, but its π bond is polarised and easy to attack.', visuals: [{ type: 'bond', a: 'C', b: 'O' }, { type: 'plane', atoms: ['C', 'O', 'H', 'R1'] }] },
      { id: 'polar', links: [{ label: 'Electrophile', href: '#glossary/electrophile' }, { label: 'LUMO', href: '#glossary/lumo' }], title: 'δ+ carbon = electrophile', detail: 'O pulls the π electrons (resonance form C⁺–O⁻). Nucleophiles (H⁻, R⁻, CN⁻, ROH, RNH₂, H₂O) add to the carbon; this is the master reaction of all carbonyls.', visuals: [{ type: 'charges', map: { C: 'δ+', O: 'δ−' } }, { type: 'dipole', from: 'C', to: 'O' }] },
      { id: 'lp', title: 'Two lone pairs on oxygen', detail: 'H-bond acceptor (soluble when small) and weak base: protonating O makes the carbon a far better electrophile (acid catalysis).', visuals: [{ type: 'lonePairs', id: 'O' }] },
      { id: 'h', title: 'Exactly one H on the carbonyl carbon', detail: 'This H is what distinguishes an aldehyde from a ketone. It is NOT acidic, but it is what gets removed when the aldehyde is oxidised.', visuals: [{ type: 'bond', a: 'C', b: 'H' }, { type: 'atom', id: 'H' }] },
      { id: 'ox', title: 'Oxidised to a carboxylic acid', detail: 'Because of that C–H, every aldehyde gives a positive Tollens′ (silver mirror), Fehling′s/Benedict′s test, and is oxidised by Jones reagent or even air. Ketones are not.', visuals: [{ type: 'bond', a: 'C', b: 'H' }] },
      { id: 'react', title: 'More reactive than a ketone', detail: 'One R instead of two means less steric hindrance and less electron donation into the carbonyl: aldehydes hydrate, form acetals and are reduced faster than ketones.', visuals: [{ type: 'atom', id: 'C' }] },
    ],
    varies: [
      { title: 'α-Hydrogens', audience: 'both', detail: 'If R has H on the carbon next to C=O (pKa ≈ 17), enol/enolate chemistry (aldol) is possible; benzaldehyde and pivaldehyde have none.' },
      { title: 'Conjugation', detail: 'Aryl or vinyl R delocalises the C=O, lowering the C=O stretch to ~1690–1710 cm⁻¹ and slowing nucleophilic addition.' },
      { title: 'Steric access', detail: 'tert-Butyl slows addition; H (formaldehyde) makes it fastest.' },
    ],
    identify: ['¹H NMR: CHO at 9–10 ppm (unmistakable)', 'IR: C=O 1720–1740 cm⁻¹ (1690–1715 conjugated); C–H doublet at ~2720 & 2820 cm⁻¹', '¹³C: 190–200 ppm', 'Positive Tollens′ / Fehling′s / 2,4-DNP tests'],
  },

  // ---------------------------------------------------------------- ketone
  ketone: {
    id: 'ketone', name: 'Ketone', pattern: 'R–CO–R′', suffix: '-one', color: '#f59e0b', family: 'carbonyl',
    core: { atoms: [{ id: 'C', el: 'C', hyb: 'sp2' }, sp2O('O')], bonds: [bond('C', 'O', 2)] },
    attachments: [{ id: 'R1', atom: 'C', default: 'methyl', label: 'R' }, { id: 'R2', atom: 'C', default: 'methyl', label: 'R′' }],
    symmetric: true, fallbackNoun: 'ketone',
    nameFor: (r) => ({ 'methyl|methyl': 'propanone (acetone)', 'ethyl|methyl': 'butanone (MEK)', 'ethyl|ethyl': 'pentan-3-one', 'methyl|phenyl': 'acetophenone', 'phenyl|phenyl': 'benzophenone', 'isopropyl|methyl': '3-methylbutan-2-one', 'methyl|tBu': '3,3-dimethylbutan-2-one (pinacolone)', 'methyl|vinyl': 'but-3-en-2-one (methyl vinyl ketone)', 'CF3|methyl': '1,1,1-trifluoroacetone' }[r.slice().sort().join('|')]),
    classify: ({ R }) => (R.R1 === 'H' || R.R2 === 'H' ? 'With an H on the carbonyl carbon this is an ALDEHYDE, not a ketone.' : R.R1 === R.R2 ? 'symmetrical ketone (one kind of α-position)' : 'unsymmetrical ketone (two different α-positions: regiochemistry matters)'),
    invariants: [
      { id: 'co', title: 'C=O between two carbons, trigonal planar', detail: 'sp² carbonyl carbon, 120° angles; the two R attachment atoms, C and O are coplanar.', visuals: [{ type: 'bond', a: 'C', b: 'O' }, { type: 'plane', atoms: ['C', 'O', 'R1', 'R2'] }] },
      { id: 'polar', links: [{ label: 'Electrophile', href: '#glossary/electrophile' }, { label: 'LUMO', href: '#glossary/lumo' }], title: 'δ+ carbon = electrophile', detail: 'Same nucleophilic-addition chemistry as aldehydes: hydride, Grignard, cyanide, alcohols (ketals), amines (imines), Wittig.', visuals: [{ type: 'charges', map: { C: 'δ+', O: 'δ−' } }, { type: 'dipole', from: 'C', to: 'O' }] },
      { id: 'lp', title: 'Two lone pairs on oxygen', detail: 'H-bond acceptor (acetone is water-miscible) and site of acid catalysis.', visuals: [{ type: 'lonePairs', id: 'O' }] },
      { id: 'noH', title: 'No H on the carbonyl carbon', detail: 'So ketones are NOT oxidised by Tollens′, Fehling′s or Jones reagent. Breaking a C–C bond would be required.', visuals: [{ type: 'atom', id: 'C' }] },
      { id: 'enol', title: 'α-C–H is acidic (pKa ≈ 19–20)', detail: 'Any ketone with α-hydrogens forms an enol/enolate: keto-enol tautomerism, α-halogenation, aldol and Claisen chemistry.', visuals: [{ type: 'atom', id: 'R1' }, { type: 'atom', id: 'R2' }] },
      { id: 'less', title: 'Less electrophilic than an aldehyde', detail: 'Two alkyl groups donate electron density and block the approach, so ketones react slower and their hydrates/ketals are less favourable.', visuals: [{ type: 'atom', id: 'C' }] },
    ],
    varies: [
      { title: 'Symmetry', audience: 'both', detail: 'Unsymmetrical ketones have two α-positions: kinetic vs thermodynamic enolate regiochemistry.' },
      { title: 'Conjugation', detail: 'Aryl/vinyl R lowers C=O frequency; enones do 1,4- (Michael) as well as 1,2-addition.' },
      { title: 'Sterics', detail: 'Bulky R (pinacolone) resists addition; cyclic ketones have ring-strain effects (cyclobutanone very reactive).' },
    ],
    identify: ['IR: C=O 1705–1725 cm⁻¹ (acyclic), lower if conjugated', '¹³C: 205–220 ppm', 'No 9–10 ppm aldehyde proton, negative Tollens′', 'Positive 2,4-DNP (orange precipitate) and iodoform test for methyl ketones'],
  },

  // ---------------------------------------------------------------- carboxylic acid
  carboxylicAcid: {
    id: 'carboxylicAcid', name: 'Carboxylic acid', pattern: 'R–COOH', suffix: '-oic acid', color: '#e879f9', family: 'carbonyl',
    core: {
      atoms: [{ id: 'C', el: 'C', hyb: 'sp2' }, sp2O('O1'), { id: 'O2', el: 'O', hyb: 'sp2', lonePairs: 2, pOrbital: 'lonePair' }, { id: 'H', el: 'H' }],
      bonds: [bond('C', 'O1', 2), cbond('C', 'O2', 'acid_CO'), bond('O2', 'H')],
    },
    attachments: [{ id: 'R1', atom: 'C', default: 'methyl', label: 'R' }],
    fallbackNoun: 'carboxylic acid',
    nameFor: (r) => ({ H: 'methanoic acid (formic acid)', methyl: 'ethanoic acid (acetic acid)', ethyl: 'propanoic acid', isopropyl: '2-methylpropanoic acid', tBu: '2,2-dimethylpropanoic acid (pivalic acid)', phenyl: 'benzoic acid', benzyl: 'phenylacetic acid', vinyl: 'propenoic acid (acrylic acid)', allyl: 'but-3-enoic acid', CF3: 'trifluoroacetic acid (TFA, pKa 0.2)' }[r[0]]),
    classify: () => null,
    invariants: [
      { id: 'planar', title: 'C=O and O–H on the same sp² carbon (planar carboxyl)', detail: 'The whole COOH unit is planar, and the O–H prefers to sit syn to the C=O.', visuals: [{ type: 'plane', atoms: ['C', 'O1', 'O2', 'H', 'R1'] }, { type: 'bond', a: 'O2', b: 'H' }] },
      { id: 'acid', links: [{ label: 'Resonance', href: '#glossary/resonance' }, { label: 'pKa', href: '#glossary/pka' }], title: 'Acidic O–H: pKa ≈ 4–5', detail: 'About 10¹² times more acidic than an alcohol because the carboxylate anion is resonance-stabilised: the negative charge is shared equally by both oxygens and both C–O bonds become identical (1.26 Å). Reacts with NaHCO₃ to fizz CO₂: the classic test.', visuals: [{ type: 'label', id: 'H', text: 'pKa ≈ 4–5' }, { type: 'atom', id: 'H' }, { type: 'lonePairs', id: 'O1' }] },
      { id: 'dimer', title: 'Hydrogen-bond donor + acceptor → dimers', detail: 'Two acids pair up head-to-head through two H-bonds. Result: high boiling points (acetic acid 118 °C) and the odd double molecular weight in the gas phase.', visuals: [{ type: 'bond', a: 'O2', b: 'H' }, { type: 'lonePairs', id: 'O1' }] },
      { id: 'electro', title: 'Electrophilic carbonyl carbon, but OH is a poor leaving group', detail: 'Nucleophilic acyl substitution needs activation: SOCl₂ → acid chloride, or acid catalyst + alcohol (Fischer esterification), or DCC for amides. Bases just deprotonate it instead of attacking.', visuals: [{ type: 'charges', map: { C: 'δ+', O1: 'δ−', O2: 'δ−' } }] },
      { id: 'red', title: 'Reduced only by strong hydride (LiAlH₄ → 1° alcohol)', detail: 'NaBH₄ does not reduce carboxylic acids; LiAlH₄ or BH₃ does.', visuals: [{ type: 'atom', id: 'C' }] },
      { id: 'res', title: 'Resonance: the alkoxy O donates into C=O', detail: 'The lone pair on O2 sits in a p orbital overlapping the C=O π system, shortening C–O2 to 1.36 Å (acetic acid; 1.43 Å in an alcohol).', visuals: [{ type: 'orbital', id: 'O2' }, { type: 'bond', a: 'C', b: 'O2' }] },
    ],
    varies: [
      { title: 'Acidity strength', audience: 'both', detail: 'Electron-withdrawing R increases acidity (CF₃COOH pKa 0.2; ClCH₂COOH 2.9; HCOOH 3.8) while alkyl donation lowers it slightly (pivalic 5.0).' },
      { title: 'Solubility', detail: 'Up to C₄ miscible with water; long chains are fatty acids (soap chemistry).' },
      { title: 'α-Chemistry', detail: 'α-H present → Hell–Volhard–Zelinsky bromination; aryl acids do electrophilic aromatic substitution meta.' },
    ],
    identify: ['IR: very broad O–H 2500–3300 cm⁻¹ (overlaps C–H) + C=O 1700–1725 cm⁻¹', '¹H NMR: COOH 10–13 ppm (broad singlet, exchangeable)', '¹³C: 170–185 ppm', 'Fizzes with NaHCO₃; litmus red'],
  },

  // ---------------------------------------------------------------- ester
  ester: {
    id: 'ester', name: 'Ester', pattern: 'R–COO–R′', suffix: 'alkyl -oate', color: '#c084fc', family: 'carbonyl',
    core: {
      atoms: [{ id: 'C', el: 'C', hyb: 'sp2' }, sp2O('O1'), { id: 'O2', el: 'O', hyb: 'sp2', lonePairs: 2, pOrbital: 'lonePair' }],
      bonds: [bond('C', 'O1', 2), cbond('C', 'O2', 'ester_CO')],
    },
    attachments: [{ id: 'R1', atom: 'C', default: 'methyl', label: 'R (acyl)' }, { id: 'R2', atom: 'O2', default: 'ethyl', label: 'R′ (alkoxy)' }],
    fallbackNoun: 'ester',
    nameFor: (r) => ({ 'methyl|ethyl': 'ethyl ethanoate (ethyl acetate)', 'methyl|methyl': 'methyl acetate', 'H|ethyl': 'ethyl formate', 'H|methyl': 'methyl formate', 'phenyl|methyl': 'methyl benzoate', 'phenyl|ethyl': 'ethyl benzoate', 'methyl|phenyl': 'phenyl acetate', 'methyl|isopropyl': 'isopropyl acetate', 'methyl|benzyl': 'benzyl acetate (jasmine)', 'methyl|tBu': 'tert-butyl acetate', 'vinyl|methyl': 'methyl acrylate', 'methyl|H': 'acetic acid (R′ = H makes it an ACID)' }[r.join('|')]),
    classify: ({ R, attach }) => (R.R2 === 'H' ? 'R′ = H: that is a carboxylic acid, not an ester.' : attach.R2.aromatic ? 'aryl ester (phenoxide is a better leaving group: more reactive)' : attach.R1.el === 'H' ? 'formate ester' : 'alkyl ester'),
    invariants: [
      { id: 'two', title: 'Two different C–O bonds on one sp² carbon', detail: 'C=O (1.21 Å) and C–O–R′ (1.33 Å, shortened by resonance; 1.43 Å in an ether). The ester carbon, both oxygens and both attachment atoms are coplanar; R′ sits Z (cis) to the C=O.', visuals: [{ type: 'bond', a: 'C', b: 'O1' }, { type: 'bond', a: 'C', b: 'O2' }, { type: 'plane', atoms: ['C', 'O1', 'O2', 'R1', 'R2'] }] },
      { id: 'noacid', title: 'No acidic O–H', detail: 'Neutral: no fizz with bicarbonate, no H-bond donation (so low boiling points and fruity volatility).', visuals: [{ type: 'atom', id: 'O2' }] },
      { id: 'res', title: 'Alkoxy lone pair donates into C=O', detail: 'The p-type lone pair on O2 conjugates with the carbonyl, making esters LESS electrophilic than acid chlorides and anhydrides but MORE than amides.', visuals: [{ type: 'orbital', id: 'O2' }, { type: 'charges', map: { C: 'δ+', O1: 'δ−' } }] },
      { id: 'hydro', title: 'Hydrolysed by acid (reversible) or base (saponification, irreversible)', detail: 'Nucleophilic acyl substitution: the C(=O)–O bond breaks and alkoxide leaves (then gets protonated). Base gives carboxylate + alcohol; the carboxylate cannot go back.', visuals: [{ type: 'bond', a: 'C', b: 'O2' }] },
      { id: 'red', title: 'LiAlH₄ reduces to TWO alcohols', detail: 'R–CH₂OH from the acyl half and R′–OH from the alkoxy half. Grignards add twice to give tertiary alcohols.', visuals: [{ type: 'atom', id: 'C' }] },
      { id: 'lp', title: 'Carbonyl O is the H-bond acceptor / protonation site', detail: 'Not the alkoxy O: protonating the C=O oxygen keeps the resonance.', visuals: [{ type: 'lonePairs', id: 'O1' }] },
    ],
    varies: [
      { title: 'Which acid and which alcohol', detail: 'Names and smells (fruit esters) come from the two halves; hydrolysis gives them back.' },
      { title: 'Rate of hydrolysis', detail: 'Bulky R or R′ slows attack; aryl esters and formates hydrolyse faster.' },
      { title: 'Rings (lactones)', detail: 'Cyclic esters are strained when small and polymerise.' },
    ],
    identify: ['IR: C=O 1735–1750 cm⁻¹ plus two strong C–O bands 1000–1300 cm⁻¹; no O–H', '¹H NMR: O–CH₂/O–CH₃ at 3.7–4.3 ppm', '¹³C: 165–175 ppm', 'Fruity odour; hydroxamic acid test (FeCl₃ purple)'],
  },

  // ---------------------------------------------------------------- amide
  amide: {
    id: 'amide', name: 'Amide', pattern: 'R–CONR′₂', suffix: '-amide', color: '#38bdf8', family: 'carbonyl',
    core: {
      atoms: [{ id: 'C', el: 'C', hyb: 'sp2' }, sp2O('O'), { id: 'N', el: 'N', hyb: 'sp2', lonePairs: 1, pOrbital: 'lonePair' }],
      bonds: [bond('C', 'O', 2), cbond('C', 'N', 'amide_CN')],
    },
    attachments: [{ id: 'R1', atom: 'C', default: 'methyl', label: 'R (acyl)' }, { id: 'R2', atom: 'N', default: 'H', label: 'R′ on N' }, { id: 'R3', atom: 'N', default: 'H', label: 'R″ on N' }],
    fallbackNoun: 'amide',
    nameFor: (r) => ({ 'methyl|H|H': 'ethanamide (acetamide)', 'H|H|H': 'methanamide (formamide)', 'H|methyl|methyl': 'N,N-dimethylformamide (DMF)', 'methyl|methyl|methyl': 'N,N-dimethylacetamide (DMAc)', 'methyl|methyl|H': 'N-methylacetamide', 'methyl|H|methyl': 'N-methylacetamide', 'phenyl|H|H': 'benzamide', 'methyl|phenyl|H': 'acetanilide', 'methyl|H|phenyl': 'acetanilide' }[r.join('|')]),
    classify: ({ R }) => { const n = [R.R2, R.R3].filter((x) => x !== 'H').length; return ['primary amide (–NH₂, two N–H)', 'secondary amide (one N–H; E/Z about C–N)', 'tertiary amide (no N–H)'][n]; },
    invariants: [
      { id: 'planar', links: [{ label: 'Resonance', href: '#glossary/resonance' }], title: 'Planar C(=O)–N with partial double-bond character', detail: 'The N lone pair delocalises into C=O (resonance form C(–O⁻)=N⁺). C–N is short (1.35 Å in formamide vs 1.47 Å in amines), rotation about it costs 15–20 kcal/mol, and the N is trigonal planar, not pyramidal. This is the geometry that locks peptide backbones.', visuals: [{ type: 'plane', atoms: ['C', 'O', 'N', 'R1', 'R2', 'R3'] }, { type: 'bond', a: 'C', b: 'N' }, { type: 'orbital', id: 'N' }] },
      { id: 'notbasic', title: 'Nitrogen is NOT basic or nucleophilic', detail: 'Because the lone pair is tied up in resonance: pKaH ≈ −1 (an amine is +10). Protonation happens on the carbonyl oxygen instead.', visuals: [{ type: 'orbital', id: 'N' }, { type: 'lonePairs', id: 'O' }] },
      { id: 'least', title: 'Least reactive carboxylic acid derivative', detail: 'Strong donation from N makes the carbonyl carbon only weakly electrophilic: hydrolysis needs strong acid or base plus heat for hours. Order: acid chloride > anhydride > ester > amide.', visuals: [{ type: 'charges', map: { C: 'δ+', O: 'δ−' } }] },
      { id: 'hb', title: 'Carbonyl O is a strong H-bond acceptor', detail: 'The resonance puts extra negative charge on O, so amides H-bond strongly: high melting points, and α-helices/β-sheets in proteins.', visuals: [{ type: 'lonePairs', id: 'O' }] },
      { id: 'red', title: 'LiAlH₄ reduces C=O all the way to CH₂ (gives an amine)', detail: 'Unlike esters and acids, the oxygen is lost entirely because the nitrogen stays attached.', visuals: [{ type: 'atom', id: 'C' }] },
    ],
    varies: [
      { title: 'N-substitution (1°, 2°, 3°)', audience: 'both', detail: 'Determines how many N–H bonds (H-bond donors) there are and the IR N–H pattern.' },
      { title: 'E/Z about C–N', detail: 'Secondary amides exist as trans (Z) mostly; proline-type amides can flip.' },
      { title: 'N–H acidity', detail: 'N–H pKa ≈ 15–17 for simple amides; imides (two C=O) are far more acidic (pKa ≈ 8–10).' },
      { title: 'Ring strain (lactams)', detail: 'β-Lactams (penicillin) are strained, so they are unusually reactive acylating agents.' },
    ],
    identify: ['IR: C=O ("amide I") 1630–1690 cm⁻¹, lower than any other carbonyl; N–H 3200–3400 cm⁻¹ (two bands 1°, one 2°, none 3°)', '¹H NMR: N–H 5–8 ppm broad; N-methyls of DMF appear as two signals (restricted rotation!)', '¹³C: 165–175 ppm', 'Does not dissolve in dilute HCl (not basic)'],
  },

  // ---------------------------------------------------------------- amine
  amine: {
    id: 'amine', name: 'Amine', pattern: 'R–NH₂ / R₂NH / R₃N', suffix: '-amine', color: '#60a5fa', family: 'nitrogen',
    core: { atoms: [{ id: 'N', el: 'N', lonePairs: 1 }], bonds: [] },
    attachments: [{ id: 'R1', atom: 'N', default: 'ethyl', label: 'R' }, { id: 'R2', atom: 'N', default: 'H', label: 'R′' }, { id: 'R3', atom: 'N', default: 'H', label: 'R″' }],
    symmetric: true, fallbackNoun: 'amine',
    nameFor: (r) => ({ 'H|H|H': 'ammonia (the parent)', 'H|H|methyl': 'methanamine (methylamine)', 'H|H|ethyl': 'ethanamine (ethylamine)', 'H|H|isopropyl': 'propan-2-amine (isopropylamine)', 'H|H|tBu': '2-methylpropan-2-amine (tert-butylamine)', 'H|H|phenyl': 'aniline (an aryl amine)', 'H|H|benzyl': 'benzylamine', 'H|methyl|methyl': 'dimethylamine', 'methyl|methyl|methyl': 'trimethylamine', 'H|ethyl|ethyl': 'diethylamine', 'ethyl|ethyl|ethyl': 'triethylamine (Et₃N)', 'H|isopropyl|isopropyl': 'diisopropylamine', 'ethyl|isopropyl|isopropyl': 'Hünig′s base (DIPEA)', 'H|allyl|allyl': 'diallylamine' }[r.slice().sort((a, b) => (a === 'H' ? -1 : b === 'H' ? 1 : a.localeCompare(b))).join('|')]),
    classify: ({ R, attach }) => { const subs = ['R1', 'R2', 'R3'].filter((k) => R[k] !== 'H'); const n = subs.length; const aryl = subs.some((k) => attach[k].aromatic); return (['ammonia', 'primary amine (1°)', 'secondary amine (2°)', 'tertiary amine (3°, no N–H)'][n]) + (aryl ? ' — ARYL amine: lone pair delocalised into the ring, pKaH ≈ 4.6, far less basic' : ''); },
    invariants: [
      { id: 'pyr', title: 'Pyramidal sp³ nitrogen with ONE lone pair', detail: 'Bond angles ≈ 107° (drawn at the ammonia value, 106.7°). The lone pair is in an sp³ orbital pointing out of the pyramid: it is available, so every amine is a base and a nucleophile.', visuals: [{ type: 'lonePairs', id: 'N' }, { type: 'angle', center: 'N', a: 'R1', b: 'R2', text: '≈ 107°' }] },
      { id: 'base', links: [{ label: 'Basicity', href: '#glossary/basicity' }], title: 'Basic: pKaH ≈ 9–11', detail: 'Protonated at physiological pH and dissolves in dilute HCl as the ammonium salt (the extraction test). Alkyl amines are stronger bases than ammonia (9.25) because alkyl groups donate.', visuals: [{ type: 'lonePairs', id: 'N' }, { type: 'label', id: 'N', text: 'pKaH ≈ 10' }] },
      { id: 'nuc', title: 'Nucleophilic nitrogen', detail: 'Alkylation (SN2 on halides, over-alkylates), acylation (→ amides), addition to carbonyls (→ imines/enamines), reaction with HNO₂.', visuals: [{ type: 'atom', id: 'N' }] },
      { id: 'inv', title: 'Rapid pyramidal inversion', detail: 'The nitrogen flips through a planar transition state ~10¹¹ times per second (barrier ≈ 6 kcal/mol). So an amine with three different groups is NOT a resolvable stereocentre.', visuals: [{ type: 'atom', id: 'N' }, { type: 'plane', atoms: ['R1', 'R2', 'R3'] }] },
      { id: 'hb', title: 'Weaker H-bonds than alcohols', detail: 'N (EN 3.04) is less electronegative than O (3.44): boiling points sit between alkanes and alcohols (ethylamine 17 °C, ethanol 78 °C).', visuals: [{ type: 'charges', map: { N: 'δ−', R2: 'δ+', R3: 'δ+' } }] },
    ],
    varies: [
      { title: 'Degree (1°, 2°, 3°)', audience: 'both', detail: 'Changes the number of N–H bonds (H-bond donors), the IR pattern and the products with HNO₂ or acyl chlorides.' },
      { title: 'Aryl vs alkyl', audience: 'both', detail: 'Aniline is a million times less basic because the lone pair is delocalised into the ring.' },
      { title: 'Steric bulk', detail: 'Hünig′s base and 2,6-lutidine are bases but not nucleophiles: too crowded to attack carbon.' },
    ],
    identify: ['IR: N–H 3300–3500 cm⁻¹ (1°: two bands; 2°: one; 3°: none); N–H bend 1590–1650', '¹H NMR: N–H broad 0.5–5 ppm; α-H 2.2–3.0 ppm', '¹³C: α-carbon 30–50 ppm', 'Fishy smell; dissolves in dilute HCl; Hinsberg test distinguishes 1°/2°/3°'],
  },

  // ---------------------------------------------------------------- haloalkane
  haloalkane: {
    id: 'haloalkane', name: 'Alkyl halide', pattern: 'R–X', suffix: 'halo-', color: '#4ade80', family: 'halogen',
    core: { atoms: [{ id: 'X', el: '$X', lonePairs: 3 }], bonds: [] },
    variants: [
      { id: 'F', label: 'Fluoro (R–F)', el: 'F', note: 'C–F 115 kcal/mol, F⁻ is a poor leaving group' },
      { id: 'Cl', label: 'Chloro (R–Cl)', el: 'Cl', note: 'C–Cl 84 kcal/mol, Cl⁻ fair leaving group' },
      { id: 'Br', label: 'Bromo (R–Br)', el: 'Br', note: 'C–Br 72 kcal/mol, Br⁻ good leaving group' },
      { id: 'I', label: 'Iodo (R–I)', el: 'I', note: 'C–I 57 kcal/mol, I⁻ excellent leaving group' },
    ],
    defaultVariant: 'Br',
    attachments: [{ id: 'R1', atom: 'X', default: 'ethyl', label: 'R' }],
    fallbackNoun: 'halide',
    nameFor: (r, variant) => { const x = { F: 'fluoro', Cl: 'chloro', Br: 'bromo', I: 'iodo' }[variant]; const base = { H: `hydrogen ${x.replace(/o$/, 'ide')} (H–X, the parent acid)`, methyl: `${x}methane (methyl ${x.replace(/o$/, 'ide')})`, ethyl: `${x}ethane (ethyl ${x.replace(/o$/, 'ide')})`, isopropyl: `2-${x}propane (isopropyl ${x.replace(/o$/, 'ide')})`, tBu: `2-${x}-2-methylpropane (tert-butyl ${x.replace(/o$/, 'ide')})`, phenyl: `${x}benzene (an ARYL halide)`, benzyl: `benzyl ${x.replace(/o$/, 'ide')}`, vinyl: `vinyl ${x.replace(/o$/, 'ide')} (${x}ethene)`, allyl: `allyl ${x.replace(/o$/, 'ide')} (3-${x}propene)`, CF3: `${x}trifluoromethane` }; return base[r[0]]; },
    classify: ({ attach }) => degreeLabel(attach.R1, { aromatic: 'ARYL halide: no SN1, no SN2 (needs SNAr or metal catalysis)', sp2: 'VINYL halide: no SN1, no SN2 (sp² carbon, strong bond)', H: 'hydrogen halide (the acid H–X)' }),
    invariants: [
      { id: 'polar', links: [{ label: 'Watch SN2', href: '#mechanisms/sn2' }, { label: 'Electrophile', href: '#glossary/electrophile' }], title: 'Polar C–X bond: δ+ carbon = electrophile', detail: 'X is more electronegative than C (except I ≈ C), and X⁻ is a stable anion, so the α-carbon is attacked by nucleophiles. This bond is the business end of SN1, SN2, E1 and E2.', visuals: [{ type: 'bond', a: 'R1', b: 'X' }, { type: 'charges', map: { R1: 'δ+', X: 'δ−' } }, { type: 'dipole', from: 'R1', to: 'X' }] },
      { id: 'lp', title: 'Three lone pairs on the halogen', detail: 'They make X a (very weak) Lewis base and are what leave with X⁻. Halogens on carbon do not H-bond usefully or act as nucleophiles.', visuals: [{ type: 'lonePairs', id: 'X' }] },
      { id: 'lg', links: [{ label: 'Leaving group', href: '#glossary/leaving-group' }, { label: 'Watch SN1', href: '#mechanisms/sn1' }], title: 'X⁻ is a good leaving group: I > Br > Cl ≫ F', detail: 'Weaker base = better leaving group. C–X bond strength drops down the group (F 115, Cl 84, Br 72, I 57 kcal/mol) and the anion gets bigger and softer. Alkyl fluorides are nearly inert in substitution.', visuals: [{ type: 'atom', id: 'X' }] },
      { id: 'grignard', title: 'Mg or Li inserts to make R–MgX / R–Li (polarity reversal)', detail: 'The same carbon that was δ+ becomes δ− and a powerful nucleophile/base. Works for all alkyl, vinyl and aryl halides (not F).', visuals: [{ type: 'bond', a: 'R1', b: 'X' }] },
      { id: 'sub', links: [{ label: 'Reaction lab: SN2', href: '#mechanisms/sn2' }, { label: 'E2', href: '#mechanisms/e2' }, { label: 'Which mechanism?', href: '#glossary/substitution-vs-elimination' }], title: 'Substitution vs elimination is decided by structure + conditions', detail: 'Every alkyl halide can in principle do all four mechanisms; which one wins depends on the degree of the α-carbon, the nucleophile/base, solvent and temperature (see the Mechanisms tab).', visuals: [{ type: 'atom', id: 'R1' }] },
    ],
    varies: [
      { title: 'Degree of the α-carbon', audience: 'both', detail: 'Methyl/1° → SN2 (and E2 with bulky base); 2° → anything; 3° → SN1/E1 or E2, never SN2.' },
      { title: 'Which halogen', audience: 'both', detail: 'Rate order RI > RBr > RCl > RF for every mechanism.' },
      { title: 'Allylic / benzylic', detail: 'Faster in both SN1 (stabilised cation) and SN2 (π overlap in the TS).' },
      { title: 'Vinyl / aryl', detail: 'Do neither SN1 nor SN2: the C–X bond is shorter and stronger and backside attack is blocked.' },
    ],
    identify: ['¹H NMR: α-H at 3–4 ppm (Cl, Br), ~3.2 (I)', '¹³C: α-C 20–60 ppm; iodides upfield (heavy-atom effect)', 'Mass spec: M/M+2 = 3:1 for Cl, 1:1 for Br', 'AgNO₃/EtOH: precipitate fastest for 3° and iodides; Beilstein flame test green'],
  },

  // ---------------------------------------------------------------- alkene
  alkene: {
    id: 'alkene', name: 'Alkene', pattern: 'C=C', suffix: '-ene', color: '#34d399', family: 'hydrocarbon',
    core: { atoms: [{ id: 'C1', el: 'C', hyb: 'sp2' }, { id: 'C2', el: 'C', hyb: 'sp2' }], bonds: [bond('C1', 'C2', 2)] },
    attachments: [{ id: 'R1', atom: 'C1', default: 'methyl', label: 'R¹' }, { id: 'R2', atom: 'C1', default: 'H', label: 'R²' }, { id: 'R3', atom: 'C2', default: 'H', label: 'R³' }, { id: 'R4', atom: 'C2', default: 'H', label: 'R⁴' }],
    fallbackNoun: 'alkene',
    nameFor: (r) => { const k = r.join('|'); return { 'H|H|H|H': 'ethene (ethylene)', 'methyl|H|H|H': 'propene (propylene)', 'methyl|H|methyl|H': '(Z)-but-2-ene (cis)', 'methyl|H|H|methyl': '(E)-but-2-ene (trans)', 'methyl|methyl|H|H': '2-methylpropene (isobutylene)', 'ethyl|H|H|H': 'but-1-ene', 'phenyl|H|H|H': 'styrene', 'methyl|methyl|methyl|methyl': '2,3-dimethylbut-2-ene (tetrasubstituted)', 'methyl|methyl|methyl|H': '2-methylbut-2-ene', 'vinyl|H|H|H': 'buta-1,3-diene (conjugated)' }[k]; },
    classify: ({ R }) => { const n = ['R1', 'R2', 'R3', 'R4'].filter((k) => R[k] !== 'H').length; return ['unsubstituted (ethene)', 'monosubstituted', 'disubstituted', 'trisubstituted', 'tetrasubstituted (most stable)'][n] + ' alkene'; },
    invariants: [
      { id: 'pi', title: 'σ + π double bond, 1.34 Å', detail: 'Shorter and stronger than C–C (1.54 Å), but the π component (~65 kcal/mol) is weak and exposed above and below the plane: it is the reactive part.', visuals: [{ type: 'bond', a: 'C1', b: 'C2' }] },
      { id: 'planar', title: 'Both carbons sp², everything planar at 120°', detail: 'The two carbons and all four attached atoms lie in one plane. Bond angles ≈ 120°.', visuals: [{ type: 'plane', atoms: ['C1', 'C2', 'R1', 'R2', 'R3', 'R4'] }, { type: 'angle', center: 'C1', a: 'R1', b: 'R2', text: '≈ 120°' }] },
      { id: 'rot', links: [{ label: 'Made by E2', href: '#mechanisms/e2' }], title: 'No rotation about C=C → cis/trans (E/Z) isomers', detail: 'Rotating would break the π overlap (~65 kcal/mol), so two different groups on each carbon give separable geometric isomers. Single bonds rotate freely; double bonds do not.', visuals: [{ type: 'bond', a: 'C1', b: 'C2' }] },
      { id: 'nuc', links: [{ label: 'Nucleophile', href: '#glossary/nucleophile' }, { label: 'HOMO', href: '#glossary/homo' }], title: 'The π electrons are a nucleophile', detail: 'Electrophilic ADDITION is the alkene′s reaction: HX (Markovnikov, via the more stable carbocation), X₂ (anti, via bromonium), H₂O/H⁺, BH₃ then H₂O₂ (anti-Markovnikov, syn), H₂/Pd (syn), OsO₄/cold KMnO₄ (syn-diol), O₃ (cleavage).', visuals: [{ type: 'bond', a: 'C1', b: 'C2' }, { type: 'charges', map: { C1: 'δ−', C2: 'δ−' } }] },
      { id: 'test', title: 'Decolourises Br₂ (and cold KMnO₄)', detail: 'The red-brown colour disappears instantly: the standard test for unsaturation. Arenes do not do this without a catalyst.', visuals: [{ type: 'bond', a: 'C1', b: 'C2' }] },
    ],
    varies: [
      { title: 'Substitution pattern → stability', audience: 'both', detail: 'More alkyl groups on the C=C = more stable (hyperconjugation): tetra > tri > di > mono. Heats of hydrogenation measure it. Zaitsev′s rule follows from this.' },
      { title: 'E vs Z', audience: 'both', detail: 'Trans (E) is usually more stable than cis (Z) by ~1 kcal/mol (less steric clash).' },
      { title: 'Regiochemistry of addition', detail: 'Unsymmetrical alkenes give Markovnikov products because the more substituted carbocation forms.' },
      { title: 'Conjugation', detail: 'A second C=C or an aryl ring (styrene, dienes) stabilises and enables 1,4-addition and Diels–Alder.' },
    ],
    identify: ['¹H NMR: vinyl H 4.5–6.5 ppm; J ≈ 15 Hz trans, ≈ 10 Hz cis', '¹³C: 100–150 ppm', 'IR: C=C 1640–1680 cm⁻¹ (weak, absent if symmetric), =C–H 3020–3100 cm⁻¹, out-of-plane bends 650–1000', 'One degree of unsaturation each'],
  },

  // ---------------------------------------------------------------- alkyne
  alkyne: {
    id: 'alkyne', name: 'Alkyne', pattern: 'C≡C', suffix: '-yne', color: '#2dd4bf', family: 'hydrocarbon',
    core: { atoms: [{ id: 'C1', el: 'C', hyb: 'sp' }, { id: 'C2', el: 'C', hyb: 'sp' }], bonds: [bond('C1', 'C2', 3)] },
    attachments: [{ id: 'R1', atom: 'C1', default: 'methyl', label: 'R' }, { id: 'R2', atom: 'C2', default: 'H', label: 'R′' }],
    symmetric: true, fallbackNoun: 'alkyne',
    nameFor: (r) => ({ 'H|H': 'ethyne (acetylene)', 'H|methyl': 'propyne', 'methyl|methyl': 'but-2-yne (internal)', 'H|ethyl': 'but-1-yne', 'H|phenyl': 'phenylacetylene (ethynylbenzene)', 'H|tBu': '3,3-dimethylbut-1-yne', 'ethyl|methyl': 'pent-2-yne', 'phenyl|phenyl': 'diphenylacetylene' }[r.slice().sort().join('|')]),
    classify: ({ R }) => (R.R1 === 'H' || R.R2 === 'H' ? 'terminal alkyne (has the acidic ≡C–H, pKa ≈ 25)' : 'internal alkyne (no acidic H)'),
    invariants: [
      { id: 'triple', title: 'σ + 2π triple bond, 1.20 Å', detail: 'Two perpendicular π bonds form a cylinder of electron density around the C–C axis.', visuals: [{ type: 'bond', a: 'C1', b: 'C2' }] },
      { id: 'linear', title: 'sp carbons: linear, 180°', detail: 'The two attached atoms are collinear with the C≡C, so alkynes are rods. Small rings (< C₈) cannot contain a triple bond.', visuals: [{ type: 'angle', center: 'C1', a: 'R1', b: 'C2', text: '180°' }, { type: 'angle', center: 'C2', a: 'C1', b: 'R2', text: '180°' }] },
      { id: 'add', title: 'Electrophilic addition, twice', detail: 'HX adds Markovnikov (geminal dihalide with 2 equiv.); H₂O/Hg²⁺/H⁺ gives an enol that tautomerises to a KETONE (methyl ketone from terminal alkynes); hydroboration gives the aldehyde.', visuals: [{ type: 'bond', a: 'C1', b: 'C2' }] },
      { id: 'red', title: 'Selective reductions to either alkene', detail: 'H₂/Lindlar → cis (Z) alkene; Na/NH₃(l) → trans (E) alkene; H₂/Pd → alkane. The same bond, three different outcomes.', visuals: [{ type: 'bond', a: 'C1', b: 'C2' }] },
      { id: 'acid', title: 'A terminal ≡C–H is acidic (pKa ≈ 25)', detail: 'The C–H bond uses an sp orbital (50 % s-character), which holds the electrons close: 10²⁰ times more acidic than an alkane. NaNH₂ makes the acetylide R–C≡C⁻, a carbon nucleophile that forms C–C bonds by SN2 with 1° halides. (Internal alkynes have no such H: this is a "varies" item, but the reason is invariant.)', visuals: [{ type: 'atom', id: 'R2' }, { type: 'label', id: 'R2', text: 'pKa ≈ 25 if H' }] },
    ],
    varies: [
      { title: 'Terminal vs internal', audience: 'both', detail: 'Only terminal alkynes are deprotonated, give Ag⁺/Cu⁺ precipitates, or show the 3300 cm⁻¹ ≡C–H band.' },
      { title: 'Symmetry', audience: 'both', detail: 'Symmetric internal alkynes have no IR C≡C stretch (no dipole change).' },
    ],
    identify: ['IR: C≡C 2100–2260 cm⁻¹ (weak), ≡C–H 3300 cm⁻¹ sharp', '¹H NMR: ≡C–H 2–3 ppm (shielded by the π cylinder)', '¹³C: 65–90 ppm', 'Two degrees of unsaturation; decolourises Br₂ slowly'],
  },

  // ---------------------------------------------------------------- nitrile
  nitrile: {
    id: 'nitrile', name: 'Nitrile', pattern: 'R–C≡N', suffix: '-nitrile', color: '#818cf8', family: 'nitrogen',
    core: { atoms: [{ id: 'C', el: 'C', hyb: 'sp' }, { id: 'N', el: 'N', hyb: 'sp', lonePairs: 1 }], bonds: [bond('C', 'N', 3)] },
    attachments: [{ id: 'R1', atom: 'C', default: 'methyl', label: 'R' }],
    fallbackNoun: 'nitrile',
    nameFor: (r) => ({ H: 'hydrogen cyanide (HCN, the parent)', methyl: 'ethanenitrile (acetonitrile, MeCN)', ethyl: 'propanenitrile', isopropyl: '2-methylpropanenitrile', tBu: 'pivalonitrile', phenyl: 'benzonitrile', benzyl: 'phenylacetonitrile (benzyl cyanide)', vinyl: 'acrylonitrile', allyl: 'but-3-enenitrile', CF3: 'trifluoroacetonitrile' }[r[0]]),
    classify: ({ attach }) => (attach.R1.aromatic || attach.R1.sp2 ? 'conjugated nitrile' : 'alkyl nitrile'),
    invariants: [
      { id: 'triple', title: 'C≡N triple bond, linear, 1.16 Å', detail: 'Both C and N are sp, so R–C≡N is a straight line (180°).', visuals: [{ type: 'bond', a: 'C', b: 'N' }, { type: 'angle', center: 'C', a: 'R1', b: 'N', text: '180°' }] },
      { id: 'polar', title: 'Strongly polarised: δ+ carbon is electrophilic', detail: 'Grignards add (→ ketone after hydrolysis), LiAlH₄ reduces to a 1° amine (R–CH₂NH₂), and H₂O/H⁺ or HO⁻ hydrolyses via the amide to a carboxylic acid. Dipole ≈ 3.9 D.', visuals: [{ type: 'charges', map: { C: 'δ+', N: 'δ−' } }, { type: 'dipole', from: 'C', to: 'N' }] },
      { id: 'lp', title: 'N lone pair in an sp orbital: barely basic', detail: 'pKaH ≈ −10. Held tightly by the high s-character, it is a poor H-bond acceptor and not nucleophilic. (MeCN is a polar aprotic solvent for exactly this reason.)', visuals: [{ type: 'lonePairs', id: 'N' }] },
      { id: 'alpha', title: 'α-C–H is acidic (pKa ≈ 25)', detail: 'The carbanion is delocalised onto N (ketenimine resonance). Alkylation α to CN is a standard C–C bond-forming step.', visuals: [{ type: 'atom', id: 'R1' }] },
      { id: 'make', title: 'Made by SN2 with cyanide: adds one carbon', detail: 'R–Br + NaCN → R–CN. A one-carbon homologation that every synthesis course uses.', visuals: [{ type: 'bond', a: 'R1', b: 'C' }] },
    ],
    varies: [
      { title: 'Conjugation', detail: 'Aryl/vinyl R lowers the C≡N stretch to ~2220–2240 cm⁻¹ and allows conjugate addition (acrylonitrile).' },
      { title: 'α-Substitution', detail: 'Only nitriles with α-H can be deprotonated.' },
    ],
    identify: ['IR: sharp, medium C≡N 2210–2260 cm⁻¹ (unique region, with alkynes)', '¹³C: 115–120 ppm', 'No ¹H signal for the group itself; α-H ≈ 2–2.5 ppm', 'Hydrolysis to NH₃ (smell) with hot base'],
  },

  // ---------------------------------------------------------------- thiol
  thiol: {
    id: 'thiol', name: 'Thiol', pattern: 'R–SH', suffix: '-thiol', color: '#fde047', family: 'sulfur',
    core: { atoms: [{ id: 'S', el: 'S', lonePairs: 2 }, { id: 'H', el: 'H' }], bonds: [bond('S', 'H')] },
    attachments: [{ id: 'R1', atom: 'S', default: 'ethyl', label: 'R' }],
    fallbackNoun: 'thiol',
    nameFor: (r) => ({ H: 'hydrogen sulfide (H₂S, the parent)', methyl: 'methanethiol', ethyl: 'ethanethiol (the gas odorant)', isopropyl: 'propane-2-thiol', tBu: '2-methylpropane-2-thiol (tert-butyl mercaptan)', phenyl: 'thiophenol (benzenethiol, pKa 6.6)', benzyl: 'benzyl mercaptan', allyl: 'allyl mercaptan (garlic)', vinyl: 'ethenethiol', CF3: 'trifluoromethanethiol' }[r[0]]),
    classify: ({ attach }) => degreeLabel(attach.R1, { aromatic: 'aryl thiol (thiophenol): much more acidic', sp2: 'enethiol', H: 'hydrogen sulfide' }),
    invariants: [
      { id: 'sh', title: 'S–H on sp³ sulfur, C–S–H ≈ 96°', detail: 'Sulfur uses nearly pure p orbitals for bonding, so the angle is tighter than in alcohols. C–S is long (1.82 Å) and S–H is weak (87 kcal/mol vs 105 for O–H).', visuals: [{ type: 'bond', a: 'S', b: 'H' }, { type: 'angle', center: 'S', a: 'R1', b: 'H', text: '≈ 96°' }] },
      { id: 'weakhb', title: 'Barely any hydrogen bonding', detail: 'S (EN 2.58) ≈ C (2.55): the S–H bond is nearly nonpolar, so thiols boil far below alcohols (ethanethiol 35 °C vs ethanol 78 °C) and are poorly water-soluble.', visuals: [{ type: 'charges', map: { S: 'δ−', H: 'δ+' } }] },
      { id: 'acid', title: 'More acidic than alcohols: pKa ≈ 10–11', detail: 'The big, polarisable sulfur spreads out the negative charge of RS⁻. NaOH deprotonates thiols completely, unlike alcohols.', visuals: [{ type: 'label', id: 'H', text: 'pKa ≈ 10' }, { type: 'atom', id: 'H' }] },
      { id: 'nuc', title: 'Thiolate RS⁻ is an excellent, soft nucleophile', detail: 'Faster than alkoxides in SN2 despite being a weaker base (polarisable, weakly solvated). Also adds to Michael acceptors and carbonyls (thioacetals).', visuals: [{ type: 'lonePairs', id: 'S' }] },
      { id: 'ox', title: 'Oxidised to disulfides R–S–S–R (reversibly)', detail: 'Mild oxidants (I₂, air, H₂O₂) couple two thiols; reducing agents (DTT, Zn/H⁺) break them. Cysteine–cystine chemistry in proteins.', visuals: [{ type: 'atom', id: 'S' }] },
      { id: 'metal', title: 'Binds soft metals (Hg, Ag, Au, Cu)', detail: '"Mercaptan" = mercury-capturing. The basis of heavy-metal toxicity and of gold-surface self-assembled monolayers.', visuals: [{ type: 'lonePairs', id: 'S' }] },
    ],
    varies: [
      { title: 'Acidity', audience: 'both', detail: 'Thiophenol pKa 6.6; alkyl thiols 10–11.' },
      { title: 'Volatility and odour', detail: 'Small thiols are detectable at parts per billion (skunk, garlic, gas odorant).' },
    ],
    identify: ['IR: weak S–H 2550–2600 cm⁻¹ (a lonely region)', '¹H NMR: S–H 1–2 ppm (alkyl), couples to α-H unlike O–H', '¹³C: α-C 20–40 ppm', 'Unmistakable stench; lead acetate paper turns black'],
  },

  // ---------------------------------------------------------------- arene
  arene: (() => {
    const ring = benzeneTemplate('');
    return {
      id: 'arene', name: 'Arene (benzene ring)', pattern: 'Ar–R', suffix: '-benzene', color: '#a3e635', family: 'hydrocarbon',
      core: { atoms: ring.atoms, bonds: ring.bonds, rigid: ring.rigid },
      attachments: [{ id: 'R1', atom: 'C1', default: 'methyl', label: 'R' }],
      fallbackNoun: 'benzene',
      nameFor: (r) => ({ H: 'benzene', methyl: 'toluene (methylbenzene)', ethyl: 'ethylbenzene', isopropyl: 'cumene (isopropylbenzene)', tBu: 'tert-butylbenzene', phenyl: 'biphenyl', benzyl: 'diphenylmethane', vinyl: 'styrene', allyl: 'allylbenzene', CF3: 'benzotrifluoride (trifluoromethylbenzene)' }[r[0]]),
      classify: ({ R }) => ({ H: 'parent arene', methyl: 'alkyl arene: benzylic C–H oxidisable (KMnO₄ → benzoic acid); R is an o/p-directing activator', ethyl: 'alkyl arene: benzylic position reactive; o/p-director', isopropyl: 'alkyl arene (cumene): benzylic C–H → cumene hydroperoxide → phenol + acetone industrially', tBu: 'alkyl arene with NO benzylic H: not oxidised by KMnO₄; directs para (bulk)', phenyl: 'biaryl: conjugated rings, twisted ~45°', benzyl: 'diarylmethane: doubly benzylic CH₂ (very stabilised radical/cation/anion)', vinyl: 'styrene: conjugated, polymerises', allyl: 'allylbenzene: isomerises to the conjugated propenylbenzene', CF3: 'CF₃ is a strong deactivator and meta-director' }[R.R1]),
      invariants: [
        { id: 'planar', title: 'Planar hexagon, all C sp², 120°', detail: 'Six identical C–C bonds of 1.39 Å, between a single (1.54) and a double (1.34). No alternation: the Kekulé picture is two resonance forms of one structure.', visuals: [{ type: 'plane', atoms: ring.ring }, { type: 'bond', a: 'C1', b: 'C2' }, { type: 'bond', a: 'C2', b: 'C3' }] },
        { id: 'arom', links: [{ label: 'Aromaticity', href: '#glossary/aromaticity' }], title: 'Six delocalised π electrons (4n+2, Hückel) → aromatic', detail: 'A continuous ring of p orbitals above and below the plane. Resonance energy ≈ 36 kcal/mol: benzene releases far less heat on hydrogenation than three isolated C=C would.', visuals: ring.ring.map((id) => ({ type: 'atom', id })) },
        { id: 'subst', title: 'Reacts by electrophilic aromatic SUBSTITUTION, not addition', detail: 'Nitration (HNO₃/H₂SO₄), halogenation (Br₂/FeBr₃), Friedel–Crafts alkylation/acylation (AlCl₃), sulfonation. An electrophile breaks aromaticity for one step (arenium ion), then a proton is lost to restore it. Addition would cost the 36 kcal/mol.', visuals: [{ type: 'atom', id: 'C2' }, { type: 'atom', id: 'C4' }, { type: 'atom', id: 'C6' }] },
        { id: 'inert', title: 'Does NOT decolourise Br₂, resist KMnO₄ and H₂/Pd at room temperature', detail: 'The tests that work on alkenes fail on the ring itself: that is how you tell an arene from an alkene in the lab. (Side chains can still be oxidised.)', visuals: [{ type: 'bond', a: 'C3', b: 'C4' }] },
        { id: 'ringcurrent', title: 'Ring current: aromatic H at 6.5–8 ppm', detail: 'The circulating π electrons create a magnetic field that deshields the ring hydrogens. A diagnostic every NMR problem relies on.', visuals: [{ type: 'atom', id: 'H3' }, { type: 'atom', id: 'H4' }, { type: 'atom', id: 'H5' }] },
      ],
      varies: [
        { title: 'Substituent effects on EAS', audience: 'both', detail: 'Electron donors (OH, NH₂, OR, alkyl) activate and direct ortho/para; withdrawers (NO₂, C=O, CN, CF₃, SO₃H) deactivate and direct meta; halogens deactivate but direct o/p.' },
        { title: 'Benzylic reactivity', detail: 'A C–H on the carbon attached to the ring is oxidised (KMnO₄ → COOH), brominated by NBS, and forms stabilised cations/anions. tert-Butyl has none.' },
        { title: 'Fused rings', detail: 'Naphthalene, anthracene: still aromatic but less so per ring; more addition-like reactivity.' },
      ],
      identify: ['¹H NMR: 6.5–8.0 ppm; monosubstituted shows 5H multiplet', '¹³C: 110–160 ppm', 'IR: C=C ring stretches 1450–1600 cm⁻¹ (several), =C–H 3030 cm⁻¹, weak overtones 1660–2000', 'Four degrees of unsaturation; UV absorption ~255 nm'],
    };
  })(),

  // ---------------------------------------------------------------- nitro
  nitro: {
    id: 'nitro', name: 'Nitro', pattern: 'R–NO₂', suffix: 'nitro-', color: '#f472b6', family: 'nitrogen',
    core: {
      atoms: [{ id: 'N', el: 'N', hyb: 'sp2', charge: 1 }, sp2O('O1'), { id: 'O2', el: 'O', hyb: 'sp2', lonePairs: 3, charge: -1 }],
      bonds: [cbond('N', 'O1', 'nitro_NO', 2), cbond('N', 'O2', 'nitro_NO')],
    },
    attachments: [{ id: 'R1', atom: 'N', default: 'methyl', label: 'R' }],
    fallbackNoun: 'nitro compound',
    nameFor: (r) => ({ H: 'nitrous acid tautomer (H–NO₂)', methyl: 'nitromethane', ethyl: 'nitroethane', isopropyl: '2-nitropropane', tBu: '2-methyl-2-nitropropane', phenyl: 'nitrobenzene', benzyl: '(nitromethyl)benzene', vinyl: 'nitroethene', allyl: '3-nitropropene', CF3: 'trifluoronitromethane' }[r[0]]),
    classify: ({ attach }) => (attach.R1.aromatic ? 'nitroarene: strongly deactivated ring, meta-director, SNAr-activated' : 'nitroalkane: α-H acidic (pKa ≈ 10 for nitromethane)'),
    invariants: [
      { id: 'fc', links: [{ label: 'Formal charge', href: '#glossary/formal-charge' }], title: 'Formal charges: N is +1, one O is −1, overall neutral', detail: 'Nitrogen can only make four bonds, so one N–O must be a single bond to O⁻ while the other is N=O. This is the standard formal-charge exercise: N has 4 bonds and 0 lone pairs → +1.', visuals: [{ type: 'charges', map: { N: '+', O2: '−' } }, { type: 'atom', id: 'N' }] },
      { id: 'res', title: 'Two equivalent N–O bonds by resonance (1.22 Å)', detail: 'Swap which O carries the double bond and you get the second resonance form. The real molecule is the average: both N–O bonds identical, −½ charge on each O.', visuals: [{ type: 'bond', a: 'N', b: 'O1' }, { type: 'bond', a: 'N', b: 'O2' }, { type: 'plane', atoms: ['N', 'O1', 'O2', 'R1'] }] },
      { id: 'planar', title: 'Trigonal planar nitrogen, O–N–O ≈ 125°', detail: 'sp² N with the π system spread over O–N–O. No lone pair is left on N, so nitro compounds are not basic at all. Measured 125.3° in nitromethane: the two N–O domains are fatter than the N–C one. The model draws the ideal 120° (like carbonyl angles).', visuals: [{ type: 'angle', center: 'N', a: 'O1', b: 'O2', text: '≈ 125° (drawn 120°)' }] },
      { id: 'ewg', title: 'Powerful electron-withdrawing group (−I and −M)', detail: 'Acidifies α-C–H (nitromethane pKa 10.2, usable in Henry reactions), deactivates arenes ~10⁷-fold and directs meta, and activates aryl halides toward SNAr.', visuals: [{ type: 'charges', map: { R1: 'δ+' } }, { type: 'dipole', from: 'R1', to: 'N' }] },
      { id: 'red', title: 'Reduced to an amine (R–NH₂)', detail: 'Fe/HCl, Sn/HCl, SnCl₂, H₂/Pd or Zn all take NO₂ → NH₂. The standard route to anilines.', visuals: [{ type: 'atom', id: 'N' }] },
    ],
    varies: [
      { title: 'Alkyl vs aryl', audience: 'both', detail: 'Nitroalkanes are acidic at α-C and form nitronates; nitroarenes are EAS substrates and SNAr activators.' },
      { title: 'Number of nitro groups', detail: 'Each extra NO₂ raises oxygen balance and energy content (TNT).' },
    ],
    identify: ['IR: two strong bands, 1500–1560 cm⁻¹ (asymmetric) and 1345–1385 cm⁻¹ (symmetric)', '¹³C: α-carbon 70–80 ppm (nitroalkane)', '¹H NMR: α-H ≈ 4.3 ppm', 'Pale yellow colour for nitroarenes'],
  },
};

/** Describe the attachment carbon's degree for alcohols, halides, thiols. */
function degreeLabel(info, special = {}) {
  if (info.el === 'H') return special.H || 'parent (H)';
  if (info.aromatic) return special.aromatic || 'aryl';
  if (info.sp2) return special.sp2 || 'vinyl';
  return ['methyl (0°): least hindered', 'primary (1°)', 'secondary (2°)', 'tertiary (3°)'][Math.min(3, info.degree)] + (info.allylicBenzylic ? ' + allylic/benzylic (cation-stabilised)' : '');
}

export const FUNCTIONAL_GROUP_ORDER = ['alcohol', 'ether', 'aldehyde', 'ketone', 'carboxylicAcid', 'ester', 'amide', 'amine', 'haloalkane', 'alkene', 'alkyne', 'nitrile', 'thiol', 'arene', 'nitro'];

/** Visual spec types understood by the renderer, documented for the animation layer. */
export const VISUAL_TYPES = ['atom', 'bond', 'lonePairs', 'orbital', 'dipole', 'angle', 'plane', 'charges', 'label'];
