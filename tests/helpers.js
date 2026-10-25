import assert from 'node:assert/strict';
import { v } from '../src/chem/geometry.js';

/** Fail when two atoms that are neither bonded nor 1,3-related sit closer than minDist Å. */
export function assertNoClashes(frame, label, minDist = 1.6) {
  const atoms = frame.atoms.filter((a) => !a.ghost);
  const adj = new Map(atoms.map((a) => [a.id, new Set()]));
  for (const b of frame.bonds) { adj.get(b.a)?.add(b.b); adj.get(b.b)?.add(b.a); }
  const related = (x, y) => {
    if (adj.get(x).has(y)) return true;
    for (const n of adj.get(x)) if (adj.get(n)?.has(y)) return true;
    return false;
  };
  for (let i = 0; i < atoms.length; i++) for (let j = i + 1; j < atoms.length; j++) {
    const a = atoms[i], b = atoms[j];
    if (related(a.id, b.id)) continue;
    const d = v.dist(a.pos, b.pos);
    assert.ok(d > minDist, `${label}: non-bonded ${a.id}/${b.id} too close (${d.toFixed(2)} Å)`);
  }
}
