# References: transition metals

* Crystal-field patterns (`CRYSTAL_FIELD` in `src/chem/references/textbook.js`): the barycentre rule, t₂g at
  −0.4 Δo and e_g at +0.6 Δo in an octahedron, e at −0.6 Δt and t₂ at +0.4 Δt in a tetrahedron with
  Δt ≈ 4/9 Δo, and the square-planar order d(x²−y²) > d(xy) > d(z²) > d(xz), d(yz): Housecroft & Sharpe,
  *Inorganic Chemistry* 5e, ch. 20; Miessler, Fischer & Tarr, *Inorganic Chemistry* 5e, ch. 10. The
  square-planar gaps are drawn schematically and carry no numbers.
* Δo values (`DELTA_O`, cm⁻¹): Housecroft & Sharpe 5e Table 20.2 (from electronic spectra), the set most
  textbooks reproduce; cross-checked against the MIT 5.03 (Nocera, "Spectrochemical series") and IIT Delhi
  CYL120 lecture tables. Compilations differ by a few hundred cm⁻¹ for some entries ([Cr(H₂O)₆]³⁺ 17,000 vs
  17,400; [Co(NH₃)₆]³⁺ 22,870 vs 22,900; [Fe(CN)₆]⁴⁻ 32,200 vs 33,800), which the card says. No Δo is
  quoted for [Mn(H₂O)₆]²⁺, [Cu(H₂O)₆]²⁺ (Jahn–Teller distorted) or any non-octahedral complex.
* The spectrochemical series (`SPECTROCHEMICAL_SERIES`): Housecroft & Sharpe ch. 20; an experimental ranking,
  used only to order ligands. The sweep checks that Δo rises along it for every same-metal, same-oxidation
  pair in the table.
* Spin states, unpaired-electron counts and colours (`COMPLEX_MAGNETISM`, `COMPLEX_COLOURS`): Housecroft &
  Sharpe ch. 20–21 and Miessler, Fischer & Tarr ch. 10–11 (magnetic moments and the usual descriptions of
  the ions and their salts; Greenwood & Earnshaw for the halide salts). The model's filling is checked
  against the tabulated unpaired count; a what-if filling is labelled as such on the card.
* Counting: d count = group number − oxidation state (`METAL_GROUPS`, IUPAC groups); oxidation state =
  complex charge − ligand charges; unpaired electrons and CFSE by counting the filling; the spin-only moment
  μ = √(n(n+2)) μ_B (Housecroft & Sharpe eq. 20.10); 1 cm⁻¹ = 0.011963 kJ/mol and λ = 10⁷ / Δo are unit
  conversions. Pairing energies are not tabulated here, so the card never claims Δo > P or Δo < P as a
  number: it reports the tabulated spin state and the ligand's place in the series.
* The 3D model: donor atoms on the ideal octahedral / square-planar / tetrahedral template at the
  element/order bond length (Cordero covalent radii: Fe–O 1.98 Å, Co–N 1.97 Å, Pt–Cl 2.38 Å …; real
  M–L lengths vary by ±0.1 Å with spin and oxidation state), ligand hydrogens on ideal tetrahedral slots
  with no lone-pair compression (`embed(..., { lonePairAngles: false })`), torsions relaxed; the
  Jahn–Teller distortion of d⁹ is not drawn. The d orbital is the hydrogen-like 3d function at
  Z_eff = 6.25 (Slater's rules for a 3d electron of iron, `D_ORBITAL_ZEFF`): size only.
* Isomers: Werner's cis / trans [Co(NH₃)₄Cl₂]⁺ (violeo / praseo) and fac / mer MA₃B₃: Housecroft & Sharpe
  ch. 19; cisplatin: Miessler, Fischer & Tarr ch. 9.
