# References: atomic orbitals

* Hydrogen-like wavefunctions R_nl(r)·Y(θ, φ) for n ≤ 3, their normalisation, nodes (n − l − 1 radial,
  l angular) and the real spherical harmonics chemistry draws: Atkins & de Paula, *Physical Chemistry*,
  "Atomic structure"; Atkins & Friedman, *Molecular Quantum Mechanics*, table 3.2; Griffiths & Schroeter,
  *Introduction to Quantum Mechanics*, 3rd ed., table 4.7 (`src/chem/orbitals.js`, `src/chem/references.md`).
  The pictures are the |ψ| isosurface enclosing the chosen share of the probability (90 % by default,
  the usual textbook contour); nothing is fitted.
* Radial distribution function P(r) = r²R² and the most probable radii (a₀ for 1s; n²a₀ for the
  l = n − 1 orbitals; 3 + √5 = 5.24 a₀ for the outer peak of 2s): Atkins & de Paula; the module finds
  the peaks and the radial nodes on the functions themselves and the sweep checks them against the
  closed forms (2s node at 2 a₀, 3p at 6 a₀, 3s at (9 ± 3√3)/2 a₀).
* Hydrogen energy levels E_n = −R_H/n² with R_H = 13.6 eV (CODATA 2018: hc R∞ = 13.605693 eV;
  `HYDROGEN_ENERGY` in `src/chem/references/textbook.js`). Hydrogen only: the configuration ladder for
  other atoms is schematic and carries no numbers.
* Hybrid orbitals as the stated linear combinations of 2s and 2p (sp: (s ± p𝓏)/√2; sp²: s/√3 with the
  two in-plane p; sp³: (s ± pₓ ± pᵧ ± p𝓏)/2), their s character (½, ⅓, ¼) and lobe angles (180°, 120°,
  arccos(−⅓) = 109.47°): Clayden, Greeves & Warren ch. 4; Atkins & de Paula, "Valence-bond theory".
  Drawn with hydrogen-like 2s and 2p at Z = 1 (a carbon's are contracted, same shape); the sweep reads
  the main-lobe direction off each drawn hybrid and compares the angles with the analytic values.
* Ground-state electron configurations of the elements 1–36 (`GROUND_STATE_CONFIGURATIONS`): NIST
  Atomic Spectra Database, "Ground levels and ionization energies for the neutral atoms" (2023), as
  reproduced in Atkins and the CRC Handbook. The aufbau generator (Madelung order 1s 2s 2p 3s 3p 4s 3d 4p,
  two electrons per orbital, Hund's rule for the boxes) reproduces every one of them with the two
  tabulated exceptions Cr and Cu (`AUFBAU_EXCEPTIONS`); the sweep checks all 36.
* Aufbau, Pauli and Hund at teaching level: Atkins & de Paula "Atomic structure"; Housecroft & Sharpe,
  *Inorganic Chemistry*, ch. 1.
