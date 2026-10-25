/**
 * Animator contract.
 *
 * The app never animates on its own: whenever the user presses Play, clicks a step, or
 * the predictor jumps to a mechanism, the active Animator is asked to carry the
 * reaction-coordinate parameter `t` from one value to another. Everything visual is a
 * pure function of `t` (mechanism.frame(t)), so an animator only has to decide HOW `t`
 * moves through time and what extra flourish (camera moves, glows, particles, trails,
 * sound) accompanies it.
 *
 * To plug in a new animator:
 *   1. create src/anim/MyAnimator.js exporting a class that extends Animator
 *   2. register it in src/anim/index.js (or at runtime: window.OrbitalChemistry.registerAnimator(MyAnimator))
 *   3. it appears in the "Animator" dropdown of the Mechanisms panel.
 *
 * `ctx` (constructor argument) gives you:
 *   ctx.viewport  – { THREE, scene, camera, controls, root, renderer, onTick(fn), moveCamera(pos, target, ms), fitTo(box) }
 *   ctx.view      – MoleculeView: setFrame(frame), setArrows(arrows), setHighlights(visuals), layers.{atoms,bonds,...}, bounds()
 *   ctx.getMechanism() – the current mechanism object (steps, frame(t), energyAt(t), view)
 *   ctx.getT() / ctx.setT(t) – read or write the reaction coordinate; setT re-renders the frame,
 *                 the arrows of the current step, the energy marker and the narration.
 *   ctx.getSpeed() – user speed multiplier (0.25 … 3)
 */
export class Animator {
  static id = 'base';
  static label = 'Base animator';
  static description = 'Abstract base class.';

  constructor(ctx) { this.ctx = ctx; this._cancelled = false; }

  /**
   * Move t from `fromT` to `toT`. Must call ctx.setT() along the way and resolve when done.
   * `fromStep` / `toStep` are the step objects (id, cue, title, arrows, highlights…).
   * `durationMs` is a suggestion derived from |toT − fromT| and the user's speed setting.
   * Return a Promise. If cancel() is called, finish quickly (snap or ease out) and resolve.
   */
  async transition({ mechanism, fromT, toT, fromStep, toStep, durationMs }) {
    this.ctx.setT(toT);
  }

  /** User dragged the scrubber: t already applied, no animation requested. */
  scrub(t) {}

  /** Called when a different mechanism is selected (good moment to reset camera / effects). */
  onMechanismChange(mechanism) {}

  /** Called once per rendered frame with the elapsed seconds (for ambient effects). */
  tick(dt) {}

  /** Stop any running transition as soon as possible. */
  cancel() { this._cancelled = true; }

  /** Release resources you added to the scene. */
  dispose() { this.cancel(); }
}

export const easeInOutCubic = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
export const easeOutCubic = (u) => 1 - Math.pow(1 - u, 3);
