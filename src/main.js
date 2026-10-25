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
const view = new MoleculeView(viewport);
const panelEl = document.getElementById('panel');
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
  panelEl.scrollTop = 0;
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.mode === m));
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
