// Invariant cards and glossary for the Electrochemistry topic. `show: { partner, conc, pH }` sets the partner couple and
// the Nernst inputs while the card is selected. Every potential quoted is a STANDARD_POTENTIALS entry; every ΔG°, K
// and E is one of the three identities applied to it.
export const INVARIANTS = {
  fluorine: [
    { id: 'top', title: 'The strongest oxidant on the ladder: +2.87 V', detail: 'F₂ + 2 e⁻ → 2 F⁻ sits at the top of the series. Paired with anything below it, fluorine is the cathode; only another halogen or an oxoanion comes close. No aqueous F₂ cell exists in practice (it oxidises water), which is why the value is derived, not measured in a beaker.', show: { partner: 'lithium' } },
  ],
  peroxideReduced: [
    { id: 'oxidant', title: 'H₂O₂ as an oxidant: +1.78 V', detail: 'H₂O₂ + 2 H⁺ + 2 e⁻ → 2 H₂O lies above permanganate. Paired with its own oxidation couple (O₂/H₂O₂, +0.70 V) the cell reads +1.08 V: the decomposition 2 H₂O₂ → 2 H₂O + O₂ is downhill, which is why peroxide bottles go flat.', show: { partner: 'peroxideOxidised' }, links: [{ label: 'Disproportionation', href: '#glossary/disproportionation' }] },
  ],
  permanganate: [
    { id: 'titrant', title: '+1.51 V in acid: the titrant that is its own indicator', detail: 'Against Fe³⁺/Fe²⁺ (+0.77 V) the cell is +0.74 V and five Fe²⁺ are oxidised per MnO₄⁻. The eight H⁺ in the half-reaction put the pH into Q: raise the pH and the Nernst potential falls by 8 × 0.0592 / 5 ≈ 0.095 V per unit.', show: { partner: 'iron' } },
    { id: 'ph', title: 'Why it is run in acid', detail: 'Set the pH slider to 7 and watch E drop: the permanganate couple consumes protons, so its potential is pH-dependent while Fe³⁺/Fe²⁺ is not. At high pH the product is MnO₂, a different couple not listed here.', show: { partner: 'iron', pH: 7 }, audience: 'learn' },
  ],
  chlorine: [
    { id: 'halogens', title: 'Cl₂ displaces Br⁻ and I⁻ but not F⁻', detail: 'Cl₂/Cl⁻ at +1.36 V lies above Br₂/Br⁻ (+1.09) and I₂/I⁻ (+0.54) and below F₂/F⁻ (+2.87). Bubble chlorine into bromide and the cell Br⁻ → Br₂ is +0.27 V downhill; into fluoride it is −1.51 V and nothing happens.', show: { partner: 'bromine' } },
  ],
  dichromate: [
    { id: 'breath', title: '+1.33 V: enough to take electrons from almost anything organic', detail: 'The dichromate couple needs 14 H⁺, so its potential falls by 14 × 0.0592 / 6 ≈ 0.14 V per pH unit; in acid it oxidises ethanol (the breathalyser), Fe²⁺ (+0.56 V cell) and I⁻. Paired with Fe³⁺/Fe²⁺ here.', show: { partner: 'iron' }, links: [{ label: 'The electrons, counted', href: '#redox/dichromate' }] },
  ],
  oxygen: [
    { id: 'fuel', title: 'The hydrogen–oxygen fuel cell: 1.23 V', detail: 'O₂ + 4 H⁺ + 4 e⁻ → 2 H₂O (+1.23 V) against H⁺/H₂ (0 V): E°cell = 1.23 V, n = 4, ΔG° = −475 kJ per mole of O₂, the free energy of burning two moles of hydrogen, delivered as electricity instead of heat.', show: { partner: 'hydrogen' } },
    { id: 'corrosion', title: 'Why iron rusts and zinc protects it', detail: 'Any metal below +1.23 V is oxidised by oxygen in acid: Fe²⁺/Fe (−0.44) gives a 1.67 V cell. Zinc (−0.76) is further down still, so a zinc coating or block is oxidised first and the iron stays reduced: sacrificial protection.', show: { partner: 'ironMetal' }, audience: 'learn' },
  ],
  bromine: [
    { id: 'middle', title: 'Br₂/Br⁻ at +1.09 V: between chlorine and iodine', detail: 'Bromine is made industrially by exactly this ladder: chlorine (+1.36) oxidises bromide in seawater, and the bromine formed can oxidise iodide (+0.54) in turn. Compilations differ here: Atkins gives +1.09, the CRC +1.07.', show: { partner: 'iodine' } },
  ],
  silver: [
    { id: 'coefficients', title: 'Doubling the half-reaction leaves E° alone', detail: 'Cu + 2 Ag⁺ → Cu²⁺ + 2 Ag needs two Ag⁺ + e⁻ → Ag per copper, yet E°cell is still 0.80 − 0.34 = 0.46 V. The potential is intensive; it is ΔG° = −nFE° = −89 kJ/mol that carries the n = 2.', show: { partner: 'copper' } },
  ],
  iron: [
    { id: 'inert', title: 'An ion / ion couple needs an inert electrode', detail: 'Fe³⁺ + e⁻ → Fe²⁺ has no metal to plate: both forms are dissolved, so the cell uses a platinum wire that only passes electrons. The notation writes both ions in one phase, Pt(s) | Fe²⁺(aq), Fe³⁺(aq).', show: { partner: 'hydrogen' }, links: [{ label: 'd⁵ and d⁶ in the Transition metals tab', href: '#transition-metals/feAqua' }] },
  ],
  peroxideOxidised: [
    { id: 'reductant', title: 'H₂O₂ as a reductant: +0.70 V', detail: 'Written as O₂ + 2 H⁺ + 2 e⁻ → H₂O₂ the couple lies below permanganate, dichromate and chlorine, so against those peroxide is the anode and gives up O₂. It is the oxidant only against couples below +0.70 V.', show: { partner: 'permanganate' } },
  ],
  iodine: [
    { id: 'low', title: 'The weakest halogen oxidant: +0.54 V', detail: 'I₂ + 2 e⁻ → 2 I⁻ is displaced by every other halogen and is itself reduced by thiosulfate: iodometry. Against H⁺/H₂ the cell is 0.54 V with iodine as the cathode.', show: { partner: 'hydrogen' } },
  ],
  copper: [
    { id: 'she', title: 'E° is measured against the standard hydrogen electrode', detail: 'Pt(s) | H₂(g) | H⁺(aq) || Cu²⁺(aq) | Cu(s) reads +0.34 V with copper as the cathode: by convention the SHE is 0 and that reading is E°(Cu²⁺/Cu). Every number on the ladder is a cell against hydrogen.', show: { partner: 'hydrogen' } },
    { id: 'daniell', title: 'The Daniell cell: 1.10 V', detail: 'Zn(s) | Zn²⁺(aq) || Cu²⁺(aq) | Cu(s): zinc (−0.76) dissolves at the anode, copper (+0.34) plates at the cathode, E° = 0.34 − (−0.76) = 1.10 V, n = 2, ΔG° = −212 kJ/mol, K = 1.5 × 10³⁷.', show: { partner: 'zinc' } },
  ],
  hydrogen: [
    { id: 'zero', title: 'Zero by convention', detail: '2 H⁺ + 2 e⁻ → H₂ at 1 bar and unit activity is assigned E° = 0 exactly; it is a reference, not a measurement. Everything above it is reduced by H₂, everything below it reduces H⁺ to H₂: the metals that fizz in acid are the ones with negative E°.', show: { partner: 'zinc' } },
    { id: 'ph', title: 'A hydrogen electrode is a pH meter', detail: 'E = 0 − 0.0592 × pH for the H⁺/H₂ couple at 1 bar: set the pH slider and the cell against copper rises by 59 mV per unit, because H⁺ is a product of H₂ + Cu²⁺ → 2 H⁺ + Cu. The glass electrode exploits the same dependence.', show: { partner: 'copper', pH: 4 }, audience: 'learn' },
  ],
  lead: [
    { id: 'below', title: 'Just below hydrogen: −0.13 V', detail: 'Pb²⁺ + 2 e⁻ → Pb. Lead dissolves in acid only slowly, consistent with the small negative value; the lead–acid battery pairs this couple (as PbSO₄/Pb) with PbO₂, not listed here.', show: { partner: 'hydrogen' } },
  ],
  nickel: [
    { id: 'plating', title: '−0.23 V: plated from solution by zinc, not by copper', detail: 'Ni²⁺/Ni lies between zinc and hydrogen. A zinc strip in Ni²⁺ gives a +0.53 V cell and nickel plates out; a copper strip gives −0.57 V and nothing happens. Compilations give −0.23 (Atkins) or −0.26 V (CRC).', show: { partner: 'zinc' } },
  ],
  ironMetal: [
    { id: 'rust', title: 'Fe²⁺/Fe at −0.44 V: iron is oxidised by air', detail: 'Against O₂/H₂O the cell is 1.67 V: rusting is strongly downhill. Against Zn²⁺/Zn (−0.76) iron is the cathode, which is the whole idea of galvanising.', show: { partner: 'oxygen' }, links: [{ label: 'Zinc protects iron', href: '#electrochemistry/oxygen/corrosion' }] },
  ],
  zinc: [
    { id: 'anode', title: 'The textbook anode: −0.76 V', detail: 'Zn → Zn²⁺ + 2 e⁻ runs against copper (Daniell, 1.10 V), against hydrogen (0.76 V), against silver (1.56 V): zinc is the anode in every one because it is lower on the ladder than all of them.', show: { partner: 'copper' } },
    { id: 'nernst', title: 'Dilute the Cu²⁺ and the Daniell voltage drops', detail: 'E = E° − (0.0592 / 2) log([Zn²⁺]/[Cu²⁺]). With [Cu²⁺] = 0.010 M and [Zn²⁺] = 1 M, Q = 100 and E = 1.10 − 0.059 = 1.04 V. The cell runs until Q reaches K = 1.5 × 10³⁷, when E = 0.', show: { partner: 'copper', conc: { copper2: 0.01 } }, audience: 'learn' },
  ],
  aluminium: [
    { id: 'three', title: '−1.66 V and three electrons per atom', detail: 'Al³⁺ + 3 e⁻ → Al: against copper the cell is 2.00 V with n = 6 in the overall equation 2 Al + 3 Cu²⁺ → 2 Al³⁺ + 3 Cu. The oxide skin, not the potential, is what keeps aluminium pans intact.', show: { partner: 'copper' } },
  ],
  magnesium: [
    { id: 'sacrificial', title: '−2.36 V: the sacrificial anode', detail: 'Magnesium blocks bolted to a steel hull or pipeline corrode instead of the iron: Mg²⁺/Mg lies 1.9 V below Fe²⁺/Fe, so magnesium is the anode of that cell as long as any remains.', show: { partner: 'ironMetal' } },
  ],
  lithium: [
    { id: 'bottom', title: 'The bottom of the ladder: −3.04 V', detail: 'Li⁺ + e⁻ → Li is the most negative entry, which makes lithium the strongest reductant and the anode of choice: against F₂ the (hypothetical) cell would read 5.91 V, the full span of the series. Real lithium cells use non-aqueous electrolytes because lithium reduces water (the H⁺/H₂ cell is 3.04 V).', show: { partner: 'hydrogen' } },
  ],
};

export const GLOSSARY_TERMS = [
  { id: 'standard-potential', term: 'Standard potential (E°)', definition: 'The potential of a half-cell, written as a reduction, measured against the standard hydrogen electrode (E° = 0 by convention) with every species at unit activity (1 M, 1 bar) at 298 K. Tabulated; a more positive E° means a stronger oxidant.', why: 'E°cell = E°(cathode) − E°(anode): the couple higher on the ladder is reduced. Multiplying a half-reaction by a number does not change its E°.', links: [{ label: 'The ladder', href: '#electrochemistry/copper/she' }, { label: 'Doubling leaves E° alone', href: '#electrochemistry/silver/coefficients' }] },
  { id: 'galvanic-cell', term: 'Galvanic cell, anode and cathode', definition: 'Two half-cells joined by a wire and a salt bridge. Oxidation happens at the anode (negative terminal of a galvanic cell), reduction at the cathode (positive); electrons flow through the wire from anode to cathode, anions through the bridge towards the anode and cations towards the cathode.', why: 'The couple with the higher E° is the cathode; the voltmeter reads E°(cathode) − E°(anode) when everything is standard.', links: [{ label: 'The Daniell cell', href: '#electrochemistry/copper/daniell' }] },
  { id: 'cell-notation', term: 'Cell notation', definition: 'Anode on the left, cathode on the right, a single bar for each phase boundary, a double bar for the salt bridge, commas between species in the same phase: Zn(s) | Zn²⁺(aq) || Cu²⁺(aq) | Cu(s). Ion / ion and gas couples sit on an inert platinum electrode: Pt(s) | H₂(g) | H⁺(aq).', links: [{ label: 'An inert electrode', href: '#electrochemistry/iron/inert' }] },
  { id: 'nernst-equation', term: 'Nernst equation', definition: 'E = E° − (RT/nF) ln Q = E° − (0.0592 V / n) log Q at 298 K, with Q the reaction quotient of the overall cell reaction (concentrations for solutes, pressures in bar for gases, 1 for solids, liquids and the solvent). E = 0 when Q = K.', why: 'ΔG = −nFE: a cell with a positive E runs forward; diluting a product or concentrating a reactant raises E; a couple that consumes H⁺ depends on pH.', links: [{ label: 'Dilute the Daniell cell', href: '#electrochemistry/zinc/nernst' }, { label: 'A pH meter', href: '#electrochemistry/hydrogen/ph' }] },
  { id: 'electrochemical-series', term: 'Electrochemical (activity) series', definition: 'The couples ordered by E°: Li, Mg, Al, Zn, Fe, Ni, Pb below hydrogen; Cu, Ag, the halogens and the oxoanions above it. A metal displaces from solution any metal above it on the list, and any metal below hydrogen is oxidised by acid.', links: [{ label: 'Nickel from zinc, not copper', href: '#electrochemistry/nickel/plating' }] },
];
