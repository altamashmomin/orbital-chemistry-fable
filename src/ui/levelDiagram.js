// Generic 2D energy-level diagram on a <canvas>: horizontal levels grouped in columns, optional
// electron arrows (↑↓), connections between levels (MO correlation lines, crystal-field splitting)
// and a highlight callback. Derived from energyDiagram.js; colours come from the sage theme tokens
// in style.css (--accent, --muted, --text, --line-2, --bad) with hex fallbacks.
//
// spec = {
//   columns: [{ id, label }],                                  // left → right
//   levels: [{ id, column, E, label?, electrons?, style?, labelSide? }],
//       electrons: 0 | 1 | 2 or ['up', 'down'] / ['up', 'up'] (drawn as arrows on the level)
//       style: 'solid' (default) | 'dashed';  labelSide: 'right' (default) | 'left' | 'above'
//   connections: [{ from, to, style?: 'dashed' | 'solid' }],   // level ids
//   yLabel?: 'energy →', range?: [Emin, Emax], unit?: 'eV'
// }
// Levels in the same column with (nearly) equal E are degenerate and drawn side by side.
// layoutLevels() is pure (no DOM) so topics can test their diagrams under node.

const FALLBACK = { accent: '#48725c', accent2: '#879f68', muted: '#727e70', text: '#2d3b32', line2: '#cdd7c7', bad: '#ad6552', panel: '#fdfef9' };

/** Read theme tokens from CSS custom properties (falls back to the sage palette outside the DOM). */
export function themeColors(el) {
  if (typeof getComputedStyle !== 'function' || !el) return { ...FALLBACK };
  const cs = getComputedStyle(el);
  const tok = (name, fb) => (cs.getPropertyValue(name) || '').trim() || fb;
  return {
    accent: tok('--accent', FALLBACK.accent), accent2: tok('--accent-2', FALLBACK.accent2), muted: tok('--muted', FALLBACK.muted),
    text: tok('--text', FALLBACK.text), line2: tok('--line-2', FALLBACK.line2), bad: tok('--bad', FALLBACK.bad), panel: tok('--panel', FALLBACK.panel),
  };
}

/** Normalise `electrons` to an array of 'up' | 'down'. */
export function electronArrows(electrons) {
  if (Array.isArray(electrons)) return electrons.filter((e) => e === 'up' || e === 'down');
  const n = Math.max(0, Math.min(2, Math.round(electrons || 0)));
  return n === 2 ? ['up', 'down'] : n === 1 ? ['up'] : [];
}

/**
 * Pure layout: positions for every column, level and connection in a width × height box.
 * opts: { width, height, padding: { left, right, top, bottom }, degenerateEps }
 * Returns { columns: [{ id, label, x0, x1, xc }], levels: [{ ...level, x0, x1, y, xc, groupIndex, groupSize }],
 *           connections: [{ from, to, x0, y0, x1, y1, style }], range: [Emin, Emax], yOf(E), axis: { x, y0, y1 } }.
 */
export function layoutLevels(spec, { width = 320, height = 220, padding = {}, degenerateEps } = {}) {
  const pad = { left: 34, right: 14, top: 16, bottom: 30, ...padding };
  const columns = (spec.columns && spec.columns.length ? spec.columns : [{ id: 'main', label: '' }]).map((c) => (typeof c === 'string' ? { id: c, label: c } : c));
  const levels = spec.levels || [];
  const Es = levels.map((l) => l.E).filter((e) => Number.isFinite(e));
  let [minE, maxE] = spec.range || [Math.min(...Es), Math.max(...Es)];
  if (!Number.isFinite(minE) || !Number.isFinite(maxE)) { minE = 0; maxE = 1; }
  if (maxE - minE < 1e-9) { minE -= 1; maxE += 1; }
  if (!spec.range) { const m = (maxE - minE) * 0.12; minE -= m; maxE += m; }
  const span = maxE - minE;
  const eps = degenerateEps ?? span * 0.004;
  const innerW = Math.max(1, width - pad.left - pad.right);
  const yOf = (E) => pad.top + (1 - (E - minE) / span) * (height - pad.top - pad.bottom);

  const gap = Math.min(28, innerW * 0.08);
  const colW = (innerW - gap * (columns.length - 1)) / columns.length;
  const cols = columns.map((c, i) => {
    const x0 = pad.left + i * (colW + gap);
    return { ...c, x0, x1: x0 + colW, xc: x0 + colW / 2 };
  });
  const colById = new Map(cols.map((c) => [c.id, c]));

  // Group degenerate levels (same column, |ΔE| < eps) and spread them across the column.
  const out = [];
  for (const c of cols) {
    const mine = levels.filter((l) => (l.column ?? cols[0].id) === c.id).sort((a, b) => a.E - b.E);
    let i = 0;
    while (i < mine.length) {
      let j = i + 1;
      while (j < mine.length && Math.abs(mine[j].E - mine[i].E) < eps) j++;
      const group = mine.slice(i, j);
      const n = group.length;
      const inset = n === 1 ? colW * 0.1 : colW * 0.04;
      const avail = colW - 2 * inset;
      const slotGap = n > 1 ? Math.min(10, avail * 0.08) : 0;
      const w = (avail - slotGap * (n - 1)) / n;
      group.forEach((l, k) => {
        const x0 = c.x0 + inset + k * (w + slotGap);
        out.push({ ...l, column: c.id, x0, x1: x0 + w, xc: x0 + w / 2, y: yOf(l.E), groupIndex: k, groupSize: n });
      });
      i = j;
    }
  }
  const byId = new Map(out.map((l) => [l.id, l]));
  const connections = (spec.connections || []).map((cn) => {
    const a = byId.get(cn.from), b = byId.get(cn.to);
    if (!a || !b) return null;
    const leftToRight = a.xc <= b.xc;
    return { from: cn.from, to: cn.to, style: cn.style || 'dashed', x0: leftToRight ? a.x1 : a.x0, y0: a.y, x1: leftToRight ? b.x0 : b.x1, y1: b.y };
  }).filter(Boolean);
  return { columns: cols, levels: out, connections, range: [minE, maxE], yOf, axis: { x: pad.left, y0: pad.top, y1: height - pad.bottom }, pad, colById };
}

export class LevelDiagram {
  /**
   * canvas: a <canvas>; opts.onHighlight(level | null, source: 'hover' | 'click' | 'api') fires when the
   * highlighted level changes; opts.followConnections (default true) also highlights connected levels.
   */
  constructor(canvas, { onHighlight = null, followConnections = true, padding } = {}) {
    this.canvas = canvas;
    this.onHighlight = onHighlight;
    this.followConnections = followConnections;
    this.padding = padding;
    this.spec = null;
    this.layout = null;
    this.hoverId = null;
    this.highlighted = new Set();
    this._onMove = (e) => this._pointer(e, 'hover');
    this._onLeave = () => { if (this.hoverId) { this.hoverId = null; this.draw(); this.onHighlight?.(null, 'hover'); } };
    this._onClick = (e) => this._pointer(e, 'click');
    canvas.addEventListener('pointermove', this._onMove);
    canvas.addEventListener('pointerleave', this._onLeave);
    canvas.addEventListener('click', this._onClick);
    this.ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => this.draw()) : null;
    this.ro?.observe(canvas);
  }

  set(spec) { this.spec = spec; this.hoverId = null; this.draw(); }

  /** Programmatic highlight: a level id, an array of ids, or null to clear. */
  highlight(ids) {
    this.highlighted = new Set(ids == null ? [] : Array.isArray(ids) ? ids : [ids]);
    this.draw();
  }

  /** Level under a canvas-local point, or null. */
  hitTest(px, py) {
    if (!this.layout) return null;
    let best = null, bd = 7;
    for (const l of this.layout.levels) {
      if (px < l.x0 - 4 || px > l.x1 + 4) continue;
      const d = Math.abs(py - l.y);
      if (d < bd) { bd = d; best = l; }
    }
    return best;
  }

  _pointer(e, source) {
    const r = this.canvas.getBoundingClientRect();
    const hit = this.hitTest(e.clientX - r.left, e.clientY - r.top);
    const id = hit ? hit.id : null;
    if (source === 'hover' && id === this.hoverId) return;
    this.hoverId = id;
    this.canvas.style.cursor = hit ? 'pointer' : '';
    this.draw();
    this.onHighlight?.(hit ? this.spec.levels.find((l) => l.id === id) || hit : null, source);
  }

  _activeIds() {
    const ids = new Set(this.highlighted);
    if (this.hoverId) ids.add(this.hoverId);
    if (this.followConnections && this.layout) {
      for (const cn of this.layout.connections) {
        if (ids.has(cn.from) && cn.from === this.hoverId) ids.add(cn.to);
        if (ids.has(cn.to) && cn.to === this.hoverId) ids.add(cn.from);
      }
    }
    return ids;
  }

  draw() {
    const c = this.canvas, dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const W = c.clientWidth || 320, H = c.clientHeight || 220;
    if (c.width !== W * dpr || c.height !== H * dpr) { c.width = W * dpr; c.height = H * dpr; }
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!this.spec) { this.layout = null; return; }
    const T = themeColors(c);
    const L = this.layout = layoutLevels(this.spec, { width: W, height: H, padding: this.padding });
    const active = this._activeIds();
    const font = (px, weight = 400) => `${weight} ${px}px 'Helvetica Neue', -apple-system, system-ui, sans-serif`;

    // Axis and labels
    ctx.strokeStyle = 'rgba(87,109,91,0.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(L.axis.x, L.axis.y0); ctx.lineTo(L.axis.x, L.axis.y1); ctx.stroke();
    ctx.fillStyle = T.muted; ctx.font = font(11);
    ctx.save(); ctx.translate(11, (L.axis.y0 + L.axis.y1) / 2 + 24); ctx.rotate(-Math.PI / 2); ctx.fillText(this.spec.yLabel || 'energy →', 0, 0); ctx.restore();
    ctx.textAlign = 'center';
    for (const col of L.columns) if (col.label) ctx.fillText(col.label, col.xc, H - 10);
    ctx.textAlign = 'left';

    // Connections
    for (const cn of L.connections) {
      const hot = active.has(cn.from) || active.has(cn.to);
      ctx.strokeStyle = hot ? T.accent : T.line2;
      ctx.lineWidth = hot ? 1.4 : 1;
      ctx.setLineDash(cn.style === 'solid' ? [] : [3, 3]);
      ctx.beginPath(); ctx.moveTo(cn.x0, cn.y0); ctx.lineTo(cn.x1, cn.y1); ctx.stroke();
    }
    ctx.setLineDash([]);

    // Levels
    for (const l of L.levels) {
      const hot = active.has(l.id);
      ctx.strokeStyle = hot ? T.bad : T.accent;
      ctx.lineWidth = hot ? 3 : 2;
      ctx.setLineDash(l.style === 'dashed' ? [4, 3] : []);
      ctx.beginPath(); ctx.moveTo(l.x0, l.y); ctx.lineTo(l.x1, l.y); ctx.stroke();
      ctx.setLineDash([]);
      const arrows = electronArrows(l.electrons);
      if (arrows.length) this._drawElectrons(ctx, l.xc, l.y, arrows, hot ? T.bad : T.text);
      if (l.label) {
        ctx.fillStyle = hot ? T.bad : T.muted; ctx.font = font(10, hot ? 600 : 400);
        const side = l.labelSide || (l.groupSize > 1 ? 'above' : 'right');
        if (side === 'above') { ctx.textAlign = 'center'; ctx.fillText(l.label, l.xc, l.y - (arrows.length ? 12 : 5)); ctx.textAlign = 'left'; }
        else if (side === 'left') { ctx.textAlign = 'right'; ctx.fillText(l.label, l.x0 - 4, l.y + 3.5); ctx.textAlign = 'left'; }
        else ctx.fillText(l.label, l.x1 + 4, l.y + 3.5);
      }
    }
  }

  _drawElectrons(ctx, cx, y, arrows, color) {
    const h = 13, head = 3.2, dx = arrows.length > 1 ? 4.5 : 0;
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.4;
    arrows.forEach((dir, i) => {
      const x = cx + (i - (arrows.length - 1) / 2) * 2 * dx;
      const up = dir === 'up';
      const y0 = y + h / 2, y1 = y - h / 2;
      ctx.beginPath(); ctx.moveTo(x, up ? y0 : y1); ctx.lineTo(x, up ? y1 : y0); ctx.stroke();
      const tip = up ? y1 : y0, back = up ? y1 + head : y0 - head;
      ctx.beginPath(); ctx.moveTo(x, tip); ctx.lineTo(x - head * 0.8, back); ctx.lineTo(x + head * 0.8, back); ctx.closePath(); ctx.fill();
    });
  }

  dispose() {
    this.ro?.disconnect();
    this.canvas.removeEventListener('pointermove', this._onMove);
    this.canvas.removeEventListener('pointerleave', this._onLeave);
    this.canvas.removeEventListener('click', this._onClick);
  }
}

/** Convenience: a crystal-field splitting spec for an octahedral d^n ion (illustrative Δo in arbitrary units). */
export function octahedralSplitting(dElectrons = 6, { delta = 1, highSpin = false } = {}) {
  const d = Math.max(0, Math.min(10, dElectrons));
  // Fill t2g then eg (low spin) or singly across all five first (high spin).
  const occ = { t2g: [0, 0, 0], eg: [0, 0] };
  const order = highSpin ? ['t0', 't1', 't2', 'e0', 'e1', 't0', 't1', 't2', 'e0', 'e1'] : ['t0', 't1', 't2', 't0', 't1', 't2', 'e0', 'e1', 'e0', 'e1'];
  for (let i = 0; i < d; i++) { const k = order[i]; (k[0] === 't' ? occ.t2g : occ.eg)[Number(k[1])]++; }
  const levels = [
    { id: 'free', column: 'ion', E: 0, label: `d (${d} e⁻)`, electrons: 0 },
    ...occ.t2g.map((n, i) => ({ id: `t2g${i}`, column: 'oct', E: -0.4 * delta, electrons: n, label: i === 1 ? 't₂g' : undefined })),
    ...occ.eg.map((n, i) => ({ id: `eg${i}`, column: 'oct', E: 0.6 * delta, electrons: n, label: i === 0 ? 'e_g' : undefined })),
  ];
  const connections = [...occ.t2g.map((_, i) => ({ from: 'free', to: `t2g${i}` })), ...occ.eg.map((_, i) => ({ from: 'free', to: `eg${i}` }))];
  return { columns: [{ id: 'ion', label: 'free ion' }, { id: 'oct', label: 'octahedral field' }], levels, connections, yLabel: 'energy →' };
}
