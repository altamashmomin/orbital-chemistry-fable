// Header search box and the glossary drawer. Navigation goes through `navigate(href)` so deep
// links open the right topic and entity (see setTopic in main.js).
import { h, clear, fill, aud } from '../ui/dom.js';
import { buildIndex, search, allTerms } from './search.js';

const KIND_LABEL = { topic: 'Topic', group: 'Group', mechanism: 'Mechanism', step: 'Step', item: 'Note', term: 'Term' };

export function mountNexus({ searchRoot, drawerRoot, topics, navigate, getLevel, onLevelChange, onTopicsChanged }) {
  let entries = buildIndex(topics);
  onTopicsChanged?.(() => { entries = buildIndex(topics); renderTerms(); });

  // ---------------------------------------------------------------- search
  const input = h('input', { type: 'search', class: 'nexus-input', placeholder: 'Search topics, terms, mechanisms…', 'aria-label': 'Search the nexus', autocomplete: 'off', spellcheck: 'false' });
  const results = h('div', { class: 'nexus-results', role: 'listbox', hidden: true });
  const wrap = h('div', { class: 'nexus-search' }, input, h('kbd', { class: 'nexus-kbd', 'aria-hidden': 'true' }, '/'), results);
  let hits = [], active = -1;
  const close = () => { results.hidden = true; active = -1; };
  const go = (href) => { close(); input.blur(); navigate(href); };
  const render = () => {
    if (!hits.length) { fill(results, h('div', { class: 'nexus-empty' }, input.value.trim() ? 'No matches. Try a group name, a mechanism, or a term like “leaving group”.' : 'Type to search.')); results.hidden = false; return; }
    fill(results, hits.map((e, i) => h('button', { class: `nexus-result ${i === active ? 'active' : ''}`, role: 'option', 'aria-selected': String(i === active), onMousedown: (ev) => ev.preventDefault(), onClick: () => go(e.href) },
      h('span', { class: `nexus-kind k-${e.kind}` }, KIND_LABEL[e.kind] || e.kind),
      h('span', { class: 'nexus-text' }, h('b', {}, e.title), e.snippet ? h('small', {}, e.snippet.length > 110 ? `${e.snippet.slice(0, 107)}…` : e.snippet) : null))));
    results.hidden = false;
  };
  const update = () => { hits = search(entries, input.value, { level: getLevel(), limit: 10 }); active = hits.length ? 0 : -1; render(); };
  input.addEventListener('input', update);
  input.addEventListener('focus', () => { if (input.value.trim()) update(); });
  input.addEventListener('blur', () => setTimeout(close, 120));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && hits.length) { active = (active + 1) % hits.length; render(); e.preventDefault(); }
    else if (e.key === 'ArrowUp' && hits.length) { active = (active - 1 + hits.length) % hits.length; render(); e.preventDefault(); }
    else if (e.key === 'Enter' && hits[active]) { go(hits[active].href); e.preventDefault(); }
    else if (e.key === 'Escape') { close(); input.blur(); }
  });
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) && !e.metaKey && !e.ctrlKey) { input.focus(); input.select(); e.preventDefault(); }
  });
  onLevelChange?.(() => { if (!results.hidden) update(); });

  // ---------------------------------------------------------------- glossary drawer
  const glossaryBtn = h('button', { class: 'btn nexus-glossary', 'aria-haspopup': 'dialog', onClick: () => openGlossary() }, 'Glossary');
  searchRoot.append(wrap, glossaryBtn);

  const filter = h('input', { type: 'search', class: 'nexus-input', placeholder: 'Filter terms…', 'aria-label': 'Filter glossary terms' });
  const list = h('div', { class: 'terms' });
  const drawer = h('aside', { class: 'drawer', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Glossary', hidden: true },
    h('div', { class: 'drawer-head' }, h('div', {}, h('span', { class: 'eyebrow' }, 'Field guide'), h('h2', {}, 'Glossary')), h('button', { class: 'btn icon', 'aria-label': 'Close glossary', onClick: () => closeGlossary() }, '✕')),
    filter, list);
  const backdrop = h('div', { class: 'drawer-backdrop', hidden: true, onClick: () => closeGlossary() });
  drawerRoot.append(backdrop, drawer);
  const termLink = (l) => h('a', { class: 'xlink', href: l.href, onClick: (e) => { e.preventDefault(); closeGlossary(); navigate(l.href); } }, l.label);
  function renderTerms() {
    const q = filter.value.trim().toLowerCase();
    const terms = allTerms(topics).filter((t) => !q || `${t.term} ${t.definition} ${t.why || ''}`.toLowerCase().includes(q));
    let letter = '';
    const nodes = [];
    for (const t of terms) {
      const first = t.term[0].toUpperCase();
      if (first !== letter) { letter = first; nodes.push(h('div', { class: 'term-letter' }, letter)); }
      nodes.push(h('article', { class: 'term', id: `term-${t.id}`, dataset: { id: t.id } },
        h('h3', {}, t.term),
        h('p', {}, t.definition),
        t.why ? aud(h('p', { class: 'term-why' }, t.why), 'learn') : null,
        t.links?.length ? h('div', { class: 'xlinks' }, t.links.map(termLink)) : null));
    }
    fill(list, nodes.length ? nodes : h('div', { class: 'nexus-empty' }, 'No terms match.'));
  }
  filter.addEventListener('input', renderTerms);
  renderTerms();
  let lastFocus = null;
  function openGlossary(termId) {
    lastFocus = document.activeElement;
    drawer.hidden = false; backdrop.hidden = false;
    document.body.classList.add('drawer-open');
    if (termId) {
      filter.value = ''; renderTerms();
      const el = list.querySelector(`#term-${CSS.escape(termId)}`);
      list.querySelectorAll('.term.hit').forEach((n) => n.classList.remove('hit'));
      if (el) { el.classList.add('hit'); el.scrollIntoView({ block: 'start' }); el.focus?.(); }
    } else filter.focus();
  }
  function closeGlossary() {
    drawer.hidden = true; backdrop.hidden = true;
    document.body.classList.remove('drawer-open');
    if (location.hash.startsWith('#glossary')) history.replaceState(null, '', location.hash.replace(/^#glossary[^#]*/, `#${document.body.dataset.topic || ''}`));
    lastFocus?.focus?.();
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !drawer.hidden) closeGlossary(); });

  return { openGlossary, closeGlossary, search: (q) => search(entries, q, { level: getLevel() }), rebuild: () => { entries = buildIndex(topics); renderTerms(); } };
}
