# References: electrochemistry (redox phase B)

* Standard potentials (`STANDARD_POTENTIALS` in `src/chem/references/textbook.js`, V vs SHE at 298 K): Atkins,
  *Physical Chemistry*, resource section (standard potentials at 298 K), the set the teaching texts reproduce;
  cross-checked against the CRC Handbook "Electrochemical series" values as compiled on the Wikipedia data page
  (read 2026-10-31). The compilations differ for three entries, which the cards say: Mg²⁺/Mg −2.36 (Atkins) vs
  −2.37 (CRC), Ni²⁺/Ni −0.23 vs −0.26, Br₂/Br⁻ +1.09 vs +1.07. The hydrogen electrode is 0 by convention. Twenty
  couples: the halogens, O₂/H₂O, both H₂O₂ couples, MnO₄⁻/Mn²⁺, Cr₂O₇²⁻/Cr³⁺, Fe³⁺/Fe²⁺, Ag, Cu, H, Pb, Ni, Fe, Zn,
  Al, Mg, Li. Each couple's half-reaction is the phase A balancer's and is checked against `HALF_REACTIONS`.
* The cell rule and the identities (`cell()` in `src/chem/electrochemistry.js`): the couple with the higher E° is
  the cathode; E°cell = E°(cathode) − E°(anode); ΔG° = −nFE°; ln K = nFE°/RT; E = E° − (RT/nF) ln Q (Atkins ch. 6;
  Housecroft & Sharpe 5e ch. 8). Constants F = 96 485.332 C/mol, R = 8.314 463 J/(K·mol), T = 298.15 K (CODATA 2018,
  `ELECTROCHEMICAL_CONSTANTS`). Q is built from the overall equation with activities = concentrations for solutes
  (the sliders), 10^−pH for H⁺ and 10^(pH−14) for OH⁻, 1 for solids, liquids, the solvent and gases at 1 bar: the
  ideal-solution teaching form, not activity coefficients.
* Textbook cells (`TEXTBOOK_CELLS`): the Daniell cell (1.10 V, K = 1.5 × 10³⁷, Atkins ch. 6), Cu/Ag (0.46 V), Zn/H₂
  (0.76 V), the hydrogen–oxygen fuel cell (1.23 V) (Zumdahl ch. 18), the peroxide disproportionation cell (1.08 V)
  and Fe²⁺/MnO₄⁻ (0.74 V) (Housecroft & Sharpe ch. 8); the module reproduces E°, n and the notation of each.
* Cell notation: anode on the left, phase boundaries as single bars, the salt bridge as a double bar, species of one
  phase separated by commas, an inert platinum electrode for ion / ion and gas couples with the gas written next to
  the platinum (IUPAC Green Book §2.13; Atkins ch. 6).
* The drawing: a schematic of two beakers, electrodes (the metal of a metal couple, platinum otherwise, bubbles for a
  gas), a KNO₃ salt bridge, the voltmeter reading E, electron flow from anode to cathode and ion flow through the
  bridge. Solution colours are not drawn; liquid junction potentials, overpotentials and resistance are ignored.
* What is deliberately absent: non-standard temperatures, activity coefficients, electrolysis and Faraday's laws,
  batteries with solid-phase couples (PbO₂/PbSO₄, MnO₂), biochemical E°′ values, and any kinetics (a positive E says
  a reaction is downhill, not that it is fast: aluminium's oxide skin, hydrogen overpotential).
