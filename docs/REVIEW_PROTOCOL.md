# Review protocol: the suite sweep

Orbital models molecules and reactions. The standard it is held to is **what a good textbook
describes and what measurement shows**, within the idealisations we knowingly make. So after
**every new addition** (a merged PR, a data change, a new topic) the project runs a *suite
sweep*, logs what it finds, and **no new branch starts until the sweep is clean or every open
issue is triaged and logged**.

## 1. What a sweep is

```bash
npm run sweep        # = node --test  +  node scripts/sweep.mjs --write
npm run build
```

1. **Automated gates** (must all pass):
   * the full `node --test` suite (geometry, builder, mechanisms, predictor, primitives, topics,
     audience, nexus, overlays, …);
   * the **conformance suite** (`src/chem/conformance.js`, run by `tests/sweep.test.js`), which
     compares the model to the reference values in `src/chem/references/textbook.js`:
     bond lengths and angles of every built molecule (ideal VSEPR at centres without lone pairs,
     the measured `LONE_PAIR_ANGLES` value at centres with them); ring templates and VSEPR shapes
     (slot placement on ideal slots, then the measured SF₄ / ClF₃ / BrF₅ / H₂O / NH₃ / H₂S angles);
     coordination geometries; mechanism frames (atom and charge conservation, partial-bond
     monotonicity, textbook endpoint geometry, SN2 inversion, SN1 planar cation, E2
     anti-periplanar start and planar E product); energy-profile topology (number of maxima,
     rate-determining step, exergonic examples); the predictor against the textbook decision
     table; orbital normalisation and node counts; electronegativity and bond tables;
     cross-links and audience tags; and the **model boundary** checks of §6 (every displayed
     angle, length and energy carries a basis; no visible item reaches a convention).
   * `npm run build`.
2. **The sweep report** (`scripts/sweep.mjs --write` → `docs/reviews/<date>-sweep-NN.md`):
   every check with status *pass / fail / note*, plus the **known-simplifications register**
   (idealisations we accept, with the measured value next to the modelled one).
3. **Manual chemistry review** of the addition, recorded in the same report using the checklist
   below. This is the part the tests cannot do.
4. **Findings** are logged with a severity and a status, and the report ends with a decision:
   *proceed* or *hold*.

## 2. Manual chemistry checklist

For each new molecule, mechanism, diagram or data item:

- [ ] **Structure**: connectivity, formal charges, lone-pair counts, hybridisation and geometry
      match the textbook drawing; stereochemistry (R/S, E/Z, cis/trans) is correct in 3D.
- [ ] **Electron bookkeeping**: every curved arrow starts at a lone pair or bond and ends at an
      atom or bond; electrons are conserved; charges before and after each step balance.
- [ ] **Energetics**: the number of transition states and intermediates matches the step count;
      the rate-determining step is the highest barrier; endothermic steps have late (product-like)
      transition states (Hammond); illustrative numbers are labelled illustrative.
- [ ] **Kinetics and selectivity**: rate law, molecularity, regiochemistry (Markovnikov, Zaitsev
      vs Hofmann), stereochemical outcome (inversion, racemisation, syn/anti) as the textbook
      states them; the predictor's reasons name the real factors.
- [ ] **Numbers**: every quoted value (pKa, bond length, angle, IR range, BDE, dipole) traces to
      `src/chem/references/textbook.js` or the topic's `references.md`, with units.
- [ ] **Names**: IUPAC and common names are correct for the built molecule, including the
      special cases (phenol ≠ alcohol, enol, aryl/vinyl halides).
- [ ] **Audience**: facts tagged for both depths, reasoning for Learn; nothing essential hidden
      from Refresher.
- [ ] **Rendering honesty**: nothing on screen implies more than the model knows (e.g. a dashed
      partial bond is a cartoon of bond order, lone-pair lobes are schematic, isosurfaces use a
      stated |ψ| threshold), and nothing crosses the model boundary of §6.
- [ ] **Links and glossary**: new terms added; cross-links resolve; deep links tested.

## 3. Severity and status

| severity | meaning | effect |
| --- | --- | --- |
| **blocker** | wrong chemistry a student would learn (wrong product, wrong stereochemistry, wrong rate law, wrong value by more than a textbook tolerance) | fix before any new branch |
| **major** | misleading model or missing standard case (e.g. a shape with the wrong lone-pair placement, an energy profile with the wrong number of barriers) | fix before the next branch that touches the area, and log it |
| **minor** | idealisation beyond the accepted register, cosmetic inaccuracy, imprecise wording | log; fix opportunistically |
| **note** | accepted simplification, documented in the register | no action |

Status values: *open*, *fixed (commit)*, *accepted (register)*, *deferred (roadmap item)*.

## 4. When a sweep runs

* After every merge to `main` (the merging session runs it and commits the report).
* Before a topic branch opens its PR (run locally; attach the report to the PR).
* On demand, when a chemistry question comes up.

Reports live in `docs/reviews/`, numbered. A report that says *hold* blocks new branches until
a follow-up report says *proceed*.

## 5. Known-simplifications register

The model is idealised on purpose; these are the places where it deliberately differs from
measurement. New idealisations are added here with a measured value, not silently.

| area | model | measured / textbook | why accepted |
| --- | --- | --- | --- |
| Lone-pair angles: class approximations | alcohols, ethers, thiols, sulfides, acids and esters take the angle of one measured exemplar each (methanol 108.9°, dimethyl ether 111.2°, methanethiol 96.5°, dimethyl sulfide 98.9°, formic acid 106.3°, methyl formate 114.8°); `lonePairAngleTargets().basis` reports `exemplar` or `class` | the displayed molecule is usually not the exemplar (ethanol, diethyl ether; acetic acid 107°, methyl acetate 116.4°) | substituent effects of a degree or two are below the teaching level; every number traces to `src/chem/references/measured.js`, the oracle the embedder never reads |
| Amine angles | all three angles at an amine N = 106.7° (the ammonia row, as class default) | methylamine H–N–H 105.8° / C–N–H 111°, dimethylamine C–N–C 112.2°, trimethylamine 110.9° | a symmetric compression cannot show two different angles at one centre; the card quotes the range |
| Lone-pair centres outside the table | every bonded angle closes by 2.5° per lone pair (`LONE_PAIR_COMPRESSION_PER_PAIR`), reported as `basis: 'fallback'` | element-specific (TeCl₄ …); H₂Se, PH₃ and SO₂ have sourced rows | a convention (a rounded H₂O / NH₃ deficit), not a measurement; a topic that teaches such a centre adds a sourced row first |
| Methanethiol C–S–H | 96.5° (microwave structure as tabulated by Landolt-Börnstein II/7 and the CRC gas-phase table) | the NIST CCCBDB listing quotes Herzberg's 1966 compilation, 100.3° | the microwave value is kept and the discrepancy is recorded in `measured.js` |
| Carbonyl and nitro angles | 120° exactly | acetone C–C–C 116°, C–C=O 122°; nitromethane O–N–O 125.3° (CCCBDB) | idealised VSEPR is the teaching level; the cards state the measured value beside the drawn one |
| Conjugated single bonds | amide C–N 1.35, acid C–O(H) 1.36, ester C(=O)–O 1.33, nitro N–O 1.22 Å drawn from `CONJUGATED_BOND_LENGTHS` (per-bond `length`), each cited in `measured.js` | formamide / acetic acid / methyl formate / nitromethane values stand in for the whole class (N-methylacetamide is not on CCCBDB) | the element/order table was 0.1 Å off for these and the cards already quoted the short values; everything else keeps the table |
| Shape gallery angles | CH₄, CO₂, BF₃, PF₅, SF₆ and XeF₄ at the ideal VSEPR values; formaldehyde at 120° with the measured 116.1° / 121.9° stated beside it; H₂O, NH₃, H₂S, SO₂, SF₄ at their measured values | the first six are exact by symmetry; carbonyl angles differ from 120° | every angle on the card carries its status (ideal / measured / class / fallback) and the `gallery.*` conformance checks hold each one to the oracle |
| Torsional energy curves | ethane and butane E(φ) are three-term cosine fits through the textbook values (ethane 12; butane 3.8 / 16 / 20 kJ/mol) | the textbook values themselves are rounded teaching numbers (Klein gives 19 for CH₃/CH₃); real curves have slightly different shapes and the bond angles relax along the way | labelled "textbook values, curve illustrative" on the card; the frames turn one side rigidly, so bond lengths and angles are the embedder's at every dihedral |
| Cyclohexane chair energies | A-values (methyl 7.3, isopropyl 9.0, tert-butyl 20.5 kJ/mol …) and ring forms (twist-boat 23, boat 29, half-chair 45) from `A_VALUES` / `RING_CONFORMER_ENERGIES`; % equatorial = K/(1+K) with K = e^(A/RT) at 298 K; disubstituted chairs take the sum of the A-values of their axial groups, with the tabulated 1,3-diaxial CH₃/CH₃ value (`DIAXIAL_PAIRS`, 15.5 kJ/mol) in place of 2 × 7.3 where both are axial 1,3; the chair ring is the 110° template | compilations differ by 0.1–0.3 kcal/mol (solvent, method); OH is solvent dependent; tert-butyl is an estimate; the boat value is cyclohexane's own; the additive estimate neglects gauche interactions between adjacent equatorial groups and untabulated diaxial pairs (the card then says "lower estimate"); measured chair C–C–C 111.3° | the model's one planned exception under §6: tabulated values with unit and source, displayed as such, never computed from the drawn sterics; the substituent is embedded as any R group and crowding (axial tert-butyl) is flagged, not relieved |
| E2 σ/σ* alignment bar | \|cos φ\| of the Br–C–C–H dihedral | an overlap integral is not computed | a teaching cartoon, labelled as such on the card |
| Crowded R combinations | bulky substituents on one centre keep the class bond angle; the relaxer rotates bonds (greedy passes, then a joint two-bond rescue search) and never widens angles. Combinations it cannot untangle keep overlapping atoms, are flagged as `frame.crowding` (hard contacts: H···H < 1.8, H···X < 2.0, X···X < 2.5 Å) and the molecule card says so and suggests a lighter group | real molecules open their bond angles and twist (di-tert-butyl ether, di-tert-butylamine, cis-di-tert-butylethene) | no force field in this model; the notice states that the overlap is the model's limit, not the molecule's impossibility; sweep reports list the flagged counts per group |
| Energy profiles | illustrative kcal/mol shapes | measured Eₐ differ by substrate and solvent | labelled "illustrative" in the UI and data |
| Predictor percentages | heuristic tendencies | no single measured yield exists | labelled as a teaching heuristic |
| SN2 transition state | exactly symmetric, both partial bonds 0.5 | real TS is earlier or later (Hammond) | pedagogical symmetry |
| Solvent and counter-ions | only the attacking/departing species shown | solvation shells, ion pairs | clarity; mentioned in narration |
| Partial bonds and charges | linear interpolation of order and charge | nonlinear along the true reaction path | smooth animation |
| Lone pairs and p lobes | fixed-size schematic lobes; lone-pair lobes open by the mean bond compression at their centre (water LP–O–LP 114.4°) | diffuse densities; no single measured lone-pair direction | schematic, as in textbooks |
| Orbital isosurfaces | one |ψ| threshold, 48³ grid | 90 % probability surfaces | performance; threshold is stated |
| Molecular orbitals topic | MOs as ±1/√2 (diatomics) or Hückel combinations of hydrogen-like orbitals with Clementi–Raimondi exponents, overlap neglected; the 2s σ of N₂ / O₂ drawn with the 2p exponent; C–Cl σ / σ* with equal weights; diatomic ladders schematic, Hückel energies in units of β only; bond energies tabulated | real MOs are SCF results with overlap and polarised coefficients; β ≈ −75 kJ/mol if one must put a number | shapes and phases are what the lesson teaches and the sweep reads them off the functions (`mo/phases`), bond orders and magnetism follow from the textbook filling (`mo/diatomic.*`), Hückel eigenvalues are exact for the stated matrix (`mo/huckel.*`); every frame is at a cited measured length (`mo/frames.measured`) |
| Atomic orbitals topic | hydrogen-like functions at Z = 1 for every picture (gallery and sp / sp² / sp³ hybrids); hydrogen energies only (E_n = −13.6/n² eV); a schematic, unnumbered ladder for many-electron configurations | real atoms contract the orbitals (Z_eff) and split s/p/d by penetration; hybrid pictures in textbooks use node-less Slater functions | the shapes, nodes and angles are exact for the stated functions and the sweep reads them off the functions (`orbitals/gallery.*`, `orbitals/hybrid.*`); configurations are tabulated (NIST) and the generator is checked against all 36 (`orbitals/configurations.1-36`) |

## 6. Model boundary

Orbital is a **cited-geometry template engine**, not a simulator. Every number on screen is a
published measurement, an ideal value fixed by symmetry, or a tabulated textbook value, and the
conformance suite enforces that line mechanically (the `boundary.*` checks). Sterics, bond
strengths and bond lengths are where a model like this starts inventing numbers; this section
fixes where it stops. A change that crosses the line is a *blocker* by the table in §3, whatever
it looks like on screen.

**The model may**

* place atoms from VSEPR slot templates, the cited exemplar angles in `LONE_PAIR_ANGLES`, the
  element/order bond-length table and the per-bond lengths in `CONJUGATED_BOND_LENGTHS`;
* turn rigid pieces about single bonds (the torsion relaxer, the Conformations rotors). It
  rotates only: it never opens an angle or stretches a bond to make room;
* flag steric overlap as a yes/no condition (`frame.crowding`) with the contact distances stated;
* show an energy that is a tabulated textbook value with a unit and a source
  (`TORSION_ENERGIES`), or draw a profile labelled *illustrative*.

**The model never**

* computes an energy, force, strain or stability from the drawn geometry: no force field, no
  "steric energy", no derived barrier, no stability ordering read off distances;
* uses a bond strength, bond length or pKa to calculate anything else. BDEs and pKas are card
  facts, never inputs to a rate, a selectivity or a geometry;
* derives one geometry number from another except by stated symmetry or a stated idealisation
  (the ideal 120° at a carbonyl, the class value of an exemplar);
* shows a quantity it cannot cite. A number without a basis fails the sweep, it is not a note.

**Three limits, fixed after sweep 08**

* *Fallback compression* (2.5° per lone pair) is a convention, not a measurement. It is tolerated
  only in the explorer's R-combination space, where nothing claims accuracy, and the
  `boundary.<group>.lone-pair-basis` checks prove that no functional group reaches it at any
  attachment-element combination. A shape card or lesson that would reach it adds a sourced
  oracle row first or does not ship.
* *Per-bond length overrides* stop at the four conjugated bonds the cards already quoted. A new
  override is added only when a topic teaches that exact molecule, with a `MEASURED_BONDS` row;
  `boundary.bond-lengths.cited` fails otherwise.
* *Crowded R combinations* keep the flag. The remaining overlaps are not closed by widening
  angles, which would be an unparametrised force field by another name; the R menu is capped to
  groups the templates draw cleanly, or the flag stays.

**The one planned exception.** The cyclohexane chair lesson needs A-values. They enter as a
tabulated textbook table (`A_VALUES`: value, unit, source) and are displayed as such; the
axial/equatorial energy difference is never computed from the sterics of the drawn model. (Done:
`src/chem/cyclohexane.js`, checked by `conformations/chair.*` and `boundary/energies.sourced`.)

**Mechanical checks** (`boundary.*` in `src/chem/conformance.js`, all must pass):

| check | holds |
| --- | --- |
| `<group>.lone-pair-basis` | every lone-pair centre of the group has a sourced `LONE_PAIR_ANGLES` row (exemplar or class) at every attachment-element combination of its R menu |
| `shapes.angle-basis` | every gallery angle is ideal, measured or class, each with its oracle source |
| `bond-lengths.cited` | every bond drawn off the element/order table cites a `MEASURED_BONDS` row |
| `energies.sourced` | every energy is a table value with unit and source, or a profile labelled illustrative; a rotor without a table row reports none |
| `card-angles.stated` | every angle printed on a card equals the drawn angle to the label's precision, or says what is drawn |
