// A very small DOM stand-in so panels built with src/ui/dom.js can be exercised under node --test.
// Supports what h()/fill()/clear()/section()/aud() and the CollectionExplorer use: createElement,
// createTextNode, append, removeChild, childNodes, className/classList, style, dataset, attributes,
// addEventListener + click(), textContent, and a querySelectorAll() limited to '.class' selectors.
class FakeNode {
  constructor(nodeType) { this.nodeType = nodeType; this.parentNode = null; }
}
export class FakeText extends FakeNode {
  constructor(text) { super(3); this.data = String(text); }
  get textContent() { return this.data; }
}
export class FakeElement extends FakeNode {
  constructor(tagName) {
    super(1);
    this.tagName = tagName.toUpperCase();
    this.childNodes = []; this.attributes = {}; this.style = {}; this.dataset = {}; this.listeners = {};
    this._class = new Set();
    this.hidden = false; this.checked = false; this.innerHTML = ''; this.value = '';
  }
  get className() { return [...this._class].join(' '); }
  set className(s) { this._class = new Set(String(s).split(/\s+/).filter(Boolean)); }
  get classList() {
    const c = this._class;
    return { add: (...xs) => xs.forEach((x) => c.add(x)), remove: (...xs) => xs.forEach((x) => c.delete(x)), contains: (x) => c.has(x), toggle: (x, force) => { const on = force ?? !c.has(x); on ? c.add(x) : c.delete(x); return on; } };
  }
  get children() { return this.childNodes.filter((n) => n.nodeType === 1); }
  get firstChild() { return this.childNodes[0] || null; }
  get textContent() { return this.childNodes.map((n) => n.textContent).join(''); }
  set textContent(s) { this.childNodes = s === '' ? [] : [new FakeText(s)]; }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] ?? null; }
  append(...nodes) { for (const n of nodes) { const node = n?.nodeType ? n : new FakeText(n); node.parentNode?.removeChild?.(node); node.parentNode = this; this.childNodes.push(node); } }
  removeChild(n) { const i = this.childNodes.indexOf(n); if (i >= 0) { this.childNodes.splice(i, 1); n.parentNode = null; } return n; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  dispatch(type, event = {}) { const e = { type, target: this, stopPropagation() {}, preventDefault() {}, ...event }; for (const fn of this.listeners[type] || []) fn(e); }
  click() { this.dispatch('click'); }
  /** '.a', '.a.b', '.a .b' and 'tag' selectors only. */
  querySelectorAll(selector) {
    const parts = selector.trim().split(/\s+/);
    let scope = [this];
    for (const part of parts) {
      const classes = part.split('.').filter(Boolean);
      const tag = part.startsWith('.') ? null : classes.shift()?.toUpperCase();
      const next = [];
      for (const s of scope) walk(s, (el) => { if (el !== s && (!tag || el.tagName === tag) && classes.every((c) => el._class.has(c))) next.push(el); });
      scope = next;
    }
    return scope;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}
function walk(el, fn) { for (const n of el.childNodes) if (n.nodeType === 1) { fn(n); walk(n, fn); } }

/** Install a fake `document` on globalThis; returns a teardown function. */
export function installFakeDom() {
  const byId = new Map();
  const doc = {
    createElement: (tag) => new FakeElement(tag),
    createTextNode: (s) => new FakeText(s),
    getElementById: (id) => { if (!byId.has(id)) byId.set(id, new FakeElement('div')); return byId.get(id); },
    body: new FakeElement('body'),
  };
  const prev = globalThis.document;
  globalThis.document = doc;
  return () => { if (prev === undefined) delete globalThis.document; else globalThis.document = prev; };
}
