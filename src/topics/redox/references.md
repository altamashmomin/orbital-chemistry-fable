# References: redox (phase A: oxidation states and half-reactions)

* The oxidation-state rule (`OXIDATION_STATE_RULES` in `src/chem/references/textbook.js`, implemented by
  `oxidationStates()` in `src/chem/redox.js`): the ionic approximation of IUPAC Recommendations 2016, Karen,
  McArdle & Takats, *Pure Appl. Chem.* 88, 831: each bond's electrons go to the more electronegative atom, a bond
  between like atoms is split, and the oxidation state is the resulting charge. Implemented as formal charge +
  Σ (bond order × ±1). IUPAC uses Allen electronegativities; this app uses the Pauling values of its
  `ELECTRONEGATIVITY` table (CRC). The two scales rank every bond partner used here the same way; they differ
  for C–I (Allen puts carbon above iodine), and no iodine species appears. The electron-count form (valence −
  lone-pair electrons − bond electrons won) is computed alongside and the test asserts the two agree on every
  species, which also checks that each drawn Lewis structure (charges, lone pairs, bond orders) is consistent.
* Carbon oxidation levels (`OXIDATION_LEVELS`): Clayden, Greeves & Warren ch. 24 (oxidation levels: alkane <
  alcohol < aldehyde / ketone < acid < CO₂, two electrons a step); Klein ch. 12 (oxidation state of carbon from
  C–H and C–O bond counts). The assigner is checked against every row.
* Half-reactions (`HALF_REACTIONS`): the textbook forms in acid (and base where listed) with their electron
  counts: Atkins, resource section (standard potentials); Housecroft & Sharpe 5e ch. 8 (balancing in acid and
  base) and Appendix 11; Clayden ch. 23 (nitro reduction, Sn/HCl or H₂/Pd); Klein ch. 12 (alcohol oxidation).
  `balance()` is arithmetic on atom and charge counts (H₂O for O, H⁺ for H, e⁻ for charge; OH⁻ added to both
  sides in base) and must reproduce each listed string; `overall()` scales two half-reactions to a common
  electron count and adds them. The sweep checks element and charge balance of every equation and that the
  electron count equals the change in Σ oxidation states of the key element.
* Geometries: Functional-group species come from the builder (measured lone-pair angles and conjugated bond
  lengths as in the Functional groups tab). Explicit graphs use the element/order bond table except where
  `REDOX_BOND_LENGTHS` cites a measured row in `src/chem/references/measured.js`: H₂O₂ (O–O 1.475, O–H 0.95 Å,
  H–O–O 94.8°; Redington, Olson & Cross, *J. Chem. Phys.* 36, 1311 (1962), via CCCBDB; the H–O–O–H dihedral
  119.8° is not imposed, the relaxer's staggered placement is drawn), KMnO₄ (Mn–O 1.63 Å, Palenik, *Inorg. Chem.*
  6, 503 (1967), as quoted by Wikipedia; CRC gives 1.63 for the ion), K₂Cr₂O₇ (terminal Cr–O 1.63, bridging
  1.79 Å, Cr–O–Cr 124° and 128° in the two ions, drawn at the mean 126°; Brandon & Brown, *Can. J. Chem.* 46, 933
  (1968), abstract). O–Mn–O and O–Cr–O angles are the ideal 109.5°. Bare ions (Fe³⁺, Cu, Zn²⁺, Mn²⁺, Cr³⁺, H⁺,
  halides) are drawn as single atoms; the card says they are hydrated.
* What is deliberately absent: standard potentials, the direction of any redox reaction, cell diagrams and the
  Nernst equation (phase B of the roadmap row); rates and reagents (which oxidant does which step). The card says
  "which way" needs E°.
