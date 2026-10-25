// Tiny DOM helpers (no framework).
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}
export const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };

export function select(options, value, onChange, attrs = {}) {
  const el = h('select', { class: 'select', ...attrs, onChange: (e) => onChange(e.target.value) },
    options.map((o) => h('option', { value: o.value ?? o.id, selected: (o.value ?? o.id) === value }, o.label)));
  return el;
}
export function toggle(label, checked, onChange) {
  const input = h('input', { type: 'checkbox', onChange: (e) => onChange(e.target.checked) });
  input.checked = !!checked;
  return h('label', { class: 'toggle' }, input, h('span', {}, label));
}
export const section = (title, ...children) => h('section', { class: 'sec' }, title ? h('h3', { class: 'sec-title' }, title) : null, ...children);
