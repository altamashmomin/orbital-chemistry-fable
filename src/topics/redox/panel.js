// Redox panel: a CollectionExplorer over the couples. The 3D view shows one species of the couple with every heavy
// atom labelled by its oxidation state and the atoms that change highlighted; the card holds the per-atom counts,
// the change in the key element, the half-reaction in acid and in base, the overall equation with a partner
// couple, and the carbon ladder. Every number is counting on a Lewis structure or in a balanced equation.
import { h, section, aud, select } from '../../ui/dom.js';
import { CollectionExplorer } from '../../ui/collectionExplorer.js';
import { COUPLES, FAMILIES, SPECIES, LADDERS, buildCouple, balance, ladderLevels, osText } from '../../chem/redox.js';
import { OXIDATION_STATE_RULES, OXIDATION_LEVELS, HALF_REACTIONS, ELECTRONEGATIVITY } from '../../chem/references/textbook.js';
import { INVARIANTS } from './content.js';
import { ACTIVITIES, correctOption } from './activities.js';

const kindWord = { oxidation: 'lost', reduction: 'gained', none: 'moved' };
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
/** '2 bonds to H (−2), 1 to O (+1), 1 to C (0) = −1' for an atom's bookkeeping row. */
export function bookText(b, graphAtoms) {
  if (!b.toH && !b.toHetero && !b.toSame) return `no bonds: the charge is the oxidation state = ${osText(b.os)}`;
  const parts = [];
  if (b.toH) parts.push(`${plural(b.toH, 'bond')} to H (−${b.toH})`);
  if (b.toHetero) parts.push(`${b.toHetero} to a more electronegative atom (+${b.toHetero})`);
  if (b.toSame) parts.push(`${b.toSame} to ${b.el} (0)`);
  const fc = graphAtoms?.find((a) => a.id === b.id)?.charge || 0;
  if (fc) parts.push(`formal charge ${osText(fc)}`);
  return `${parts.join(', ') || 'no bonds: the charge is the oxidation state'} = ${osText(b.os)}`;
}

export function makeRedoxCollection(panel) {
  const redoxCouples = COUPLES.filter((c) => balance(c).electrons !== 0);
  return {
    id: 'redox',
    items: COUPLES,
    chips: (c) => { const b = buildCouple(c.id); return { pattern: SPECIES[c.from[0].sp].formula, name: `→ ${SPECIES[c.to[0].sp].formula} · ${b.kind === 'none' ? 'no e⁻' : `${b.n} e⁻ ${kindWord[b.kind]}`}`, color: FAMILIES[c.family]?.color, title: FAMILIES[c.family]?.label }; },
    initialState: () => ({ side: 'from', index: 0, medium: 'acid', partner: null }),
    build: (c, state) => buildCouple(c.id, state),
    controls: (c, state, api) => {
      const live = api.live((st, built) => {
        const rows = [];
        const buttons = [];
        for (const side of ['from', 'to']) c[side].forEach(({ sp }, i) => buttons.push(h('button', { class: `btn landmark ${built.side === side && built.index === i ? 'active' : ''}`, dataset: { side, index: String(i) }, onClick: () => api.setState({ side, index: i }) }, `${side === 'from' ? (i === 0 ? '' : '+ ') : (i === 0 ? '→ ' : '+ ')}${SPECIES[sp].formula}`)));
        rows.push(h('div', { class: 'row' }, h('label', {}, 'Show in 3D'), h('div', { class: 'landmarks' }, buttons)));
        if (built.kind !== 'none') {
          rows.push(h('div', { class: 'row' }, h('label', {}, 'Balance in'), h('div', { class: 'landmarks' }, ['acid', 'base'].map((m) => h('button', { class: `btn landmark ${built.medium === m ? 'active' : ''}`, dataset: { medium: m }, onClick: () => api.setState({ medium: m }) }, m === 'acid' ? 'Acid (H⁺ / H₂O)' : 'Base (OH⁻ / H₂O)')))));
          const partners = redoxCouples.filter((q) => q.id !== c.id).map((q) => { const b = buildCouple(q.id); return { value: q.id, label: `${q.name} (${b.n} e⁻ ${kindWord[b.kind]})` }; });
          rows.push(h('div', { class: 'row' }, h('label', {}, 'Pair it with'), select(partners, built.partner, (id) => api.setState({ partner: id }), { 'aria-label': 'Partner couple' })));
        }
        return rows;
      });
      return [
        live,
        aud(h('div', { class: 'hint' }, 'The labels in 3D are oxidation states: each bond given to its more electronegative end, like atoms splitting theirs. Switch species to watch the highlighted atoms change; the half-reaction counts the difference.'), 'learn'),
      ];
    },
    card: (c, state, built) => {
      const shownGraphAtoms = built.frame.atoms;
      const osChips = (s) => h('div', { class: 'os-list' }, s.atoms.map((a) => h('span', { class: `os-chip ${s.key.includes(a.id) ? 'key' : ''}`, title: a.id }, `${a.el} ${osText(a.os)}`)));
      const rows = [];
      rows.push(h('div', { class: 'shape-angle status-measured' }, h('b', {}, 'Shown'), h('span', { class: 'value' }, built.shown.formula), h('span', { class: 'status' }, `${built.shown.name}; ${built.book.map((b) => `${b.el}${built.book.length > 1 ? ` (${b.id})` : ''}: ${bookText(b, shownGraphAtoms)}`).join('; ')}`)));
      for (const side of ['from', 'to']) rows.push(h('div', { class: 'shape-angle status-ideal' }, h('b', {}, side === 'from' ? 'Before' : 'After'), h('span', { class: 'value' }, built.sides[side].map((s) => `${s.n > 1 ? `${s.n} ` : ''}${s.formula}`).join(' + ')), h('span', { class: 'status' }, built.sides[side].map((s) => osChips(s)))));
      rows.push(h('div', { class: `shape-angle ${built.kind === 'none' ? 'status-class' : 'status-measured'}` }, h('b', {}, 'Change'), h('span', { class: 'value' }, built.kind === 'none' ? '0 e⁻' : `${built.n} e⁻ ${kindWord[built.kind]}`), h('span', { class: 'status' }, `${built.changeText}; the ${built.kind === 'none' ? 'equation' : built.kind} below carries exactly that many e⁻`)));
      const eq = (label, b, active) => h('div', { class: `redox-eq ${active ? 'active' : ''}`, 'aria-label': label }, h('b', {}, `${label}: `), b.text);
      const eqs = built.kind === 'none' ? [eq('Balanced', built.acid, true)] : [eq('In acid', built.acid, built.medium === 'acid'), eq('In base', built.base, built.medium === 'base')];
      if (built.overall) eqs.push(h('div', { class: 'redox-eq' }, h('b', {}, `With ${built.partnerCouple.name}: `), built.overall.text, h('span', { class: 'status' }, ` (× ${built.overall.multipliers[c.id]} and × ${built.overall.multipliers[built.partner]}${built.overall.partnerReversed ? ', partner reversed' : ''}: ${built.overall.electrons} e⁻ each way)`)));
      const ladders = LADDERS.filter((l) => l.rungs.some((r) => [...c.from, ...c.to].some((x) => x.sp === r.sp)));
      const onCouple = new Set([...c.from, ...c.to].map((x) => x.sp));
      return [
        h('div', { class: 'mol-pattern' }, built.title),
        h('div', { class: 'mol-name' }, c.name),
        h('div', { class: 'mol-meta' }, h('span', { class: 'formula' }, built.kind === 'none' ? 'not a redox reaction' : `${built.kind}: ${built.n} e⁻ ${kindWord[built.kind]} per ${c.from.map(({ sp, n }) => `${n > 1 ? `${n} ` : ''}${SPECIES[sp].formula}`).join(' + ')}`), h('span', { class: 'pattern' }, FAMILIES[c.family]?.label)),
        h('div', { class: 'shape-angles' }, ...rows),
        ...eqs,
        ...ladders.map((l) => h('p', { class: 'series' }, h('b', {}, `${l.label}: `), ...ladderLevels(l.id).map((r, i, arr) => h('span', { class: `series-item ${onCouple.has(r.sp) ? 'active' : ''}` }, `${r.formula} (${osText(r.os)})${i < arr.length - 1 ? ' < ' : ''}`)))),
        aud(h('p', { class: 'hint' }, built.kind === 'none' ? 'Bonds changed, electrons did not: the key element\'s total is the same on both sides, so the balanced equation has no e⁻ term.' : 'Oxidation is loss of electrons: the oxidation state rises. The medium only changes the spectators (H⁺ and H₂O, or OH⁻ and H₂O); the electron count is fixed by the atoms.'), 'learn'),
      ];
    },
    invariants: (c) => INVARIANTS[c.id] || [],
    highlights: () => [],            // cards adjust the view through `show` in afterUpdate, not through MoleculeView highlights
    guide: (c, api) => [
      section('Predict, then count', ...ACTIVITIES.filter((a) => a.item === c.id).map((act) => panel.activityBlock(act, api))),
      aud(section('The rule in one line', h('p', {}, `${OXIDATION_STATE_RULES.rule}. Electronegativities (Pauling): ${['H', 'C', 'N', 'O', 'S', 'Cl', 'Br'].map((e) => `${e} ${ELECTRONEGATIVITY[e]}`).join(', ')}.`)), 'learn'),
      aud(section('Where the numbers come from', h('ul', { class: 'identify' },
        h('li', {}, h('b', {}, 'Oxidation states: '), `${OXIDATION_STATE_RULES.source}. ${OXIDATION_STATE_RULES.caveat}.`),
        h('li', {}, h('b', {}, 'The carbon ladder: '), `${OXIDATION_LEVELS.source}; the assigner reproduces every tabulated row.`),
        h('li', {}, h('b', {}, 'Half-reactions: '), `balanced by counting (H₂O for oxygen, H⁺ for hydrogen, e⁻ for charge; OH⁻ added to both sides in base) and checked against the textbook forms (${HALF_REACTIONS.source}).`),
        h('li', {}, h('b', {}, 'Overall equations: '), 'the two half-reactions scaled to the same electron count and added; the partner is reversed when both are written the same way. Which direction actually runs needs E°, which this phase does not tabulate.'),
        h('li', {}, h('b', {}, 'The pictures: '), 'Functional groups molecules as built there; oxoanions and H₂O₂ at their measured bond lengths (see references.md); bare ions as single atoms, hydrated in reality.'))), 'learn'),
    ],
    titles: { collection: 'The couples', build: 'Count the electrons', invariants: (c) => `What ${c.name.toLowerCase()} shows` },
  };
}

export class RedoxPanel {
  constructor({ view, viewport, level = 'learn', navigate = null }) {
    this.view = view; this.viewport = viewport; this.level = level;
    this.answers = {};
    this.explorer = new CollectionExplorer(makeRedoxCollection(this), { view, viewport, navigate, level, onChange: (ctx) => this.afterUpdate(ctx) });
    this.el = this.explorer.el; this.inspector = this.explorer.inspector;
  }
  activate() {
    this.view?.setOptions?.({ lonePairs: false, hydrogens: true, labels: true, orbitals: false, arrows: false, highlights: true });
    this.viewport.setAutoRotate?.(false);
    this.explorer.activate();
  }
  deactivate() {}
  setLevel(level) { this.level = level; this.explorer.setLevel(level); }
  navigate(sub) { this.explorer.navigate(sub); }

  afterUpdate({ state, built, selected }) {
    const show = selected?.show || {};
    const want = {};
    if (show.side && (state.side !== show.side || (state.index || 0) !== (show.index || 0))) { want.side = show.side; want.index = show.index || 0; }
    if (show.medium && state.medium !== show.medium) want.medium = show.medium;
    if (show.partner && built.partner !== show.partner) want.partner = show.partner;
    if (Object.keys(want).length) { this.explorer.api.setState(want); return; }
    this.view?.setHighlights?.(built.keyAtoms.map((id) => ({ type: 'atom', id })));
  }

  activityBlock(act, api) {
    const block = h('div', { class: 'poe', dataset: { activity: act.id } });
    const render = () => {
      const chosen = this.answers[act.id], correct = correctOption(act);
      const kids = [h('h4', { class: 'poe-title' }, act.title), h('p', { class: 'poe-prompt' }, act.prompt),
        h('div', { class: 'poe-options', role: 'group', 'aria-label': act.title }, act.options.map((o) => h('button', { class: `btn poe-option ${chosen === o.id ? (o.correct ? 'right' : 'wrong') : ''} ${chosen && o.correct ? 'reveal' : ''}`, 'aria-pressed': String(chosen === o.id), onClick: () => { this.answers[act.id] = o.id; render(); } }, o.label)))];
      if (chosen) kids.push(h('div', { class: `poe-reveal ${chosen === correct?.id ? 'right' : 'wrong'}` }, h('b', {}, chosen === correct?.id ? 'Right. ' : `Not quite: ${correct?.label.toLowerCase()}. `), act.reveal(),
        act.show ? h('button', { class: 'btn poe-show', onClick: () => { if (act.show.item !== api.item.id) api.select(act.show.item); if (act.show.invariant) api.selectInvariant(act.show.invariant); } }, 'Show me') : null,
        h('button', { class: 'btn poe-reset', onClick: () => { delete this.answers[act.id]; render(); } }, 'Try again')));
      block.replaceChildren(...kids);
    };
    render();
    return block;
  }
}
