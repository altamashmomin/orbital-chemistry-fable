import './style.css';
import { createViewport } from './render/scene.js';
import { MoleculeView } from './render/moleculeView.js';
import { clear, h } from './ui/dom.js';
import { LEVELS, getLevel, setLevel, onLevelChange } from './ui/level.js';
import { TOPICS, registerTopic, resolveTopicId, topicById, onTopicsChanged, validateTopic } from './topics/index.js';
import { registerAnimator, listAnimators, Animator } from './anim/index.js';
import { mountNexus } from './nexus/ui.js';
import { MECHANISMS } from './chem/mechanisms/index.js';
import { FUNCTIONAL_GROUPS } from './chem/functionalGroups.js';
import { R_GROUPS } from './chem/rGroups.js';
import { makeMolecule } from './chem/builder.js';

export const REPO_URL = 'https://github.com/altamashmomin/orbital-chemistry-fable';

const $ = (id) => document.getElementById(id);
const viewportElement = $('viewport');
const viewport = createViewport(viewportElement);
// Match the reference's softly tinted molecular canvas without changing renderer APIs.
viewport.scene.background.set('#f0f3ed');
viewport.scene.fog.color.set('#f0f3ed');
// Preserve enough horizontal field of view for separated reactants on phone screens.
const framingObserver = new ResizeObserver(() => {
  const aspect = viewportElement.clientWidth / Math.max(1, viewportElement.clientHeight);
  viewport.camera.zoom = Math.min(1, Math.max(0.5, aspect / 1.3));
  viewport.camera.updateProjectionMatrix();
});
framingObserver.observe(viewportElement);
const view = new MoleculeView(viewport);
const panelEl = $('panel');
const inspectorEl = $('inspector');
const customEl = $('workspace-custom');
const tabsEl = $('tabs');

// ---------------------------------------------------------------- topics
const panels = new Map();          // topic id -> panel instance (created on first visit)
let current = null;

function panelFor(topic) {
  if (!panels.has(topic.id)) panels.set(topic.id, topic.create({ view, viewport, level: getLevel(), navigate: (path) => history.replaceState(null, '', `#${path}`) }));
  return panels.get(topic.id);
}

function renderTabs() {
  clear(tabsEl).append(...TOPICS.map((t) => h('button', {
    class: `tab ${t.id === current ? 'active' : ''}`, dataset: { topic: t.id }, 'aria-pressed': String(t.id === current), onClick: () => setTopic(t.id),
  }, t.title, t.badge ? h('span', { class: 'beta' }, t.badge) : null)));
}

function applyCopy(topic) {
  const c = topic.copy || {}, w = topic.workspace || {};
  $('page-eyebrow').textContent = c.eyebrow || '';
  $('page-title').innerHTML = c.headline || topic.title;
  $('page-subtitle').textContent = c.subtitle || '';
  $('intro-note').textContent = c.note || '';
  $('intro-note-sub').textContent = c.noteSub || '';
  $('workspace-label').textContent = w.label || topic.title;
  $('workspace-name').textContent = '';
  $('workspace-badge').textContent = w.badge || '';
  clear($('workspace-hint')).append(...(w.hints || []).flatMap((hint, i) => (i ? [h('span', {}, '·'), hint] : [hint])));
}

/** Split '#topic/sub/path' into { head, sub }. */
const parseHash = (idOrHash) => { const raw = String(idOrHash || '').replace(/^#/, '').trim(); const i = raw.indexOf('/'); return i < 0 ? { head: raw, sub: '' } : { head: raw.slice(0, i), sub: raw.slice(i + 1) }; };

export function setTopic(idOrHash) {
  const { head, sub } = parseHash(idOrHash);
  if (head === 'glossary') { if (!current) setTopic(TOPICS[0]?.id); nexus.openGlossary(sub || undefined); return; }
  const topic = topicById(resolveTopicId(head));
  if (!topic) return;
  if (topic.id === current) { if (sub) panelFor(topic).navigate?.(sub); history.replaceState(null, '', `#${topic.id}${sub ? `/${sub}` : ''}`); return; }
  if (current) {
    const prev = panelFor(topicById(current));
    prev.deactivate?.();
    prev.unmountWorkspace?.(customEl);
  }
  current = topic.id;
  const panel = panelFor(topic);
  clear(panelEl).append(panel.el);
  clear(inspectorEl).append(panel.inspector || h('div', { class: 'panel-inner' }));
  panelEl.scrollTop = 0;
  inspectorEl.scrollTop = 0;
  document.body.dataset.topic = topic.id;
  document.body.dataset.mode = topic.aliases?.[0] || topic.id;   // legacy hook for styles
  applyCopy(topic);
  const custom = topic.workspace?.kind === 'canvas';
  viewportElement.classList.toggle('custom', custom);
  customEl.hidden = !custom;
  renderTabs();
  history.replaceState(null, '', `#${topic.id}${sub ? `/${sub}` : ''}`);
  view.clear();
  if (custom) panel.mountWorkspace?.(customEl);
  panel.activate?.();
  panel.setLevel?.(getLevel());
  if (sub) panel.navigate?.(sub);
}

// ---------------------------------------------------------------- audience level
function renderLevelSwitch() {
  const el = $('levelSwitch');
  clear(el).append(...LEVELS.map((l) => h('button', {
    class: `level-btn ${l.id === getLevel() ? 'active' : ''}`, 'aria-pressed': String(l.id === getLevel()), title: l.hint, onClick: () => setLevel(l.id),
  }, l.label)));
}
onLevelChange((level) => { renderLevelSwitch(); if (current) panelFor(topicById(current)).setLevel?.(level); });
setLevel(getLevel());
renderLevelSwitch();

// ---------------------------------------------------------------- nexus: search + glossary
const nexus = mountNexus({ searchRoot: $('nexus'), drawerRoot: document.body, topics: TOPICS, navigate: (href) => setTopic(href), getLevel, onLevelChange, onTopicsChanged });

// ---------------------------------------------------------------- boot
onTopicsChanged(() => renderTabs());
$('repoLink').href = REPO_URL;
window.addEventListener('hashchange', () => setTopic(location.hash));
setTopic(location.hash);

// Public hook for custom topics/animators and for poking at the data from the console.
window.OrbitalChemistry = {
  version: '0.3.0',
  topics: TOPICS, registerTopic, validateTopic, setTopic, panels, getLevel, setLevel, nexus,
  registerAnimator, listAnimators, Animator,
  mechanisms: MECHANISMS, functionalGroups: FUNCTIONAL_GROUPS, rGroups: R_GROUPS, makeMolecule,
  viewport, view,
};
