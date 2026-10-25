import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CinematicAnimator } from '../src/anim/CinematicAnimator.js';
import { timeline, peaks } from '../src/anim/pacing.js';
import { MECHANISMS } from '../src/chem/mechanisms/index.js';

function fixture(mechanism) {
  let t = 0, speed = 1;
  const controls = new THREE.EventDispatcher();
  controls.target = new THREE.Vector3();
  const view = {
    frame: null, options: { arrows: true }, arrows: [],
    atomPool: { items: new Map() }, bondPool: { items: new Map() },
    lpPool: { items: new Map() }, orbPool: { items: new Map() }, labelPool: { items: new Map() },
    setFrame(frame) { this.frame = frame; },
    setArrows(arrows) { this.arrows = arrows; },
    atom(id) { return this.frame.atoms.find((a) => a.id === (this.frame.aliases?.[id] || id)); },
  };
  const ctx = {
    viewport: { THREE, root: new THREE.Group(), controls, camera: new THREE.PerspectiveCamera(38, 1, 0.1, 100) },
    view, getT: () => t, getSpeed: () => speed,
    setT(value) { t = value; view.setFrame(mechanism.frame(value)); view.setArrows(mechanism.steps[0].arrows); },
  };
  ctx.viewport.camera.position.set(0, 3, 12);
  ctx.setT(0);
  const animator = new CinematicAnimator(ctx);
  animator.onMechanismChange(mechanism);
  return { ctx, animator, speed(value) { speed = value; } };
}

for (const mechanism of Object.values(MECHANISMS)) {
  test(`${mechanism.id}: reversible playback visits every peak and resolves at the exact endpoint`, async () => {
    const { ctx, animator } = fixture(mechanism);
    for (const [fromT, toT] of [[0, 1], [1, 0]]) {
      const promise = animator.transition({ mechanism, fromT, toT, fromStep: mechanism.steps[0], durationMs: 1800 });
      const visits = new Map(peaks(mechanism).map((p) => [p, 0]));
      let ticks = 0;
      while (animator.task && ticks++ < 3000) {
        animator.tick(1 / 60);
        const t = ctx.getT();
        assert.ok(t >= 0 && t <= 1);
        for (const [p, count] of visits) if (Math.abs(t - p) < 1e-8) visits.set(p, count + 1);
        assert.ok(ctx.view.frame.atoms.every((a) => a.pos.every(Number.isFinite)));
        for (const arrow of animator.arrows) {
          assert.ok([...arrow.line.geometry.attributes.position.array].every(Number.isFinite));
        }
      }
      await promise;
      assert.ok(ticks < 3000);
      assert.equal(ctx.getT(), toT);
      for (const count of visits.values()) assert.ok(count >= 35, 'peak must hold for at least 0.6 seconds');
    }
    animator.dispose();
    assert.equal(ctx.viewport.root.children.length, 0);
  });
}

test('cancel freezes the coordinate and camera immediately, and settles the pending Promise', async () => {
  const mechanism = MECHANISMS.sn2;
  const { ctx, animator } = fixture(mechanism);
  const promise = animator.transition({ mechanism, fromT: 0, toT: 1, durationMs: 2000 });
  animator.tick(0.1);
  animator.cancel();
  await promise;
  const t = ctx.getT(), camera = ctx.viewport.camera.position.toArray();
  animator.tick(0.1);
  assert.equal(ctx.getT(), t);
  assert.deepEqual(ctx.viewport.camera.position.toArray(), camera);
  animator.dispose();
});

test('speed is applied exactly once; user camera input survives until the next transition', () => {
  const mechanism = MECHANISMS.sn2;
  const a = fixture(mechanism), b = fixture(mechanism);
  for (const f of [a, b]) f.animator.transition({ mechanism, fromT: 0, toT: 0.5, durationMs: 2000 });
  b.speed(2);
  a.animator.tick(0.1);
  a.animator.tick(0.1);
  b.animator.tick(0.1);
  assert.equal(a.ctx.getT(), b.ctx.getT());
  b.ctx.viewport.controls.dispatchEvent({ type: 'start' });
  b.ctx.viewport.camera.position.set(9, 8, 7);
  b.animator.tick(0.1);
  assert.deepEqual(b.ctx.viewport.camera.position.toArray(), [9, 8, 7]);
  a.animator.dispose(); b.animator.dispose();
});

test('ghost records extend past topology changes and fade; scrub and dispose restore borrowed hooks', () => {
  const { ctx, animator } = fixture(MECHANISMS.sn1);
  ctx.setT(0.29);
  animator.scrub();
  assert.ok(ctx.view.frame.atoms.some((a) => a.ghost), 'pre-roll ghost records should exist before t=0.3');
  assert.ok(animator.ghosts[0].weight > 0 && animator.ghosts[0].weight < 1);
  ctx.setT(0.61);
  animator.scrub();
  assert.ok(ctx.view.frame.atoms.some((a) => a.ghost), 'fade-out records should survive beyond t=0.6');
  const original = animator.originalFrame;
  animator.dispose();
  assert.equal(ctx.view.setFrame, original);
  ctx.setT(0.61);
  assert.ok(!ctx.view.frame.atoms.some((a) => a.ghost));
  animator.dispose();
});

test('timeline finds off-checkpoint maxima and supports equal coordinates', () => {
  assert.deepEqual(timeline(MECHANISMS.sn1, 0.4, 0.4, 1000), []);
  const parts = timeline(MECHANISMS.sn1, 0, 1, 3000);
  assert.ok(parts.some((p) => p.kind === 'hold' && p.t === 0.16));
  assert.ok(parts.some((p) => p.kind === 'hold' && p.t === 0.83));
});
