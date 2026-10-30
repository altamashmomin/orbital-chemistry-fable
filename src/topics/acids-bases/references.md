# References: acids and bases

* pKa values (`PKA` / `PKA_TABLE` in `src/chem/references/textbook.js`, water, 25 °C): Bruice, *Organic
  Chemistry*, appendix pKa table; Clayden, Greeves & Warren ch. 8. The hydrogen halides (HCl −7, HBr −9,
  HI −10), ethene (≈ 44) and ethane (≈ 50) are the textbook estimates: acids stronger than H₃O⁺ and
  weaker than about 30 cannot be measured in water (levelling), so those figures come from other solvents
  and extrapolation, and the cards say so. Water's 15.7 is the value on the same footing as every other
  acid (Kw = 10⁻¹⁴ counts the solvent differently); both numbers appear in textbooks.
* The direction of a proton transfer: HA + B⁻ ⇌ A⁻ + HB lies on the side of the weaker acid with
  K = 10^(pKa(HB) − pKa(HA)) and ΔG° = −2.303RT log K; 2.303RT = 5.708 kJ/mol at 298.15 K
  (`RT_LN10_KJ`). A thermodynamic identity applied to two tabulated values: nothing else is computed.
* The five factors (element, size, resonance, induction, hybridisation) and the effect of charge:
  Clayden, Greeves & Warren ch. 8; Bruice ch. 2; Klein ch. 3. Each factor is stored as ordered
  comparisons of pairs on the ladder (`FACTORS`), which the sweep checks against the table
  (`acids/factor.*`).
* The 3D model: each acid is the Functional groups molecule (water as the alcohol with R = H, the
  hydrogen halides as the haloalkane with R = H, acetylene and ethene as the alkyne / alkene with R = H,
  the α C–H acids as the ketone / aldehyde / nitro molecules); cationic acids (H₃O⁺, NH₄⁺, anilinium) have
  their proton added on the lone pair at the table X–H length. "Sending the proton off" moves it 1.4 Å
  along its bond and shifts the formal charges linearly; no geometry or energy is computed, and the
  conjugate base is not re-optimised (a real carboxylate, enolate or phenoxide relaxes its bond lengths).
