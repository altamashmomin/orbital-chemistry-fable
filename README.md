# Orbital Chemistry

An interactive 3D organic-chemistry tutor for students doing their own homework.

* **Functional-group explorer.** Fifteen functional groups, each with swappable R groups
  (H, methyl, ethyl, isopropyl, tert-butyl, phenyl, benzyl, vinyl, allyl, CF₃) on every
  attachment point. For every group the app separates **what is always true for every member
  of the class** (geometry, lone pairs, polarity, acidity, the reactions it must undergo) from
  **what the R group tunes** (degree, sterics, conjugation, boiling point…). Click an
  invariant and it is highlighted in 3D: bonds, angles, planes, lone pairs, p orbitals,
  dipoles and partial charges.
* **Reaction lab.** SN2, SN1, E2 and E1 as continuous 3D animations you can play, step
  through or scrub, with curved electron-pushing arrows, forming/breaking (dashed) bonds,
  charges, lone pairs, the planar carbocation with its empty p orbital, the anti-periplanar
  geometry of E2 and the Walden inversion of SN2, plus a live reaction-coordinate diagram.
  The default **Cinematic** animator adds checkpoint holds at transition states, animated
  electron flow, bond-change cues and a gently guided camera; the plain tween is still
  available from the Animator dropdown.
* **"Which mechanism will my reaction follow?"** Set substrate, nucleophile/base, solvent,
  temperature and leaving group from a homework problem; the predictor applies the standard
  decision table, shows the SN2 / SN1 / E2 / E1 tendencies, explains every factor and jumps
  to the matching animation.
* **Two depths.** A Refresher/Learn switch in the header: Refresher keeps the facts, tables and
  invariants for someone who has done this before; Learn adds narration, reasoning and hints
  for someone meeting the topic for the first time. Content opts in per item.
* **Topic registry.** Every topic is a folder under `src/topics/` registered with one line;
  tabs, routing, header copy and the workspace come from the registry. New topics (transition
  metals, atomic orbitals, HOMO/LUMO, redox, …) arrive as `topic/<id>` branches; see
  `docs/ADDING_A_TOPIC.md`.
* **Pluggable animation layer.** All motion goes through an `Animator` interface, so new
  animators can be dropped in without touching the chemistry
  (see `docs/ANIMATION_API.md`; `docs/CHATGPT_ANIMATION_PROMPT.md` is the brief the first
  cinematic animator was built from and can be reused for a refinement pass).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # geometry, builder, mechanism and predictor tests (node --test)
npm run build      # static site in dist/
```

Requires Node 18+ and a browser with WebGL2.

## How it is built

```
src/
  chem/                      pure JavaScript, no Three.js, runs in Node for tests
    elements.js              CPK colours, radii, electronegativity, bond-length table
    geometry.js              vector math + VSEPR embedder (tetrahedral / trigonal / linear /
                             octahedral / square-planar slots, staggered & planar torsions, rigid
                             ring templates, pinned atoms for reaction frames, torsion relaxation,
                             complexFrame() for MLₙ complexes)
    orbitals.js              hydrogen-like orbitals (n ≤ 3) with phase, σ/π combinations, grid sampling
    marchingCubes.js         watertight isosurface extraction (marching tetrahedra), mesh checks
    references.md            sources for the chemistry encoded in the shared core
    rGroups.js               R-group fragments (benzene template included)
    functionalGroups.js      the 15 groups: core graph, attachment points, invariants with
                             3D visual specs, what varies with R, spectroscopy / tests
    builder.js               FG + R choices → molecular graph → embedded render frame
    mechanisms/
      frameUtils.js          System builder, schedules, energy profiles, fragments
      sn2.js sn1.js e2.js e1.js   parametric frame(t), steps, arrows, narration, energy
      predictor.js           environment → mechanism tendencies with reasons
  render/
    scene.js                 Three.js viewport, lights, OrbitControls, CSS2D labels
    moleculeView.js          ball-and-stick renderer: partial bonds, lone pairs, p orbitals,
                             charge labels, electron arrows, teaching highlights
    orbitalView.js           phase-coloured |ψ| isosurfaces (orbitals, σ/π MOs) next to a frame
  anim/
    Animator.js              the animator contract (documented)
    DefaultAnimator.js       plain eased tween (baseline)
    CinematicAnimator.js     default: electron flow, holds at energy maxima, bond cues, camera
    pacing.js                timeline builder shared by the cinematic animator and its tests
    index.js                 registry; window.OrbitalChemistry.registerAnimator()
  topics/
    registry.js              the topic contract, validation, directory, hash resolution
    index.js                 one import + one registerTopic line per topic
    functional-groups/       panel.js (controls + field guide), index.js (metadata), references.md
    mechanisms/              panel.js (transport, steps, narration, predictor), index.js, references.md
    _template/               copy-me topic with a canvas workspace (not registered)
  ui/
    dom.js                   DOM helpers incl. aud() audience tagging
    level.js                 Refresher/Learn state
    energyDiagram.js         reaction-coordinate canvas
    levelDiagram.js          energy-level diagram: columns, ↑↓ electrons, correlation lines, highlight
  main.js, style.css, index.html
tests/                       node --test suites (geometry, builder, mechanisms, predictor, cinematic pacing,
                             topics, orbitals, marching cubes, coordination, level-diagram layout)
docs/                        adding a topic, animation API, ChatGPT handoff prompt
.github/workflows/ci.yml     npm test + npm run build on every push to main and every PR
```

### Modelling choices

* Geometries are **idealised VSEPR** (109.5°, 120°, 180°, textbook bond lengths), not
  optimised structures. That is the right level for teaching hybridisation and shape.
* Reaction frames are parametric: the reacting atoms are placed explicitly as functions of
  the reaction coordinate `t` (bond distances, umbrella angle, planarisation), and the
  embedder fills in the spectator atoms each frame. Bonds carry a `partial` strength that is
  rendered as a dashed/amber bond, and charges are numeric so δ+/δ− appear and fade.
* Energy profiles are **illustrative** (shapes and relative barrier heights are textbook-like,
  numbers are not measured values).
* The predictor's percentages are a **teaching heuristic** that reproduces the standard
  substrate × reagent decision table with solvent, temperature and leaving-group modifiers.

## Adding a topic

Copy `src/topics/_template/`, rename it, fill in the contract, add two lines to
`src/topics/index.js`. Full guide: [docs/ADDING_A_TOPIC.md](docs/ADDING_A_TOPIC.md).

## Roadmap

* More mechanisms: electrophilic addition to alkenes, nucleophilic acyl substitution,
  electrophilic aromatic substitution, carbocation rearrangements.
* Newman-projection overlay for E2; stereodescriptor (R/S) computation from 3D.
* Quiz mode: "which mechanism?" with the predictor as the answer key.

## License

MIT
