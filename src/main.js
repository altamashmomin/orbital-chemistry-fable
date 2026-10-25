import './style.css';
import { createViewport } from './render/scene.js';
import { MoleculeView } from './render/moleculeView.js';
import { ExplorerPanel } from './ui/explorer.js';
import { MechanismPanel } from './ui/mechanism.js';
import { clear } from './ui/dom.js';
import { registerAnimator, listAnimators, Animator } from './anim/index.js';
import { MECHANISMS } from './chem/mechanisms/index.js';
import { FUNCTIONAL_GROUPS } from './chem/functionalGroups.js';
import { R_GROUPS } from './chem/rGroups.js';
import { makeMolecule } from './chem/builder.js';

export const REPO_URL = 'https://github.com/altamashmomin/orbital-chemistry-fable';

const viewport = createViewport(document.getElementById('viewport'));
// Match the reference's softly tinted molecular canvas without changing renderer APIs.
viewport.scene.background.set('#f0f3ed');
viewport.scene.fog.color.set('#f0f3ed');
// Preserve enough horizontal field of view for separated reactants on phone screens.
const viewportElement = document.getElementById('viewport');
const framingObserver = new ResizeObserver(() => {
  const aspect = viewportElement.clientWidth / Math.max(1, viewportElement.clientHeight);
  viewport.camera.zoom = Math.min(1, Math.max(0.5, aspect / 1.3));
  viewport.camera.updateProjectionMatrix();
});
framingObserver.observe(viewportElement);
const view = new MoleculeView(viewport);
const panelEl = document.getElementById('panel');
const inspectorEl = document.getElementById('inspector');
const panels = {
  explorer: new ExplorerPanel({ view, viewport }),
  mechanisms: new MechanismPanel({ view, viewport }),
};
let mode = null;

function setMode(m) {
  if (!panels[m] || mode === m) return;
  if (mode) panels[mode].deactivate?.();
  mode = m;
  clear(panelEl).append(panels[m].el);
  clear(inspectorEl).append(panels[m].inspector);
  panelEl.scrollTop = 0;
  inspectorEl.scrollTop = 0;
  document.body.dataset.mode = m;
  const explorer = m === 'explorer';
  document.getElementById('page-eyebrow').textContent = explorer ? 'Your organic chemistry workspace' : 'The reaction studio';
  document.getElementById('page-title').innerHTML = explorer ? 'Get to know your <em>functional groups.</em>' : 'Chemistry, <em>in motion.</em>';
  document.getElementById('page-subtitle').textContent = explorer
    ? 'Turn the molecule. Change the R group. Find the chemistry that connects them.'
    : 'See atoms move, bonds change, and a mechanism come together.';
  document.getElementById('intro-note').textContent = explorer ? 'Start with structure.' : 'A closer look at change.';
  document.getElementById('workspace-label').textContent = explorer ? 'Molecule workspace' : 'Reaction studio';
  document.querySelectorAll('.tab').forEach((b) => {
    b.classList.toggle('active', b.dataset.mode === m);
    b.setAttribute('aria-pressed', String(b.dataset.mode === m));
  });
  history.replaceState(null, '', `#${m}`);
  view.clear();
  panels[m].activate();
}

document.getElementById('tabs').addEventListener('click', (e) => {
  const b = e.target.closest('.tab');
  if (b) setMode(b.dataset.mode);
});
document.getElementById('repoLink').href = REPO_URL;
window.addEventListener('hashchange', () => setMode(location.hash.slice(1) || 'explorer'));
setMode(location.hash.slice(1) === 'mechanisms' ? 'mechanisms' : 'explorer');

// Public hook for custom animators and for poking at the data from the console.
window.OrbitalChemistry = {
  version: '0.1.0',
  registerAnimator, listAnimators, Animator,
  mechanisms: MECHANISMS, functionalGroups: FUNCTIONAL_GROUPS, rGroups: R_GROUPS, makeMolecule,
  viewport, view, panels, setMode,
};
