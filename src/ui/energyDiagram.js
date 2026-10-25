// Reaction-coordinate diagram drawn on a <canvas>, with a marker at the current t.
export class EnergyDiagram {
  constructor(canvas) { this.canvas = canvas; this.mech = null; this.t = 0; this.ro = new ResizeObserver(() => this.draw(this.t)); this.ro.observe(canvas); }
  set(mech) { this.mech = mech; this.draw(0); }
  draw(t = this.t) {
    this.t = t;
    const c = this.canvas, dpr = window.devicePixelRatio || 1;
    const W = c.clientWidth || 320, H = c.clientHeight || 170;
    if (c.width !== W * dpr || c.height !== H * dpr) { c.width = W * dpr; c.height = H * dpr; }
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!this.mech) return;
    const pts = this.mech.energy.points;
    const Es = pts.map((p) => p.E);
    const minE = Math.min(...Es) - 6, maxE = Math.max(...Es) + 8;
    const padL = 34, padR = 14, padT = 14, padB = 30;
    const X = (u) => padL + u * (W - padL - padR);
    const Y = (E) => padT + (1 - (E - minE) / (maxE - minE)) * (H - padT - padB);

    ctx.strokeStyle = 'rgba(148,163,184,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, H - padB); ctx.lineTo(W - padR, H - padB); ctx.stroke();
    ctx.fillStyle = 'rgba(148,163,184,0.8)'; ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('reaction coordinate →', W / 2 - 50, H - 10);
    ctx.save(); ctx.translate(11, H / 2 + 20); ctx.rotate(-Math.PI / 2); ctx.fillText('energy →', 0, 0); ctx.restore();

    // curve
    ctx.beginPath();
    for (let i = 0; i <= 240; i++) { const u = i / 240; const y = Y(this.mech.energyAt(u)); if (i === 0) ctx.moveTo(X(u), y); else ctx.lineTo(X(u), y); }
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.stroke();
    ctx.lineTo(X(1), H - padB); ctx.lineTo(X(0), H - padB); ctx.closePath();
    ctx.fillStyle = 'rgba(56,189,248,0.08)'; ctx.fill();

    // control-point labels
    ctx.font = '10px system-ui, sans-serif';
    pts.forEach((p, i) => {
      if (!p.label) return;
      const isMax = (i > 0 && i < pts.length - 1 && p.E > pts[i - 1].E && p.E > pts[i + 1].E);
      const x = X(p.t), y = Y(p.E);
      ctx.fillStyle = isMax ? '#fbbf24' : '#cbd5e1';
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
      const w = ctx.measureText(p.label).width;
      ctx.fillText(p.label, Math.min(W - padR - w, Math.max(padL, x - w / 2)), isMax ? y - 7 : y + 14);
    });

    // marker
    const mx = X(t), my = Y(this.mech.energyAt(t));
    ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(251,191,36,0.5)';
    ctx.beginPath(); ctx.moveTo(mx, padT); ctx.lineTo(mx, H - padB); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(mx, my, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#0b1020'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#fde68a'; ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(`${this.mech.energyAt(t).toFixed(0)} ${this.mech.energy.unit.split(' ')[0]}`, Math.min(W - 70, mx + 8), Math.max(padT + 10, my - 8));
  }
  dispose() { this.ro.disconnect(); }
}
