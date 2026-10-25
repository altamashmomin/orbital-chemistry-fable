// Audience levels for content items.
// 'refresher' = facts, tables, invariants, definitions (a working chemist checking something);
// 'learn'     = narration, reasoning, hints (a student meeting it for the first time);
// 'both'      = shown at either depth.
// Every collection has a default; an item overrides it with `audience: '...'`.
// Items in string collections may be plain strings or { text, audience }.
export const AUDIENCES = ['refresher', 'learn'];
export const DEFAULTS = {
  invariants: 'both',   // "always true for every X" cards
  varies: 'learn',      // what the R group changes (structural classifications override to 'both')
  identify: 'both',     // spectroscopy and lab tests
  keyIdeas: 'learn',    // mechanism key ideas (rule-like ones override to 'both')
  keyPoints: 'learn',   // per-step bullet points (rule-like ones override to 'both')
  conditions: 'both',   // favoured / disfavoured tables
  glossary: 'both',
};
export const isValidAudience = (a) => a === 'both' || AUDIENCES.includes(a);
export const textOf = (item) => (typeof item === 'string' ? item : (item?.text ?? item?.title ?? ''));
export function audienceOf(item, collection) {
  const explicit = item && typeof item === 'object' ? item.audience : undefined;
  return explicit || DEFAULTS[collection] || 'both';
}
export const visibleAt = (item, collection, level) => { const a = audienceOf(item, collection); return a === 'both' || a === level; };
/** Audience to put on a whole list: 'learn' when every item is learn-only, else null (mixed/both). */
export function listAudience(items, collection) {
  if (!items?.length) return null;
  const set = new Set(items.map((x) => audienceOf(x, collection)));
  return set.size === 1 && !set.has('both') ? [...set][0] : null;
}
