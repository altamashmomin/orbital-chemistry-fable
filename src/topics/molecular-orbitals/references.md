# References: molecular orbitals

* Homonuclear diatomics (σ / σ* from 1s and 2s, σ / π from 2p, the level order with and without 2s–2p
  mixing, bond order, the paramagnetism of O₂): Atkins & de Paula, *Physical Chemistry*, "Molecular
  structure"; Housecroft & Sharpe, *Inorganic Chemistry*, ch. 2. The ladder drawn for each molecule is
  the textbook order (`DIATOMIC_MO` in `src/chem/references/textbook.js`); its heights are schematic
  and carry no energies. Bond orders and unpaired counts follow from the filling by counting.
* Bond dissociation energies H₂ 436, N₂ 945, O₂ 498 kJ/mol (D₀, rounded): CRC Handbook, "Bond
  dissociation energies in diatomic molecules"; Atkins data section. Tabulated facts, never computed.
* Bond lengths (frames are drawn at them, cited in `src/chem/references/measured.js` from NIST CCCBDB):
  H₂ 0.741, N₂ 1.098, O₂ 1.208 Å (Huber & Herzberg 1979); ethylene C=C 1.339, C–H 1.086 Å, H–C=C 121.2°
  (Herzberg 1966); 1,3-butadiene C=C 1.337, C–C 1.476 Å, C=C–C 122.9° (Herzberg 1966; no C–H is listed,
  the ethylene value is used); chloromethane C–Cl 1.785, C–H 1.090 Å, H–C–Cl 108.16° (Duncan et al.
  1973); formaldehyde from the Molecular shapes frame (C=O 1.205 Å measured, Gurvich 1989).
* Orbital shapes: hydrogen-like functions (`src/chem/orbitals.js`) with the Clementi–Raimondi
  effective charges (`SLATER_ZEFF`: H 1s 1.00, C 2p 3.136, N 2p 3.834, O 2p 4.453, Cl 3p 6.116; J. Chem.
  Phys. 38, 2686 (1963)) so the lobes are atom-sized next to the measured bond; combinations with
  ±1/√2 (diatomics, overlap neglected) or the Hückel coefficients. The 2s-based σ(2s) / σ*(2s) of N₂
  and O₂ are drawn with the 2p exponent (shape only, declared on the card); the C–Cl σ / σ* use equal
  weights on C and Cl and the card says so.
* Hückel theory (ethene E = α ± β; butadiene x = ±1.618, ±0.618 with delocalisation energy 0.472 β;
  the carbonyl with α_O = α + hβ, β_CO = kβ, h = k = 1): Clayden, Greeves & Warren ch. 4; Atkins &
  de Paula; heteroatom parameters from Streitwieser, *Molecular Orbital Theory for Organic Chemists*
  (1961), Table 5.1 (`HUCKEL_PARAMETERS`). The solver (`huckel()`, Jacobi diagonalisation) returns the
  exact eigenvalues of the stated matrix in units of β; β is never assigned a number.
* σ*(C–X) as the LUMO behind backside attack, and the Bürgi–Dunitz trajectory into the carbonyl π*:
  Clayden, Greeves & Warren ch. 4 and ch. 6; Bürgi, Dunitz & Shefter, J. Am. Chem. Soc. 95, 5065 (1973).
