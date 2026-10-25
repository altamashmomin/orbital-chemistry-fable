// Dependency-free client-side search over topics, their content and the glossary.
// Entries: { kind: 'topic' | 'group' | 'mechanism' | 'step' | 'item' | 'term', title, snippet, href, keywords?, audience? }
import { GLOSSARY } from './glossary.js';
import { audienceOf, isValidAudience } from '../chem/audience.js';

const SUBS = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9', '⁺': '+', '⁻': '-', '–': '-', '—': '-', '′': "'", '’': "'" };
export const normalise = (s) => String(s || '').toLowerCase().replace(/[₀-₉⁺⁻–—′’]/g, (c) => SUBS[c] || c).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const KIND_RANK = { topic: 0, group: 1, mechanism: 1, term: 2, step: 3, item: 4 };
const KIND_BONUS = { topic: 2, group: 2, mechanism: 2, term: 1, step: 0.5, item: 0 };
const words = (s) => s.split(/[^a-z0-9+'-]+/).filter(Boolean);

/** Build the flat index from registered topics (their index() functions) and the glossary. */
export function buildIndex(topics) {
  const entries = [];
  for (const t of topics) {
    entries.push({ kind: 'topic', title: t.title, snippet: t.summary || '', href: `#${t.id}`, keywords: [t.id, ...(t.aliases || [])], topic: t.id });
    if (typeof t.index === 'function') for (const e of t.index()) entries.push({ topic: t.id, ...e });
    for (const term of t.glossary || []) entries.push(termEntry(term, t.id));
  }
  for (const term of GLOSSARY) entries.push(termEntry(term, null));
  for (const e of entries) {
    e._title = normalise(e.title); e._body = normalise(`${e.snippet || ''} ${(e.keywords || []).join(' ')}`);
    e._keywords = (e.keywords || []).map(normalise);
    e._titleWords = words(e._title); e._bodyWords = words(e._body);
    if (e.audience && !isValidAudience(e.audience)) e.audience = 'both';
  }
  return entries;
}
const termEntry = (term, topic) => ({ kind: 'term', title: term.term, snippet: term.definition, href: `#glossary/${term.id}`, keywords: [term.id], audience: audienceOf(term, 'glossary'), topic });

/** Score entries for a query; every token must match somewhere. Hidden-level entries are skipped. */
export function search(entries, query, { level = 'learn', limit = 12 } = {}) {
  const tokens = normalise(query).split(/[^a-z0-9+'-]+/).filter((t) => t.length > 0);
  if (!tokens.length) return [];
  const out = [];
  for (const e of entries) {
    if (e.audience && e.audience !== 'both' && e.audience !== level) continue;
    let score = 0, ok = true;
    for (const tok of tokens) {
      // Best single match for this token: exact title or keyword beats a prefix beats a mention.
      let s = 0;
      if (e._title === tok) s = 12;
      else if (e._keywords.includes(tok)) s = 11;
      else if (e._titleWords.some((w) => w.startsWith(tok))) s = 6;
      else if (e._title.includes(tok)) s = 4;
      else if (e._bodyWords.some((w) => w.startsWith(tok))) s = 2;
      else if (e._body.includes(tok)) s = 1;
      if (!s) { ok = false; break; }
      score += s;
    }
    if (ok) out.push({ entry: e, score: score + (KIND_BONUS[e.kind] ?? 0) });
  }
  // Ties go to destinations (topics, groups, mechanisms) before definitions (terms) before notes.
  out.sort((a, b) => b.score - a.score || (KIND_RANK[a.entry.kind] ?? 5) - (KIND_RANK[b.entry.kind] ?? 5) || a.entry.title.localeCompare(b.entry.title));
  return out.slice(0, limit).map((x) => x.entry);
}

/** All glossary terms (core + topic-contributed), sorted. */
export function allTerms(topics) {
  const terms = [...GLOSSARY];
  for (const t of topics) for (const term of t.glossary || []) terms.push({ ...term, topic: t.id });
  return terms.sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }));
}
