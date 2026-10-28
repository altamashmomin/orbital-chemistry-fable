# References: molecular shapes

* VSEPR and the domain-counting rule, lone pairs taking equatorial positions in a trigonal bipyramid
  and trans positions in an octahedron, the "lone pairs repel more than bonding pairs" picture:
  Gillespie & Hargittai, *The VSEPR Model of Molecular Geometry* (Allyn & Bacon, 1991); Atkins & Jones,
  *Chemical Principles*, ch. 3; Housecroft & Sharpe, *Inorganic Chemistry*, 5th ed., ch. 2.
* Every displayed angle is either fixed by symmetry (CH₄, CO₂, BF₃, PF₅, SF₆, XeF₄) or measured, with the
  measurement cited in `src/chem/references/measured.js` (NIST CCCBDB experimental-geometry listings):
  H₂O 104.5°, NH₃ 106.7°, H₂S 92.1°, SO₂ 119.5°, SF₄ 173.1° / 101.6°. The card says which it is; the
  conformance suite checks both.
* Formaldehyde is drawn at the ideal 120° and labelled with the measured H–C–H 116.1° and H–C=O 121.9°
  (Gurvich, Veyts & Alcock 1989, via CCCBDB): carbonyl angles are an accepted idealisation in the
  known-simplifications register (`docs/REVIEW_PROTOCOL.md`).
* The small angles of H₂S, thiols and phosphine (bonding with nearly pure p orbitals, little s
  mixing on heavier atoms): Bent, *Chem. Rev.* 61, 275 (1961); Clayden, Greeves & Warren,
  *Organic Chemistry* 2e, ch. 4 (hybridisation and bond angles). The topic states this as the
  teaching-level reason and leaves the quantitative treatment to a later orbitals topic.
* Five- and six-domain examples are explained by domain counting only; the app does not claim an sp³d /
  sp³d² hybridisation model for them (the modern view is that d orbitals play little part).
