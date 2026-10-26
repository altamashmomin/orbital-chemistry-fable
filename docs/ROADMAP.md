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

## Phase 0 — core hardening (small PRs on `main`, before branches fan out)

These are the pieces several branches would otherwise each invent. Each is a day or less,
fully unit-testable, and lands on its own. ✅ marks a row that is merged on `main`.

| # | Core PR | Why first | Unlocks |
| --- | --- | --- | --- |
| 0a | ✅ **Mechanism families** in the Reaction lab: a family registry (Substitution & elimination, Addition, Carbonyl, Aromatic …) with family tabs, each family bringing its mechanisms and its own predictor | the Reaction lab currently hard-codes four mechanisms; every reaction branch would edit the same file | 1, 2, 5, 9 |
| 0b | ✅ **`CollectionExplorer`** extracted from the functional-group panel: chips → build controls → entity card → invariant cards → field guide, driven by a collection definition | shapes, ligands, orbitals and complexes all want this exact panel | 3, 6, 7, 10 |
| 0c | ✅ **Embedder additions**: lone-pair slot preferences (equatorial in tbp, trans in octahedral), seesaw / T-shaped / square-pyramidal shapes, cycloalkane ring templates (cyclopropane → cyclohexane chair and boat) with substituent attachment, `mirror()` helper | cheap now, invasive later; VSEPR and conformations depend on it | 3, 4, 6, 10 |
| 0d | ✅ **2D overlays**: Newman projection and wedge/dash sketch drawn from 3D coordinates onto a small canvas | stereochemistry and conformations both need them | 3, 4 |
| 0e | ✅ **Lone-pair angle compression** in the embedder (deferred from sweep 01): bonded angles at lone-pair centres close to the measured values in `LONE_PAIR_ANGLES` (H₂O 104.5°, NH₃ 107.3°, CH₃OH 108.5°, Me₂O 111.7°, CH₃SH 96.5°, SF₄ 173°/102°, ClF₃ 175°, BrF₅ 85°), 2.5° per lone pair elsewhere; register updated | the shapes topic would otherwise teach 109.5° for water | 6 |

**Phase 0 is complete** (PRs #2, #3, #4, #5 and the 0e PR): topic branches can start from
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
| 4 | `topic/conformations` — ethane/butane Newman, torsional energy, cyclohexane chair ↔ boat, axial/equatorial, A-values | torsion-driven `frame(t)`, `EnergyDiagram` as a torsional profile, ring templates, Newman overlay | conformer energy table | medium (chair authoring, but geometry tests catch it) |
| 5 | `topic/acids-bases` — pKa ladder, conjugate pairs, "which way does the equilibrium go", the five factors (element, resonance, induction, hybridisation, size) | FG pKa data already in cards, `LevelDiagram` as a pKa ladder, a proton-transfer `frame(t)`, glossary | pKa table + comparison helper | low |

## Phase 2 — primitive-backed topics (orbitals, diagrams, coordination)

Built on the primitives merged in PR #1. Ordered by dependency: shapes before orbitals,
orbitals before MOs, oxidation states before transition metals.

| order | branch | reuses | new | risk |
| --- | --- | --- | --- | --- |
| 6 | `topic/hybridization-shapes` — VSEPR gallery (2–6 domains with lone pairs), bond-angle effects, sp³/sp²/sp hybrid lobes | embedder (+0c), `CollectionExplorer`, `OrbitalView` via `lcao()` for hybrid lobes, angle/plane highlights | shapes data | low |
| 7 | `topic/atomic-orbitals` — s/p/d isosurfaces, nodes, quantum numbers, electron configurations (aufbau, Hund, Pauli), periodic trends | `orbitals.js`, `OrbitalView`, `LevelDiagram` | electron-configuration generator (pure), orbital explorer panel | low–medium (GPU budget: keep grids ≤ 48³) |
| 8 | `topic/molecular-orbitals` (HOMO / LUMO) — H₂/He₂, N₂/O₂ (paramagnetism), ethylene π/π*, butadiene, C=O π* and C–X σ* as the LUMOs behind the mechanisms | `lcao()` / `molecularOrbital()`, `LevelDiagram`, links to Reaction lab | small Hückel solver (pure, tested), MO-diagram builder | medium (keep it qualitative) |
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
