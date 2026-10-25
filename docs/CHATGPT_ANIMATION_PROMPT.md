# Prompt for ChatGPT: build the cinematic animation layer

> Status: a first `CinematicAnimator` built from this brief now ships as the default
> (`src/anim/CinematicAnimator.js`, `src/anim/pacing.js`, tests in `tests/cinematic.test.js`).
> Reuse the prompt for a refinement pass by also attaching those files and saying what to
> improve; the contract below is unchanged.

Copy everything below the line into ChatGPT (GPT-4-class model with code ability). Attach or
paste these files from the repo so it has the real interfaces in front of it:

* `docs/ANIMATION_API.md`
* `src/anim/Animator.js`, `src/anim/DefaultAnimator.js`, `src/anim/index.js`
* `src/render/moleculeView.js`, `src/render/scene.js`
* `src/ui/mechanism.js`
* `src/chem/mechanisms/sn2.js` (one mechanism is enough to see the frame/step shape)

---

You are joining an existing open-source project called **Orbital Chemistry**: a 3D organic
chemistry tutor built with **Vite + vanilla ES modules + Three.js 0.170** (no React, no
TypeScript, no bundler plugins). It has two tabs: a functional-group explorer and a
step-by-step mechanism viewer for SN2, SN1, E2 and E1. The chemistry, geometry, UI and a
plain baseline animation are done and working. **Your job is only the animation layer**: make
the mechanism animations beautiful and pedagogically clear, without changing any chemistry,
UI or data files.

## How the system works (read `docs/ANIMATION_API.md` first)

* Every mechanism exposes `frame(t)` for a reaction coordinate `t ∈ [0,1]`. The frame holds
  atoms with stable ids and positions, bonds with a `partial` strength (0–1 for
  forming/breaking bonds), numeric charges, lone-pair directions and p-orbital lobes.
* `mechanism.steps[]` are the checkpoints (each has a `t`, a `cue` id such as
  `sn2.transitionState`, narration, electron-pushing `arrows` and `highlights`).
* The UI delegates all motion to an **Animator** (`src/anim/Animator.js`). An animator is a
  class with `transition({mechanism, fromT, toT, fromStep, toStep, durationMs})`, `scrub(t)`,
  `onMechanismChange(mechanism)`, `tick(dt)`, `cancel()`, `dispose()`. It receives `ctx` with
  the Three.js `viewport` (scene, camera, OrbitControls, `moveCamera`, `onTick`), the
  `MoleculeView` (`setFrame`, `atom(id)`, `layers.*` groups), `getMechanism()`, `getT()`,
  `setT(t)` and `getSpeed()`.
* `DefaultAnimator` is a plain eased tween of `t`. It is registered in `src/anim/index.js` and
  selectable in the "Animator" dropdown. Yours will sit next to it.

## Deliverable

Create **`src/anim/CinematicAnimator.js`** (plus any helper modules under `src/anim/`) and
register it in `src/anim/index.js` with `static id = 'cinematic'` and
`static label = 'Cinematic'`. Make it the default selection in the dropdown by registering it
before `DefaultAnimator` or by setting `animatorId = 'cinematic'` in
`src/ui/mechanism.js` (that one-line change in the UI is allowed).

Required behaviour:

1. **Motion quality.** Ease `t` with per-step pacing: slow into and out of each checkpoint,
   linger ~0.6 s at transition states (`*.transitionState`, and the `‡` energy maxima), and
   let intermediates (`sn1.carbocation`, `e1.carbocation`) breathe. Respect `ctx.getSpeed()`.
   `cancel()` must stop within one frame and leave `t` wherever it is (the UI then snaps).
2. **Camera choreography.** On `onMechanismChange`, fly the camera to `mechanism.view`. During
   a transition, gently orbit/dolly so the key atoms in `frame.focus` stay framed; for SN2 end
   with a view that makes the Walden inversion unmistakable (look along the Nu···C···Br axis
   for a beat, then side-on). Never fight the user: if OrbitControls detects user input during
   a transition, stop driving the camera until the next transition.
3. **Electron flow.** Replace the static amber arrows with animated ones: draw each arrow
   progressively along its curve over the first 40 % of the step, then emit 2 small glowing
   "electron pair" spheres that travel from the source (lone pair / bond midpoint) to the
   destination and fade as the new bond's `partial` approaches 1. Use `MoleculeView._anchor`
   (or re-implement from `atom(id).pos` and `lonePairDirs`) for the anchor points. Keep your
   objects in your own `THREE.Group` added to `ctx.viewport.root` (the view rebuilds
   `layers.arrows` every frame).
4. **Bond making/breaking.** Forming bonds should grow in (scale + opacity from the `partial`
   value) with a brief bright flash when `partial` crosses 0.95; breaking bonds should stretch,
   thin and shimmer, with a short particle puff when they vanish. You can read `partial` from
   `mechanism.frame(t).bonds` each tick.
5. **Charge and orbital emphasis.** Pulse the empty p-orbital lobes of carbocations, pulse
   lone pairs that are about to attack (the `from` of a `lonePair` arrow), and animate charge
   labels (fade in δ− / δ+ and pop the full charges). The CSS2D labels live in
   `ctx.view.layers.labels`; you may add CSS classes to `src/style.css` (`.lbl.pop` etc.).
6. **Transition-state cue.** At `*.transitionState` and at each energy maximum add a subtle
   radial glow or a translucent "‡" plane behind the reacting centre and a tiny camera
   shake-free slow-motion (time-scale 0.35) for ~0.8 s.
7. **Ghost species.** Atoms with `ghost: true` (e.g. the "equally likely" water on the other
   face of the SN1 carbocation) should fade in/out smoothly instead of popping.
8. **Performance.** 60 fps on a laptop integrated GPU: reuse geometries/materials, no
   per-frame geometry allocation except for the arrow tubes (cap at 2 rebuilds per step),
   dispose everything in `dispose()`.

## Constraints

* Three.js **0.170** API only (`three` and `three/addons/...` imports). No new npm
  dependencies. No TypeScript. No changes to anything in `src/chem/`, `src/render/`
  (you may add optional methods, not change existing signatures) or the UI except the
  one-line default-animator switch.
* Keep it a drop-in: the app must still work with the Default animator selected.
* Code style: ES2022 modules, 2-space indent, single quotes, JSDoc on public methods.

## Acceptance checklist

* `npm test` still passes and `npm run build` succeeds.
* In the Mechanisms tab, with "Cinematic" selected: Play on each of SN2, SN1, E2, E1 runs
  start-to-finish with no console errors; Pause stops within a frame; the scrubber still
  works; switching mechanisms mid-animation is clean; switching back to "Default" works.
* SN2: inversion clearly visible; SN1: planar cation with pulsing empty p orbital and the
  ghost water fading; E2: the anti-periplanar H–C–C–Br plane is shown, then the π bond forms as
  the H and Br leave simultaneously; E1: carbocation first, then β-H transfer to ethanol.

Please return the complete contents of every new or modified file, each in its own code
block with the file path as the first line, and a short paragraph explaining the pacing
model you chose.
