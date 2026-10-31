# References: chemistry encoded in the shared core

Where a number or a shape in `src/chem/` comes from. Topic folders keep their own
`references.md` for teaching content; this file covers the primitives every topic shares.

## Hydrogen-like orbitals (`orbitals.js`)

* Radial functions R₁₀ … R₃₂ and their normalisation: Atkins & de Paula, *Physical Chemistry*,
  table "Hydrogenic radial wavefunctions" (any recent edition); Griffiths & Schroeter,
  *Introduction to Quantum Mechanics*, 3rd ed., table 4.7. Written with ρ = Zr/a₀ so Z contracts
  the orbital as a₀/Z. Radial nodes: n − l − 1; angular nodes: l.
* Real spherical harmonics (s, pₓ, pᵧ, p𝓏, d𝓏², dₓ𝓏, dᵧ𝓏, dₓ²₋ᵧ², dₓᵧ) in Cartesian form, normalised
  over the sphere: Atkins & Friedman, *Molecular Quantum Mechanics*, 5th ed., table 3.2 and the
  standard "real form" tables. The real combinations are the ones chemistry textbooks draw.
* Bohr radius a₀ = 0.529177 Å (CODATA 2018). Set `a0 = A0_ANGSTROM` to evaluate ψ in Å next to a
  molecule frame.
* The "90 % contour" convention for pictures of orbitals (the |ψ| isosurface enclosing 90 % of
  the probability, `isoValue(grid, { probability: 0.9 })`) follows the usual textbook practice
  (Atkins; Housecroft & Sharpe, *Inorganic Chemistry*, ch. 1).
* Two-centre MOs: σ/σ* from s or p𝓏, π/π* from parallel p orbitals as ψ_A ± ψ_B with coefficients
  ±1/√2 (overlap S neglected, so shapes and phases are right but the normalisation is approximate).
  Phase convention and nodal properties: Atkins & de Paula ch. "Molecular structure"; Housecroft &
  Sharpe ch. 2. The bonding σ built from p orbitals is p𝓏(A) − p𝓏(B) because both p𝓏 point along
  +z: between the nuclei p𝓏(A) is positive and p𝓏(B) negative, so the difference is in phase.

## Isosurfaces (`marchingCubes.js`)

* Marching cubes: Lorensen & Cline, *SIGGRAPH* 1987. Implemented here as marching tetrahedra
  (six tetrahedra per cube around the main diagonal), which needs no case tables and has no
  ambiguous configurations: Doi & Koide, *IEICE Trans.* E74 (1991); P. Bourke, "Polygonising a
  scalar field" (1994/1997). Vertex normals are the (negated) central-difference gradient.

## Coordination geometries (`geometry.js`)

* Octahedral (six ligands at 90°/180°) and square-planar (four coplanar ligands) templates follow
  VSEPR / crystal-field conventions; the square plane is drawn as xz so its normal is y, matching
  the sp² convention used for p orbitals in `embed()`. Housecroft & Sharpe, *Inorganic Chemistry*,
  5th ed., ch. 19–20; Miessler, Fischer & Tarr, *Inorganic Chemistry*, 5th ed., ch. 9–10.
* `hyb: 'oct' | 'd2sp3' | 'sp3d2'` and `hyb: 'sqp' | 'dsp2'` are accepted as labels only; the app
  does not claim a hybridisation model for complexes (crystal-field and ligand-field pictures are
  the topic's job).
* Metal–ligand bond lengths default to the sum of covalent radii, which lands in the right
  range for first-row complexes (Fe–N 2.03 Å, Co–N 1.97 Å, Pt–Cl 2.38 Å); real complexes vary by
  ±0.1 Å with spin state and oxidation state. Pass `bondLength` or per-ligand `length` for a
  specific compound.

## Element data (`elements.js`)

* Covalent radii: Cordero et al., *Dalton Trans.* 2008, 2832–2838 (low-spin values for Mn, Fe, Co).
* Pauling electronegativities: standard tables (Housecroft & Sharpe appendix).
* Colours: Jmol/CPK-inspired, adjusted for the light sage canvas.

## Level diagrams (`src/ui/levelDiagram.js`)

* `octahedralSplitting()` uses the barycentre rule: t₂g at −0.4 Δₒ, e_g at +0.6 Δₒ relative to
  the free-ion d level, low-spin or high-spin filling (Housecroft & Sharpe ch. 20). Δₒ is in
  arbitrary units; label it as illustrative in the UI.

## Ring templates and lone-pair placement (`geometry.js`)

* VSEPR lone-pair positions (equatorial in a trigonal bipyramid, trans in an octahedron) and the
  seesaw / T-shaped / square-pyramidal / square-planar shapes of SF₄, ClF₃, BrF₅ and XeF₄: Gillespie
  & Hargittai, *The VSEPR Model of Molecular Geometry* (Allyn & Bacon, 1991); any general-chemistry
  text (e.g. Atkins & Jones, *Chemical Principles*, ch. 3).
* Cyclohexane chair (C–C–C ≈ 111°, ring torsion ≈ 55°, axial bonds parallel to the C₃ axis,
  1,3-diaxial H···H ≈ 2.5 Å), the boat with its flagpole hydrogens, the cyclopentane envelope and the
  puckered cyclobutane (fold ≈ 25–35°): Eliel & Wilen, *Stereochemistry of Organic Compounds*
  (Wiley, 1994), ch. 11; Clayden, Greeves & Warren, *Organic Chemistry* (OUP, 2nd ed.), ch. 16.
  The templates are idealised (all C–C = 1.54 Å, exact closure) for teaching, not refined structures.
* Lone-pair angle compression (`LONE_PAIR_ANGLES` in `references/textbook.js`): the bonded angles at
  centres with lone pairs are closed from the ideal slot angle to one measured gas-phase exemplar per
  row. The citations live in `references/measured.js`, copied by hand from the NIST Computational
  Chemistry Comparison and Benchmark Database experimental-geometry listings
  (`https://cccbdb.nist.gov/expgeom2x.asp?casno=<CAS>`, read 2026-10-27), which name the original
  measurement: H₂O 104.48° rₑ (Hoy & Bunker 1979), NH₃ 106.67° (Herzberg 1966), PH₃ 93.3°, H₂S 92.11°
  (Cook, De Lucia & Helminger 1975), H₂Se 90.9° (Kuchitsu 1998), CH₃OH C–O–H 108.87° (Venkateswarlu &
  Gordy 1955), (CH₃)₂O 111.2° rₛ (Niide & Hayashi 2003; Landolt-Börnstein and CRC quote 111.7°),
  (CH₃)₂S 98.9° (Pierce & Hayashi 1961), HCOOH C–O–H 106.3° (Herzberg 1966), HCOOCH₃ C–O–C 114.8°
  (Landolt-Börnstein II/7), SO₂ 119.5°, SF₄ 173.07°/101.55° (Tolles & Gwinn 1962), ClF₃ 87.45° rₑ
  (Müller 2001), BrF₅ 84.8° (Gurvich et al. 1989). CH₃SH C–S–H 96.5° follows the microwave structure
  tabulated by Landolt-Börnstein II/7 and the CRC gas-phase table; the CCCBDB page quotes Herzberg's
  1966 compilation value 100.3°, a discrepancy the register records. Where a row stands in for a class
  (ethanol takes methanol's angle, acetic acid formic acid's) the lookup says so (`basis: 'class'` or
  an `appliesTo` note). The picture behind the rule — lone pairs repel more than bonding pairs, so
  bonded angles close and the lone pairs spread — is Gillespie & Hargittai (above); the 2.5° per lone
  pair default for centres with no row is a rounded version of the H₂O / NH₃ deficit and is a teaching
  convention, not a measurement. Idealised references the model knowingly does not reproduce (acetone
  C–C–C 116°, cyclohexane C–C–C 111.28°, both Kuchitsu 1998 via CCCBDB) are in the same file.

## Redox (`redox.js`)

* Oxidation states: IUPAC Recommendations 2016 (Karen, McArdle & Takats, *Pure Appl. Chem.* 88, 831), the
  ionic approximation applied with the Pauling `ELECTRONEGATIVITY` table (CRC); carbon oxidation levels
  (`OXIDATION_LEVELS`): Clayden, Greeves & Warren ch. 24, Klein ch. 12; textbook half-reactions
  (`HALF_REACTIONS`): Atkins resource section, Housecroft & Sharpe 5e ch. 8 and Appendix 11. Measured
  geometries of H₂O₂ (CCCBDB), KMnO₄ and K₂Cr₂O₇ (crystal structures) in `references/measured.js`. Details
  and the limits of the model in `src/topics/redox/references.md`.

## Transition metals (`transitionMetals.js`)

* Crystal-field patterns and the barycentre rule (`CRYSTAL_FIELD`), Δo values (`DELTA_O`, Housecroft &
  Sharpe 5e Table 20.2, cross-checked against the MIT 5.03 and IIT Delhi lecture tables; compilations
  differ by a few hundred cm⁻¹), the spectrochemical series, spin states, unpaired counts and colours
  (`COMPLEX_MAGNETISM`, `COMPLEX_COLOURS`): Housecroft & Sharpe ch. 19–21; Miessler, Fischer & Tarr
  ch. 9–11. Details and the limits of the model in `src/topics/transition-metals/references.md`.
* The metal d orbital is drawn at Z_eff = 6.25 (Slater's rules for a 3d electron of Fe) for every metal:
  size only; no energy is computed from it.
