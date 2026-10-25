// Three.js viewport: renderer, label renderer, camera, controls, lights, resize and render loop.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

export function createViewport(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.className = 'gl-canvas';
  container.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.className = 'label-layer';
  container.appendChild(labelRenderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0b1020');
  scene.fog = new THREE.Fog('#0b1020', 30, 60);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  camera.position.set(0, 3, 12);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotateSpeed = 1.2;
  controls.minDistance = 2;
  controls.maxDistance = 60;

  scene.add(new THREE.HemisphereLight('#dbeafe', '#1e293b', 0.9));
  const key = new THREE.DirectionalLight('#ffffff', 1.4); key.position.set(5, 8, 7); scene.add(key);
  const fill = new THREE.DirectionalLight('#93c5fd', 0.45); fill.position.set(-7, -3, -5); scene.add(fill);
  scene.add(new THREE.AmbientLight('#ffffff', 0.22));

  const root = new THREE.Group();
  scene.add(root);

  const tickers = new Set();
  const clock = new THREE.Clock();
  let disposed = false;

  function resize() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    labelRenderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  function loop() {
    if (disposed) return;
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.1);
    for (const fn of tickers) fn(dt);
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }
  loop();

  /** Frame the camera on a Box3 while keeping the current viewing direction. */
  function fitTo(box, padding = 1.35, animate = true) {
    if (!box || box.isEmpty()) return;
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const dist = (sphere.radius * padding) / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) + 0.5;
    const dir = camera.position.clone().sub(controls.target).normalize();
    if (!Number.isFinite(dir.x) || dir.lengthSq() < 1e-6) dir.set(0, 0.25, 1).normalize();
    const targetPos = sphere.center.clone().add(dir.multiplyScalar(dist));
    moveCamera(targetPos, sphere.center, animate ? 450 : 0);
  }

  let camAnim = null;
  function moveCamera(position, target, durationMs = 600) {
    const p0 = camera.position.clone(), t0 = controls.target.clone();
    const p1 = new THREE.Vector3().copy(position), t1 = new THREE.Vector3().copy(target);
    if (durationMs <= 0) { camera.position.copy(p1); controls.target.copy(t1); return Promise.resolve(); }
    if (camAnim) tickers.delete(camAnim);
    return new Promise((resolve) => {
      let elapsed = 0;
      camAnim = (dt) => {
        elapsed += dt * 1000;
        const u = Math.min(1, elapsed / durationMs);
        const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
        camera.position.lerpVectors(p0, p1, e);
        controls.target.lerpVectors(t0, t1, e);
        if (u >= 1) { tickers.delete(camAnim); camAnim = null; resolve(); }
      };
      tickers.add(camAnim);
    });
  }

  return {
    THREE, scene, camera, renderer, labelRenderer, controls, root,
    onTick: (fn) => { tickers.add(fn); return () => tickers.delete(fn); },
    fitTo, moveCamera,
    setAutoRotate: (on) => { controls.autoRotate = !!on; },
    dispose: () => { disposed = true; ro.disconnect(); renderer.dispose(); },
  };
}
