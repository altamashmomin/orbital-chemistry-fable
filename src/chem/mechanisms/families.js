// Mechanism families: the registry behind the Reaction lab's family tabs.
//
// A family groups mechanisms that share a decision ("which of these will my reaction follow?"):
//   {
//     id: 'substitution-elimination',      // kebab-case, unique; usable as a deep link #mechanisms/<family-id>
//     title: 'Substitution & elimination', // family tab label
//     summary: 'One sentence for search.',
//     mechanisms: ['sn2', 'sn1', 'e2', 'e1'],   // mechanism ids in tab order (each must be registered)
//     predictor?: {                        // optional: the family's environment → mechanism predictor
//       options: [                         // rendered as rows above the prediction, in order
//         { key: 'substrate', label: 'Substrate', choices: [{ id, label, examples? }], default: 'secondary' },
//         { key: 'allylicBenzylic', label: 'Allylic or benzylic carbon', kind: 'toggle', default: false },
//       ],
//       predict: (env) => ({ pct: { [mechanismId]: 0–100, none: 0–100 }, ranked: [{ id, pct }], dominant: id | 'none', summary, reasons: [], warnings: [] }),
//       colors?: { [mechanismId]: '#hex' },  // bar colours; a palette fills in when absent
//     },
//   }
// Mechanisms keep their own shape (see sn2.js: frame(t), steps, energyAt, keyIdeas, conditions, related).
// A reaction branch adds src/chem/mechanisms/<family>/ and one registerFamily(...) line in index.js;
// the Reaction lab, the search index and the deep links pick the family up from the registry.

const BAR_PALETTE = ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#f472b6', '#fb923c', '#60a5fa', '#a3e635'];

/** Return a list of problems with a family definition (empty when valid). */
export function validateFamily(family, mechanismsById = {}) {
  const errors = [];
  if (!family || typeof family !== 'object') return ['family is not an object'];
  if (!/^[a-z][a-z0-9-]*$/.test(family.id || '')) errors.push('id must be kebab-case (a-z, 0-9, -)');
  if (typeof family.title !== 'string' || !family.title.trim()) errors.push('title is required');
  if (!Array.isArray(family.mechanisms) || !family.mechanisms.length) errors.push('mechanisms must be a non-empty array of mechanism ids');
  else {
    for (const id of family.mechanisms) {
      const m = mechanismsById[id];
      if (!m) errors.push(`mechanism "${id}" is not registered`);
      else if (m.id !== id) errors.push(`mechanism "${id}" reports id "${m.id}"`);
      else if (typeof m.frame !== 'function' || !Array.isArray(m.steps) || !m.steps.length) errors.push(`mechanism "${id}" needs frame(t) and steps`);
    }
    if (new Set(family.mechanisms).size !== family.mechanisms.length) errors.push('mechanism ids repeat');
  }
  const p = family.predictor;
  if (p !== undefined) {
    if (!p || typeof p !== 'object') errors.push('predictor must be an object');
    else {
      if (typeof p.predict !== 'function') errors.push('predictor.predict(env) must be a function');
      if (!Array.isArray(p.options)) errors.push('predictor.options must be an array');
      else {
        const keys = new Set();
        p.options.forEach((o, i) => {
          if (!o || typeof o.key !== 'string' || !o.key) errors.push(`predictor.options[${i}] needs a key`);
          else if (keys.has(o.key)) errors.push(`predictor option key "${o.key}" repeats`);
          else keys.add(o.key);
          if (typeof o?.label !== 'string') errors.push(`predictor.options[${i}] needs a label`);
          if (o?.kind !== 'toggle' && !(Array.isArray(o?.choices) && o.choices.length && o.choices.every((c) => c && typeof c.id === 'string' && typeof c.label === 'string'))) errors.push(`predictor.options[${i}] needs choices [{ id, label }] (or kind: 'toggle')`);
        });
      }
    }
  }
  return errors;
}

/** Default environment for a predictor: each option's `default`, else its first choice (toggles: false). */
export function defaultEnv(predictor) {
  const env = {};
  for (const o of predictor?.options || []) env[o.key] = o.default ?? (o.kind === 'toggle' ? false : o.choices?.[0]?.id);
  return env;
}

/** Bar colour for a mechanism within a family (its predictor's colours, else a stable palette slot). */
export function familyColor(family, mechanismId) {
  const own = family?.predictor?.colors?.[mechanismId];
  if (own) return own;
  const i = Math.max(0, (family?.mechanisms || []).indexOf(mechanismId));
  return BAR_PALETTE[i % BAR_PALETTE.length];
}

/**
 * Create an independent registry. The module-level one below is what the app uses; tests
 * that register throwaway families use a fresh instance.
 */
export function createFamilyRegistry() {
  const MECHANISMS = {};
  const MECHANISM_ORDER = [];
  const FAMILIES = {};
  const FAMILY_ORDER = [];
  const familyOfMechanism = new Map();

  /** Register a family together with the mechanism objects its `mechanisms` ids refer to. */
  function registerFamily(family, mechanisms = {}) {
    const pool = { ...MECHANISMS };
    for (const m of Object.values(mechanisms)) if (m?.id) pool[m.id] = m;
    const errors = validateFamily(family, pool);
    if (errors.length) throw new Error(`Invalid mechanism family "${family?.id}": ${errors.join('; ')}`);
    if (FAMILIES[family.id]) throw new Error(`Mechanism family "${family.id}" is already registered`);
    for (const id of family.mechanisms) {
      if (familyOfMechanism.has(id)) throw new Error(`Mechanism "${id}" already belongs to family "${familyOfMechanism.get(id)}"`);
    }
    for (const id of family.mechanisms) {
      if (!MECHANISMS[id]) { MECHANISMS[id] = pool[id]; MECHANISM_ORDER.push(id); }
      familyOfMechanism.set(id, family.id);
    }
    FAMILIES[family.id] = family;
    FAMILY_ORDER.push(family.id);
    return family.id;
  }

  const familyOf = (mechanismId) => FAMILIES[familyOfMechanism.get(mechanismId)] || null;
  const listFamilies = () => FAMILY_ORDER.map((id) => FAMILIES[id]);

  return { MECHANISMS, MECHANISM_ORDER, FAMILIES, FAMILY_ORDER, registerFamily, familyOf, listFamilies };
}

const registry = createFamilyRegistry();
/** Live, ordered registries (do not mutate; use registerFamily). */
export const { MECHANISMS, MECHANISM_ORDER, FAMILIES, FAMILY_ORDER, registerFamily, familyOf, listFamilies } = registry;
