# Roadmap: the branch pipeline

Orbital grows one topic branch at a time. This pipeline orders the branches by **how much of
the existing engine each one reuses** and **how little new, hard-to-test code it needs**. The
rule behind the order: make the shared core serve as many branches as possible first, then
finesse the branches that fit the architecture least.

## What the core already provides

| Layer | Reusable pieces | Used by |
| --- | --- | --- |
| Molecule engine (`src/chem/`) | graph → VSEPR embedder (tetrahedral, trigonal, linear, tbp, octahedral, square planar) with measured lone-pair angles, rigid ring templates, pinned atoms, torsion relaxation, builder (core + R groups), bond-length and element tables | anything that shows a molecule |
| Reaction engine (`src/chem/mechanisms/`) | parametric `frame(t)` with partial bonds, charges, arrows, steps, cues, energy profiles; `System` builder; predictor pattern; Cinematic animator | any mechanism or dynamic process |
| Renderers (`src/render/`) | `MoleculeView` (ball-and-stick, lone pairs, p lobes, 9 highlight types), `OrbitalView` (phase-coloured isosurfaces, LCAO), viewport + camera | 3D topics |
| Diagrams (`src/ui/`) | `EnergyDiagram` (reaction coordinate), `LevelDiagram` (levels, electrons ↑↓, correlation lines) | energetics, MO, crystal field, pKa / E° ladders |
| Shell (`src/topics/`, `src/nexus/`) | registry, 3d / canvas workspaces, Refresher / Learn tagging, deep links, search `index()`, glossary contributions | every topic |
| Content pattern | invariants vs "what R changes", recognise-it notes, decision tables with reasons | explorer-style topics |

## Map: what a learner sees and what it runs on

Built from the code on `main` (2026-10-27). *Runs on* is runtime reuse (imports); *teaches toward* is a
conceptual link (a deep link or a sentence in a card), not code.

| Topic (status) | Runs on | Teaches toward |
| --- | --- | --- |
| **Functional groups** 👁 | `CollectionExplorer`, builder + R groups, embedder (lone-pair angles, crowding flag), `MoleculeView` highlights, search / glossary | Molecular shapes explain its bent and pyramidal centres; the Reaction lab shows its halides and alcohols reacting |
| **Molecular shapes** 👁 | `src/chem/shapes.js` on the embedder, `CollectionExplorer`, `MoleculeView` angle / plane / lone-pair highlights, wedge-dash overlay (readable without WebGL), `measured.js` citations | Functional-group geometry cards; SN2 inversion and the planar SN1 cation; Conformations next |
| **Conformations** 👁 | `src/chem/conformations.js` on the embedder (rigid turn of one side of a bond), Newman overlay, a torsion-energy canvas, `TORSION_ENERGIES` | the E2 anti-periplanar start of the Reaction lab (checked equal in the sweep); gauche butane → the 1,3-diaxial interaction and the A-values of the cyclohexane chair |
| **Atomic orbitals** 👁 | `src/chem/atomicOrbitals.js` on `orbitals.js`, `OrbitalView` (up to four lobes), `CollectionExplorer`, a radial-distribution canvas, `LevelDiagram` boxes, `GROUND_STATE_CONFIGURATIONS` | the sp³ / sp² / sp hybrids behind Molecular shapes and the functional-group geometries; the 3p lone pairs of halides and thiols; the d orbitals the transition-metal topic will split |
| **Molecular orbitals** 👁 | `src/chem/molecularOrbitals.js` on `orbitals.js` (two-centre σ / π, Hückel combinations), `OrbitalView` over the molecule frame, `LevelDiagram` (click a level), `DIATOMIC_MO`, `HUCKEL_PARAMETERS`, `SLATER_ZEFF`, measured frames | the π bond of the alkene cards, the carbonyl π* behind nucleophilic addition, the C–Cl σ* behind SN2 in the Reaction lab, the p and sp² lobes of Atomic orbitals |
| **Reaction lab** 👁 | mechanism families, `frame(t)` with pinned atoms, Cinematic animator, `EnergyDiagram`, predictor | the tetrahedral centre and planar carbon of Molecular shapes; E2's anti-periplanar geometry explained in Conformations |
| Shared support ✅ (merged, no tab yet) | orbitals + isosurfaces + `OrbitalView` (#1), coordination frames, `LevelDiagram`, ring templates / `mirror()` / dihedrals (#4), Newman projection (#5), lone-pair angle table + oracle (#7), steric rescue + `frame.crowding` (#8), WebGL fallback | Conformations (Newman, chair), Hybridisation / orbitals, Transition metals |
| Planned | `_template` topic as the starting point | see the learning sequence below |

## Learning sequence (ordered by learning value)

The tabs follow this order; the pipeline tables further down are ordered by implementation ease and
dependency, which is a different question.

1. **Functional groups** — recognise the pattern, separate what never changes from what R tunes. 👁
2. **Molecular shapes** — why those centres are bent, pyramidal or flat; measured angles next to the
   ideal ones; predict-observe-explain. 👁
3. **Conformations** — ethane and butane with synchronized 3D and Newman views and the torsional
   energy curve, then the E2 anti-periplanar geometry on 2-bromobutane. 👁 The cyclohexane chair
   (ring templates exist) is the next lesson once this one has been used.
4. **Reaction lab: substitution and elimination** — now explained by 2 and 3 (inversion through the
   tetrahedron, the planar cation, anti-periplanar E2). 👁
5. Addition and carbonyl chemistry, then stereochemistry and acids / bases (Phase 1 below).
6. Orbitals, molecular orbitals, redox and transition metals (Phase 2), then the canvas topics (Phase 3).

Reassess after 3 using the teaching gaps the first three topics expose; do not start later milestones
automatically.

## Phase 0 — core hardening (small PRs on `main`, before branches fan out)

These are the pieces several branches would otherwise each invent. Each is a day or less,
fully unit-testable, and lands on its own. Status marks, here and below: 🔧 implemented on a branch ·
🔍 reviewed (a sweep report says *proceed*) · ✅ merged on `main` · 👁 visible as a topic in the app.

| # | Core PR | Why first | Unlocks |
| --- | --- | --- | --- |
| 0a | ✅ **Mechanism families** in the Reaction lab: a family registry (Substitution & elimination, Addition, Carbonyl, Aromatic …) with family tabs, each family bringing its mechanisms and its own predictor | the Reaction lab currently hard-codes four mechanisms; every reaction branch would edit the same file | 1, 2, 5, 9 |
| 0b | ✅ **`CollectionExplorer`** extracted from the functional-group panel: chips → build controls → entity card → invariant cards → field guide, driven by a collection definition | shapes, ligands, orbitals and complexes all want this exact panel | 3, 6, 7, 10 |
| 0c | ✅ **Embedder additions**: lone-pair slot preferences (equatorial in tbp, trans in octahedral), seesaw / T-shaped / square-pyramidal shapes, cycloalkane ring templates (cyclopropane → cyclohexane chair and boat) with substituent attachment, `mirror()` helper | cheap now, invasive later; VSEPR and conformations depend on it | 3, 4, 6, 10 |
| 0d | ✅ **2D overlays**: Newman projection and wedge/dash sketch drawn from 3D coordinates onto a small canvas | stereochemistry and conformations both need them | 3, 4 |
| 0f | ✅ **Crowded-R handling**: a joint two-bond rescue search in the torsion relaxer for simultaneous bulky substituents, `stericContacts()` / `frame.crowding` for what it cannot untangle, and an honest notice on the molecule card (sweep 02 finding 4) | the explorer drew di-tert-butyl ether and tri-tert-butylamine with overlapping hydrogens | 3, 4 |
| 0e | ✅ **Lone-pair angle compression** in the embedder (deferred from sweep 01): bonded angles at lone-pair centres close to one cited exemplar per row in `LONE_PAIR_ANGLES` (H₂O 104.5°, NH₃ 106.7°, CH₃OH 108.9°, Me₂O 111.2°, CH₃SH 96.5°, HCOOH 106.3°, SF₄ 173.1°/101.6°, ClF₃ 174.9°, BrF₅ 84.8°; oracle in `references/measured.js`), 2.5° per lone pair elsewhere; register updated — PR #7 | the shapes topic would otherwise teach 109.5° for water | 6 |

**Phase 0 is complete** (PRs #2, #3, #4, #5 and #7): topic branches can start from
`main`; each primitive is documented with a snippet in [ADDING_A_TOPIC.md](ADDING_A_TOPIC.md) §6.

## Phase 1 — pure reuse of the molecule and reaction engines

Highest reuse, lowest bug surface: new *data* in existing shapes, plus pure algorithms with
unit tests. These also stress the architecture while it is still easy to adjust.

| order | branch | reuses | new (all pure JS, tested) | risk |
| --- | --- | --- | --- | --- |
| 1 | `topic/addition-reactions` — HBr (Markovnikov via carbocation), Br₂ (bromonium, anti), acid-catalysed hydration, hydroboration–oxidation (syn, anti-Markovnikov), catalytic hydrogenation | `frame(t)`, steps, energy, animator, predictor pattern, Cinematic | mechanism data; regio/stereo predictor for the family | low |
| 2 | `topic/carbonyl-chemistry` — nucleophilic addition (hydride, Grignard, cyanohydrin, hemiacetal) and nucleophilic acyl substitution (tetrahedral intermediate; Cl > anhydride > ester > amide) | same as 1; links from aldehyde/ketone/ester cards | mechanism data; reactivity-order predictor | low |
| 2b | `topic/aromatic-substitution` — nitration, bromination, Friedel–Crafts alkylation/acylation via the arenium (Wheland) intermediate; ortho/para vs meta directing effects as a predictor | benzene rigid template, `frame(t)`, `EnergyDiagram` (aromaticity lost then regained), links from the arene cards | mechanism data; directing-effects predictor | low–medium |
| 3 | `topic/stereochemistry` — chirality, R/S, enantiomers vs diastereomers, meso; ties to SN1 racemisation and SN2 inversion | builder, `MoleculeView`, `CollectionExplorer`, `mirror()`, wedge/dash overlay | CIP priority algorithm (graph-based, exhaustively testable) | low–medium |
| 4 | 👁 `topic/conformations` — ethane/butane Newman + torsional energy + the E2 anti-periplanar rotor (PR #10); cyclohexane chair ↔ flipped chair ↔ boat with one substituent, axial/equatorial, 1,3-diaxial contacts and tabulated A-values (`topic/cyclohexane-chair`); disubstituted rings, cis/trans 1,2 / 1,3 / 1,4, both chairs by the additive A-value estimate (`topic/disubstituted-rings`) | rigid bond turn on the embedder, Newman overlay, a torsion canvas, ring templates (chair, flipped chair, boat) | `TORSION_ENERGIES`, `A_VALUES`, `DIAXIAL_PAIRS`, `RING_CONFORMER_ENERGIES` (textbook values) | done |
| 5 | `topic/acids-bases` — pKa ladder, conjugate pairs, "which way does the equilibrium go", the five factors (element, resonance, induction, hybridisation, size) | FG pKa data already in cards, `LevelDiagram` as a pKa ladder, a proton-transfer `frame(t)`, glossary | pKa table + comparison helper | low |

## Phase 2 — primitive-backed topics (orbitals, diagrams, coordination)

Built on the primitives merged in PR #1. Ordered by dependency: shapes before orbitals,
orbitals before MOs, oxidation states before transition metals.

| order | branch | reuses | new | risk |
| --- | --- | --- | --- | --- |
| 6 | 👁 `topic/molecular-shapes` — VSEPR gallery (2–6 domains with lone pairs), measured vs ideal angles with their status, predict-observe-explain activities (PR #9); the sp³/sp²/sp hybrid lobes via `OrbitalView` / `lcao()` are left for the orbitals topic | embedder (+0c, +0e), `CollectionExplorer`, angle/plane highlights, wedge-dash overlay | `src/chem/shapes.js` | low |
| 7 | 👁 `topic/atomic-orbitals` — 1s–3d isosurfaces with the radial distribution, nodes and hydrogen energies; sp / sp² / sp³ hybrids as stated combinations; electron configurations 1–36 (aufbau, Hund, Pauli, the Cr / Cu exceptions) with box diagrams, checked against the NIST table. Periodic trends (radii, ionisation energies) deferred: they need a tabulated data set of their own | `orbitals.js`, `OrbitalView`, `LevelDiagram`, `CollectionExplorer` | `src/chem/atomicOrbitals.js` (pure: RDF, hybrids, configuration generator) | done |
| 8 | 👁 `topic/molecular-orbitals` — H₂ / He₂, N₂ / O₂ (paramagnetism), ethene π / π*, butadiene, the carbonyl π* and the C–Cl σ* as the LUMOs behind the mechanisms; frames at measured lengths, a Jacobi Hückel solver, MO diagrams you click to draw the orbital | `lcao()` / `molecularOrbital()`, `OrbitalView` over `MoleculeView`, `LevelDiagram`, `CollectionExplorer`, links to the Reaction lab | `src/chem/molecularOrbitals.js` (pure: Hückel, diatomic filling, frames, ψ builders) | done |
| 9 | `topic/redox` — **phase A**: oxidation states from any molecular graph, redox vs non-redox classification of the reactions already in the app, half-reactions and balancing in acid/base; **phase B** (canvas): galvanic cells, E° ladder on `LevelDiagram`, Nernst | FG data, `LevelDiagram`, canvas workspace | oxidation-state assigner and half-reaction balancer (algorithmic, unit-tested) | medium (balancer edge cases) |
| 10 | `topic/transition-metals` — ML₆/ML₄ complexes, ligand library (monodentate first, then en/acac as rigid templates), d-electron count, crystal-field splitting (oct/tet/sqp) with high/low spin, spectrochemical series, colour and magnetism, cis/trans and fac/mer isomers | `complexFrame`, octahedral / square-planar templates, d-orbital `OrbitalView`, `LevelDiagram`, `CollectionExplorer`, oxidation states from 9 | ligand fragments, CFSE calculator, spectrochemical data | medium–high (most new data; bidentate geometry) |

## Phase 3 — finesse: canvas-workspace and physics-flavoured topics

These reuse the shell, search, glossary and `LevelDiagram` but little of the molecule engine.
They live in `canvas` workspaces with their own small simulation code, so they cannot
destabilise the 3D topics. Develop them from the `_template` topic; do not bend
`MoleculeView` to fit them.

| order | branch | reuses | new | risk |
| --- | --- | --- | --- | --- |
| 11 | `topic/kinetics-thermodynamics` — rate laws, Arrhenius, Hammond postulate, ΔG/K, catalysis on a reaction coordinate | `EnergyDiagram`, mechanism steps, predictor vocabulary | interactive plots, calculators | low–medium |
| 12 | `topic/uncertainty-principle` (quantum basics) — particle in a box (the template's standing wave is the seed), Gaussian wave packets and Δx·Δp, de Broglie wavelength | canvas workspace, template, `LevelDiagram` for box levels | numeric mini-engine (closed-form packets, no FFT) | medium (numerics), but zero coupling: can run in parallel with anything |
| 13 | `topic/spectroscopy` — IR and ¹H NMR interpretation; predicted stick spectra for molecules built in the explorer from the recognise-it data | FG `identify` data, builder | fragment → signal tables, spectrum canvas | medium–high (accuracy expectations) |
| 14 | `topic/periodic-trends`, `topic/intermolecular-forces` — periodic table canvas; IMF needs multi-molecule scenes and simple dynamics (a new engine) | shell, glossary | periodic data; particle sim for IMF | low (trends) / high (IMF) |

## Cross-cutting features (slot in at any phase)

* **Carbocation rearrangements** (1,2-hydride and methyl shifts): an extra optional step in the
  SN1, E1 and addition frames plus a "will it rearrange?" check in those predictors. Data-only
  once Phase 1 exists.
* **Quiz mode** on the Learn layer: "which mechanism / which product / assign R or S / count
  d electrons", with the topic's predictor or algorithm as the answer key. Build it once as a
  shell feature after two or three predictors exist (after branch 3).
* **Worked examples** per topic, tagged Learn, deep-linking into the exact view.

## Dependency graph

```
0a ─┬─ 1 addition ─── 2 carbonyl ─── 2b aromatic ──────┐
    └─ 5 acids-bases                                   ├─ 11 kinetics
0b ─┬─ 3 stereochemistry (needs 0c mirror, 0d)         │
    ├─ 6 shapes (needs 0c) ─ 7 atomic orbitals ─ 8 MOs ┘
    └─ 10 transition metals (needs 7, 9A)
0c ─── 4 conformations (needs 0d)
9A redox (oxidation states) ─ 9B cells ─ 10
12 uncertainty, 13 spectroscopy, 14 trends: independent, any time after the shell (done)
```

Branches with no edge between them can run in parallel; they touch different folders and
only share the two-line registration in `src/topics/index.js`.

## Working rules that keep resistance low

1. **Core first, in its own PR.** Anything two branches would both need goes to `main`
   before either branch starts (Phase 0 list above, and whatever else turns up).
2. **One folder per topic.** `src/topics/<id>/` plus pure modules in `src/chem/<id>.js` when
   the chemistry is reusable; one import + one `registerTopic` line; nothing else shared.
3. **Pure before pixels.** Every algorithm (CIP, oxidation states, electron configurations,
   Hückel, balancer, CFSE) is a dependency-free module with `node --test` coverage before a
   panel renders it.
4. **Geometry is tested, not eyeballed.** Every new frame or template goes through the clash
   and bond-length tests (`tests/helpers.js`), every link through the resolver test, every
   data item through the audience test.
5. **Canvas topics stay in canvas.** Physics topics own their workspace; the shared surface
   is `LevelDiagram` and the shell, nothing in `MoleculeView`.
6. **Depth from day one.** Tag content Refresher/Learn as it is written; add a `references.md`
   and glossary terms with the branch, not after.
7. **Green CI to merge.** Squash-merge, delete the branch, rebase the next one on `main`.
8. **Sweep after every addition.** Run `npm run sweep`, complete the manual chemistry checklist,
   log findings in `docs/reviews/`, and start no new branch while a report says *hold*
   (`docs/REVIEW_PROTOCOL.md`).
9. **Templates, not physics.** The model places atoms from cited geometry and tables and turns
   bonds; it never computes an energy, strain or stability, never widens an angle to make room,
   and never shows a number it cannot cite (`docs/REVIEW_PROTOCOL.md` §6, enforced by the
   `boundary.*` conformance checks). New physics-flavoured ideas enter as tabulated textbook
   values or not at all.
