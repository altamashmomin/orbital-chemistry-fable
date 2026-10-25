// Animator registry. Add new animators here or at runtime via window.OrbitalChemistry.registerAnimator().
import { Animator } from './Animator.js';
import { DefaultAnimator } from './DefaultAnimator.js';
import { CinematicAnimator } from './CinematicAnimator.js';

const registry = new Map();
const listeners = new Set();

export function registerAnimator(cls) {
  if (!cls || !cls.id) throw new Error('An animator class needs a static id');
  registry.set(cls.id, cls);
  listeners.forEach((fn) => fn(listAnimators()));
  return cls.id;
}
export function listAnimators() { return [...registry.values()].map((c) => ({ id: c.id, label: c.label || c.id, description: c.description || '' })); }
export function createAnimator(id, ctx) { const Cls = registry.get(id) || DefaultAnimator; return new Cls(ctx); }
export function onAnimatorsChanged(fn) { listeners.add(fn); return () => listeners.delete(fn); }

registerAnimator(DefaultAnimator);
registerAnimator(CinematicAnimator);

export { Animator, DefaultAnimator, CinematicAnimator };
