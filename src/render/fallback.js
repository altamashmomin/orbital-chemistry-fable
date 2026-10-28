// What the app runs on when WebGL is unavailable (old or locked-down browsers, some remote desktops):
// a viewport stub with the surface the panels and the animator touch, and a molecule-view stub that
// keeps the frame so cards, sketches and overlays still read it. Topics stay readable; nothing 3D draws.
// Debug hook: open the app with `?nowebgl` to exercise this path in a normal browser.

/** A stub whose every property is another stub, callable and constructible (`new THREE.Group()`); numbers come back as 0. */
function anyStub() {
  function target() {}
  return new Proxy(target, {
    get: (t, key) => {
      if (key === Symbol.toPrimitive || key === 'valueOf') return () => 0;
      if (key === 'toString') return () => '';
      if (key === 'then') return undefined;   // not a thenable
      if (key === 'length') return 0;
      if (key === 'prototype') return t.prototype;
      return anyStub();
    },
    apply: () => anyStub(),
    construct: () => anyStub(),
  });
}

/**
 * A readable stand-in for a topic whose panel cannot be built without WebGL (the Reaction lab's
 * animator needs a scene): the topic's own summary and copy, plus the reason, in the panel column.
 */
export function fallbackPanel(topic, err, doc = typeof document !== 'undefined' ? document : null) {
  const make = (tag, className, text) => { const el = doc.createElement(tag); if (className) el.className = className; if (text) el.textContent = text; return el; };
  const el = doc ? make('div', 'panel-inner fallback-panel') : null;
  if (el) {
    el.append(make('h3', 'sec-title', topic.title), make('p', 'fallback-why', 'This topic draws and animates in 3D, which needs WebGL, and the 3D view is unavailable here.'), make('p', 'fallback-summary', topic.summary || ''), make('p', 'hint', `(${err?.message || err})`));
  }
  return { el, inspector: null, fallback: true, activate() {}, deactivate() {}, setLevel() {}, navigate() {} };
}

const vec = () => ({ x: 0, y: 0, z: 0, set() { return this; }, copy() { return this; }, clone() { return vec(); }, toArray: () => [0, 0, 0], lerpVectors() { return this; }, add() { return this; }, sub() { return this; }, normalize() { return this; }, multiplyScalar() { return this; }, lengthSq: () => 0 });

/**
 * Create the fallback viewport: writes a readable notice into `container` (when given) and returns an
 * object with the viewport API as no-ops. `fallback: true` and `reason` let the shell adapt.
 */
export function createFallbackViewport(container, reason = 'WebGL is not available') {
  const message = typeof reason === 'string' ? reason : reason?.message || 'WebGL is not available';
  if (container && typeof container.appendChild === 'function') {
    const box = container.ownerDocument.createElement('div');
    box.className = 'webgl-fallback';
    box.setAttribute('role', 'status');
    box.innerHTML = `<b>The 3D view is unavailable here.</b> <span class="reason"></span> Every card still describes the structure, the Molecular shapes topic draws each molecule as a wedge-and-dash sketch, and the search and glossary work as usual.`;
    box.querySelector('.reason').textContent = `(${message}.)`;
    container.appendChild(box);
  }
  const camera = { position: vec(), quaternion: anyStub(), zoom: 1, fov: 38, updateProjectionMatrix() {} };
  const controls = { target: vec(), autoRotate: false, addEventListener() {}, removeEventListener() {}, update() {} };
  return {
    fallback: true, reason: message,
    THREE: anyStub(), scene: { background: { set() {} }, fog: { color: { set() {} } }, add() {}, remove() {} },
    camera, controls, renderer: { render() {}, domElement: null, dispose() {} }, labelRenderer: { render() {} },
    root: { add() {}, remove() {}, children: [] },
    onTick: () => () => {},
    fitTo() {}, moveCamera: () => Promise.resolve(), setAutoRotate(on) { controls.autoRotate = !!on; }, dispose() {},
  };
}

/** The MoleculeView surface panels use, without a scene: it only remembers the frame and options. */
export class FallbackMoleculeView {
  constructor() { this.frame = null; this.options = {}; this.highlights = []; this.arrows = []; this.fallback = true; }
  setFrame(frame) { this.frame = frame; }
  setArrows(arrows = []) { this.arrows = arrows; }
  setHighlights(visuals = []) { this.highlights = visuals; }
  setOptions(patch = {}) { Object.assign(this.options, patch); }
  bounds() { return null; }
  clear() { this.frame = null; this.highlights = []; this.arrows = []; }
  atom(id) { return this.frame?.atoms.find((a) => a.id === id) || null; }
}
