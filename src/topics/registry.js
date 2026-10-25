// Topic registry: the contract every topic module satisfies, and the directory of registered topics.
//
// A topic is one folder under src/topics/<id>/ exporting an object of this shape:
//   {
//     id: 'transition-metals',            // kebab-case, unique, used in the URL hash
//     title: 'Transition metals',         // tab label
//     badge: 'BETA' | undefined,          // small tag next to the tab label
//     order: 30,                          // tab position (lower first); default 100
//     aliases: ['legacy-hash'],           // old hashes that should still open this topic
//     summary: 'One sentence for directories and search.',
//     audiences: ['refresher', 'learn'],  // which depth levels the content supports
//     workspace: { kind: '3d' | 'canvas', label, badge, hints: ['Drag to rotate', ...] },
//     copy: { eyebrow, headline (may contain <em>), subtitle, note, noteSub },
//     create: ({ view, viewport, level }) => panel,
//   }
// and `panel` is { el, inspector?, activate(), deactivate(), setLevel?(level),
//                  mountWorkspace?(container), unmountWorkspace?(container) }.
// kind '3d' topics draw into the shared MoleculeView; kind 'canvas' topics own the workspace
// container (mountWorkspace) and may draw anything (2D canvas, SVG, text).
export const WORKSPACE_KINDS = ['3d', 'canvas'];
export const AUDIENCES = ['refresher', 'learn'];

const topics = [];
const listeners = new Set();

/** Return a list of problems with a topic object (empty when valid). */
export function validateTopic(t) {
  const errors = [];
  if (!t || typeof t !== 'object') return ['topic is not an object'];
  if (!/^[a-z][a-z0-9-]*$/.test(t.id || '')) errors.push('id must be kebab-case (a-z, 0-9, -)');
  if (typeof t.title !== 'string' || !t.title.trim()) errors.push('title is required');
  if (typeof t.create !== 'function') errors.push('create(ctx) must be a function returning a panel');
  if (!Array.isArray(t.audiences) || !t.audiences.length || t.audiences.some((a) => !AUDIENCES.includes(a))) errors.push(`audiences must be a non-empty subset of ${AUDIENCES.join('/')}`);
  if (!t.workspace || !WORKSPACE_KINDS.includes(t.workspace.kind)) errors.push(`workspace.kind must be one of ${WORKSPACE_KINDS.join('/')}`);
  if (!t.copy || typeof t.copy.headline !== 'string') errors.push('copy.headline is required');
  if (t.aliases && !Array.isArray(t.aliases)) errors.push('aliases must be an array');
  return errors;
}

export function registerTopic(t) {
  const errors = validateTopic(t);
  if (errors.length) throw new Error(`Invalid topic "${t?.id}": ${errors.join('; ')}`);
  if (topics.some((x) => x.id === t.id)) throw new Error(`Topic "${t.id}" is already registered`);
  topics.push(t);
  topics.sort((a, b) => (a.order ?? 100) - (b.order ?? 100) || a.title.localeCompare(b.title));
  listeners.forEach((fn) => fn(listTopics()));
  return t.id;
}

/** Live, ordered array of registered topics (do not mutate; use registerTopic). */
export const TOPICS = topics;
export const listTopics = () => [...topics];
export const topicById = (id) => topics.find((t) => t.id === id) || null;

/** Map a URL hash or id (including legacy aliases) to a registered topic id. */
export function resolveTopicId(hashOrId, fallback = topics[0]?.id) {
  const raw = String(hashOrId || '').replace(/^#/, '').trim();
  if (!raw) return fallback;
  if (topicById(raw)) return raw;
  const t = topics.find((x) => (x.aliases || []).includes(raw));
  return t ? t.id : fallback;
}

export function onTopicsChanged(fn) { listeners.add(fn); return () => listeners.delete(fn); }
