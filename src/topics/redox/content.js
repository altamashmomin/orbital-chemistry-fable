// Invariant cards and glossary for the Redox topic. `show: { side, index, medium, partner }` sets the shown species,
// the medium of the half-reaction and the partner couple while the card is selected. Every number quoted is read
// off a Lewis structure by the rule in OXIDATION_STATE_RULES or is a count in a balanced equation.
export const INVARIANTS = {
  methane: [
    { id: 'rule', title: 'Carbon at −4: every bond to hydrogen counts −1', detail: 'In the ionic approximation each C–H bond gives its two electrons to carbon (2.55 against 2.20 on the Pauling scale), so methane\'s carbon is −4 and each hydrogen +1. No bond is broken to decide this: it is bookkeeping on the Lewis structure.', show: { side: 'from' } },
    { id: 'step', title: 'Methane to methanol is a two-electron step', detail: 'One C–H bond becomes a C–O bond: carbon goes from −4 to −2 and two electrons leave the molecule. Every rung of the carbon ladder is worth two electrons.', show: { side: 'to' }, links: [{ label: 'Oxidation level', href: '#glossary/oxidation-level' }] },
  ],
  methanol: [
    { id: 'aldehyde', title: 'An alcohol loses two hydrogens to become a carbonyl', detail: 'Methanol (C −2) to formaldehyde (C 0): one C–H and the O–H go, the C=O forms. The carbon climbs two steps because the double bond to oxygen counts twice.', show: { side: 'to' } },
    { id: 'base', title: 'Balanced in base the same electrons appear', detail: 'In acid: CH₃OH → H₂CO + 2 H⁺ + 2 e⁻. Add two hydroxides to each side, make water, and the base form reads CH₃OH + 2 OH⁻ → H₂CO + 2 H₂O + 2 e⁻. The medium changes the spectators, never the electron count.', show: { medium: 'base' }, audience: 'learn' },
  ],
  formaldehyde: [
    { id: 'acid', title: 'Aldehyde to acid: the oxygen comes from water', detail: 'H₂CO + H₂O → HCOOH + 2 H⁺ + 2 e⁻. The C–H of the aldehyde becomes a C–OH, carbon 0 to +2. This is why aldehydes give a silver mirror and ketones, with no C–H on the carbonyl carbon, do not.', show: { side: 'to' }, links: [{ label: 'Aldehyde: the one H on the carbonyl', href: '#functional-groups/aldehyde/h' }] },
  ],
  formicAcid: [
    { id: 'co2', title: 'Formic acid to CO₂: the top of the ladder', detail: 'HCOOH → CO₂ + 2 H⁺ + 2 e⁻ takes carbon from +2 to +4. Four bonds to oxygen is the most oxidised a carbon can be: CO₂ is the end product of every combustion and of respiration.', show: { side: 'to' } },
  ],
  ethanol: [
    { id: 'ladder', title: 'Only the carbinol carbon changes', detail: 'Ethanol\'s CH₂OH carbon is −1 (two H, one O) and becomes +1 in acetaldehyde (one H, a double bond to O). The methyl carbon stays at −3 throughout: oxidation state is a property of each atom, and the sum over the molecule is what the electrons track.', show: { side: 'to' } },
    { id: 'breath', title: 'Dichromate oxidises it: the breathalyser', detail: 'Pair the oxidation with the dichromate reduction and the electrons match 3 : 1: 3 CH₃CH₂OH + Cr₂O₇²⁻ + 8 H⁺ → 3 CH₃CHO + 2 Cr³⁺ + 7 H₂O, orange to green. The overall equation is the two half-reactions scaled to the same electron count.', show: { partner: 'dichromate' }, links: [{ label: 'Dichromate', href: '#redox/dichromate' }] },
  ],
  acetaldehyde: [
    { id: 'acid', title: 'Acetaldehyde to acetic acid: +1 to +3', detail: 'The carbonyl carbon gains a bond to oxygen (from water) and loses its hydrogen: two more electrons. Vinegar from wine is this step, done by Acetobacter with O₂ as the partner.', show: { side: 'to', partner: 'oxygen' } },
  ],
  propan2ol: [
    { id: 'ketone', title: 'A secondary alcohol stops at the ketone', detail: 'Propan-2-ol\'s central carbon is 0 (one H, one O, two C) and becomes +2 in acetone. With no C–H left on the carbonyl carbon the ketone cannot climb further without breaking a C–C bond.', show: { side: 'to' } },
    { id: 'tertiary', title: 'A tertiary alcohol has no α-H to lose', detail: 'tert-Butanol\'s carbinol carbon carries three carbons and one oxygen: no hydrogen to remove, so no two-electron step exists. The rule "oxidisable only with an α-H" of the Functional groups tab is this count.', links: [{ label: 'Alcohol: oxidisable only with an α-H', href: '#functional-groups/alcohol/ox' }], audience: 'learn' },
  ],
  hydrogenation: [
    { id: 'reduction', title: 'Adding H₂ is a reduction of carbon', detail: 'Both carbons go from −2 in ethene to −3 in ethane: two electrons gained. As a half-reaction, C₂H₄ + 2 H⁺ + 2 e⁻ → C₂H₆; the electrons and protons come from H₂, whose hydrogens go from 0 to +1.', show: { side: 'to', partner: 'hydrogen' } },
    { id: 'hydride', title: 'Hydride reagents do the same bookkeeping', detail: 'NaBH₄ or LiAlH₄ reducing a carbonyl adds H⁻ to carbon: the carbon\'s oxidation state falls by two, exactly as here. "Reduction = gain of hydrogen" is a special case of "reduction = gain of electrons".', audience: 'learn' },
  ],
  nitrobenzene: [
    { id: 'six', title: 'Nitro to amine is a six-electron reduction', detail: 'Nitrogen goes from +3 in the nitro group (two bonds to oxygen counting +3 with the formal charge, one to carbon) to −3 in aniline (two bonds to hydrogen, one to carbon). Six electrons and six protons: C₆H₅NO₂ + 6 H⁺ + 6 e⁻ → C₆H₅NH₂ + 2 H₂O.', show: { side: 'to' } },
    { id: 'formal', title: 'Formal charge and oxidation state are different counts', detail: 'The nitro nitrogen carries a formal charge of +1 (electrons shared evenly) but an oxidation state of +3 (every bond given to the more electronegative atom). The ring carbons never change: the rule applies atom by atom.', show: { side: 'from' }, links: [{ label: 'Formal charge', href: '#glossary/formal-charge' }], audience: 'learn' },
  ],
  thiol: [
    { id: 'disulfide', title: 'Two thiols lose two electrons to make one S–S bond', detail: 'Each sulfur goes from −2 (one bond to H, one to C) to −1 (one to C, one to the other S, which counts 0). Two sulfurs, one electron each: 2 RSH → RSSR + 2 H⁺ + 2 e⁻. Cysteine pairs in proteins form this way.', show: { side: 'to' } },
  ],
  substitution: [
    { id: 'none', title: 'Substitution moves no electrons', detail: 'The carbon loses a bond to bromine (+1) and gains one to oxygen (+1): −1 before and after. The balanced equation CH₃CH₂Br + H₂O → CH₃CH₂OH + Br⁻ + H⁺ has no e⁻ term. Nucleophilic substitution is never a redox reaction, however the leaving group and nucleophile are charged.', show: { side: 'to' } },
  ],
  elimination: [
    { id: 'internal', title: 'Elimination: one carbon up, one down, net zero', detail: 'The CH₂Br carbon goes from −1 to −2 and the CH₃ carbon from −3 to −2: the total over both carbons stays −4 and no electrons leave. Textbooks call this "neither oxidation nor reduction" on the molecule, though each carbon changed.', show: { side: 'to' } },
  ],
  hydration: [
    { id: 'none', title: 'Adding water across C=C is not redox', detail: 'One carbon gains H (−2 to −3), the other gains OH (−2 to −1): the sum is unchanged and the equation C₂H₄ + H₂O → CH₃CH₂OH needs no electrons. Adding H₂ instead would be a reduction (both carbons down).', show: { side: 'to' }, links: [{ label: 'Hydrogenation', href: '#redox/hydrogenation' }] },
  ],
  permanganate: [
    { id: 'seven', title: 'Manganese at +7: four oxygens take everything', detail: 'Each of the four Mn–O bonds gives its electrons to oxygen (double bonds count twice), so manganese reaches +7, the group number: no d electrons are left and the ion is intensely coloured by charge transfer, not by d–d bands.', show: { side: 'from' } },
    { id: 'five', title: 'To Mn²⁺ in acid: five electrons and eight protons', detail: 'MnO₄⁻ + 8 H⁺ + 5 e⁻ → Mn²⁺ + 4 H₂O. The eight protons turn the four oxide ions into water; the five electrons are +7 → +2. In base permanganate usually stops at MnO₂ (+4), a different couple.', show: { side: 'to', medium: 'acid' } },
  ],
  dichromate: [
    { id: 'six', title: 'Two chromiums at +6 become two at +3: six electrons', detail: 'Cr₂O₇²⁻ + 14 H⁺ + 6 e⁻ → 2 Cr³⁺ + 7 H₂O. Seven oxide ions need fourteen protons; each chromium drops three. The 3 : 1 ratio with a two-electron alcohol oxidation follows from 6 = 3 × 2.', show: { side: 'to', partner: 'ethanol' } },
    { id: 'shape', title: 'Two tetrahedra sharing a corner', detail: 'The frame draws the measured K₂Cr₂O₇ geometry: terminal Cr–O 1.63 Å, bridging 1.79 Å and a Cr–O–Cr angle of 126° (the mean of the two ions in the crystal); the O–Cr–O angles are the ideal 109.5°.', show: { side: 'from' }, audience: 'learn' },
  ],
  iron: [
    { id: 'one', title: 'One electron, d⁵ to d⁶', detail: 'Fe³⁺ + e⁻ → Fe²⁺: the simplest half-reaction, no oxygen or hydrogen to balance. In water both are hexaaqua ions, and the Transition metals tab counts the same oxidation state as the d count 8 − 3 = 5 and 8 − 2 = 6.', links: [{ label: '[Fe(H₂O)₆]²⁺', href: '#transition-metals/feAqua' }, { label: 'd-electron count', href: '#glossary/d-electron-count' }] },
  ],
  copper: [
    { id: 'plate', title: 'Cu²⁺ to the metal: two electrons', detail: 'Cu²⁺ + 2 e⁻ → Cu. A metal in its element is at 0 by definition; the ion\'s charge is its oxidation state. Pair it with zinc and the overall equation is the Daniell cell: Zn + Cu²⁺ → Zn²⁺ + Cu.', show: { partner: 'zinc' } },
  ],
  zinc: [
    { id: 'anode', title: 'Zinc dissolves as Zn²⁺: an oxidation', detail: 'Zn → Zn²⁺ + 2 e⁻. Which metal dissolves and which plates out is decided by E°, which this phase of the topic does not tabulate: here you can only balance the equation, not predict its direction.', show: { partner: 'copper' } },
  ],
  hydrogen: [
    { id: 'reference', title: 'The reference couple', detail: '2 H⁺ + 2 e⁻ → H₂: hydrogen goes from +1 to 0. In base the same couple is written 2 H₂O + 2 e⁻ → H₂ + 2 OH⁻. Standard potentials are all measured against this half-reaction (phase B).', show: { medium: 'base' } },
  ],
  oxygen: [
    { id: 'four', title: 'O₂ to water: four electrons', detail: 'O₂ + 4 H⁺ + 4 e⁻ → 2 H₂O. Oxygen goes from 0 in the element to −2 in water, two electrons per atom. Combustion and respiration pay for everything with this couple; pair it with the acetaldehyde oxidation for vinegar.', show: { partner: 'acetaldehyde' } },
  ],
  peroxideReduced: [
    { id: 'minus1', title: 'Peroxide oxygen sits at −1', detail: 'In H₂O₂ each oxygen has one bond to H (−1) and one to the other oxygen (0): −1, halfway between O₂ (0) and water (−2). Reduced to water it gains one electron per oxygen: H₂O₂ + 2 H⁺ + 2 e⁻ → 2 H₂O.', show: { side: 'from' } },
    { id: 'geometry', title: 'A skewed molecule', detail: 'The frame uses the measured gas-phase H₂O₂: O–O 1.475 Å, O–H 0.95 Å, H–O–O 94.8°. The measured H–O–O–H dihedral is 119.8°; the relaxer places the hydrogens staggered, so the drawn dihedral is a convention.', audience: 'learn' },
  ],
  peroxideOxidised: [
    { id: 'dispro', title: 'The same molecule can lose electrons instead', detail: 'H₂O₂ → O₂ + 2 H⁺ + 2 e⁻ takes oxygen from −1 to 0. Pair this couple with its own reduction and the overall equation is 2 H₂O₂ → 2 H₂O + O₂: disproportionation, which is why peroxide bottles slowly go flat.', show: { partner: 'peroxideReduced' }, links: [{ label: 'Disproportionation', href: '#glossary/disproportionation' }] },
  ],
  fluorine: [
    { id: 'two', title: 'The most electronegative element takes two electrons', detail: 'F₂ + 2 e⁻ → 2 F⁻: fluorine at 0 to −1. Fluorine is never positive in any compound, because nothing is more electronegative; its only redox chemistry is this reduction.' },
  ],
  bromine: [
    { id: 'two', title: 'Br₂ to bromide: the same count as chlorine', detail: 'Br₂ + 2 e⁻ → 2 Br⁻. The halogens all take one electron per atom; what differs down the group is how strongly, which is E°, not the count (Electrochemistry tab).' , links: [{ label: 'Bromide from the SN2 reaction', href: '#redox/substitution' }] },
  ],
  iodine: [
    { id: 'two', title: 'I₂ to iodide: two electrons, no acid or base needed', detail: 'I₂ + 2 e⁻ → 2 I⁻. Iodine–iodide is the couple of iodometric titrations: the starch–iodine colour marks where the last I₂ has been reduced.' },
  ],
  silver: [
    { id: 'one', title: 'One electron plates one silver atom', detail: 'Ag⁺ + e⁻ → Ag. Compared with Cu²⁺ + 2 e⁻ → Cu, twice as many silver ions are needed per copper atom in the overall equation: 2 Ag⁺ + Cu → 2 Ag + Cu²⁺.' , show: { partner: 'copper' } },
  ],
  lead: [
    { id: 'two', title: 'Pb(II) to the metal: two electrons', detail: 'Pb²⁺ + 2 e⁻ → Pb. Lead sits just below hydrogen in the series; the lead–acid battery uses this couple on one plate and Pb(IV) on the other (not listed here).' },
  ],
  nickel: [
    { id: 'two', title: 'Ni(II) to nickel: d⁸ gains two', detail: 'Ni²⁺ + 2 e⁻ → Ni. The ion in water is the green [Ni(H₂O)₆]²⁺ of the Transition metals tab; the metal is at 0 by definition.' },
  ],
  ironMetal: [
    { id: 'two', title: 'Fe(II) to iron: the second iron couple', detail: 'Fe²⁺ + 2 e⁻ → Fe. Iron has two couples on the ladder, Fe³⁺/Fe²⁺ (one electron) and Fe²⁺/Fe (two); rusting runs the second one backwards with O₂ as the partner.' , links: [{ label: 'Fe(III) to Fe(II)', href: '#redox/iron' }], show: { partner: 'oxygen' } },
  ],
  aluminium: [
    { id: 'three', title: 'Al(III) to aluminium: three electrons per atom', detail: 'Al³⁺ + 3 e⁻ → Al. Three electrons per atom is why aluminium smelting costs so much electricity: the Hall–Héroult cell pays 3 F per mole of metal.' },
  ],
  magnesium: [
    { id: 'two', title: 'Mg(II) to magnesium', detail: 'Mg²⁺ + 2 e⁻ → Mg. Run backwards, Mg → Mg²⁺ + 2 e⁻ is why magnesium ribbon burns and why it is sacrificed to protect steel hulls (Electrochemistry tab).' },
  ],
  lithium: [
    { id: 'one', title: 'Li(I) to lithium: one electron, the bottom of the ladder', detail: 'Li⁺ + e⁻ → Li. One electron per atom and the lightest metal: the reason lithium stores the most charge per gram of any anode.' },
  ],
  chlorine: [
    { id: 'two', title: 'Cl₂ to chloride: two electrons, nothing else to balance', detail: 'Cl₂ + 2 e⁻ → 2 Cl⁻. A halogen molecule is at 0; the halide is −1. No oxygen or hydrogen is involved, so acid and base read the same.' },
  ],
};

export const GLOSSARY_TERMS = [
  { id: 'oxidation-state', term: 'Oxidation state', definition: 'The charge an atom would carry if every bond were ionic: each bond\'s electrons are given to the more electronegative partner (a bond between like atoms is split). Equivalent to the formal charge plus +1 for every bond to a more electronegative atom and −1 for every bond to a less electronegative one.', why: 'It is the number that tells you whether a reaction moved electrons and how many: Σ oxidation states of the changing atoms before and after equals the electron count of the balanced half-reaction.', links: [{ label: 'Methane at −4', href: '#redox/methane/rule' }, { label: 'Oxidation level', href: '#glossary/oxidation-level' }, { label: 'Formal charge', href: '#glossary/formal-charge' }] },
  { id: 'half-reaction', term: 'Half-reaction', definition: 'One side of a redox reaction written with its electrons shown: an oxidation (electrons on the right) or a reduction (electrons on the left). In water it is balanced with H₂O for oxygen, H⁺ for hydrogen and e⁻ for charge; in base, OH⁻ is added to both sides to remove the H⁺.', why: 'Two half-reactions scaled to the same electron count add to the overall equation; this is the only reliable way to balance MnO₄⁻ or Cr₂O₇²⁻ reactions.', links: [{ label: 'Permanganate', href: '#redox/permanganate/five' }, { label: 'Dichromate and ethanol', href: '#redox/ethanol/breath' }] },
  { id: 'redox', term: 'Oxidation and reduction (redox)', definition: 'Oxidation is loss of electrons (the oxidation state rises); reduction is gain (it falls). For carbon this reads as losing H or gaining O (oxidation) and the reverse (reduction). A reaction in which no atom changes oxidation state is not redox, whatever bonds it makes or breaks.', why: 'SN2, E2 and hydration keep the carbon total fixed; alcohol → aldehyde → acid climbs two electrons a step; adding H₂ is a reduction.', links: [{ label: 'SN2 is not redox', href: '#redox/substitution' }, { label: 'The carbon ladder', href: '#redox/ethanol' }] },
  { id: 'oxidising-agent', term: 'Oxidising and reducing agents', definition: 'The oxidising agent takes the electrons and is itself reduced (MnO₄⁻, Cr₂O₇²⁻, O₂, Cl₂); the reducing agent gives them and is oxidised (Zn, H₂, a thiol, an alcohol towards dichromate).', why: 'Naming the agents is the first step in pairing half-reactions. Which pair actually reacts, and how far, needs E°, the deferred phase of this topic.', links: [{ label: 'Permanganate', href: '#redox/permanganate' }, { label: 'Zinc', href: '#redox/zinc' }] },
  { id: 'disproportionation', term: 'Disproportionation', definition: 'One species is both oxidised and reduced: an atom at an intermediate oxidation state goes up in one molecule and down in another. 2 H₂O₂ → 2 H₂O + O₂ (O at −1 to −2 and 0).', links: [{ label: 'Hydrogen peroxide', href: '#redox/peroxideOxidised/dispro' }] },
];
