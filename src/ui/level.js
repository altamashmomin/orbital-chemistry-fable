// Audience level: 'refresher' shows the facts, 'learn' adds the reasoning.
// Content opts in with data-audience="learn" / "refresher" (see aud() in dom.js); CSS does the hiding.
export const LEVELS = [
  { id: 'refresher', label: 'Refresher', hint: 'Just the facts: for a quick check by someone who has done this before.' },
  { id: 'learn', label: 'Learn', hint: 'Facts plus the reasoning, narration and worked logic for someone meeting it for the first time.' },
];
const KEY = 'orbital.level';
const listeners = new Set();
let level = (() => { try { const v = localStorage.getItem(KEY); return LEVELS.some((l) => l.id === v) ? v : 'learn'; } catch { return 'learn'; } })();

export const getLevel = () => level;
export function setLevel(next) {
  if (!LEVELS.some((l) => l.id === next)) return;
  level = next;
  if (typeof document !== 'undefined') document.body.dataset.level = next;
  try { localStorage.setItem(KEY, next); } catch { /* private mode etc. */ }
  listeners.forEach((fn) => fn(next));
}
export function onLevelChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
