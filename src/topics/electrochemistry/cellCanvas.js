// 2D drawing of a galvanic cell on a <canvas>: two beakers with their electrodes and solutions, the salt bridge, the
// wire through a voltmeter reading the cell potential, the electron flow from anode to cathode and the ion flow
// through the bridge. Pure drawing: every label comes from the cell object of src/chem/electrochemistry.js.
import { themeColors } from '../../ui/levelDiagram.js';
import { ELEMENTS } from '../../chem/elements.js';
import { SPECIES } from '../../chem/redox.js';
import { signed, fmtConc } from '../../chem/electrochemistry.js';

/**
 * Draw `cell` (from cell() / buildCell().cell) into `canvas`, fitted to its CSS size. `opts.dpr` defaults to the device
 * pixel ratio; `opts.colors` to the theme tokens read from the canvas.
 */
export function drawCell(canvas, cell, opts = {}) {
  if (!canvas || !cell) return;
  const dpr = opts.dpr || (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1;
  const W = canvas.clientWidth || 640, H = canvas.clientHeight || 420;
  if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const col = opts.colors || themeColors(canvas);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const narrow = W < 420;
  const s = Math.min(W / 640, H / 420, 1.6);                 // scale factor; layout designed at 640 × 420
  const font = (px, weight = 400) => `${weight} ${Math.max(9, px * s)}px system-ui, -apple-system, 'Helvetica Neue', sans-serif`;
  // the workspace heading sits above the drawing (two lines at phone width), so the layout starts lower
  const cx = W / 2, top = Math.max(110 * s, H * 0.28) + (narrow ? 40 : 0), beakerW = Math.min(200 * s, W * 0.36), beakerH = 190 * s, gap = Math.max(60 * s, W * 0.16);
  const bx = [cx - gap / 2 - beakerW, cx + gap / 2];           // left = anode, right = cathode
  const by = top + 40 * s, liquidY = by + 50 * s, bottom = by + beakerH;
  const sides = [{ role: 'anode', hc: cell.half.anode, x: bx[0], sign: '−' }, { role: 'cathode', hc: cell.half.cathode, x: bx[1], sign: '+' }];

  // beakers and solutions
  for (const side of sides) {
    const { x, hc } = side;
    ctx.fillStyle = 'rgba(95, 142, 163, 0.14)';
    ctx.fillRect(x + 2, liquidY, beakerW - 4, bottom - liquidY - 2);
    ctx.strokeStyle = col.text; ctx.lineWidth = 1.5 * s;
    ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x, bottom); ctx.lineTo(x + beakerW, bottom); ctx.lineTo(x + beakerW, by); ctx.stroke();
    ctx.strokeStyle = col.line2; ctx.beginPath(); ctx.moveTo(x + 2, liquidY); ctx.lineTo(x + beakerW - 2, liquidY); ctx.stroke();
    // electrode
    const ex = x + beakerW / 2, ew = 16 * s, eTop = by - 10 * s, eBottom = bottom - 22 * s;
    const el = hc.electrode.el;
    ctx.fillStyle = hc.electrode.kind === 'metal' ? (ELEMENTS[el]?.color || '#999') : '#b8bcd0';
    ctx.strokeStyle = col.text; ctx.lineWidth = 1 * s;
    ctx.fillRect(ex - ew / 2, eTop, ew, eBottom - eTop); ctx.strokeRect(ex - ew / 2, eTop, ew, eBottom - eTop);
    ctx.fillStyle = col.text; ctx.font = font(11, 600); ctx.textAlign = 'center';
    ctx.fillText(hc.electrode.kind === 'metal' ? `${hc.electrode.formula}(s)` : 'Pt(s)', ex, eTop - 6 * s);
    // gas inlet: bubbles beside the platinum
    if (hc.gas) {
      ctx.strokeStyle = col.muted; ctx.lineWidth = 1 * s;
      for (let i = 0; i < 6; i++) { const r = (2 + (i % 3)) * s; ctx.beginPath(); ctx.arc(ex + (i % 2 ? 1 : -1) * (14 + (i % 3) * 3) * s, eBottom - (8 + i * 22) * s, r, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = col.muted; ctx.font = font(10); ctx.fillText(`${SPECIES[hc.gas].formula}(g), 1 bar`, ex, liquidY - 8 * s);
    }
    // solutes
    ctx.fillStyle = col.text; ctx.font = font(11); ctx.textAlign = 'left';
    const lines = hc.solutes.map((id) => `${SPECIES[id].formula}(aq) ${fmtConc(cell.conc?.[id] ?? 1)}`);
    if (hc.needsAcid && !hc.solutes.includes('proton')) lines.push(`H⁺(aq) pH ${Number(cell.pH ?? 0).toFixed(1)}`);
    lines.forEach((t, i) => ctx.fillText(t, x + 8 * s, bottom - 10 * s - (lines.length - 1 - i) * 14 * s));
    // caption under the beaker
    ctx.textAlign = 'center'; ctx.fillStyle = side.role === 'anode' ? col.bad : col.accent; ctx.font = font(12, 700);
    ctx.fillText(`${side.role} (${side.sign}) · ${side.role === 'anode' ? 'oxidation' : 'reduction'}`, x + beakerW / 2, bottom + 20 * s);
    ctx.fillStyle = col.text; ctx.font = font(10.5);
    const half = side.role === 'anode' ? `${hc.reduction.right.filter((t) => t.id !== 'electron').map((t) => `${t.n === 1 ? '' : `${t.n} `}${t.formula}`).join(' + ')} → ${hc.reduction.left.map((t) => `${t.n === 1 ? '' : `${t.n} `}${t.formula}`).join(' + ')}` : hc.text;
    ctx.fillText(half, x + beakerW / 2, bottom + 36 * s, beakerW + gap * 0.6);
    ctx.fillStyle = col.muted; ctx.font = font(10);
    ctx.fillText(`E° = ${signed(hc.E0)} V`, x + beakerW / 2, bottom + 50 * s);
  }
  // salt bridge
  const sbY = liquidY - 20 * s, sbW = 14 * s, lx = bx[0] + beakerW * 0.78, rx = bx[1] + beakerW * 0.22;
  ctx.strokeStyle = col.text; ctx.lineWidth = 1.2 * s; ctx.fillStyle = 'rgba(135, 159, 104, 0.25)';
  ctx.beginPath(); ctx.moveTo(lx - sbW / 2, liquidY + 30 * s); ctx.lineTo(lx - sbW / 2, sbY); ctx.lineTo(rx + sbW / 2, sbY); ctx.lineTo(rx + sbW / 2, liquidY + 30 * s);
  ctx.lineTo(rx - sbW / 2, liquidY + 30 * s); ctx.lineTo(rx - sbW / 2, sbY + sbW); ctx.lineTo(lx + sbW / 2, sbY + sbW); ctx.lineTo(lx + sbW / 2, liquidY + 30 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = col.muted; ctx.font = font(10); ctx.textAlign = 'center';
  ctx.fillText('salt bridge (KNO₃)', cx, sbY - 6 * s);
  if (!narrow) { ctx.fillText('anions →', cx - 30 * s, sbY + sbW * 0.75); ctx.fillText('← cations', cx + 36 * s, sbY + sbW * 0.75); }
  // wire and voltmeter
  const wireY = top - 30 * s, r = 20 * s;
  const ax = bx[0] + beakerW / 2, kx = bx[1] + beakerW / 2;
  ctx.strokeStyle = col.text; ctx.lineWidth = 1.5 * s;
  ctx.beginPath(); ctx.moveTo(ax, by - 10 * s); ctx.lineTo(ax, wireY); ctx.lineTo(cx - r, wireY); ctx.moveTo(cx + r, wireY); ctx.lineTo(kx, wireY); ctx.lineTo(kx, by - 10 * s); ctx.stroke();
  ctx.fillStyle = col.panel; ctx.beginPath(); ctx.arc(cx, wireY, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = col.text; ctx.font = font(12, 700); ctx.fillText(`${signed(cell.E)} V`, cx, wireY + 4 * s);
  ctx.font = font(9.5); ctx.fillStyle = col.muted; ctx.fillText(cell.standard ? 'E° (standard)' : 'E (Nernst)', cx, wireY + r + 11 * s);
  // electron flow: anode → cathode along the wire
  const arrowY = wireY - 12 * s;
  const drawArrow = (x0, x1, y, color) => { ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.2 * s; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); const d = Math.sign(x1 - x0) * 6 * s; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x1 - d, y - 3.5 * s); ctx.lineTo(x1 - d, y + 3.5 * s); ctx.closePath(); ctx.fill(); };
  drawArrow(ax + 20 * s, cx - r - 14 * s, arrowY, col.accent2); drawArrow(cx + r + 14 * s, kx - 20 * s, arrowY, col.accent2);
  ctx.fillStyle = col.accent2; ctx.font = font(10, 600); ctx.textAlign = 'center';
  ctx.fillText(`e⁻ flow: ${cell.n} per ${cell.eq.text.split(' → ')[0]}`, cx, arrowY - 6 * s);
  // notation and overall equation
  ctx.fillStyle = col.text; ctx.font = font(11, 600); ctx.textAlign = 'center';
  ctx.fillText(cell.notation, cx, H - 24 * s, W - 20);
  ctx.font = font(11); ctx.fillStyle = col.muted;
  ctx.fillText(`${cell.eq.text}   E°cell = ${signed(cell.half.cathode.E0)} − (${signed(cell.half.anode.E0)}) = ${signed(cell.E0)} V`, cx, H - 8 * s, W - 20);
}
