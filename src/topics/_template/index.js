// Starter for a new topic. Copy this folder to src/topics/<your-id>/, rename the export, and add
// two lines to src/topics/index.js. It is NOT registered; try it from the browser console with
//   import('/src/topics/_template/index.js').then((m) => window.OrbitalChemistry.registerTopic(m.template))
// This example uses a 'canvas' workspace (a 2D standing wave) to show how non-molecular topics
// (uncertainty principle, redox potentials, MO diagrams) own the workspace area.
import { h, clear, section, aud } from '../../ui/dom.js';

export const template = {
  id: 'template-topic',
  title: 'Template',
  badge: 'DEMO',
  order: 999,
  summary: 'A copy-me topic showing the contract: panel, field guide, audience tags and a canvas workspace.',
  audiences: ['refresher', 'learn'],
  workspace: { kind: 'canvas', label: 'Canvas workspace', badge: 'Interactive', hints: ['Move the slider'] },
  copy: {
    eyebrow: 'Template topic',
    headline: 'A standing wave, <em>as a starting point.</em>',
    subtitle: 'Replace this with the one idea your topic is about.',
    note: 'Copy, rename, register.',
    noteSub: 'Three steps to a new topic.',
  },
  create: ({ level }) => new TemplatePanel(level),
};

class TemplatePanel {
  constructor(level) {
    this.level = level;
    this.n = 3;
    this.el = h('div', { class: 'panel-inner' },
      section('Controls',
        h('div', { class: 'row' }, h('label', {}, 'Nodes n'),
          h('input', { type: 'range', min: 1, max: 8, value: this.n, class: 'scrubber', onInput: (e) => { this.n = Number(e.target.value); this.draw(); } })),
        aud(h('div', { class: 'hint' }, 'Learn-level hint: explain what the control does and why it matters.'), 'learn'),
      ),
    );
    this.inspector = h('div', { class: 'panel-inner study-guide' },
      section('Always true',
        h('ul', { class: 'identify' }, h('li', {}, 'Refresher fact: a standing wave has n − 1 interior nodes.'))),
      aud(section('Why it works', h('p', {}, 'Learn-only reasoning goes here: boundary conditions force sin(nπx/L).')), 'learn'),
    );
  }
  activate() {}
  deactivate() {}
  setLevel(level) { this.level = level; }
  mountWorkspace(container) {
    this.canvas = h('canvas', { class: 'workspace-canvas' });
    container.append(this.canvas);
    this.ro = new ResizeObserver(() => this.draw());
    this.ro.observe(container);
    this.draw();
  }
  unmountWorkspace(container) { this.ro?.disconnect(); clear(container); this.canvas = null; }
  draw() {
    const c = this.canvas; if (!c) return;
    const dpr = window.devicePixelRatio || 1, W = c.clientWidth || 600, H = c.clientHeight || 400;
    if (c.width !== W * dpr || c.height !== H * dpr) { c.width = W * dpr; c.height = H * dpr; }
    const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = '#48725c'; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= 300; i++) { const x = i / 300; const y = Math.sin(this.n * Math.PI * x); const px = 60 + x * (W - 120), py = H / 2 - y * (H * 0.3); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.stroke();
    ctx.fillStyle = '#727e70'; ctx.font = '12px system-ui'; ctx.fillText(`n = ${this.n}`, 60, H / 2 + H * 0.3 + 24);
  }
}
