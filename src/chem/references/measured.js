// Independent experimental reference geometries: the oracle the conformance suite checks the model
// against (docs/REVIEW_PROTOCOL.md). Every value was copied by hand from the cited measurement, as
// listed in the NIST Computational Chemistry Comparison and Benchmark Database experimental-geometry
// pages (https://cccbdb.nist.gov/expgeom2x.asp?casno=<CAS without dashes>, read 2026-10-27) unless the
// source says otherwise. `value` is the figure rounded to 0.1° as the model uses it; `listed` is the
// figure as printed.
//
// The embedder never imports this file. LONE_PAIR_ANGLES in textbook.js carries its own literal
// numbers and names the row here each one was taken from; tests/sweep and the conformance suite check
// that the two agree, so a change to either side is caught instead of silently propagating.

/** Measured bond lengths (Å) the model draws where the element/order table would be wrong: conjugated single bonds. */
export const MEASURED_BONDS = {
  formamide_CN: { value: 1.35, listed: 1.350, molecule: 'HCONH₂', cas: '75-12-7', atoms: 'C–N (amide)', source: 'Hirota & Sugisaki, J. Mol. Spectrosc. 49, 251 (1974), via CCCBDB; N-methylacetamide is not on CCCBDB' },
  aceticAcid_CO: { value: 1.36, listed: 1.361, molecule: 'CH₃COOH', cas: '64-19-7', atoms: 'C–O(H)', source: 'Landolt-Börnstein II/7 (1976), via CCCBDB' },
  methylFormate_CO: { value: 1.33, listed: 1.334, molecule: 'HCOOCH₃', cas: '107-31-3', atoms: 'C(=O)–O (ester)', source: 'Landolt-Börnstein II/7 (1976), via CCCBDB; O–CH₃ is 1.437' },
  nitromethane_NO: { value: 1.22, listed: 1.224, molecule: 'CH₃NO₂', cas: '75-52-5', atoms: 'N–O (both)', source: 'Landolt-Börnstein II/7 (1976), via CCCBDB' },
  // diatomics and the small molecules of the Molecular orbitals topic (read 2026-10-29)
  H2_HH: { value: 0.741, listed: 0.7414, molecule: 'H₂', cas: '1333-74-0', atoms: 'H–H', type: 'rₑ', source: 'Huber & Herzberg, Constants of Diatomic Molecules (1979), via CCCBDB' },
  N2_NN: { value: 1.098, listed: 1.0977, molecule: 'N₂', cas: '7727-37-9', atoms: 'N≡N', type: 'rₑ', source: 'Huber & Herzberg (1979), via CCCBDB' },
  O2_OO: { value: 1.208, listed: 1.2075, molecule: 'O₂', cas: '7782-44-7', atoms: 'O=O', type: 'rₑ', source: 'Huber & Herzberg (1979), via CCCBDB' },
  ethylene_CC: { value: 1.339, listed: 1.339, molecule: 'C₂H₄', cas: '74-85-1', atoms: 'C=C', source: 'Herzberg (1966), via CCCBDB' },
  ethylene_CH: { value: 1.086, listed: 1.086, molecule: 'C₂H₄', cas: '74-85-1', atoms: 'C–H', source: 'Herzberg (1966), via CCCBDB' },
  butadiene_CC: { value: 1.476, listed: 1.476, molecule: 'CH₂=CH–CH=CH₂', cas: '106-99-0', atoms: 'C2–C3 (single)', source: 'Herzberg (1966), via CCCBDB' },
  butadiene_CdC: { value: 1.337, listed: 1.337, molecule: 'CH₂=CH–CH=CH₂', cas: '106-99-0', atoms: 'C=C', source: 'Herzberg (1966), via CCCBDB; no C–H length is listed, the ethylene value is used' },
  chloromethane_CCl: { value: 1.785, listed: 1.785, molecule: 'CH₃Cl', cas: '74-87-3', atoms: 'C–Cl', source: 'Duncan, McKean, Mallinson & McCulloch, J. Mol. Spectrosc. 46, 232 (1973), via CCCBDB' },
  chloromethane_CH: { value: 1.09, listed: 1.090, molecule: 'CH₃Cl', cas: '74-87-3', atoms: 'C–H', source: 'Duncan et al. (1973), via CCCBDB' },
  formaldehyde_CH: { value: 1.111, listed: 1.111, molecule: 'H₂CO', cas: '50-00-0', atoms: 'C–H', source: 'Gurvich, Veyts & Alcock (1989), via CCCBDB' },
  formaldehyde_CO: { value: 1.205, listed: 1.205, molecule: 'H₂CO', cas: '50-00-0', atoms: 'C=O', source: 'Gurvich, Veyts & Alcock (1989), via CCCBDB; the Molecular shapes frame draws the table value 1.21 Å' },
};

export const MEASURED_ANGLES = {
  // bent and pyramidal centres (one measured exemplar per table row)
  water_HOH: { value: 104.5, listed: 104.48, molecule: 'H₂O', cas: '7732-18-5', atoms: 'H–O–H', type: 'rₑ', source: 'Hoy & Bunker, J. Mol. Spectrosc. 74, 1 (1979), via CCCBDB' },
  ammonia_HNH: { value: 106.7, listed: 106.67, molecule: 'NH₃', cas: '7664-41-7', atoms: 'H–N–H', source: 'Herzberg, Electronic Spectra of Polyatomic Molecules (1966), via CCCBDB' },
  phosphine_HPH: { value: 93.3, listed: 93.3, molecule: 'PH₃', cas: '7803-51-2', atoms: 'H–P–H', source: 'Herzberg (1966), via CCCBDB' },
  hydrogenSulfide_HSH: { value: 92.1, listed: 92.11, molecule: 'H₂S', cas: '7783-06-4', atoms: 'H–S–H', source: 'Cook, De Lucia & Helminger, J. Mol. Struct. 28, 237 (1975), via CCCBDB' },
  hydrogenSelenide_HSeH: { value: 90.9, listed: 90.9, molecule: 'H₂Se', cas: '7783-07-5', atoms: 'H–Se–H', source: 'Kuchitsu (ed.), Structure of Free Polyatomic Molecules (1998), via CCCBDB' },
  methanol_COH: { value: 108.9, listed: 108.87, molecule: 'CH₃OH', cas: '67-56-1', atoms: 'C–O–H', source: 'Venkateswarlu & Gordy, J. Chem. Phys. 23, 1200 (1955), via CCCBDB' },
  dimethylEther_COC: { value: 111.2, listed: 111.2, molecule: '(CH₃)₂O', cas: '115-10-6', atoms: 'C–O–C', type: 'rₛ', source: 'Niide & Hayashi, J. Mol. Spectrosc. 220, 65 (2003), via CCCBDB; Landolt-Börnstein II/7 and the CRC gas-phase table give 111.7° (microwave, 1963)' },
  methanethiol_CSH: { value: 96.5, listed: 96.5, molecule: 'CH₃SH', cas: '74-93-1', atoms: 'C–S–H', source: 'Kojima, J. Phys. Soc. Jpn. 15, 1284 (1960), microwave, as tabulated in Landolt-Börnstein II/7 and the CRC gas-phase table; the CCCBDB listing quotes the older Herzberg (1966) compilation value 100.3° — discrepancy recorded in the register' },
  dimethylSulfide_CSC: { value: 98.9, listed: 98.9, molecule: '(CH₃)₂S', cas: '75-18-3', atoms: 'C–S–C', source: 'Pierce & Hayashi, J. Chem. Phys. 35, 479 (1961), via CCCBDB' },
  formicAcid_COH: { value: 106.3, listed: 106.3, molecule: 'HCOOH', cas: '64-18-6', atoms: 'C–O–H', source: 'Herzberg (1966), via CCCBDB; acetic acid monomer 107° (Derissen, J. Mol. Struct. 7, 67 (1971), electron diffraction) is not on CCCBDB' },
  methylFormate_COC: { value: 114.8, listed: 114.8, molecule: 'HCOOCH₃', cas: '107-31-3', atoms: 'C–O–C', source: 'Landolt-Börnstein II/7 (1976), via CCCBDB; methyl acetate 116.4° (Pyckhout et al., J. Mol. Struct. 144, 265 (1986), electron diffraction) is not on CCCBDB' },
  sulfurDioxide_OSO: { value: 119.5, listed: 119.5, molecule: 'SO₂', cas: '7446-09-5', atoms: 'O–S–O', source: 'Herzberg (1966), via CCCBDB' },
  // hypervalent centres
  SF4_axial_FSF: { value: 173.1, listed: 173.07, molecule: 'SF₄', cas: '7783-60-0', atoms: 'F(ax)–S–F(ax)', source: 'Tolles & Gwinn, J. Chem. Phys. 36, 1119 (1962), via CCCBDB' },
  SF4_equatorial_FSF: { value: 101.6, listed: 101.55, molecule: 'SF₄', cas: '7783-60-0', atoms: 'F(eq)–S–F(eq)', source: 'Tolles & Gwinn (1962), via CCCBDB' },
  SF4_axialEquatorial_FSF: { value: 87.8, listed: 87.81, molecule: 'SF₄', cas: '7783-60-0', atoms: 'F(ax)–S–F(eq)', source: 'Tolles & Gwinn (1962), via CCCBDB ("by symmetry")' },
  ClF3_axialEquatorial_FClF: { value: 87.5, listed: 87.45, molecule: 'ClF₃', cas: '7790-91-2', atoms: 'F(ax)–Cl–F(eq)', type: 'rₑ', source: 'Müller, Phys. Chem. Chem. Phys. 3, 1570 (2001), via CCCBDB' },
  ClF3_axial_FClF: { value: 174.9, listed: 174.9, molecule: 'ClF₃', cas: '7790-91-2', atoms: 'F(ax)–Cl–F(ax)', source: 'Müller (2001), via CCCBDB ("from symmetry assuming planar")' },
  BrF5_basalApical_FBrF: { value: 84.8, listed: 84.8, molecule: 'BrF₅', cas: '7789-30-2', atoms: 'F(basal)–Br–F(apical)', source: 'Gurvich, Veyts & Alcock, Thermodynamic Properties of Individual Substances, 4th ed. (1989), via CCCBDB' },
  BrF5_basalCis_FBrF: { value: 89.5, listed: 89.53, molecule: 'BrF₅', cas: '7789-30-2', atoms: 'F(basal)–Br–F(basal), cis', source: 'Gurvich et al. (1989), via CCCBDB' },
  // centres the model keeps idealised (register)
  formaldehyde_HCH: { value: 116.1, listed: 116.133, molecule: 'H₂CO', cas: '50-00-0', atoms: 'H–C–H', source: 'Gurvich, Veyts & Alcock (1989), via CCCBDB' },
  formaldehyde_HCO: { value: 121.9, listed: 121.9, molecule: 'H₂CO', cas: '50-00-0', atoms: 'H–C=O', source: 'Gurvich, Veyts & Alcock (1989), via CCCBDB ("from H–C–H by symmetry")' },
  nitromethane_ONO: { value: 125.3, listed: 125.3, molecule: 'CH₃NO₂', cas: '75-52-5', atoms: 'O–N–O', source: 'Landolt-Börnstein II/7 (1976), via CCCBDB' },
  acetone_CCC: { value: 116.0, listed: 116, molecule: '(CH₃)₂CO', cas: '67-64-1', atoms: 'C–C–C', source: 'Kuchitsu (1998), via CCCBDB (C–C=O 122°)' },
  cyclohexaneChair_CCC: { value: 111.3, listed: 111.28, molecule: 'C₆H₁₂', cas: '110-82-7', atoms: 'C–C–C', source: 'Kuchitsu (1998), via CCCBDB; Clayden, Greeves & Warren ch. 16 quotes 111.4°' },
  // amines: the range the ammonia class default stands in for (register)
  methylamine_HNH: { value: 105.8, listed: 105.8, molecule: 'CH₃NH₂', cas: '74-89-5', atoms: 'H–N–H', source: 'Kuchitsu (1998), via CCCBDB' },
  methylamine_CNH: { value: 111.0, listed: 111, molecule: 'CH₃NH₂', cas: '74-89-5', atoms: 'C–N–H', source: 'Kuchitsu (1998), via CCCBDB' },
  dimethylamine_CNC: { value: 112.2, listed: 112.2, molecule: '(CH₃)₂NH', cas: '124-40-3', atoms: 'C–N–C', source: 'Wollrab & Laurie, J. Chem. Phys. 48, 5058 (1968), via CCCBDB' },
  trimethylamine_CNC: { value: 110.9, listed: 110.9, molecule: '(CH₃)₃N', cas: '75-50-3', atoms: 'C–N–C', source: 'Landolt-Börnstein II/7 (1976), via CCCBDB' },
  phenol_COH: { value: 109.0, listed: 109, molecule: 'C₆H₅OH', cas: '108-95-2', atoms: 'C–O–H', source: 'Landolt-Börnstein II/7 (1976), via CCCBDB' },
  // the Molecular orbitals topic's authored frames
  ethylene_HCH: { value: 117.6, listed: 117.6, molecule: 'C₂H₄', cas: '74-85-1', atoms: 'H–C–H', source: 'Herzberg (1966), via CCCBDB' },
  ethylene_HCC: { value: 121.2, listed: 121.2, molecule: 'C₂H₄', cas: '74-85-1', atoms: 'H–C=C', source: 'Herzberg (1966), via CCCBDB' },
  butadiene_CCC: { value: 122.9, listed: 122.9, molecule: 'CH₂=CH–CH=CH₂', cas: '106-99-0', atoms: 'C=C–C', source: 'Herzberg (1966), via CCCBDB' },
  chloromethane_HCCl: { value: 108.2, listed: 108.16, molecule: 'CH₃Cl', cas: '74-87-3', atoms: 'H–C–Cl', source: 'Duncan et al. (1973), via CCCBDB' },
};
