// Orbital isosurface renderer: draws |ψ| = c as two translucent, double-sided meshes, one per
// phase (positive lobes amber, negative lobes fuchsia: the same colours moleculeView.js uses for
// filled and empty p-orbital lobes). Works on any signed scalar grid from src/chem/orbitals.js
// (atomic orbitals, σ/π combinations) and can sit next to a MoleculeView frame.
import * as THREE from 'three';
import { isosurface, negateGrid } from '../chem/marchingCubes.js';
import { sampleGrid, isoValue } from '../chem/orbitals.js';

export const PHASE_COLORS = {
  positive: { color: '#fde68a', emissive: '#f59e0b' },
  negative: { color: '#f0abfc', emissive: '#d946ef' },
};

/** Convert an isosurface mesh ({ positions, normals, indices }) to an indexed BufferGeometry, or null when empty. */
export function lobeGeometry(mesh) {
  if (!mesh || !mesh.triangleCount) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(mesh.positions, 3));
  if (mesh.normals) g.setAttribute('normal', new THREE.BufferAttribute(mesh.normals, 3));
  else g.computeVertexNormals();
  g.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

export class OrbitalView {
  /**
   * viewport: from createViewport(); opts.molecule: an existing MoleculeView to show a frame alongside.
   */
  constructor(viewport, { molecule = null } = {}) {
    this.viewport = viewport;
    this.molecule = molecule;
    this.group = new THREE.Group();
    viewport.root.add(this.group);
    this.options = {
      size: 40,              // grid resolution per axis (≤ 48 keeps rebuilds under ~50 ms)
      probability: 0.9,      // isosurface encloses this fraction of the sampled density
      iso: null,             // or an explicit |ψ| threshold
      opacity: 0.55,
      emissiveIntensity: 0.35,
      wireframe: false,
      positive: true,
      negative: true,
      colors: PHASE_COLORS,
    };
    this.materials = {};
    this.meshes = { positive: null, negative: null };
    this.grid = null;
    this.iso = 0;
    this.stats = null;
  }

  _material(phase) {
    if (!this.materials[phase]) {
      const c = this.options.colors[phase] || PHASE_COLORS[phase];
      this.materials[phase] = new THREE.MeshStandardMaterial({
        color: c.color, emissive: c.emissive, emissiveIntensity: this.options.emissiveIntensity,
        roughness: 0.5, metalness: 0.02, transparent: true, opacity: this.options.opacity,
        depthWrite: false, side: THREE.DoubleSide, wireframe: this.options.wireframe,
      });
    }
    return this.materials[phase];
  }

  /**
   * Sample an orbital object ({ psi, extent, center } from orbital() or molecularOrbital()) and show it.
   * opts: { size, extent, center, iso, probability } override the defaults for this orbital.
   */
  setOrbital(orb, opts = {}) {
    const grid = sampleGrid(orb.psi, { size: opts.size ?? this.options.size, extent: opts.extent ?? orb.extent, center: opts.center ?? orb.center ?? [0, 0, 0] });
    return this.setGrid(grid, opts);
  }

  /** Show a precomputed signed grid (see sampleGrid). opts: { iso } or { probability }. */
  setGrid(grid, opts = {}) {
    this.grid = grid;
    const iso = opts.iso ?? this.options.iso;
    this.iso = iso != null ? iso : isoValue(grid, { probability: opts.probability ?? this.options.probability });
    this._rebuild();
    return this.stats;
  }

  /** Change the |ψ| threshold without resampling. */
  setIso(iso) { this.iso = iso; this._rebuild(); return this.stats; }
  /** Change the enclosed-probability fraction without resampling. */
  setProbability(p) { this.options.probability = p; if (this.grid) { this.iso = isoValue(this.grid, { probability: p }); this._rebuild(); } return this.stats; }

  setOptions(opts) {
    Object.assign(this.options, opts);
    for (const [phase, m] of Object.entries(this.materials)) {
      const c = this.options.colors[phase] || PHASE_COLORS[phase];
      m.color.set(c.color); m.emissive.set(c.emissive);
      m.emissiveIntensity = this.options.emissiveIntensity; m.opacity = this.options.opacity; m.wireframe = this.options.wireframe;
      m.needsUpdate = true;
    }
    if (this.grid) this._rebuild();
  }

  /** Place/scale the orbital group, e.g. { position: atomPos, scale: A0_ANGSTROM } for a Bohr-unit grid in an Å frame. */
  setPlacement({ position, scale, quaternion } = {}) {
    if (position) this.group.position.set(position[0], position[1], position[2]);
    if (scale != null) this.group.scale.setScalar(scale);
    if (quaternion) this.group.quaternion.copy(quaternion);
  }

  /** Forward a molecule frame to the attached MoleculeView (no-op without one). */
  setMolecule(frame) { this.molecule?.setFrame(frame); }

  _rebuild() {
    this._disposeMeshes();
    if (!this.grid) { this.stats = null; return; }
    const stats = { iso: this.iso, positive: null, negative: null };
    for (const phase of ['positive', 'negative']) {
      if (!this.options[phase]) continue;
      const grid = phase === 'positive' ? this.grid : negateGrid(this.grid);
      const mesh = isosurface(grid, this.iso);
      stats[phase] = { vertices: mesh.vertexCount, triangles: mesh.triangleCount };
      const geo = lobeGeometry(mesh);
      if (!geo) continue;
      const m = new THREE.Mesh(geo, this._material(phase));
      m.userData.phase = phase;
      m.renderOrder = phase === 'positive' ? 2 : 1;
      this.meshes[phase] = m;
      this.group.add(m);
    }
    this.stats = stats;
  }

  _disposeMeshes() {
    for (const phase of ['positive', 'negative']) {
      const m = this.meshes[phase];
      if (m) { this.group.remove(m); m.geometry.dispose(); this.meshes[phase] = null; }
    }
  }

  /** World-space bounds of the lobes (and the attached molecule, if any) for viewport.fitTo(). */
  bounds() {
    const box = new THREE.Box3();
    this.group.updateMatrixWorld(true);
    for (const m of Object.values(this.meshes)) if (m) box.expandByObject(m);
    if (this.molecule) { const mb = this.molecule.bounds(); if (!mb.isEmpty()) box.union(mb); }
    return box;
  }

  clear() { this._disposeMeshes(); this.grid = null; this.stats = null; }

  dispose() {
    this.clear();
    Object.values(this.materials).forEach((m) => m.dispose());
    this.materials = {};
    this.viewport.root.remove(this.group);
  }
}
