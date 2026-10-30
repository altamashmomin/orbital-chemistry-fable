// Invariant cards and glossary for the Acids and bases topic. `show: { t }` moves the proton while the
// card is selected (1 = departed); `show: { partner }` sets the base the equilibrium row compares against.
export const INVARIANTS = {
  hydrogenIodide: [
    { id: 'size', title: 'The strongest of the hydrogen halides', detail: 'Iodide is huge: its extra charge is spread over a large, polarisable ion, so HI gives up its proton more readily than HBr, HCl or HF. Size beats electronegativity down a column.', show: { t: 1 } },
    { id: 'estimate', title: 'pKa −10 is an estimate', detail: 'Acids stronger than H₃O⁺ are fully ionised in water (the levelling effect), so their pKa values come from other solvents and extrapolation; textbooks quote −10.', audience: 'learn' },
  ],
  hydrogenChloride: [
    { id: 'strong', title: 'Fully ionised in water', detail: 'pKa −7: in water every HCl molecule has handed its proton to H₂O. The acid that actually exists in the bottle is H₃O⁺.', show: { t: 1, partner: 'hydroniumIon' } },
    { id: 'row', title: 'Compare HCl with H₂S and PH₃', detail: 'Across a row, electronegativity wins: Cl holds the charge best. Down the column, size wins: HI beats HCl. Both trends are on the ladder.', audience: 'learn' },
  ],
  hydroniumIon: [
    { id: 'strongest', title: 'The strongest acid that can exist in water', detail: 'H₃O⁺ (pKa −1.7) is what every stronger acid becomes in water. Its proton leaves oxygen, which goes from +1 to neutral: losing charge is a strong driving force.', show: { t: 1 } },
    { id: 'pair', title: 'H₃O⁺ / H₂O and H₂O / HO⁻ are two different pairs', detail: 'Water is the base of one pair (pKa −1.7) and the acid of another (pKa 15.7). The 17-unit gap is the range of acids and bases water can tell apart.', links: [{ label: 'Water', href: '#acids-bases/water' }], audience: 'learn' },
  ],
  trifluoroaceticAcid: [
    { id: 'induction', title: 'Three fluorines pull through the σ bonds', detail: 'CF₃ withdraws electron density inductively, stabilising the carboxylate: pKa 0.23 against 4.76 for acetic acid, a factor of 10⁴·⁵.', show: { t: 1, partner: 'aceticAcid' } },
    { id: 'both', title: 'Resonance and induction together', detail: 'The carboxylate already shares its charge between two oxygens; the fluorines add inductive withdrawal on top. Effects stack on the log scale.', audience: 'learn' },
  ],
  hydrogenFluoride: [
    { id: 'weak', title: 'Weak, despite fluorine', detail: 'HF (pKa 3.2) is 10¹⁰ times weaker than HCl. Fluoride is small, its charge concentrated, and the H–F bond is very strong: size and bond strength outweigh electronegativity here.', show: { t: 1, partner: 'hydrogenChloride' } },
    { id: 'row', title: 'But stronger than water and acetylene', detail: 'Across the row, F > O > N > C: HF 3.2, H₂O 15.7, HC≡CH 25. Electronegativity decides within a row.', links: [{ label: 'Water', href: '#acids-bases/water' }, { label: 'Acetylene', href: '#acids-bases/acetylene' }] },
  ],
  anilinium: [
    { id: 'resonance', title: 'Aniline is a weak base, so anilinium is a stronger acid', detail: 'The nitrogen lone pair of aniline is delocalised into the ring; protonating it costs that resonance. So anilinium gives its proton up readily: pKa 4.6 against 9.25 for ammonium.', show: { t: 1, partner: 'ammonium' } },
    { id: 'rule', title: 'Read basicity off the acid ladder', detail: 'The base strength of B is the acid strength of BH⁺: a low pKaH means a weak base. Aniline (4.6) is 10⁴·⁷ times less basic than ammonia (9.25).', audience: 'learn' },
  ],
  aceticAcid: [
    { id: 'resonance', title: 'Acetate shares its charge over two oxygens', detail: 'The carboxylate\'s negative charge is delocalised equally over both oxygens, so the anion is far more stable than an alkoxide: pKa 4.76 against 16 for ethanol.', show: { t: 1, partner: 'ethanol' } },
    { id: 'hydroxide', title: 'Hydroxide takes the proton completely', detail: 'CH₃COOH + HO⁻: pKa 4.76 against 15.7, K = 10¹¹. Every weak acid is neutralised by a base whose conjugate acid is weaker than it.', show: { partner: 'water' } },
    { id: 'bicarbonate', title: 'Why acids fizz with bicarbonate', detail: 'Carbonic acid has pKa 6.4 (not on the ladder), above acetic acid\'s 4.76, so acetate + H₂CO₃ lies on the side of CO₂ + water. Vinegar on baking soda bubbles for this reason.', audience: 'learn' },
  ],
  thiophenol: [
    { id: 'both', title: 'Size and resonance: pKa 6.6', detail: 'Sulfur is larger than oxygen (thiols beat alcohols) and the phenyl ring delocalises the charge (phenols beat alcohols): both effects together put thiophenol 3.4 units below phenol.', show: { t: 1, partner: 'phenol' } },
    { id: 'thiolate', title: 'A thiolate is an excellent nucleophile', detail: 'Easy to make (any hydroxide deprotonates it) and highly polarisable: thiolates are the go-to soft nucleophiles for SN2.', links: [{ label: 'Thiols', href: '#functional-groups/thiol' }], audience: 'learn' },
  ],
  ammonium: [
    { id: 'charge', title: 'The ammonium ion is an acid, ammonia is barely one', detail: 'Losing the proton relieves the positive charge: NH₄⁺ has pKa 9.25. Neutral NH₃ would have to make an amide anion, pKa ≈ 38.', show: { t: 1 } },
    { id: 'amine-base', title: 'Amines are the bases of organic chemistry', detail: 'An amine is protonated by any acid with pKa below ≈ 10; in water at pH 7 most of an amine sits as the ammonium ion. The Functional groups cards give pKaH for every amine.', links: [{ label: 'Amines', href: '#functional-groups/amine' }, { label: 'Basicity', href: '#glossary/basicity' }] },
  ],
  phenol: [
    { id: 'resonance', title: 'Phenoxide puts the charge into the ring', detail: 'The negative charge of phenoxide is delocalised onto the ortho and para carbons, so phenol (pKa 10) is a million times more acidic than ethanol (16).', show: { t: 1, partner: 'ethanol' } },
    { id: 'hydroxide', title: 'Hydroxide deprotonates it, bicarbonate does not', detail: 'pKa 10 against 15.7 for water: HO⁻ takes the proton (K = 10⁵·⁷). Carbonic acid (6.4) is the stronger acid, so bicarbonate leaves phenol alone, the classic way to tell a phenol from a carboxylic acid.', show: { partner: 'water' } },
    { id: 'fg', title: 'A phenol is not an alcohol', detail: 'Same O–H, different chemistry: the Functional groups explorer flags an aryl alcohol as its own class for exactly this reason.', links: [{ label: 'Alcohols (phenol as R = phenyl)', href: '#functional-groups/alcohol/oh' }], audience: 'learn' },
  ],
  nitromethane: [
    { id: 'alpha', title: 'A C–H can be acidic: pKa 10.2', detail: 'The carbanion left behind is delocalised onto the two nitro oxygens (a nitronate). A C–H next to an electron-withdrawing π system is as acidic as a phenol.', show: { t: 1, partner: 'acetone' } },
    { id: 'carbanion', title: 'Carbanions are made this way', detail: 'Every enolate, nitronate and acetylide is a C–H deprotonated by a base chosen from the ladder: the base\'s conjugate acid must lie above the C–H.', audience: 'learn' },
  ],
  ethanethiol: [
    { id: 'size', title: 'A thiol is a stronger acid than an alcohol', detail: 'Sulfur is larger and more polarisable than oxygen, so the thiolate charge is spread out: pKa 10.6 against 16 for ethanol, although oxygen is the more electronegative atom.', show: { t: 1, partner: 'ethanol' } },
    { id: 'hydroxide', title: 'Hydroxide makes the thiolate', detail: 'pKa 10.6 against 15.7: K = 10⁵, so NaOH converts a thiol to its thiolate, which an alcohol would not do.', show: { partner: 'water' } },
  ],
  water: [
    { id: 'reference', title: 'The reference point: pKa 15.7', detail: 'Water as an acid gives hydroxide. Any acid below 15.7 on the ladder is deprotonated by hydroxide; any base whose conjugate acid lies above it is levelled to hydroxide in water.', show: { t: 1 } },
    { id: 'autoionisation', title: '15.7, not 14', detail: 'Kw = 10⁻¹⁴ counts the concentration of water (55.5 M) differently; on the same footing as every other acid, water\'s pKa is 15.7. Both numbers appear in textbooks and mean the same thing.', audience: 'learn' },
  ],
  ethanol: [
    { id: 'weak', title: 'An alcohol O–H is about as acidic as water', detail: 'pKa 16: ethoxide has its charge on one oxygen with nothing to share it. Hydroxide and ethoxide are bases of similar strength.', show: { t: 1, partner: 'water' } },
    { id: 'alkoxide', title: 'Make the alkoxide with a stronger base', detail: 'Sodium hydride or sodium metal, not hydroxide: the base\'s conjugate acid (H₂, pKa ≈ 35) must lie well above 16 for the equilibrium to go.', links: [{ label: 'Alcohols', href: '#functional-groups/alcohol/oh' }], audience: 'learn' },
  ],
  acetaldehyde: [
    { id: 'enolate', title: 'The α C–H gives an enolate: pKa 16.7', detail: 'The carbanion is delocalised onto the carbonyl oxygen, so an α C–H is as acidic as an alcohol, 30 units more acidic than an ordinary C–H.', show: { t: 1, partner: 'water' } },
    { id: 'aldol', title: 'Enolates are the nucleophiles of aldol chemistry', detail: 'Hydroxide makes a little enolate at equilibrium (K ≈ 0.1), enough for the base-catalysed aldol reaction; an aldehyde is more acidic than a ketone because its carbonyl is less electron-rich.', links: [{ label: 'Aldehydes', href: '#functional-groups/aldehyde' }, { label: 'Enolate', href: '#glossary/enolate' }], audience: 'learn' },
  ],
  acetone: [
    { id: 'enolate', title: 'Ketone α C–H: pKa 19.3', detail: 'Two alkyl groups push electron density into the carbonyl, so the enolate is a little less stable than acetaldehyde\'s: 19.3 against 16.7.', show: { t: 1, partner: 'acetaldehyde' } },
    { id: 'lda', title: 'Why LDA, not hydroxide', detail: 'To convert a ketone fully to its enolate the base\'s conjugate acid must lie far above 19: diisopropylamine (pKa ≈ 36) does it, water (15.7) does not (K = 10⁻³·⁶).', show: { partner: 'water' }, audience: 'learn' },
  ],
  acetylene: [
    { id: 'sp', title: 'An sp C–H is the most acidic C–H without help', detail: 'The acetylide lone pair sits in an sp orbital, 50 % s character, close to the nucleus: pKa 25 against ≈ 44 for ethene and ≈ 50 for an alkane.', show: { t: 1, partner: 'ethene' } },
    { id: 'amide', title: 'Sodium amide makes the acetylide, hydroxide does not', detail: 'NH₃ has pKa ≈ 38 (above 25), so NH₂⁻ deprotonates a terminal alkyne completely; water at 15.7 lies below, K = 10⁻⁹. The acetylide is then a carbon nucleophile.', show: { partner: 'water' }, links: [{ label: 'Alkynes', href: '#functional-groups/alkyne' }] },
  ],
  ethene: [
    { id: 'sp2', title: 'An sp² C–H: pKa ≈ 44', detail: 'More s character than an alkane (33 % against 25 %) makes the vinyl anion a little more stable than an alkyl anion, but with no resonance or electronegative atom it is still an extremely weak acid.', show: { t: 1 } },
    { id: 'estimate', title: 'Values above ≈ 30 are estimates', detail: 'Nothing in water measures a pKa of 44; the figure comes from other solvents and from the hybridisation trend. Textbooks quote ≈ 44 for ethene and ≈ 50 for ethane.', audience: 'learn' },
  ],
};

export const GLOSSARY_TERMS = [
  { id: 'conjugate-acid-base', term: 'Conjugate acid–base pair', definition: 'Two species that differ by one proton: HA / A⁻ or BH⁺ / B. The stronger the acid HA, the weaker its conjugate base A⁻, and the strength of a base B is read from the pKa of BH⁺.', why: 'Every proton transfer swaps two pairs, and the ladder of pKa values ranks them all at once.', links: [{ label: 'Acids and bases', href: '#acids-bases' }, { label: 'pKa', href: '#glossary/pka' }] },
  { id: 'equilibrium-direction', term: 'Which way a proton transfer goes', definition: 'HA + B⁻ ⇌ A⁻ + HB lies on the side of the weaker acid; K = 10^(pKa(HB) − pKa(HA)). A base deprotonates an acid completely when its conjugate acid lies several pKa units higher on the ladder.', why: 'One subtraction of two tabulated numbers predicts whether hydroxide, an alkoxide, amide or LDA is the right base.', links: [{ label: 'Acetic acid + hydroxide', href: '#acids-bases/aceticAcid/hydroxide' }, { label: 'Acetylene + amide', href: '#acids-bases/acetylene/amide' }] },
  { id: 'acid-strength-factors', term: 'The five factors of acid strength', definition: 'Element (electronegativity across a row), size (down a column), resonance (delocalising the anion\'s charge), induction (electron-withdrawing groups nearby) and hybridisation (s character of a C–H); a positive charge on the acid is a sixth.', why: 'They explain the order of the ladder, so a pKa can be estimated for a molecule that is not on it.', links: [{ label: 'Acids and bases', href: '#acids-bases' }] },
  { id: 'levelling-effect', term: 'Levelling effect', definition: 'In water no acid stronger than H₃O⁺ (pKa −1.7) and no base stronger than HO⁻ (conjugate acid pKa 15.7) can exist: they are converted to those two. pKa values outside that window come from other solvents.', why: 'It is why HCl, HBr and HI all look equally strong in water, and why amide and LDA must be used in dry solvents.', links: [{ label: 'Hydronium ion', href: '#acids-bases/hydroniumIon' }, { label: 'Water', href: '#acids-bases/water' }] },
];
