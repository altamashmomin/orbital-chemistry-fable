// Invariant cards and glossary for the Molecular orbitals topic. `show: { mo }` selects the orbital drawn
// while the card is selected; `show: { electrons: 4 }` turns H₂ into the hypothetical He₂.
export const INVARIANTS = {
  h2: [
    { id: 'sigma', title: 'In phase: σ(1s), density between the nuclei', detail: 'Adding the two 1s orbitals with the same sign piles amplitude between the protons. Both electrons sit here: bond order (2 − 0)/2 = 1, the single bond of H₂ at 0.741 Å.', show: { mo: 'sigma1s' } },
    { id: 'sigma-star', title: 'Out of phase: σ*(1s), a node between the nuclei', detail: 'Subtracting them puts a nodal plane through the bond midpoint; an electron here pulls the atoms apart. It is empty in H₂, which is why H₂ is bound.', show: { mo: 'sigma1s*' } },
    { id: 'he2', title: 'Why there is no He₂', detail: 'Two more electrons must go into σ*: bond order (2 − 2)/2 = 0. The antibonding orbital costs at least as much as the bonding one gains, so two helium atoms do not bond. Switch the electron count to see the filled ladder.', show: { electrons: 4, mo: 'sigma1s*' } },
    { id: 'bde', title: 'Bond order 1, 436 kJ/mol', detail: 'The bond dissociation energy of H₂ is tabulated (436 kJ/mol); the MO picture explains why it exists, not its size. Nothing on this card is computed from the drawing.', audience: 'learn' },
  ],
  n2: [
    { id: 'triple', title: 'Bond order 3: σ(2p) plus two π(2p)', detail: 'Ten valence electrons fill σ(2s), σ*(2s), the two π(2p) and σ(2p): eight bonding, two antibonding, (8 − 2)/2 = 3. The triple bond is the strongest homonuclear bond, 945 kJ/mol, at 1.098 Å.', show: { mo: 'pi2p' } },
    { id: 'order', title: 'σ(2p) lies above π(2p) in N₂', detail: 'In B₂, C₂ and N₂ the 2s and 2p σ orbitals mix, pushing σ(2p) up past the π pair: the textbook ordering σ2s < σ*2s < π2p < σ2p. The HOMO of N₂ is the σ(2p) lone-pair-like orbital.', show: { mo: 'sigma2p' }, audience: 'learn' },
    { id: 'diamagnetic', title: 'All paired: diamagnetic', detail: 'Every occupied level is full. N₂ is repelled, weakly, by a magnet, unlike O₂.', audience: 'learn' },
    { id: 'lumo', title: 'The LUMO is π*(2p)', detail: 'The lowest empty orbital has a nodal plane between the nitrogens on each side. It is what a reducing metal centre would fill when it binds N₂.', show: { mo: 'pi2p*' }, audience: 'learn' },
  ],
  o2: [
    { id: 'paramagnetic', title: 'Two unpaired electrons: O₂ is paramagnetic', detail: 'Twelve valence electrons: the last two enter the degenerate π*(2p) pair one each, spins parallel (Hund). Liquid oxygen sticks to a magnet; a Lewis structure cannot show why, the MO diagram does.', show: { mo: 'pi2p*' } },
    { id: 'double', title: 'Bond order 2', detail: 'Eight bonding and four antibonding electrons: (8 − 4)/2 = 2, a double bond, 498 kJ/mol at 1.208 Å, weaker and longer than N₂\'s triple.', show: { mo: 'pi2p' } },
    { id: 'order', title: 'σ(2p) below π(2p) in O₂', detail: 'With less 2s–2p mixing than in N₂, O₂ (and F₂) have the simple order σ2s < σ*2s < σ2p < π2p < π*2p < σ*2p.', show: { mo: 'sigma2p' }, audience: 'learn' },
    { id: 'reactive', title: 'Why the π* electrons matter', detail: 'The two half-filled π* orbitals are both the HOMO and what O₂ offers to radicals and metals: triplet oxygen reacts one electron at a time, and reducing it by one electron gives superoxide O₂⁻ (bond order 1.5).', audience: 'learn' },
  ],
  ethene: [
    { id: 'pi', title: 'π: both 2p lobes in phase above and below the plane', detail: 'ψ₁ = (p₁ + p₂)/√2 at E = α + β. Its nodal plane is the molecular plane; the two electrons of the double bond live here. This is the HOMO and the nucleophilic face of an alkene.', show: { mo: 'psi1' } },
    { id: 'pi-star', title: 'π*: a second node between the carbons', detail: 'ψ₂ = (p₁ − p₂)/√2 at E = α − β: empty, the LUMO. An electrophile or a radical adds by putting electrons here; filling it breaks the π bond.', show: { mo: 'psi2' } },
    { id: 'huckel', title: 'Hückel: E = α ± β, the smallest π problem', detail: 'The 2 × 2 Hückel matrix has eigenvalues x = ±1 (E = α + xβ, β < 0). Bonding gains β, antibonding loses β: the drawn surfaces are the eigenvectors on hydrogen-like 2p orbitals with a carbon-sized exponent.', audience: 'learn' },
    { id: 'rotation', title: 'Rotation breaks the π overlap', detail: 'Twist one CH₂ by 90° and the two p orbitals no longer overlap: ψ₁ and ψ₂ become degenerate and the bond is gone. That is the cis/trans barrier of the Functional groups explorer.', links: [{ label: 'Alkenes', href: '#functional-groups/alkene/rot' }], audience: 'learn' },
  ],
  butadiene: [
    { id: 'four', title: 'Four 2p orbitals, four π MOs', detail: 'Hückel on C1=C2–C3=C4 gives x = +1.618, +0.618, −0.618, −1.618 (E = α + xβ): ψ₁ with no node, ψ₂ with one, ψ₃ with two, ψ₄ with three. Four electrons fill ψ₁ and ψ₂.', show: { mo: 'psi1' } },
    { id: 'homo', title: 'HOMO ψ₂: the node sits at the central bond', detail: 'ψ₂ is bonding across C1–C2 and C3–C4 but antibonding across C2–C3, which is why the central bond is a single bond (1.476 Å) and the outer ones are double (1.337 Å).', show: { mo: 'psi2' } },
    { id: 'lumo', title: 'LUMO ψ₃: nodes at both outer bonds', detail: 'ψ₃ is bonding across the middle and antibonding at the ends. Promote an electron ψ₂ → ψ₃ (butadiene absorbs at 217 nm) and the central bond gains π character while the ends lose it.', show: { mo: 'psi3' }, audience: 'learn' },
    { id: 'deloc', title: 'Delocalisation energy 0.472 β', detail: 'The π energy 2(1.618) + 2(0.618) = 4.472 β beats two isolated ethene π bonds (4 β) by 0.472 β: the Hückel measure of conjugation. β is not given a number here; the result is exact in units of β.', audience: 'learn' },
    { id: 'coefficients', title: 'The coefficients say where the electrons are', detail: 'ψ₂ has |c| = 0.602 on the terminal carbons and 0.372 on the inner ones: the HOMO is largest at C1 and C4, so electrophiles add at the ends (1,2- and 1,4-addition), never at C2.', audience: 'learn' },
  ],
  carbonyl: [
    { id: 'polar-pi', title: 'π: polarised toward oxygen', detail: 'With oxygen lower in energy (Hückel h = 1), the bonding π MO has the larger coefficient on O (0.851 vs 0.526): the π electrons sit nearer oxygen, the origin of the C=O dipole.', show: { mo: 'psi1' } },
    { id: 'lumo', title: 'π* (LUMO): larger on carbon', detail: 'The antibonding combination reverses the weights: 0.851 on C, 0.526 on O. A nucleophile puts its electrons where the LUMO is biggest, so it attacks the carbon, from above or below the plane.', show: { mo: 'psi2' }, links: [{ label: 'Aldehydes', href: '#functional-groups/aldehyde/co' }, { label: 'LUMO', href: '#glossary/lumo' }] },
    { id: 'burgi', title: 'The Bürgi–Dunitz angle', detail: 'The π* lobe on carbon leans away from oxygen, so the best approach is not perpendicular but about 107° to the C=O bond: the trajectory the Functional groups cards quote.', audience: 'learn' },
    { id: 'parameters', title: 'Where h and k come from', detail: 'Heteroatom Hückel parameters α_O = α + hβ and β_CO = kβ are a tabulated teaching set (Streitwieser): h = 1, k = 1 for a carbonyl oxygen. The energies x = (1 ± √5)/2 and the coefficients follow exactly from them.', audience: 'learn' },
  ],
  chloromethane: [
    { id: 'sigma-star', title: 'σ*(C–Cl): the big lobe is behind the carbon', detail: 'The antibonding combination of the carbon and chlorine p orbitals has a node between the atoms and its outer lobe on the side of carbon opposite chlorine. That lobe is where a nucleophile\'s electrons go.', show: { mo: 'sigma*' } },
    { id: 'sn2', title: 'This is why SN2 is backside attack', detail: 'Filling σ*(C–Cl) breaks the C–Cl bond; the nucleophile can only reach the lobe from behind, 180° from chlorine, so the three spectator groups flip through (Walden inversion).', links: [{ label: 'Watch SN2', href: '#mechanisms/sn2' }, { label: 'Walden inversion', href: '#glossary/walden-inversion' }] },
    { id: 'sigma', title: 'σ(C–Cl): the bond itself', detail: 'The in-phase combination holds the two bonding electrons between carbon and chlorine (1.785 Å, measured).', show: { mo: 'sigma' } },
    { id: 'schematic', title: 'Drawn with equal weights: a schematic', detail: 'A real σ* is larger on carbon because the bonding σ is polarised toward chlorine; the model draws equal weights on hydrogen-like p orbitals with carbon- and chlorine-sized exponents, so shapes and phases are right and the relative sizes are not claimed.', audience: 'learn' },
  ],
};

export const GLOSSARY_TERMS = [
  { id: 'bond-order', term: 'Bond order (MO)', definition: 'Half the difference between the numbers of electrons in bonding and antibonding molecular orbitals: (n_b − n_a)/2. H₂ 1, He₂ 0, N₂ 3, O₂ 2.', why: 'It predicts whether a diatomic exists and ranks bond strength and length without a Lewis structure.', links: [{ label: 'N₂', href: '#molecular-orbitals/n2/triple' }, { label: 'He₂', href: '#molecular-orbitals/h2/he2' }] },
  { id: 'bonding-antibonding', term: 'Bonding and antibonding', definition: 'The in-phase combination of two atomic orbitals (σ, π) puts density between the nuclei and lies below them in energy; the out-of-phase one (σ*, π*) has a node between the nuclei and lies above.', why: 'Every bond and every reaction is electrons moving between these: filling a σ* breaks a bond, which is what SN2 does.', links: [{ label: 'σ and σ* of H₂', href: '#molecular-orbitals/h2' }, { label: 'σ*(C–Cl)', href: '#molecular-orbitals/chloromethane/sigma-star' }] },
  { id: 'paramagnetism', term: 'Paramagnetism', definition: 'Attraction into a magnetic field caused by unpaired electrons; diamagnetic substances, with all electrons paired, are weakly repelled.', why: 'O₂ is paramagnetic because its two highest electrons sit unpaired in the degenerate π* pair, a fact only the MO diagram explains.', links: [{ label: 'O₂', href: '#molecular-orbitals/o2/paramagnetic' }] },
  { id: 'huckel-theory', term: 'Hückel theory', definition: 'The simplest π-electron model: one 2p orbital per conjugated atom, energies α (on an atom) and β (between bonded atoms, β < 0), all else zero. Its eigenvalues E = α + xβ and eigenvectors give the π MOs and their coefficients.', why: 'It gives the HOMO and LUMO of alkenes, dienes and carbonyls and the delocalisation energy of conjugated systems in units of β.', links: [{ label: 'Butadiene', href: '#molecular-orbitals/butadiene/four' }, { label: 'Carbonyl', href: '#molecular-orbitals/carbonyl/lumo' }] },
];
