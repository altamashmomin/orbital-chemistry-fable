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
* Stay inside the model boundary (`docs/REVIEW_PROTOCOL.md` §6): geometry from cited tables and
  templates, energies only as tabulated textbook values with a source, no quantity computed from
  the drawn model. A lone-pair centre your topic shows needs a sourced `LONE_PAIR_ANGLES` row,
  never the fallback; a bond drawn off the table needs a `MEASURED_BONDS` row; an angle printed
  on a card must match the drawn one or say what is drawn. The `boundary.*` checks fail otherwise.

## 6. Branch workflow

* Branch from `main` as `topic/<id>`; rebase on `main` often.
* Changes to the shared core (`src/chem/geometry.js`, `src/render/*`, `src/ui/*`,
  `src/topics/registry.js`) go in their own small commits or PRs merged to `main` first, so
  every topic branch can use them.
* CI (`.github/workflows/ci.yml`) runs `npm test`, the conformance report and `npm run build` on
  every PR; keep it green.
* Before opening the PR run `npm run sweep`, fill in the manual checklist in the generated
  `docs/reviews/` report and commit it with the branch (`docs/REVIEW_PROTOCOL.md`). Put every
  number you quote in `src/chem/references/textbook.js` or the topic's `references.md`.

## 5b. Without WebGL

`main.js` wraps `createViewport()`: when WebGL is unavailable (or the page is opened with `?nowebgl`
for testing) panels receive a viewport stub and a `FallbackMoleculeView` (`src/render/fallback.js`)
that only remembers the frame, and the workspace shows a notice. Keep a topic readable in that mode:
put the facts in cards, not only in the 3D view, and draw a 2D sketch where the structure matters
(`drawWedgeDash(canvas, built.frame)` as the Molecular shapes card does). `mountWorkspace`
topics draw into their own canvas and are unaffected.

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

### Collection explorers: `src/ui/collectionExplorer.js`

The functional-group panel is a `CollectionExplorer`: a left column of **chips → build controls →
(footer)** and an inspector of **entity card → invariant cards → field guide**, with selection,
deep links (`#<id>/<item>/<invariant>`) and the standard 3D wiring handled for you. Shapes,
ligands, orbitals and complexes want the same panel, so describe the collection and let the
explorer render it:

```js
import { CollectionExplorer } from '../../ui/collectionExplorer.js';
import { h, select, section, aud } from '../../ui/dom.js';

const shapes = {
  id: 'shapes',                                             // hash head: #shapes/<item>/<invariant>
  items: SHAPE_ORDER.map((id) => SHAPES[id]),               // chip order; each item has an id and a name
  chips: (s) => ({ pattern: s.formula, name: s.name, color: s.color }),
  initialState: (s) => ({ lonePairs: s.defaultLonePairs }),  // mutable per-item state (reset when the item changes)
  build: (s, state) => ({ frame: shapeFrame(s, state), title: s.name }),   // `frame` → ctx.view, `title` → workspace heading
  controls: (s, state, api) => [                            // the "Build" section; call api.update() after a change
    h('div', { class: 'row' }, h('label', {}, 'Lone pairs'), select(s.lonePairOptions, state.lonePairs, (v) => { state.lonePairs = Number(v); api.update(); })),
    aud(h('div', { class: 'hint' }, 'Learn-level hint.'), 'learn'),
  ],
  card: (s, state, built) => [h('div', { class: 'mol-pattern' }, s.formula), h('div', { class: 'mol-name' }, s.name)],
  invariants: (s) => s.invariants,                          // [{ id, title, detail, links?, visuals?, audience? }]: cards with highlights, cross-links, audience tags
  guide: (s, api) => [                                      // field-guide sections; api.live(fn) re-renders a block on every update
    section('Angles', api.live((state, built) => h('p', {}, `${built.angle}°`))),
  ],
  titles: { build: 'Choose the electron domains', invariants: (s) => `Always true for ${s.name}` },
};

create: (ctx) => new CollectionExplorer(shapes, { view: ctx.view, viewport: ctx.viewport, navigate: ctx.navigate, level: ctx.level, footer: () => viewSection });
```

The explorer object is a complete panel (`el`, `inspector`, `activate`, `deactivate`, `setLevel`,
`navigate`); wrap it in a class when you need your own `activate()` (view options, auto-rotate) as
`src/topics/functional-groups/panel.js` does. Selecting an invariant applies its `visuals` through
`view.setHighlights()` (override with `highlights(invariant, item, state, built)`), and `onChange(ctx)`
fires after every update for anything else. `validateCollection()` lists definition mistakes;
`tests/collectionExplorer.test.js` shows how to exercise a panel under `node --test` with the fake
DOM in `tests/fakeDom.js`.

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

### Shapes, rings and mirror images: `src/chem/geometry.js`

**Lone-pair placement.** The embedder now reserves slots for lone pairs before substituents:
equatorial slots in a trigonal bipyramid, a trans pair in an octahedron. So a centre described by
its lone-pair count alone comes out right: `{ el: 'S', lonePairs: 1 }` with four fluorines is a
seesaw, `ClF₃` (two lone pairs) is T-shaped, `BrF₅` square pyramidal and `XeF₄` square planar.
`vseprShape(nBonds, nLonePairs)` gives the vocabulary (`{ steric, kind, shape, angles }`) and
`lonePairSlots(kind, freeSlots, n)` is the preference table behind it.

**Lone-pair angles.** A centre that keeps lone pairs in directional slots does not show the ideal
slot angle: after the slots are assigned the embedder closes its bonded directions toward each other
(symmetrically, so the first placed neighbour and the torsion stay put) until they meet the angle in
`LONE_PAIR_ANGLES` (`src/chem/references/textbook.js`), keyed `El/nBonds/nLonePairs[:sp2][/neighbours]`
by the lone-pair count *as drawn* (`atom.lonePairs`), with `:sp2` for a planar centre that keeps one
lone pair in its p orbital (the ester / acid oxygen) and an optional sorted-neighbour suffix: water
`O/2/2/H,H` 104.5°, alcohols `O/2/2/C,H` 108.9° (methanol), ethers 111.2°, amines `N/3/1` 106.7°
(ammonia), thiols 96.5°, acids `O/2/2:sp2/C,H` 106.3° (formic acid), esters 114.8° (methyl formate),
and SF₄ / ClF₃ / BrF₅ by slot class (`axial-axial`, `equatorial-equatorial`, `basal-apical`). Every row
names its measured exemplar; the citation lives in `src/chem/references/measured.js`, the oracle the
conformance suite checks against and the embedder never reads. The lookup says what the number is:
`basis: 'exemplar'` (a molecule with these very neighbours was measured), `'class'` (an element-level
default) or `'fallback'` (no row: every bonded angle closes by `LONE_PAIR_COMPRESSION_PER_PAIR`, 2.5°,
per lone pair — a convention). Show that status next to any angle you display. Lone-pair lobes open by
the mean compression. Centres whose neighbours are all pinned (mechanism frames) are left alone, and
`embed(graph, { lonePairAngles: false })` gives the ideal slots back. After `relaxTorsions()` the
builder calls `stericContacts(graph, positions)` and puts the result on the frame as `frame.crowding`
(`null`, or `{ pairs, worst, groups }` of hard contacts the relaxer could not resolve, `groups` being
the R-group attachment ids involved); a topic that lets learners combine bulky groups should show a
notice from it, as the Functional groups card does, rather than draw overlapping atoms silently.
Teaching a new lone-pair centre?
Add a cited row to `measured.js` and a matching row to the table before the topic quotes it:

```js
import { embed, lonePairAngleTargets, compressLonePairSlots } from '../../chem/geometry.js';
embed(graph, { root: 'O' });                                  // alcohol O: C–O–H = 108.9°
embed(graph, { root: 'O', lonePairAngles: false });            // ideal slots: 109.47°
lonePairAngleTargets({ el: 'O', lonePairs: 2 }, ['C', 'H']);   // { targets: { 'bond-bond': 108.9 }, key: 'O/2/2/C,H', basis: 'exemplar', exemplar: 'CH₃OH', ref: 'methanol_COH', appliesTo: 'alcohols' }
lonePairAngleTargets({ el: 'Te', lonePairs: 2 }, ['H', 'H']);  // { targets: null, basis: 'fallback', perPair: 2.5, … }
e.frames.get('O').compression;                                 // the lookup applied at that centre, or null
```

**Cycloalkane templates.** `ringTemplate(shape, opts)` returns a rigid fragment in the format the
embedder's `rigid` groups use (`atoms`, `bonds`, `rigid: { atoms, coords, attach, attachDir,
planeAxis }`), with exact ring closure and a hydrogen on every free site:

```js
import { ringTemplate, RING_SHAPES, dihedral, mirror } from '../../chem/geometry.js';
// RING_SHAPES: cyclopropane, cyclobutane (puckered), cyclopentane (envelope), cyclohexaneChair, cyclohexaneBoat

// Methylcyclohexane with an axial methyl: the C1 axial hydrogen is replaced by Me.C (add Me's hydrogens yourself).
const ring = ringTemplate('cyclohexaneChair', { substituents: { C1: { axial: 'Me.C' } } });
const graph = { atoms: [...ring.atoms, ...methylHydrogens], bonds: [...ring.bonds, ...methylBonds], rigid: [ring.rigid] };
const { positions, lonePairDirs, orbitals } = embed(graph, { root: 'C1' });

ring.sites.C1.axial;          // unit vectors per carbon: axial / equatorial (chair, boat, …) and always up / down
ring.sites.C2.equatorial;     // cis = both substituents up (or both down); C1 axial-up + C2 equatorial-up is cis-1,2
ringTemplate('cyclohexaneChair', { prefix: 'R.', attachAt: 'C1' });   // an R-group cyclohexyl (equatorial attachment)
ringTemplate('cyclopentane', { substituents: { C2: { up: { id: 'Cl', el: 'Cl' } } } });
dihedral(a, b, c, d);         // signed torsion in radians, for Newman projections and ring puckering tests
```

Hydrogens are named `H<k>ax` / `H<k>eq` where axial and equatorial are defined and `H<k>up` /
`H<k>dn` otherwise. Chair sites are ideal (axial bonds parallel to the ring axis, alternating;
trans-diaxial H–C–C–H ≈ 180°, gauche pairs ≈ 60°, 1,3-diaxial H···H ≈ 2.5 Å), which is what the
conformations topic needs for A-values and ring flips.

**Mirror images.** `mirror(x, { normal = [1, 0, 0], point = [0, 0, 0] })` reflects a vec3, an array,
a `Map` of positions, a `{ id: vec3 }` object or a whole render frame (positions, lone-pair and
p-orbital directions) through a plane, inverting every stereocentre: the enantiomer of a frame is
one call.

### 2D overlays: `src/ui/overlays.js`

Textbook sketches computed from the 3D frame, so they never disagree with the model. The
projection math is pure and node-tested; the two `draw*` functions paint on a `<canvas>` in the
sage theme (colours come from the CSS custom properties, so a theme change follows automatically).

```js
import { drawNewman, drawWedgeDash, newmanProjection, wedgeDashProjection } from '../../ui/overlays.js';

const canvas = h('canvas', { class: 'overlay-canvas' });        // sized by CSS; DPR handled for you
drawNewman(canvas, frame, 'C2', 'C3', { labels: { C1: 'CH₃' } });   // look down C2 → C3; title = "staggered · 60°"
drawWedgeDash(canvas, frame);                                   // skeleton flat in the page, H's wedged/dashed
drawWedgeDash(canvas, frame, { viewAxis: [0, 1, 0], up: [0, 0, 1], hydrogens: false, labelCarbons: true });

const P = newmanProjection(frame, 'C2', 'C3');   // { substituents: { front: [{ id, angle, r }], back }, dihedrals: [{ front, back, angle }], conformation }
P.dihedrals.find((d) => d.front === 'C1' && d.back === 'C4').angle;   // the C–C–C–C torsion, signed, in (−180, 180]
const S = wedgeDashProjection(frame);            // { atoms: [{ id, el, x, y, depth }], bonds: [{ a, b, kind: 'plain' | 'wedge' | 'dash', from, to }] }
```

Conventions: the viewer looks from the front atom toward the back one (Newman) or along
`viewAxis`, which points from the molecule **toward the viewer** (wedge/dash; default: the normal
of the heavy-atom principal plane, so the skeleton lies flat). Wedges and dashes have their narrow
end at the atom nearer the drawing plane. `groupLabel(frame, id, { exclude })` gives CH₃ / CH₂R /
OH / NH₂-style labels; pass `labels: { id: text }` to override. The `_template` topic's field guide
has a live demo of both.

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

### A second explorer: Molecular shapes (`src/topics/molecular-shapes/`)

The shapes topic is the smallest complete `CollectionExplorer` topic and a good copy-me for any
"pick one, build it, read what it shows" lesson: pure data and geometry in `src/chem/shapes.js`
(`SHAPES`, `buildShape(id)` → `{ frame, angles: [{ value, status, exemplar, source }], bonds, lonePairs,
domains }`), the panel in `panel.js` (card, invariant cards with highlights, predict-observe-explain
blocks in `activities.js` whose reveal text quotes the model's own numbers), `index.js` (topic object,
search entries, three glossary terms) and `references.md`. The rules it follows are the ones to copy:
lone-pair counts shown to a learner come from `atom.lonePairs`, never from display slots; every angle
on screen says whether it is ideal, measured (and on which molecule), a class value or the fallback;
and activities stay local to the topic rather than becoming a quiz engine.

### An explorer without a molecule: Atomic orbitals (`src/topics/atomic-orbitals/`)

A `CollectionExplorer` can drive something other than `MoleculeView`: pass no `view`, handle `onChange`
yourself and draw with `OrbitalView` (one per lobe set; `lobe(i)` creates them on demand, `deactivate()`
disposes them, nothing is created without WebGL). `src/chem/atomicOrbitals.js` is the pure half (gallery
items, radial distribution with nodes found on R_nl, hybrids as coefficient tables over 2s/2p, the aufbau
generator checked against `GROUND_STATE_CONFIGURATIONS`); `content.js` holds the invariant cards, whose
optional `show` adjusts the lobes while selected (`{ probability, negative, wireframe, orbitals, all }`);
the card draws a radial-distribution canvas and, for configurations, `LevelDiagram` boxes, so it reads
without WebGL. Rules carried over: every number is exact for the stated function or a cited table value,
and the sweep reads angles and nodes off the functions rather than trusting the labels.

### A ladder you click: Acids and bases (`src/topics/acids-bases/`)

A `CollectionExplorer` whose card carries a `LevelDiagram` of every item (the pKa ladder) with
`onHighlight` on click calling `api.select(level.id)`, so the diagram is a second set of chips. The 3D
frame is the Functional groups molecule rebuilt with a departing proton (`acidFrame(id, t)`: the H slides
along its bond, the bond's `partial` falls to 0 and becomes a ghost, charges move linearly; cationic acids
get their proton added on the first lone-pair direction at the table X–H length). The equilibrium row is
`equilibrium(acidId, baseOfId)`: one identity on two tabulated values. The five factors live as ordered
comparisons (`FACTORS`) so the sweep can hold the table to the textbook order.

### Orbitals over a molecule: Molecular orbitals (`src/topics/molecular-orbitals/`)

The same explorer with both a molecule and an orbital: pass `view` so the explorer sets the frame, and
draw the chosen MO with one `OrbitalView` created with `{ molecule: view }` so `bounds()` covers both.
`src/chem/molecularOrbitals.js` holds the pure half: `huckel()` (Jacobi eigen-solver, energies as x in
E = α + xβ, Hund-free filling two per level), `fillDiatomic()` (the textbook ladder in `DIATOMIC_MO`,
bond order and unpaired count by counting), authored frames at the measured lengths (`MEASURED_BONDS`
rows with `ref` on every bond), and ψ builders (`molecularOrbital()` for diatomics, `pOrbitalAlong()` +
`lcao()` for Hückel coefficients). The card's `LevelDiagram` takes `onHighlight` and a click selects the
MO to draw (`state.mo`); an invariant's `show: { mo }` does the same while selected. Rules: no energy is
computed beyond the stated eigenvalues in β units, diatomic ladders are schematic, and every picture
says which exponents and weights it uses.

### A custom-panel topic: Conformations (`src/topics/conformations/`)

Not every lesson is a collection. Conformations keeps one continuous control (a dihedral slider) and
three views of the same number, so it is a plain panel class rather than a `CollectionExplorer`:
`src/chem/conformations.js` (`ROTORS`, `conformer(id, phi)` → a frame with the back side of the bond
turned rigidly, `torsionEnergy(id, phi)` through `TORSION_ENERGIES`, `conformationName`,
`periplanarity`), `panel.js` (`ConformationsPanel` with chips, slider, landmark buttons, a Newman canvas
via `drawNewman`, a torsion-energy canvas, facts, activities; deep links `#conformations/<rotor>/<landmark|degrees>`),
`activities.js`, `index.js`, `references.md`. Rules carried over: quoted energies come from the
reference table and say they are textbook values, the reveal text reads the same functions the canvas
plots, and the Reaction lab's E2 start is checked equal to the anti-periplanar rotor in the sweep.
The same panel hosts the cyclohexane chair (`src/chem/cyclohexane.js`: `cyclohexaneFrame(sub, form)`
from the rigid ring templates with the substituent embedded as an R group, `chairEnergy()` a pure
table lookup into `A_VALUES` / `RING_CONFORMER_ENERGIES`), the worked example of the one energy
exception the model boundary allows (`docs/REVIEW_PROTOCOL.md` §6).
