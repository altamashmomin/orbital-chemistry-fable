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
