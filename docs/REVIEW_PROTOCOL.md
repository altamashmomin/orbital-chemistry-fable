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
     cross-links and audience tags.
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
      stated |ψ| threshold).
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
| Amine angles | all three angles at an amine N = 107.3° (the ammonia entry of `LONE_PAIR_ANGLES`) | measured amine angles vary with substitution, ≈ 106–112° | one entry per element / bond count / lone-pair count; substituent effects of a few degrees are below the teaching level |
| Lone-pair centres outside the table | every bonded angle closes by 2.5° per lone pair (`LONE_PAIR_COMPRESSION_PER_PAIR`) | element-specific (H₂Se 91°, PH₃ 93.5°, TeCl₄ …) | documented default; a topic that teaches such a centre adds a `LONE_PAIR_ANGLES` row first |
| Carbonyl angles | 120° exactly | acetone C–C–C 116°, C–C=O 122° | idealised VSEPR is the teaching level |
| Energy profiles | illustrative kcal/mol shapes | measured Eₐ differ by substrate and solvent | labelled "illustrative" in the UI and data |
| Predictor percentages | heuristic tendencies | no single measured yield exists | labelled as a teaching heuristic |
| SN2 transition state | exactly symmetric, both partial bonds 0.5 | real TS is earlier or later (Hammond) | pedagogical symmetry |
| Solvent and counter-ions | only the attacking/departing species shown | solvation shells, ion pairs | clarity; mentioned in narration |
| Partial bonds and charges | linear interpolation of order and charge | nonlinear along the true reaction path | smooth animation |
| Lone pairs and p lobes | fixed-size schematic lobes; lone-pair lobes open by the mean bond compression at their centre (water LP–O–LP 114.4°) | diffuse densities; no single measured lone-pair direction | schematic, as in textbooks |
| Orbital isosurfaces | one |ψ| threshold, 48³ grid | 90 % probability surfaces | performance; threshold is stated |
