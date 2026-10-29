# References: conformations

* Ethane and butane conformational analysis, Newman projections, the vocabulary staggered / eclipsed /
  anti / gauche, torsional vs steric strain: Clayden, Greeves & Warren, *Organic Chemistry* 2e, ch. 16;
  Klein, *Organic Chemistry* 4e, ch. 4; Eliel & Wilen, *Stereochemistry of Organic Compounds*, ch. 10.
* Energies (`TORSION_ENERGIES` in `src/chem/references/textbook.js`, kJ/mol above the lowest conformer):
  ethane barrier 12 kJ/mol (2.9 kcal/mol, the measured value); butane gauche 3.8, CH₃/H-eclipsed 16,
  CH₃/CH₃-eclipsed ≈ 20 (Klein: 19). These are the textbook teaching values; the curve drawn between
  them is a three-term cosine fit through those points, labelled illustrative in the UI, not a computed
  potential-energy surface.
* Geometry: the rotors are the embedder's own ethane, butane and 2-bromobutane (tetrahedral carbons,
  CRC bond lengths); turning the bond rotates one side rigidly, so bond lengths and angles are the
  model's at every dihedral. Real molecules relax a little along the way (bond angles open slightly in
  the eclipsed forms); the model does not.
* E2 anti-periplanar requirement and its stereochemical consequence: Clayden, Greeves & Warren ch. 17;
  Klein ch. 7. The "alignment" bar is |cos φ| of the Br–C–C–H dihedral, a teaching cartoon of the
  σ(C–H) / σ*(C–Br) overlap, not an overlap integral.
* Cyclohexane chair, ring flip, axial/equatorial, 1,3-diaxial interactions and A-values: Clayden,
  Greeves & Warren ch. 16; Klein ch. 4; Eliel & Wilen ch. 11. The A-values shown (`A_VALUES` in
  `src/chem/references/textbook.js`) are the compilation values as tabulated in Eliel & Wilen (1994)
  Table 11.7 and taught from in Klein and CGW, stored in kcal/mol as printed and converted to kJ/mol
  (× 4.184, rounded to 0.1); compilations differ by 0.1–0.3 kcal/mol between solvents and methods, the
  OH value depends on the solvent, and the tert-butyl value is an estimate ("> 4.5"). The share of
  molecules in the equatorial chair is K = e^(A/RT) at 298 K, a thermodynamic identity applied to the
  tabulated value. Ring-form energies (`RING_CONFORMER_ENERGIES`: twist-boat 23, boat 29, half-chair
  45 kJ/mol above the chair) are the textbook teaching values; only the chair and boat are drawn, from
  the rigid ring templates in `src/chem/geometry.js` (chair C–C–C 110° against the measured 111.3°,
  register row). The substituent is embedded and torsion-relaxed as any R group; the ring keeps its
  template angles, so a crowded axial group (tert-butyl) is flagged, not relieved. Nothing on the card
  is computed from the drawn geometry except the drawn distance it quotes as such.
* Why eclipsing costs energy (bonding-pair repulsion vs σ → σ* hyperconjugation): Pophristic & Goodman,
  *Nature* 411, 565 (2001), summarised at teaching level as "textbooks give two reasons".
