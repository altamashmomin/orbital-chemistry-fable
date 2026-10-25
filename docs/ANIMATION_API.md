# Animation API

Everything you see in the Mechanisms tab is a pure function of one number, the reaction
coordinate `t ∈ [0, 1]`. `mechanism.frame(t)` returns the complete 3D state (atoms, bonds,
partial bonds, charges, lone pairs, orbitals) for that `t`. The app itself never animates;
it hands the job to an **Animator**, which decides how `t` moves through time and what
extra visuals accompany it. Swap the animator and you swap the whole look of the animation
without touching the chemistry.

## 1. The Animator contract (`src/anim/Animator.js`)

```js
export class Animator {
  static id = 'my-animator';          // unique, used by the dropdown
  static label = 'My animator';       // shown in the UI
  static description = '…';

  constructor(ctx) {}                 // see "ctx" below

  // Carry t from fromT to toT. Call ctx.setT(t) as often as you like; resolve when done.
  async transition({ mechanism, fromT, toT, fromStep, toStep, durationMs }) {}

  scrub(t) {}                         // user dragged the slider (t already applied)
  onMechanismChange(mechanism) {}     // new mechanism selected: reset camera / effects
  tick(dt) {}                         // every rendered frame, dt in seconds
  cancel() {}                         // stop ASAP (user pressed pause / jumped)
  dispose() {}                        // remove anything you added to the scene
}
```

### `ctx`

| field | what it is |
| --- | --- |
| `ctx.viewport` | `{ THREE, scene, camera, controls, root, renderer, labelRenderer, onTick(fn), moveCamera(pos, target, ms), fitTo(box3), setAutoRotate(bool) }` |
| `ctx.view` | the `MoleculeView` (`src/render/moleculeView.js`): `setFrame(frame)`, `setArrows(arrows)`, `setHighlights(visuals)`, `bounds()`, `atom(id)`, `layers.{atoms,bonds,lonePairs,orbitals,labels,arrows,highlights}` (THREE.Groups you may decorate) |
| `ctx.getMechanism()` | the active mechanism object |
| `ctx.getT()` / `ctx.setT(t)` | read / write the reaction coordinate. `setT` re-renders the frame, the arrows of the current step, the narration and the energy-diagram marker |
| `ctx.getSpeed()` | user speed multiplier (0.5, 1, 2) |

### Registering

```js
// src/anim/index.js
import { MyAnimator } from './MyAnimator.js';
registerAnimator(MyAnimator);
```
or at runtime from the browser console / a script tag:
```js
window.OrbitalChemistry.registerAnimator(MyAnimator);
```
The new animator appears in the **Animator** dropdown of the Mechanisms panel.

## 2. The mechanism object (`src/chem/mechanisms/*.js`)

```js
{
  id: 'sn2', name: 'SN2', fullName, substrate, reagent, products, equation, rateLaw,
  molecularity, stereochemistry, keyIdeas: [...], conditions: { favoredBy, disfavoredBy },
  view: { position: [x, y, z], target: [x, y, z] },      // preferred camera
  steps: [ { id, t, cue, title, narration, keyPoints, arrows, highlights }, ... ],
  energy: { unit, points: [{ t, E, label }] },
  energyAt(t) -> number,                                  // smooth profile
  frame(t) -> Frame,
}
```

### Step cues (use them to key special effects)

| mechanism | cues in order |
| --- | --- |
| SN2 | `sn2.approach` (t 0) → `sn2.transitionState` (0.5) → `sn2.products` (1) |
| SN1 | `sn1.ionisation` (0) → `sn1.carbocation` (0.33) → `sn1.attack` (0.42) → `sn1.oxonium` (0.66) → `sn1.products` (1) |
| E2 | `e2.antiPeriplanar` (0) → `e2.transitionState` (0.5) → `e2.products` (1) |
| E1 | `e1.ionisation` (0) → `e1.carbocation` (0.4) → `e1.deprotonation` (0.6) → `e1.products` (1) |

### Frame format

```js
{
  atoms: [{
    id: 'C',                  // stable across all t (so you can tween / trail per atom)
    el: 'C',                  // element symbol
    pos: [x, y, z],           // Å
    charge: -0.5,             // numeric; |q|<0.12 none, <0.75 δ±, ≥0.75 full ±
    lonePairs: 2,
    lonePairDirs: [[x,y,z]],  // unit vectors from the atom
    orbital: { kind: 'empty' | 'lonePair', dirs: [[..],[..]] } | null,   // p-orbital lobes
    ghost: false,             // translucent "alternative" species (e.g. other-face nucleophile)
    label: '(R)' | null,
  }],
  bonds: [{ a, b, order: 1|2|3, partial: 0..1, aromatic, ring, ghost, piOnly }],
  focus: ['C', 'Br', 'Nu.O'],  // atoms worth framing the camera on
  aliases: {},
}
```
`partial < 1` is a forming/breaking bond (drawn amber and translucent by the default renderer).

### Electron-pushing arrows (per step)

```js
{ from: { type: 'lonePair', atom: 'Nu.O' } | { type: 'bond', a: 'C', b: 'Br' } | { type: 'atom', atom },
  to:   { type: 'atom', atom: 'C' } | { type: 'bond', a: 'C2', b: 'C3' } }
```
`MoleculeView._anchor(spec, towardsVector3)` turns a spec into a world-space point if you want
to draw your own arrows.

### Highlight visuals (per step, and per invariant in the explorer)

`atom`, `bond`, `lonePairs`, `orbital`, `dipole {from,to}`, `angle {center,a,b,text}`,
`plane {atoms}`, `charges {map}`, `label {id,text}`. See `VISUAL_TYPES` in
`src/chem/functionalGroups.js` and the switch in `MoleculeView._rebuildHighlights`.

## 3. Minimal custom animator

```js
import { Animator, easeInOutCubic } from './Animator.js';

export class BouncyAnimator extends Animator {
  static id = 'bouncy';
  static label = 'Bouncy';
  async transition({ fromT, toT, durationMs }) {
    this._cancelled = false;
    const start = performance.now();
    await new Promise((resolve) => {
      const step = (now) => {
        const u = Math.min(1, (now - start) / durationMs);
        const e = easeInOutCubic(u) + 0.05 * Math.sin(u * Math.PI * 4) * (1 - u);
        this.ctx.setT(fromT + (toT - fromT) * e);
        if (u < 1 && !this._cancelled) requestAnimationFrame(step); else resolve();
      };
      requestAnimationFrame(step);
    });
  }
}
```

## 4. Rendering hooks you can decorate

* `ctx.view.layers.arrows` is rebuilt on every `setT`; add your own objects to a sibling
  group (`ctx.viewport.root.add(myGroup)`) so they survive.
* `ctx.view.atom(id)` returns the current atom record (position etc.) for any atom id, so an
  electron "particle" can be moved from a lone pair to a target atom each tick.
* `ctx.viewport.onTick(fn)` registers a per-frame callback (returns an unsubscribe function).
