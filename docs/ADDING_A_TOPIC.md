# Adding a topic

Orbital is a nexus: every chemistry topic (functional groups, mechanisms, transition metals,
atomic orbitals, HOMO/LUMO, redox, the uncertainty principle, …) is a self-contained module
that plugs into one registry. A topic branch should only ever add a folder and two lines.

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
freshman meeting it for the first time). Everything is visible to both unless tagged:

```js
import { aud } from '../../ui/dom.js';
aud(section('Why it works', ...), 'learn');       // hidden in Refresher
aud(h('p', {}, 'Rule of thumb'), 'refresher');    // hidden in Learn
```

Data items may carry `audience: 'learn' | 'refresher'` and the renderers forward it
(functional-group invariants, `varies` and `identify` entries already do). Rule of thumb:
definitions, invariants, tables, equations and tests are for both; narration, "why",
worked reasoning and hints are `learn`.

## 4. Keep it honest

* Put sources in `src/topics/<id>/references.md` (textbook chapter, review, database).
* Add a data test in `tests/` (see `tests/builder.test.js` for the pattern): every entry has
  the fields it needs, numbers are finite, nothing overlaps in 3D.
* Mark anything illustrative (energies, percentages) as such in the UI text.

## 5. Branch workflow

* Branch from `main` as `topic/<id>`; rebase on `main` often.
* Changes to the shared core (`src/chem/geometry.js`, `src/render/*`, `src/ui/*`,
  `src/topics/registry.js`) go in their own small commits or PRs merged to `main` first, so
  every topic branch can use them.
* CI (`.github/workflows/ci.yml`) runs `npm test` and `npm run build` on every PR; keep it green.
