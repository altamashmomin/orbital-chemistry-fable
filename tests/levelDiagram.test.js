import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutLevels, electronArrows, themeColors, octahedralSplitting } from '../src/ui/levelDiagram.js';

const H2 = {
  columns: [{ id: 'A', label: 'H' }, { id: 'MO', label: 'H₂' }, { id: 'B', label: 'H' }],
  levels: [
    { id: 'a1s', column: 'A', E: -13.6, label: '1s', electrons: 1 },
    { id: 'b1s', column: 'B', E: -13.6, label: '1s', electrons: 1 },
    { id: 'sigma', column: 'MO', E: -16.3, label: 'σ', electrons: 2 },
    { id: 'sigmaStar', column: 'MO', E: -9.5, label: 'σ*', electrons: 0, style: 'dashed' },
  ],
  connections: [{ from: 'a1s', to: 'sigma' }, { from: 'b1s', to: 'sigma' }, { from: 'a1s', to: 'sigmaStar' }, { from: 'b1s', to: 'sigmaStar' }],
};

test('layout maps energies to y, columns left to right and connections between level ends', () => {
  const L = layoutLevels(H2, { width: 400, height: 240 });
  assert.equal(L.columns.length, 3);
  assert.ok(L.columns[0].x1 < L.columns[1].x0 && L.columns[1].x1 < L.columns[2].x0, 'columns do not overlap');
  const byId = Object.fromEntries(L.levels.map((l) => [l.id, l]));
  assert.ok(byId.sigma.y > byId.a1s.y && byId.a1s.y > byId.sigmaStar.y, 'lower energy is drawn lower');
  assert.equal(byId.a1s.y, byId.b1s.y, 'equal energies share a y');
  assert.ok(byId.sigma.x0 >= L.columns[1].x0 && byId.sigma.x1 <= L.columns[1].x1, 'level stays inside its column');
  assert.equal(L.connections.length, 4);
  const c = L.connections.find((x) => x.from === 'a1s' && x.to === 'sigma');
  assert.equal(c.x0, byId.a1s.x1, 'left-to-right connection starts at the right end of the source');
  assert.equal(c.x1, byId.sigma.x0, 'and ends at the left end of the target');
  assert.equal(c.y0, byId.a1s.y); assert.equal(c.y1, byId.sigma.y);
  const back = L.connections.find((x) => x.from === 'b1s' && x.to === 'sigma');
  assert.equal(back.x0, byId.b1s.x0, 'right-to-left connections start at the left end');
  assert.equal(back.x1, byId.sigma.x1);
  assert.ok(L.range[0] < -16.3 && L.range[1] > -9.5, 'auto range pads the data');
  assert.equal(L.yOf(L.range[1]), L.axis.y0);
  assert.equal(L.yOf(L.range[0]), L.axis.y1);
});

test('degenerate levels in one column are spread side by side without overlap', () => {
  const spec = octahedralSplitting(6);
  const L = layoutLevels(spec, { width: 360, height: 220 });
  const t2g = L.levels.filter((l) => l.id.startsWith('t2g')), eg = L.levels.filter((l) => l.id.startsWith('eg'));
  assert.equal(t2g.length, 3); assert.equal(eg.length, 2);
  assert.ok(t2g.every((l) => l.groupSize === 3) && eg.every((l) => l.groupSize === 2));
  const sorted = [...t2g].sort((a, b) => a.x0 - b.x0);
  for (let i = 1; i < sorted.length; i++) assert.ok(sorted[i].x0 > sorted[i - 1].x1, 't2g slots do not overlap');
  assert.ok(new Set(t2g.map((l) => l.y)).size === 1, 'degenerate levels share a y');
  assert.ok(t2g[0].y > eg[0].y, 't2g lies below eg');
  assert.equal(L.connections.length, 5, 'every split level connects back to the free-ion level');
  // Low-spin d6 fills t2g completely.
  assert.deepEqual(spec.levels.filter((l) => l.id.startsWith('t2g')).map((l) => l.electrons), [2, 2, 2]);
  assert.deepEqual(spec.levels.filter((l) => l.id.startsWith('eg')).map((l) => l.electrons), [0, 0]);
  const hs = octahedralSplitting(6, { highSpin: true });
  assert.deepEqual(hs.levels.filter((l) => l.id.startsWith('t2g')).map((l) => l.electrons), [2, 1, 1], 'high-spin d6 is t2g⁴ eg²');
  assert.deepEqual(hs.levels.filter((l) => l.id.startsWith('eg')).map((l) => l.electrons), [1, 1]);
});

test('electron arrows, missing connections, explicit range and theme fallback', () => {
  assert.deepEqual(electronArrows(2), ['up', 'down']);
  assert.deepEqual(electronArrows(1), ['up']);
  assert.deepEqual(electronArrows(0), []);
  assert.deepEqual(electronArrows(undefined), []);
  assert.deepEqual(electronArrows(['up', 'up', 'sideways']), ['up', 'up']);
  const L = layoutLevels({ levels: [{ id: 'x', E: 1 }], connections: [{ from: 'x', to: 'missing' }], range: [0, 2] }, { width: 200, height: 100 });
  assert.equal(L.connections.length, 0, 'dangling connections are dropped');
  assert.deepEqual(L.range, [0, 2], 'explicit range is used verbatim');
  assert.equal(L.columns.length, 1, 'a default column is created');
  const flat = layoutLevels({ levels: [{ id: 'a', E: 3 }, { id: 'b', E: 3 }] }, { width: 200, height: 100 });
  assert.ok(flat.range[0] < 3 && flat.range[1] > 3, 'a single energy still gets a finite range');
  assert.equal(flat.levels[0].groupSize, 2);
  const T = themeColors(null);
  assert.equal(T.accent, '#48725c');
  assert.equal(T.bad, '#ad6552');
});
