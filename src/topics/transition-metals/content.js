// Invariant cards and glossary for the Transition metals topic. `show: { orbital }` draws that d orbital over
// the complex while the card is selected; `show: { spin }` fills the diagram as a what-if; `show: { isomer }`
// switches the frame. Every number quoted is a table value (references/textbook.js) or counting on a filling.
export const INVARIANTS = {
  tiAqua: [
    { id: 'd1', title: 'One d electron, one band, one colour', detail: 'Ti(III) is d¹: its single electron sits in t₂g and the only d–d transition is t₂g → e_g, so the absorption band is Δo itself: 20,300 cm⁻¹ = 493 nm (tabulated). The complex absorbs there and looks purple.', show: { orbital: 'dxy' } },
    { id: 'eg', title: 'The orbitals that point at the ligands go up', detail: 'd𝓏² and dₓ²₋ᵧ² aim straight at the six water oxygens and are raised; dₓᵧ, dₓ𝓏 and dᵧ𝓏 point between them and are lowered. The barycentre rule keeps the average where it was: 3 × (−0.4) + 2 × (+0.6) = 0.', show: { orbital: 'dz2' }, audience: 'learn' },
  ],
  crAqua: [
    { id: 'd3', title: 'd³: three unpaired, no spin choice', detail: 'Three electrons fill t₂g singly whatever Δo is; the spin question only arises for d⁴–d⁷. Spin-only moment √(3 × 5) = 3.87 μ_B, the textbook value for Cr(III).', show: { orbital: 'dyz' } },
    { id: 'ladder', title: 'Swap water for ammonia or cyanide and Δo climbs', detail: 'Same Cr(III), three ligands: H₂O 17,400, NH₃ 21,600, CN⁻ 26,600 cm⁻¹ (tabulated). That ordering is the spectrochemical series in numbers.', links: [{ label: '[Cr(NH₃)₆]³⁺', href: '#transition-metals/crAmmine' }, { label: '[Cr(CN)₆]³⁻', href: '#transition-metals/crCyano' }] },
  ],
  mnAqua: [
    { id: 'd5', title: 'd⁵ high spin: every orbital half full', detail: 'With weak-field water Mn(II) keeps five unpaired electrons, one per d orbital. The CFSE is zero (3 × −0.4 + 2 × +0.6) and the moment is √35 = 5.92 μ_B.', show: { orbital: 'dx2y2' } },
    { id: 'pale', title: 'Why it is almost colourless', detail: 'Every d–d transition in a high-spin d⁵ ion would have to flip a spin (spin-forbidden), so the bands are very weak: the solution is the palest pink. The rule is tabulated, not computed here.', audience: 'learn' },
  ],
  feAqua: [
    { id: 'high', title: 'd⁶ high spin with water: four unpaired', detail: 'Δo = 9,400 cm⁻¹ (tabulated) is too small to pay for pairing, so the sixth electron pairs in t₂g and the other four stay single: t₂g⁴ e_g², μ = √24 = 4.90 μ_B.', show: { spin: 'high', orbital: 'dz2' } },
    { id: 'cyanide', title: 'The same Fe(II) with cyanide is diamagnetic', detail: 'Replace H₂O by CN⁻ and Δo rises to 33,800 cm⁻¹: now all six electrons pair in t₂g. Same metal, same oxidation state, opposite magnetism.', links: [{ label: '[Fe(CN)₆]⁴⁻', href: '#transition-metals/feCyano' }], show: { spin: 'low' } },
  ],
  coAqua: [
    { id: 'd7', title: 'd⁷ high spin: t₂g⁵ e_g²', detail: 'Three unpaired electrons, μ = √15 = 3.87 μ_B. The pink of Co(II) in water is the everyday colour of cobalt salts in solution.', show: { orbital: 'dxz' } },
    { id: 'low', title: 'What low spin would look like', detail: 'Pair the electrons in t₂g and one is left in e_g: t₂g⁶ e_g¹, one unpaired. Cobalt(II) only does this with very strong fields; with water it is high spin (tabulated).', show: { spin: 'low' }, audience: 'learn' },
  ],
  niAqua: [
    { id: 'd8', title: 'd⁸ octahedral: two unpaired, no choice', detail: 't₂g⁶ e_g²: with t₂g full the two e_g electrons sit singly whatever Δo is, so Ni(II) in an octahedron is always paramagnetic (μ = √8 = 2.83 μ_B). Only a change of geometry pairs them.', show: { orbital: 'dx2y2' }, links: [{ label: '[Ni(CN)₄]²⁻', href: '#transition-metals/niCyano' }] },
    { id: 'green', title: 'Green, with a small Δo', detail: 'Δo = 8,500 cm⁻¹ (tabulated): the lowest on the ladder here. A d⁸ ion has three spin-allowed bands, so its colour is not read off Δo alone; green is the tabulated colour.', audience: 'learn' },
  ],
  cuAqua: [
    { id: 'd9', title: 'd⁹: one hole in e_g', detail: 'Nine electrons leave one e_g orbital half full: one unpaired electron, μ = √3 = 1.73 μ_B, and the familiar blue of copper(II) in water.', show: { orbital: 'dx2y2' } },
    { id: 'jt', title: 'Not a regular octahedron', detail: 'A d⁹ ion with an uneven e_g set distorts (the Jahn–Teller effect): the real [Cu(H₂O)₆]²⁺ has four short and two long Cu–O bonds. This model draws the ideal octahedron and says so; no Δo is tabulated for it here.', audience: 'learn' },
  ],
  znAqua: [
    { id: 'd10', title: 'd¹⁰: full shell, colourless, diamagnetic', detail: 'Every d orbital is full, so there is no d–d transition to absorb visible light and no unpaired electron. Zinc compounds are white and diamagnetic; the CFSE is zero.', show: { orbital: 'dz2' } },
    { id: 'notTM', title: 'Why zinc is often left out of the transition metals', detail: 'A transition metal has a partly filled d shell in a common oxidation state. Zn(II) is d¹⁰ in all its chemistry, so colour, variable oxidation states and paramagnetism are all missing.', audience: 'learn' },
  ],
  crAmmine: [
    { id: 'ammonia', title: 'Ammonia: a stronger field than water', detail: 'NH₃ sits above H₂O in the series; Δo = 21,600 cm⁻¹ (tabulated) against 17,400 for the aqua ion. d³ stays t₂g³ either way: three unpaired electrons.', show: { orbital: 'dxy' } },
  ],
  crCyano: [
    { id: 'cyanide', title: 'Cyanide: near the top of the series', detail: 'Δo = 26,600 cm⁻¹ (tabulated), the largest of the three Cr(III) complexes here. The d³ count still gives three unpaired electrons; what changes is the colour (yellow) and the size of every d–d gap.', show: { orbital: 'dz2' } },
    { id: 'pi', title: 'Why CN⁻ splits so strongly', detail: 'Cyanide is a σ donor and a π acceptor: its empty π* orbitals take electron density from t₂g and push that set further down. A crystal-field picture of point charges cannot explain that; the series is an experimental ranking.', audience: 'learn' },
  ],
  feCyano: [
    { id: 'low', title: 'd⁶ low spin: t₂g⁶, diamagnetic', detail: 'Δo = 33,800 cm⁻¹ (tabulated; compilations range to 32,200) is far more than the pairing cost, so all six electrons pair in t₂g. No unpaired electrons: the yellow ferrocyanide ion is diamagnetic.', show: { spin: 'low', orbital: 'dxy' } },
    { id: 'cfse', title: 'The largest CFSE on the ladder', detail: '6 × (−0.4 Δo) = −2.4 Δo, less two pairing energies. Low-spin d⁶ is the most stabilised configuration an octahedron can have: Co(III) and Fe(II) with strong ligands are very inert for this reason.', audience: 'learn' },
  ],
  ferriCyano: [
    { id: 'd5low', title: 'd⁵ low spin: one unpaired electron', detail: 't₂g⁵: Fe(III) with cyanide pairs four of its five electrons, leaving one. μ = √3 = 1.73 μ_B against √35 = 5.92 for high-spin d⁵ (see Mn(II) in water).', show: { spin: 'low', orbital: 'dyz' }, links: [{ label: '[Mn(H₂O)₆]²⁺', href: '#transition-metals/mnAqua' }] },
    { id: 'charge', title: 'Higher oxidation state, larger Δo', detail: 'Fe(III) with CN⁻: 35,000 cm⁻¹ against 33,800 for Fe(II) (tabulated). A more positive metal pulls the ligands closer and splits harder: oxidation state is the second knob after the ligand.', audience: 'learn' },
  ],
  coFluoro: [
    { id: 'high', title: 'd⁶ high spin with fluoride: paramagnetic', detail: 'F⁻ is a weak-field ligand: Δo = 13,100 cm⁻¹ (tabulated) does not cover the pairing cost, so Co(III) keeps t₂g⁴ e_g² with four unpaired electrons. It is the textbook exception among Co(III) complexes, which are otherwise low spin.', show: { spin: 'high', orbital: 'dz2' } },
    { id: 'pair', title: 'Compare [Co(NH₃)₆]³⁺', detail: 'Same Co(III), ammonia instead of fluoride: Δo = 22,900 cm⁻¹ and the ion is low spin and diamagnetic. Two complexes of one ion sit on opposite sides of the Δo ≈ P line.', links: [{ label: '[Co(NH₃)₆]³⁺', href: '#transition-metals/coAmmine' }] },
  ],
  coAmmine: [
    { id: 'low', title: 'd⁶ low spin, diamagnetic, orange-yellow', detail: 't₂g⁶ with Δo = 22,900 cm⁻¹ (tabulated). Every classical Werner ammine of Co(III) is low spin and kinetically inert: the CFSE of −2.4 Δo is why substitution is so slow.', show: { spin: 'low', orbital: 'dxz' } },
    { id: 'whatif', title: 'What high spin would cost', detail: 'Unpair the electrons and two of them move up by Δo into e_g: t₂g⁴ e_g², CFSE −0.4 Δo instead of −2.4 Δo. Only when Δo is small (fluoride) is that cheaper than two pairings.', show: { spin: 'high' }, audience: 'learn' },
  ],
  coCyano: [
    { id: 'top', title: 'The largest Δo of the first row here', detail: '33,500 cm⁻¹ (tabulated) for Co(III) with cyanide: pale yellow because the first absorption band has moved to the edge of the visible. Low spin, diamagnetic.', show: { spin: 'low', orbital: 'dxy' } },
  ],
  niAmmine: [
    { id: 'blue', title: 'Ammonia turns green nickel blue-violet', detail: 'Δo rises from 8,500 (water) to 10,800 cm⁻¹ (tabulated): the bands shift to shorter wavelength and the colour changes. Still d⁸, still two unpaired electrons.', show: { orbital: 'dx2y2' }, links: [{ label: '[Ni(H₂O)₆]²⁺', href: '#transition-metals/niAqua' }] },
  ],
  niCyano: [
    { id: 'sqp', title: 'Square planar d⁸: all paired', detail: 'Remove the two axial ligands and d𝓏² drops, dₓ²₋ᵧ² rises far above the rest. Eight electrons fill the four lower orbitals and leave dₓ²₋ᵧ² empty: diamagnetic, unlike every octahedral Ni(II).', show: { orbital: 'dx2y2' } },
    { id: 'order', title: 'The square-planar order', detail: 'dₓ²₋ᵧ² (points at the four ligands) > dₓᵧ (in the plane, between them) > d𝓏² (along the empty axis) > dₓ𝓏, dᵧ𝓏. The diagram draws that order schematically; the gaps carry no numbers.', show: { orbital: 'dz2' }, audience: 'learn' },
  ],
  niChloro: [
    { id: 'tet', title: 'Tetrahedral d⁸: two unpaired', detail: 'In a tetrahedron the pattern inverts: e (d𝓏², dₓ²₋ᵧ²) below t₂ (dₓᵧ, dₓ𝓏, dᵧ𝓏), and Δt ≈ 4/9 Δo is always too small to force pairing. e⁴ t₂⁴: two unpaired electrons, blue.', show: { orbital: 'dxy' } },
    { id: 'between', title: 'No orbital points straight at a ligand', detail: 'The four chlorides sit on alternate cube corners, so the axes pass between them: that is why the splitting is small and why t₂ (closer to the ligands) is the upper set.', show: { orbital: 'dz2' }, audience: 'learn' },
  ],
  cisplatin: [
    { id: 'cis', title: 'cis: the two chlorides are 90° apart', detail: 'Square planar Pt(II), d⁸, diamagnetic. The cis isomer is the anticancer drug cisplatin; the trans isomer is inactive. Same formula, different arrangement.', show: { isomer: 'cis', orbital: 'dx2y2' } },
    { id: 'trans', title: 'trans: 180° apart', detail: 'Swap one ammine and one chloride and the two chlorides sit opposite each other. A square-planar MA₂B₂ complex has exactly these two geometric isomers.', show: { isomer: 'trans' } },
  ],
  coAmmineChloro: [
    { id: 'cis', title: 'cis (violet): Cl–Co–Cl = 90°', detail: 'The two chlorides share an edge of the octahedron. The cis salt is violet ("violeo"), the trans salt green ("praseo"): Werner\'s original evidence that six ligands sit at the corners of an octahedron.', show: { isomer: 'cis', orbital: 'dz2' } },
    { id: 'trans', title: 'trans (green): Cl–Co–Cl = 180°', detail: 'The chlorides occupy opposite corners. An octahedral MA₄B₂ complex has only these two geometric isomers; a planar hexagon or a trigonal prism would give three.', show: { isomer: 'trans' } },
  ],
  coAmmineTrichloro: [
    { id: 'fac', title: 'fac: three chlorides on one face', detail: 'Facial: every Cl–Co–Cl angle is 90° and the three chlorides cap one triangular face of the octahedron, the three ammines the opposite face.', show: { isomer: 'fac' } },
    { id: 'mer', title: 'mer: three chlorides on a meridian', detail: 'Meridional: two chlorides are trans (180°) and the third is cis to both, so the three lie on a great circle through the metal. MA₃B₃ has exactly these two isomers.', show: { isomer: 'mer' } },
  ],
};

export const GLOSSARY_TERMS = [
  { id: 'crystal-field-splitting', term: 'Crystal-field splitting (Δ)', definition: 'In a complex the five d orbitals are no longer equal: those pointing at the ligands rise, those pointing between them fall. In an octahedron the gap between t₂g (dₓᵧ, dₓ𝓏, dᵧ𝓏) and e_g (d𝓏², dₓ²₋ᵧ²) is Δo, with t₂g at −0.4 Δo and e_g at +0.6 Δo.', why: 'Δo is measured from the d–d absorption bands, so it is the number that connects colour, magnetism and stability. Tetrahedral Δt ≈ 4/9 Δo; square planar has four gaps.', links: [{ label: 'Start with d¹', href: '#transition-metals/tiAqua' }, { label: 'The d orbitals', href: '#atomic-orbitals/3dz2' }] },
  { id: 'd-electron-count', term: 'd-electron count', definition: 'Group number minus oxidation state: Fe(II) is d⁶ (8 − 2), Co(III) is d⁶ (9 − 3), Ni(II) is d⁸. The oxidation state is the complex charge minus the ligand charges.', why: 'The count, not the metal, decides the filling: Fe(II) and Co(III) share every d⁶ pattern.', links: [{ label: '[Fe(H₂O)₆]²⁺', href: '#transition-metals/feAqua' }] },
  { id: 'high-low-spin', term: 'High spin and low spin', definition: 'For d⁴–d⁷ in an octahedron: high spin puts one electron in each orbital before pairing (Δo smaller than the pairing energy P); low spin fills t₂g completely first (Δo larger than P). Tetrahedral complexes are high spin; square-planar d⁸ is low spin.', why: 'The choice is read from the measured magnetic moment, μ = √(n(n+2)) μ_B for n unpaired electrons, and it tracks the ligand\'s place in the spectrochemical series.', links: [{ label: 'High vs low with Fe(II)', href: '#transition-metals/feAqua/cyanide' }] },
  { id: 'spectrochemical-series', term: 'Spectrochemical series', definition: 'Ligands ranked by the Δ they produce: I⁻ < Br⁻ < Cl⁻ < F⁻ < OH⁻ < H₂O < NH₃ < en < NO₂⁻ < CN⁻ < CO (weak field to strong field). An experimental ranking, not a prediction.', why: 'For one metal ion Δo rises along the series (Cr(III): H₂O 17,400 < NH₃ 21,600 < CN⁻ 26,600 cm⁻¹). π acceptors such as CN⁻ and CO sit at the top; π donors such as the halides at the bottom.', links: [{ label: 'Cr(III) with three ligands', href: '#transition-metals/crAqua/ladder' }] },
  { id: 'geometric-isomers', term: 'cis / trans and fac / mer', definition: 'Octahedral MA₄B₂ and square-planar MA₂B₂ complexes exist as cis (B–M–B = 90°) and trans (180°) isomers; octahedral MA₃B₃ as fac (three B on one face, all 90°) and mer (three B on a meridian, one 180° pair).', why: 'Werner proved the octahedron by counting isomers: a planar or prismatic arrangement would give three for MA₄B₂, and only two are ever found.', links: [{ label: '[Co(NH₃)₄Cl₂]⁺', href: '#transition-metals/coAmmineChloro' }, { label: 'Cisplatin', href: '#transition-metals/cisplatin' }] },
];
