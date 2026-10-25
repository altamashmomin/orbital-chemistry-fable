/** Clamp a normalized animation coordinate. */
export const clamp = (x) => Math.max(0, Math.min(1, x));

/** Smooth, monotone checkpoint arrival with zero velocity at either end. */
export const ease = (x) => { const u = clamp(x); return u * u * (3 - 2 * u); };

/** Find all energy maxima, including peaks that are not narration checkpoints. */
export function peaks(mechanism) {
  const points = mechanism.energy?.points || [];
  const result = points.filter((p, i) => i > 0 && i < points.length - 1
    && p.E > points[i - 1].E && p.E > points[i + 1].E).map((p) => p.t);
  for (const step of mechanism.steps) {
    if (step.cue?.endsWith('.transitionState') && !result.some((t) => Math.abs(t - step.t) < 1e-5)) result.push(step.t);
  }
  return result.sort((a, b) => a - b);
}

/** Build a reversible timeline; durations are unscaled seconds (speed is applied by tick). */
export function timeline(mechanism, from, to, durationMs) {
  const direction = Math.sign(to - from);
  if (!direction) return [];
  const maxima = peaks(mechanism);
  const between = (t) => direction * (t - from) > 1e-6 && direction * (to - t) >= -1e-6;
  const stops = [...new Set([to, ...maxima.filter(between), ...mechanism.steps.map((s) => s.t).filter(between)])]
    .sort((a, b) => direction * (a - b));
  const total = Math.max(0.7, durationMs / 1000);
  const result = [];
  let previous = from;
  for (const t of stops) {
    const peak = maxima.some((p) => Math.abs(p - t) < 1e-5);
    const sourcePeak = maxima.some((p) => Math.abs(p - previous) < 1e-5);
    result.push({ kind: 'move', from: previous, to: t,
      seconds: Math.max(0.18, total * Math.abs(t - previous) / Math.abs(to - from)), peak, sourcePeak });
    const cation = mechanism.steps.some((s) => Math.abs(s.t - t) < 1e-5 && s.cue?.endsWith('.carbocation'));
    if (peak || cation) result.push({ kind: 'hold', t, seconds: peak ? 0.6 : 0.65, peak });
    previous = t;
  }
  return result;
}
