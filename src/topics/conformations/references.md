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
* Why eclipsing costs energy (bonding-pair repulsion vs σ → σ* hyperconjugation): Pophristic & Goodman,
  *Nature* 411, 565 (2001), summarised at teaching level as "textbooks give two reasons".
