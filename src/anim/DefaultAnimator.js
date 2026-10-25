// The built-in animator: an eased tween of t, a camera move to the mechanism's
// preferred viewpoint when the mechanism changes, and nothing fancier. It is
// deliberately plain so a richer animator can replace it without untangling anything.
import { Animator, easeInOutCubic } from './Animator.js';

export class DefaultAnimator extends Animator {
  static id = 'default';
  static label = 'Default (plain tween)';
  static description = 'Eased linear scrub of the reaction coordinate. Baseline implementation.';

  constructor(ctx) { super(ctx); this._raf = null; this._resolve = null; }

  async transition({ mechanism, fromT, toT, durationMs }) {
    this.cancel();
    this._cancelled = false;
    const speed = this.ctx.getSpeed?.() || 1;
    const dur = Math.max(80, durationMs / speed);
    const start = performance.now();
    return new Promise((resolve) => {
      this._resolve = resolve;
      const step = (now) => {
        if (this._cancelled) { this._raf = null; resolve(); return; }
        const u = Math.min(1, (now - start) / dur);
        this.ctx.setT(fromT + (toT - fromT) * easeInOutCubic(u));
        if (u < 1) this._raf = requestAnimationFrame(step);
        else { this._raf = null; this._resolve = null; resolve(); }
      };
      this._raf = requestAnimationFrame(step);
    });
  }

  onMechanismChange(mechanism) {
    const vw = mechanism.view;
    if (vw) this.ctx.viewport.moveCamera(vw.position, vw.target || [0, 0, 0], 700);
  }

  cancel() {
    this._cancelled = true;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    if (this._resolve) { const r = this._resolve; this._resolve = null; r(); }
  }
}
