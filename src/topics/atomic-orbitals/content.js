// Invariant cards and glossary for the Atomic orbitals topic. `show` on a card adjusts the 3D lobes while
// it is selected: { probability, negative, wireframe, orbitals: [names], all: true (every hybrid) }.
import { HYDROGEN_ENERGY } from '../../chem/references/textbook.js';

const A0_PM = 52.9;
export const INVARIANTS = {
  '1s': [
    { id: 'sphere', title: 'A sphere with no nodes', detail: 'ψ(1s) ∝ e^(−r/a₀): positive everywhere, largest at the nucleus, falling off smoothly. The drawn surface encloses 90 % of the probability; there is no surface inside it where ψ changes sign.', show: { probability: 0.9 } },
    { id: 'radius', title: `Most probable radius a₀ = ${A0_PM} pm`, detail: 'ψ² is largest at the nucleus, but a thin shell at radius r holds 4πr²ψ² of the probability: that radial distribution peaks at exactly a₀, the Bohr radius. The card plots it.', audience: 'learn' },
    { id: 'energy', title: `E₁ = −${HYDROGEN_ENERGY.rydbergEV} eV: the ionisation energy of hydrogen`, detail: 'E_n = −R_H / n² with R_H = 13.6 eV, so removing the 1s electron of hydrogen costs 13.6 eV (1312 kJ/mol). Every other level is this value divided by n².', audience: 'learn' },
  ],
  '2s': [
    { id: 'node', title: 'One radial node at 2 a₀', detail: 'R(2s) ∝ (2 − r/a₀) e^(−r/2a₀) is zero on the sphere r = 2 a₀ and negative outside it: the inner sphere and the outer shell have opposite phase. Tighten the contour to 60 % to see the inner sphere.', show: { probability: 0.6 } },
    { id: 'size', title: 'Four times larger than 1s', detail: 'The most probable radius is 5.2 a₀ (the outer peak of the radial distribution) against a₀ for 1s: an n = 2 electron lives much further out.', audience: 'learn' },
    { id: 'degenerate', title: 'Same energy as 2p in hydrogen, not elsewhere', detail: 'In hydrogen E depends on n only, so 2s and 2p are degenerate at −3.4 eV. In every other atom the 2s electron penetrates closer to the nucleus (its inner lobe) and sits lower than 2p: the reason the aufbau order is s before p.', audience: 'learn' },
  ],
  '2p': [
    { id: 'plane', title: 'One angular node: a plane through the nucleus', detail: 'ψ(2p𝓏) ∝ z e^(−r/2a₀): zero on the xy plane, positive above it, negative below. The two lobes have opposite phase, which is what makes π bonds and antibonding combinations possible.', show: { negative: true } },
    { id: 'three', title: 'Three of them, along x, y and z', detail: 'l = 1 gives 2l + 1 = 3 orbitals of equal energy. Together they hold six electrons, the p⁶ of a noble gas.', show: { orbitals: ['2px', '2py', '2pz'], probability: 0.8 } },
    { id: 'no-radial', title: 'No radial node: l = n − 1', detail: 'Radial nodes number n − l − 1 = 0 and angular nodes l = 1, so 2p has one node in all (n − 1), like 2s, but of a different kind.', audience: 'learn' },
    { id: 'bonds', title: 'The orbital behind π bonds and hybrids', detail: 'Side-on overlap of two 2p orbitals is a π bond; mixing 2p with 2s gives the sp, sp² and sp³ hybrids that point σ bonds where VSEPR puts them.', links: [{ label: 'sp³ hybrid', href: '#atomic-orbitals/sp3' }, { label: 'Alkenes', href: '#functional-groups/alkene/pi' }], audience: 'learn' },
  ],
  '3s': [
    { id: 'nodes', title: 'Two radial nodes, at 1.9 and 7.1 a₀', detail: 'Three concentric regions of alternating phase. The rule n − l − 1 = 2 says how many; the positions come from the roots of R(3s), which the card lists.', show: { probability: 0.5 } },
    { id: 'rule', title: 'n − 1 nodes in all', detail: 'Every orbital has n − 1 nodes, split into l angular and n − l − 1 radial ones. More nodes means higher energy: the 3s electron at −1.51 eV is bound far more loosely than 1s.', audience: 'learn' },
    { id: 'size', title: 'Most probable radius 13 a₀', detail: 'The outer peak of the radial distribution sits at 13.1 a₀ (6.9 Å): on the scale of a bond length, an n = 3 valence electron is diffuse.', audience: 'learn' },
  ],
  '3p': [
    { id: 'both', title: 'One radial and one angular node', detail: 'The nodal plane of a p orbital plus a spherical node at r = 6 a₀, so each lobe is wrapped in an outer shell of the opposite phase. Tighten the contour to see the inner lobes.', show: { probability: 0.6 } },
    { id: 'valence', title: 'The valence orbital of the third row', detail: 'Na to Ar fill 3s and 3p; the chlorine lone pairs of an alkyl chloride and the sulfur bonds of a thiol are 3p electrons, larger and more diffuse than the 2p of oxygen.', links: [{ label: 'Thiols', href: '#functional-groups/thiol/sh' }, { label: 'H₂S in Molecular shapes', href: '#molecular-shapes/hydrogen-sulfide' }], audience: 'learn' },
  ],
  '3dz2': [
    { id: 'cones', title: 'Two angular nodes: a pair of cones', detail: 'ψ(3d𝓏²) ∝ (3z² − r²) e^(−r/3a₀) is zero where 3z² = r², a double cone at 54.7° to the z axis. Two lobes along z, positive, and a negative torus in the xy plane.', show: { negative: true } },
    { id: 'five', title: 'Five d orbitals: d𝓏², dₓ²₋ᵧ², dₓᵧ, dₓ𝓏, dᵧ𝓏', detail: 'l = 2 gives 2l + 1 = 5 orbitals holding ten electrons: the d¹⁰ of zinc and copper(I).', links: [{ label: '3d (xy)', href: '#atomic-orbitals/3dxy' }], audience: 'learn' },
    { id: 'ligands', title: 'The one that points at ligands along z', detail: 'In an octahedral complex d𝓏² and dₓ²₋ᵧ² point at the six ligands and are raised in energy; dₓᵧ, dₓ𝓏 and dᵧ𝓏 point between them. That split is the colour and magnetism of transition-metal complexes.', audience: 'learn' },
  ],
  '3dxy': [
    { id: 'planes', title: 'Two nodal planes, four lobes between the axes', detail: 'ψ(3dₓᵧ) ∝ xy e^(−r/3a₀) is zero on the xz and yz planes; the four lobes alternate in phase around the z axis.', show: { negative: true } },
    { id: 'between', title: 'Between the axes, unlike dₓ²₋ᵧ²', detail: 'dₓ²₋ᵧ² has the same shape rotated by 45°, with its lobes on the x and y axes. In an octahedral complex that difference is the whole story: on-axis orbitals meet the ligands, between-axis orbitals do not.', audience: 'learn' },
  ],
  sp: [
    { id: 'mix', title: 'Half s, half p: (2s ± 2p𝓏)/√2', detail: 'Adding 2s to 2p𝓏 reinforces one lobe and cancels most of the other, so each hybrid points one way. The second hybrid uses the minus sign and points the other way.', show: { all: true } },
    { id: 'angle', title: 'Two lobes 180° apart: linear', detail: 'The two sp hybrids make the σ bonds of an alkyne or of CO₂; the two untouched 2p orbitals make the two π bonds.', links: [{ label: 'Alkynes', href: '#functional-groups/alkyne/linear' }, { label: 'CO₂', href: '#molecular-shapes/carbon-dioxide' }] },
    { id: 'left', title: 'Two p orbitals left over', detail: 'Only p𝓏 was used, so pₓ and pᵧ stay pure p, perpendicular to the axis: a triple bond is one σ (sp–sp) plus two π.', audience: 'learn' },
  ],
  sp2: [
    { id: 'mix', title: 'One third s: three hybrids in a plane', detail: 'Three combinations of 2s with 2pₓ and 2pᵧ, each with s character 1/3, pointing 120° apart in the xy plane.', show: { all: true } },
    { id: 'angle', title: '120°: trigonal planar', detail: 'The σ framework of an alkene, a carbonyl or BF₃. The p𝓏 orbital is untouched and perpendicular to the plane.', links: [{ label: 'Alkenes', href: '#functional-groups/alkene/planar' }, { label: 'BF₃', href: '#molecular-shapes/boron-trifluoride' }] },
    { id: 'pi', title: 'The leftover p𝓏 makes the π bond', detail: 'Side-on overlap of the two p𝓏 orbitals on neighbouring sp² carbons is the π bond of C=C; its nodal plane is the molecular plane. Rotation would break it, which is why alkenes have cis/trans isomers.', audience: 'learn' },
  ],
  sp3: [
    { id: 'mix', title: 'One quarter s: four hybrids', detail: '(2s ± 2pₓ ± 2pᵧ ± 2p𝓏)/2 with an even number of minus signs: four equivalent lobes toward the corners of a tetrahedron.', show: { all: true } },
    { id: 'angle', title: '109.47°: tetrahedral', detail: 'The angle between any two sp³ hybrids is arccos(−1/3) = 109.47°, the methane angle; every sp³ carbon in the Functional groups explorer uses it.', links: [{ label: 'Methane', href: '#molecular-shapes/methane' }, { label: 'Alkyl halides', href: '#functional-groups/haloalkane' }] },
    { id: 'lonepairs', title: 'Lone pairs sit in hybrids too', detail: 'The oxygen of water and the nitrogen of ammonia are drawn sp³ with lone pairs in two (or one) of the hybrids; the real angles close below 109.5° because the lone pairs take more room.', links: [{ label: 'Water', href: '#molecular-shapes/water' }, { label: 'Ammonia', href: '#molecular-shapes/ammonia' }], audience: 'learn' },
  ],
  configurations: [
    { id: 'aufbau', title: 'Fill from the bottom: 1s 2s 2p 3s 3p 4s 3d 4p', detail: 'Each subshell takes 2(2l + 1) electrons; the order is by n + l, then n, so 4s fills before 3d. The ladder on the card is schematic: the real spacings are not drawn.' },
    { id: 'pauli', title: 'Pauli: two per orbital, spins opposed', detail: 'No two electrons share all four quantum numbers, so an orbital holds at most two electrons with opposite spin, drawn as ↑↓ in one box.' },
    { id: 'hund', title: "Hund: spread out first, spins parallel", detail: 'In a set of degenerate orbitals electrons enter singly with parallel spins before any pairs up: nitrogen is 2p ↑ ↑ ↑, oxygen 2p ↑↓ ↑ ↑. The count of unpaired electrons is what a magnet measures.' },
    { id: 'exceptions', title: 'Chromium and copper break the pattern', detail: 'Cr is [Ar] 3d⁵ 4s¹ and Cu is [Ar] 3d¹⁰ 4s¹: a half-filled or filled d subshell is favoured over 3d⁴ 4s² / 3d⁹ 4s². These are tabulated, not predicted by the aufbau rule.', audience: 'learn' },
    { id: 'valence', title: 'Noble-gas core and valence electrons', detail: 'Everything inside the last noble gas is the core; what remains decides the chemistry. Carbon [He] 2s² 2p² has four, chlorine [Ne] 3s² 3p⁵ seven, which is why the halides of the Functional groups explorer form one bond.', links: [{ label: 'Alkyl halides', href: '#functional-groups/haloalkane' }], audience: 'learn' },
  ],
};

export const GLOSSARY_TERMS = [
  { id: 'node', term: 'Node (radial and angular)', definition: 'A surface where a wavefunction is zero and changes sign: a sphere (radial node) or a plane / cone through the nucleus (angular node). An orbital with quantum numbers n, l has n − l − 1 radial and l angular nodes, n − 1 in all.', why: 'Nodes are what distinguish 2s from 1s and p from s; more nodes means higher energy.', links: [{ label: '3s', href: '#atomic-orbitals/3s/nodes' }, { label: '2p', href: '#atomic-orbitals/2p/plane' }] },
  { id: 'quantum-numbers', term: 'Quantum numbers n, l, mₗ', definition: 'n (1, 2, 3 …) sets the size and, in hydrogen, the energy; l (0 … n − 1, called s p d f) the shape and the number of angular nodes; mₗ (−l … +l) the orientation, 2l + 1 orbitals per subshell. Spin mₛ = ±½ completes the set.', why: 'They label every box in an electron configuration and count how many electrons fit.', links: [{ label: 'Atomic orbitals', href: '#atomic-orbitals' }] },
  { id: 'radial-distribution', term: 'Radial distribution function', definition: 'P(r) = 4πr²ψ² (for s orbitals; r²R² in general): the probability of finding the electron in a thin shell at radius r. Its peak is the most probable radius, a₀ for 1s.', why: 'It is the honest picture of "how big" an orbital is, and it shows the radial nodes as zeros.', links: [{ label: '1s', href: '#atomic-orbitals/1s/radius' }] },
  { id: 'aufbau-principle', term: 'Aufbau principle', definition: 'Electrons occupy the lowest available subshells in the order 1s 2s 2p 3s 3p 4s 3d 4p … (increasing n + l, then n), two per orbital.', why: 'It generates the ground-state configuration of every element, with a handful of tabulated exceptions (Cr, Cu).', links: [{ label: 'Electron configurations', href: '#atomic-orbitals/configurations/aufbau' }] },
  { id: 'hund-rule', term: "Hund's rule", definition: 'Within a set of degenerate orbitals, electrons occupy separate orbitals with parallel spins before any orbital takes a second electron.', why: 'It fixes the number of unpaired electrons, hence paramagnetism and the box diagrams.', links: [{ label: 'Electron configurations', href: '#atomic-orbitals/configurations/hund' }] },
  { id: 'pauli-exclusion', term: 'Pauli exclusion principle', definition: 'No two electrons in an atom can have the same four quantum numbers; an orbital therefore holds at most two electrons, with opposite spins.', why: 'It is why subshells have capacities 2, 6, 10 and why the periodic table has the shape it has.', links: [{ label: 'Electron configurations', href: '#atomic-orbitals/configurations/pauli' }] },
];
