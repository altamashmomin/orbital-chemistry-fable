# Adding a topic

Orbital is a nexus: every chemistry topic (functional groups, mechanisms, transition metals,
atomic orbitals, HOMO/LUMO, redox, the uncertainty principle, …) is a self-contained module
that plugs into one registry. A topic branch should only ever add a folder and two lines.

Pick the next branch from [ROADMAP.md](ROADMAP.md); it says which core pieces each topic
reuses and what must land on `main` first.

## 1. Copy the template

```
src/topics/_template/   →   src/topics/<your-id>/
```

`<your-id>` is kebab-case and becomes the URL hash (`#transition-metals`). Rename the export
in `index.js` and fill in the contract (documented at the top of `src/topics/registry.js`):

| field | purpose |
| --- | --- |
| `id`, `title`, `badge`, `order` | tab label, optional BETA tag, tab position |
| `aliases` | old hashes that should still open the topic |
| `summary` | one sentence for directories and search |
| `audiences` | `['refresher', 'learn']` or a subset |
| `workspace` | `{ kind: '3d' \| 'canvas', label, badge, hints }` |
| `copy` | header text: `eyebrow`, `headline` (may contain `<em>`), `subtitle`, `note`, `noteSub` |
| `create(ctx)` | returns the panel; `ctx = { view, viewport, level }` |

The panel object provides `el` (left column), `inspector` (right column, the field guide),
`activate()`, `deactivate()`, optional `setLevel(level)`, and for `canvas` workspaces
`mountWorkspace(container)` / `unmountWorkspace(container)`.

* **`3d` topics** draw into the shared `MoleculeView` (`ctx.view`) and camera (`ctx.viewport`):
  build a frame with `src/chem/builder.js` or a parametric `frame(t)` like the mechanisms, then
  `view.setFrame(frame)`, `view.setHighlights(...)`, `viewport.fitTo(view.bounds())`.
* **`canvas` topics** own the workspace element and can draw anything (2D canvas, SVG, text).

## 2. Register it

In `src/topics/index.js` add one import and one `registerTopic(...)` line, alphabetically.
That is the only shared file a topic branch touches, which keeps parallel branches mergeable.

## 3. Tag content by audience

Two depths exist: **Refresher** (an industry chemist checking a fact) and **Learn** (a
freshman meeting it for the first time). Every collection has a default audience in
`src/chem/audience.js` (`invariants`, `identify`, `conditions` → both; `varies`, `keyIdeas`,
`keyPoints` → learn) and any item overrides it with `audience: 'both' | 'learn' | 'refresher'`;
string lists accept `{ text, audience }` objects. Use `audienceOf(item, collection)` when
rendering, and `listAudience(items, collection)` to hide a whole section only when every item is
learn-only. In the UI, tag nodes directly:

```js
import { aud } from '../../ui/dom.js';
aud(section('Why it works', ...), 'learn');       // hidden in Refresher
aud(h('p', {}, 'Rule of thumb'), 'refresher');    // hidden in Learn
```

Data items may carry `audience: 'learn' | 'refresher'` and the renderers forward it
(functional-group invariants, `varies` and `identify` entries already do). Rule of thumb:
definitions, invariants, tables, equations and tests are for both; narration, "why",
worked reasoning and hints are `learn`.

## 4. Deep links, search and the glossary

* **Deep links.** The hash is `#<topic-id>/<sub/path>`. The shell opens the topic and calls
  `panel.navigate(sub)`; implement it to select the entity (`'alcohol/acid'`, `'sn2/ts'`). Call
  `ctx.navigate('<topic-id>/<sub>')` when the user changes entity so the URL stays shareable.
  `#glossary/<term-id>` opens the glossary drawer on a term over the current topic.
* **Cross-links.** Data items may carry `links: [{ label, href }]` (functional-group invariants
  and mechanism `related` already do). Render them with `class="xlink"` anchors; any `#…` href
  routes through the shell.
* **Search.** Give the topic an `index()` returning entries
  `{ kind: 'group' | 'mechanism' | 'step' | 'item', title, snippet, href, keywords?, audience? }`.
  The header search (`/` to focus) merges every topic's entries with the glossary and filters by
  the current depth. See `src/nexus/search.js`.
* **Glossary.** Add general terms to `src/nexus/glossary.js`; add topic-specific ones as
  `glossary: [{ id, term, definition, why?, links? }]` on the topic object so they ship with the
  branch. `why` is learn-level.

## 5. Keep it honest

* Put sources in `src/topics/<id>/references.md` (textbook chapter, review, database).
* Add a data test in `tests/` (see `tests/builder.test.js` for the pattern): every entry has
  the fields it needs, numbers are finite, nothing overlaps in 3D.
* Mark anything illustrative (energies, percentages) as such in the UI text.

## 6. Branch workflow

* Branch from `main` as `topic/<id>`; rebase on `main` often.
* Changes to the shared core (`src/chem/geometry.js`, `src/render/*`, `src/ui/*`,
  `src/topics/registry.js`) go in their own small commits or PRs merged to `main` first, so
  every topic branch can use them.
* CI (`.github/workflows/ci.yml`) runs `npm test` and `npm run build` on every PR; keep it green.

## 6. Shared primitives

The core ships a few building blocks that several upcoming topics (atomic orbitals, HOMO/LUMO,
transition metals, redox) need. They are dependency-free where they can be (everything under
`src/chem/` and the layout half of `src/ui/levelDiagram.js` runs under `node --test`), and the
chemistry they encode is sourced in `src/chem/references.md`.

### Orbitals: `src/chem/orbitals.js`

Real hydrogen-like orbitals for n ≤ 3 (1s, 2s, 2p, 3s, 3p, 3d) as functions ψ(x, y, z) with phase,
two-centre σ/σ*/π/π* combinations, and grid sampling. Lengths are in Bohr radii unless you pass
`a0: A0_ANGSTROM` to work in Å next to a molecule frame.

```js
import { orbital, molecularOrbital, sampleGrid, isoValue, ORBITAL_NAMES, A0_ANGSTROM } from '../../chem/orbitals.js';

const dz2 = orbital('3dz2', { Z: 1 });              // { psi(x,y,z), extent, n, l, label: '3d𝓏²', … }
const grid = sampleGrid(dz2.psi, { size: 40, extent: dz2.extent });
const c = isoValue(grid, { probability: 0.9 });     // |ψ| level of the 90 % contour

const piStar = molecularOrbital({ type: 'pi*', basis: '2p', separation: 2.5, piDirection: [0, 1, 0] });
// or anchor it on two atoms of a frame, in Å:
const sigma = molecularOrbital({ type: 'sigma', basis: '2p', centers: [atomA.pos, atomB.pos], a0: A0_ANGSTROM });
```

`radial(n, l, r, Z, a0)` and `angular(m, x, y, z)` are exported for 2D plots (radial distribution
functions, nodal diagrams); `radialNodes(n, l)` and `angularNodes(l)` give the counts.

### Isosurfaces: `src/chem/marchingCubes.js`

`isosurface(grid, iso)` turns any scalar grid into an indexed, watertight triangle mesh
(`{ positions, normals, indices }`) whose "inside" is `values > iso`. Use `negateGrid(grid)` for
the negative lobe of a signed ψ. `meshStats(mesh)` reports boundary edges and the Euler
characteristic for tests. Keep grids at or below 48³: a 48³ orbital extracts in ~20–50 ms.

```js
import { isosurface, negateGrid } from '../../chem/marchingCubes.js';
const positiveLobe = isosurface(grid, c);
const negativeLobe = isosurface(negateGrid(grid), c);
```

### Orbital lobes in 3D: `src/render/orbitalView.js`

Draws the ±c isosurfaces as translucent, double-sided meshes, amber for the positive phase and
fuchsia for the negative one (the colours `MoleculeView` already uses for filled and empty p lobes).

```js
import { OrbitalView } from '../../render/orbitalView.js';
import { orbital } from '../../chem/orbitals.js';

const lobes = new OrbitalView(ctx.viewport, { molecule: ctx.view });   // molecule is optional
lobes.setOrbital(orbital('2pz'));                 // samples at options.size (40) and the 90 % contour
lobes.setProbability(0.7);                        // tighter surface, no resampling
lobes.setPlacement({ position: atom.pos, scale: A0_ANGSTROM });   // Bohr-unit grid inside an Å frame
lobes.setMolecule(frame);                         // forwards to the attached MoleculeView
ctx.viewport.fitTo(lobes.bounds());
lobes.setOptions({ opacity: 0.4, negative: false, wireframe: true });
lobes.dispose();                                  // in deactivate()
```

`setGrid(grid, { iso })` accepts any precomputed grid (a density, a difference map), and
`lobes.stats` reports the iso level and triangle counts after each rebuild.

### Coordination geometries: `src/chem/geometry.js`

`TEMPLATES` now includes `octahedral` (slots ±z, ±x, ±y; (0,1), (2,3), (4,5) are trans pairs) and
`squarePlanar` (±z, ±x in the xz plane). The embedder picks them for `hyb: 'oct'` / `hyb: 'sqp'`
(`d2sp3`, `sp3d2`, `dsp2` are accepted aliases) or for a steric number of 6, so ligands with their
own substituents (NH₃, en, CO) embed through the normal `embed()` → `toFrame()` path.
`complexFrame()` is the shortcut for a bare MLₙ frame with explicit ligand ids:

```js
import { complexFrame } from '../../chem/geometry.js';

const frame = complexFrame({
  metal: 'Co', id: 'Co', charge: 3, geometry: 'octahedral',
  ligands: ['N1', 'N2', 'N3', 'N4', 'N5', 'N6'],                  // ligand i → slot i
});
const cisplatin = complexFrame({
  metal: 'Pt', geometry: 'squarePlanar',
  ligands: [{ id: 'Cl1', el: 'Cl' }, { id: 'N1', el: 'N' }, { id: 'Cl2', el: 'Cl' }, { id: 'N2', el: 'N' }],  // cis: slots 0 and 2
});
ctx.view.setFrame(frame);
ctx.view.setHighlights([{ type: 'angle', center: 'Co', a: 'N1', b: 'N3', text: '90°' }]);
```

M–L lengths default to covalent-radius sums (Ti, V, Cr, Mn, Fe, Co, Ni, Cu, Zn, Pd, Pt are in
`elements.js`); pass `bondLength` or a per-ligand `length` for a specific compound.

### Reaction families: `src/chem/mechanisms/families.js`

The Reaction lab is a registry of **families** (Substitution & elimination today; Addition,
Carbonyl, Aromatic … next). A family is a tab row above the mechanism tabs; it brings its own
mechanisms and, optionally, its own "which mechanism?" predictor. A reaction branch adds one
module and two lines in `src/chem/mechanisms/index.js`; the Reaction lab, the header search and
the deep links (`#mechanisms/<mechanism-id>/<step-id>`, `#mechanisms/<family-id>`) follow.

```js
// src/chem/mechanisms/addition.js
import { hbr } from './addition/hbr.js';          // a mechanism: { id, name, fullName, frame(t), steps, energyAt, keyIdeas, conditions, related, … }
import { br2 } from './addition/br2.js';

export const additionMechanisms = { hbr, br2 };
export const addition = {
  id: 'addition', title: 'Addition', summary: 'Electrophilic addition to alkenes.',
  mechanisms: ['hbr', 'br2'],                     // tab order; ids must match the mechanism objects
  predictor: {                                    // optional
    title: 'Which product forms?', hint: 'Learn-level sentence under the title.',
    options: [
      { key: 'alkene', label: 'Alkene', choices: [{ id: 'terminal', label: 'Terminal (RCH=CH₂)' }, { id: 'internal', label: 'Internal' }], default: 'terminal' },
      { key: 'peroxide', label: 'Peroxides present', kind: 'toggle', default: false },
    ],
    predict: (env) => ({ pct: { hbr: 80, br2: 0, none: 20 }, ranked: [{ id: 'hbr', pct: 80 }, { id: 'br2', pct: 0 }], dominant: 'hbr', summary: 'Markovnikov HBr addition.', reasons: ['…'], warnings: [] }),
    colors: { hbr: '#38bdf8' },                   // bar colours; a palette fills in when absent
  },
};

// src/chem/mechanisms/index.js  (the only shared file a reaction branch touches)
registerFamily(addition, additionMechanisms);
```

`validateFamily(family, mechanisms)` lists what is wrong with a definition (unknown mechanism ids,
missing title, a predictor without `predict`); `defaultEnv(predictor)` gives the option defaults the
panel starts from; `familyOf(mechanismId)` and `listFamilies()` read the registry. The flat
`MECHANISMS` / `MECHANISM_ORDER` stay available and are built from the families in order. Test a new
family the way `tests/families.test.js` and `tests/mechanisms.test.js` do: frames sane across `t`,
no clashes, predictor table reproduced, every `related` link resolving.

### Energy-level diagrams: `src/ui/levelDiagram.js`

A canvas diagram of horizontal levels grouped in columns, with ↑↓ electron arrows, dashed
correlation lines and a highlight callback. Degenerate levels (same column, same E) are drawn side
by side automatically, which is what crystal-field splitting and degenerate π sets need.

```js
import { LevelDiagram, octahedralSplitting } from '../../ui/levelDiagram.js';

const canvas = h('canvas', { class: 'energy' });
const diagram = new LevelDiagram(canvas, { onHighlight: (level, source) => level && lobes.setOrbital(orbital(level.id)) });
diagram.set({
  columns: [{ id: 'A', label: 'O' }, { id: 'MO', label: 'O₂' }, { id: 'B', label: 'O' }],
  levels: [
    { id: 'pA', column: 'A', E: -15.9, label: '2p', electrons: 2 },
    { id: 'pi', column: 'MO', E: -17.0, label: 'π', electrons: 2 },
    { id: 'piStar', column: 'MO', E: -12.5, label: 'π*', electrons: ['up'], style: 'dashed' },
  ],
  connections: [{ from: 'pA', to: 'pi' }, { from: 'pA', to: 'piStar', style: 'dashed' }],
  yLabel: 'energy →',
});
diagram.highlight(['pi']);                // programmatic highlight (array or single id)
diagram.set(octahedralSplitting(6, { highSpin: true }));   // ready-made d⁶ crystal-field spec
```

`layoutLevels(spec, { width, height })` is the pure layout behind `draw()`; use it in tests to
assert that your diagram's levels and connections land where you expect.
