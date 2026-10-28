// Predict → observe → explain activities for the Molecular shapes topic. Local to the topic (no quiz
// engine): each one asks for a prediction, then reveals the answer with the model's own numbers.
// `reveal(angle)` receives shapeAngle(id, angleId) so the text can never drift from the frames shown.
import { shapeAngle } from '../../chem/shapes.js';

const deg = (x) => `${x.toFixed(1)}°`;

export const ACTIVITIES = [
  {
    id: 'trend',
    title: 'Four domains, three shapes',
    prompt: 'CH₄, NH₃ and H₂O all have four electron domains around the central atom. As lone pairs replace bonds, what happens to the H–X–H angle?',
    options: [{ id: 'grows', label: 'It grows' }, { id: 'same', label: 'It stays at 109.5°' }, { id: 'shrinks', label: 'It shrinks', correct: true }],
    reveal: (angle = shapeAngle) => `It shrinks: CH₄ ${deg(angle('methane', 'hch'))} → NH₃ ${deg(angle('ammonia', 'hnh'))} → H₂O ${deg(angle('water', 'hoh'))}. A lone pair is held by one nucleus instead of two, so it spreads wider than a bonding pair and pushes the bonds together; each lone pair costs a few degrees. The first value is fixed by symmetry; the other two are measured.`,
    show: { item: 'water', invariant: 'bent' },
  },
  {
    id: 'triatomic',
    title: 'Three atoms, two shapes',
    prompt: 'CO₂ and SO₂ are both three-atom molecules with a central atom from group 14 or 16. Which is linear and which is bent?',
    options: [{ id: 'both-linear', label: 'Both linear' }, { id: 'co2-linear', label: 'CO₂ linear, SO₂ bent', correct: true }, { id: 'so2-linear', label: 'SO₂ linear, CO₂ bent' }],
    reveal: (angle = shapeAngle) => `CO₂ is linear (${deg(angle('carbon-dioxide', 'oco'))}) and SO₂ is bent (${deg(angle('sulfur-dioxide', 'oso'))}). Count domains on the central atom, not atoms: carbon in CO₂ has two double bonds and no lone pair, two domains pointing opposite ways; sulfur in SO₂ keeps a lone pair, three domains in a trigonal arrangement, and the molecule is named by its atoms alone.`,
    show: { item: 'sulfur-dioxide', invariant: 'domains' },
  },
  {
    id: 'cousin',
    title: "Water's heavier cousin",
    prompt: 'H₂S has the same shape as water: two bonds, two lone pairs, bent. What is its H–S–H angle?',
    options: [{ id: '105', label: 'About 105°, like water' }, { id: '92', label: 'About 92°', correct: true }, { id: '120', label: 'About 120°' }],
    reveal: (angle = shapeAngle) => `${deg(angle('hydrogen-sulfide', 'hsh'))}, measured. Sulfur bonds with orbitals that are nearly pure p, which sit 90° apart, so the angle collapses toward 90°; "tetrahedral minus a little" is a second-row habit. Thiols (C–S–H 96.5°) and phosphine (93.3°) tell the same story. Domain counting still gives the right shape; it does not give the number.`,
    show: { item: 'hydrogen-sulfide', invariant: 'angle' },
  },
];

/** The one correct option of an activity. */
export const correctOption = (activity) => activity.options.find((o) => o.correct) || null;
