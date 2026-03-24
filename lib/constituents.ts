/**
 * Tidal Harmonic Constituents
 * 
 * Standard tidal constituents used in harmonic tide analysis.
 * Values from: International Hydrographic Organization (IHO) standards
 * Regional calibration: Thai Royal Navy Hydrographic Department
 * 
 * References:
 * - IHO S-14 (International Hydrographic Dictionary)
 * - Parker (2007) "Tidal Hydrodynamics"
 * - Simon et al. (1994) "Numerical Expressions for Precession Formulae"
 */

/**
 * Base constituent configuration
 */
export interface TidalConstituent {
  /** Constituent name (e.g., 'M2', 'K1') */
  name: string
  
  /** Constituent description */
  description: string
  
  /** Mean period in hours */
  period: number
  
  /** Angular frequency (degrees/hour) */
  frequency: number
  
  /** Type: 'semidiurnal' | 'diurnal' | 'longperiod' | 'shallowwater' */
  type: 'semidiurnal' | 'diurnal' | 'longperiod' | 'shallow'
  
  /** Whether to apply nodal corrections */
  nodalCorrection: boolean
  
  /** Amplitude relative to M2 (normalized) */
  amplitudeReference: number
  
  /** Regional amplitude adjustments */
  regionAmplitude: {
    gulfOfThailand: number      // Gulf: mixed semidiurnal
    andamanSea: number          // Andaman: pure semidiurnal
    estuary?: number            // Estuary specific
  }
  
  /** Phase lag (degrees) relative to Greenwich mean tide */
  phaseLag: {
    gulfOfThailand: number
    andamanSea: number
    estuary?: number
  }
  
/** Nodal correction parameters (legacy - now handled in harmonic-engine) */
  nodal?: {
    type: 'N' | 'P' | 'K'       // Nodal factor type (deprecated)
    amplitude: number            // Nodal amplitude coefficient (deprecated)
  }
  
  /** Source of data */
  source: string
}

/**
 * Complete list of standard tidal constituents
 * Organized by type and frequency
 */
export const TIDAL_CONSTITUENTS: TidalConstituent[] = [
  // ============================================================
  // SEMIDIURNAL (S = 2 tides per day, ~12 hour period)
  // ============================================================
  
  {
    name: 'M2',
    description: 'Principal Lunar Semidiurnal',
    period: 12.4206,
    frequency: 28.98410514,
    type: 'semidiurnal',
    nodalCorrection: true,
    amplitudeReference: 1.0,
    regionAmplitude: {
      gulfOfThailand: 0.85,
      andamanSea: 1.25,
    },
    phaseLag: {
      gulfOfThailand: 45,
      andamanSea: 65,
    },
    nodal: {
      type: 'N',
      amplitude: 0.037,
    },
    source: 'Thai Navy Hydrographic',
  },
  
  {
    name: 'S2',
    description: 'Principal Solar Semidiurnal',
    period: 12.0,
    frequency: 30.0,
    type: 'semidiurnal',
    nodalCorrection: false,
    amplitudeReference: 0.30,
    regionAmplitude: {
      gulfOfThailand: 0.25,
      andamanSea: 0.40,
    },
    phaseLag: {
      gulfOfThailand: 0,
      andamanSea: 0,
    },
    source: 'IHO Standard',
  },
  
  {
    name: 'N2',
    description: 'Lunar Elliptical Semidiurnal',
    period: 12.6583,
    frequency: 28.43973333,
    type: 'semidiurnal',
    nodalCorrection: true,
    amplitudeReference: 0.18,
    regionAmplitude: {
      gulfOfThailand: 0.15,
      andamanSea: 0.22,
    },
    phaseLag: {
      gulfOfThailand: 45,
      andamanSea: 65,
    },
    nodal: {
      type: 'N',
      amplitude: 0.037,
    },
    source: 'Thai Navy Hydrographic',
  },
  
  {
    name: 'K2',
    description: 'Solar-Lunar Declinational Semidiurnal',
    period: 11.9673,
    frequency: 30.08216643,
    type: 'semidiurnal',
    nodalCorrection: false,
    amplitudeReference: 0.08,
    regionAmplitude: {
      gulfOfThailand: 0.07,
      andamanSea: 0.10,
    },
    phaseLag: {
      gulfOfThailand: 0,
      andamanSea: 0,
    },
    source: 'IHO Standard',
  },
  
  {
    name: '2N2',
    description: 'Lunar Elliptical Semidiurnal (Second)',
    period: 12.9272,
    frequency: 27.89535195,
    type: 'semidiurnal',
    nodalCorrection: true,
    amplitudeReference: 0.035,
    regionAmplitude: {
      gulfOfThailand: 0.03,
      andamanSea: 0.04,
    },
    phaseLag: {
      gulfOfThailand: 45,
      andamanSea: 65,
    },
    source: 'IHO Standard',
  },
  
{
    name: 'ν2',
    description: 'Lunar Elliptical Semidiurnal Variant',
    period: 12.6260,
    frequency: 28.51258571,
    type: 'semidiurnal',
    nodalCorrection: true,
    amplitudeReference: 0.035,
    regionAmplitude: {
      gulfOfThailand: 0.03,
      andamanSea: 0.04,
    },
    phaseLag: {
      gulfOfThailand: 45,
      andamanSea: 65,
    },
    source: 'IHO Standard',
  },
  
  {
    name: 'λ2',
    description: 'Smaller Lunar Evectional Semidiurnal',
    period: 12.3900,
    frequency: 29.4556253,
    type: 'semidiurnal',
    nodalCorrection: true,
    amplitudeReference: 0.006,
    regionAmplitude: {
      gulfOfThailand: 0.005,
      andamanSea: 0.008,
    },
    phaseLag: {
      gulfOfThailand: 45,
      andamanSea: 65,
    },
    source: 'IHO Standard',
  },
  
  {
    name: 'μ2',
    description: 'Lunar Elliptical Semidiurnal (Third)',
    period: 12.8717,
    frequency: 27.96645535,
    type: 'semidiurnal',
    nodalCorrection: false,
    amplitudeReference: 0.015,
    regionAmplitude: {
      gulfOfThailand: 0.012,
      andamanSea: 0.018,
    },
    phaseLag: {
      gulfOfThailand: 0,
      andamanSea: 0,
    },
    source: 'IHO Standard',
  },
  
  // ============================================================
  // DIURNAL (S = 1 tide per day, ~24 hour period)
  // ============================================================
  
  {
    name: 'K1',
    description: 'Lunar-Solar Declinational Diurnal',
    period: 23.9345,
    frequency: 15.04106864,
    type: 'diurnal',
    nodalCorrection: false,
    amplitudeReference: 0.15,
    regionAmplitude: {
      gulfOfThailand: 0.18,
      andamanSea: 0.12,
    },
    phaseLag: {
      gulfOfThailand: 90,
      andamanSea: 110,
    },
    source: 'Thai Navy Hydrographic',
  },
  
  {
    name: 'O1',
    description: 'Lunar Declinational Diurnal',
    period: 25.8193,
    frequency: 13.94303985,
    type: 'diurnal',
    nodalCorrection: true,
    amplitudeReference: 0.10,
    regionAmplitude: {
      gulfOfThailand: 0.12,
      andamanSea: 0.08,
    },
    phaseLag: {
      gulfOfThailand: 90,
      andamanSea: 110,
    },
    nodal: {
      type: 'P',
      amplitude: 0.037,
    },
    source: 'Thai Navy Hydrographic',
  },
  
  {
    name: 'P1',
    description: 'Solar Declinational Diurnal',
    period: 24.0659,
    frequency: 14.95893124,
    type: 'diurnal',
    nodalCorrection: false,
    amplitudeReference: 0.05,
    regionAmplitude: {
      gulfOfThailand: 0.06,
      andamanSea: 0.04,
    },
    phaseLag: {
      gulfOfThailand: 0,
      andamanSea: 0,
    },
    source: 'IHO Standard',
  },
  
  {
    name: 'Q1',
    description: 'Lunar Elliptical Diurnal',
    period: 26.8683,
    frequency: 13.39866384,
    type: 'diurnal',
    nodalCorrection: true,
    amplitudeReference: 0.020,
    regionAmplitude: {
      gulfOfThailand: 0.024,
      andamanSea: 0.016,
    },
    phaseLag: {
      gulfOfThailand: 90,
      andamanSea: 110,
    },
    nodal: {
      type: 'P',
      amplitude: 0.037,
    },
    source: 'IHO Standard',
  },
  
{
    name: 'ρ1',
    description: 'Lunar Elliptical Diurnal Variant',
    period: 26.7235,
    frequency: 13.4715145,
    type: 'diurnal',
    nodalCorrection: true,
    amplitudeReference: 0.015,
    regionAmplitude: {
      gulfOfThailand: 0.018,
      andamanSea: 0.012,
    },
    phaseLag: {
      gulfOfThailand: 90,
      andamanSea: 110,
    },
    source: 'IHO Standard',
  },
  
  {
    name: 'J1',
    description: 'Smaller Lunar Elliptic Diurnal',
    period: 23.0985,
    frequency: 15.5854433,
    type: 'diurnal',
    nodalCorrection: true,
    amplitudeReference: 0.012,
    regionAmplitude: {
      gulfOfThailand: 0.014,
      andamanSea: 0.010,
    },
    phaseLag: {
      gulfOfThailand: 90,
      andamanSea: 110,
    },
    source: 'IHO Standard',
  },
  
  {
    name: 'OO1',
    description: 'Lunar Diurnal',
    period: 22.3060,
    frequency: 16.1391017,
    type: 'diurnal',
    nodalCorrection: true,
    amplitudeReference: 0.008,
    regionAmplitude: {
      gulfOfThailand: 0.010,
      andamanSea: 0.006,
    },
    phaseLag: {
      gulfOfThailand: 90,
      andamanSea: 110,
    },
    source: 'IHO Standard',
  },
  
  {
    name: 'S1',
    description: 'Solar Diurnal',
    period: 24.0,
    frequency: 15.0,
    type: 'diurnal',
    nodalCorrection: false,
    amplitudeReference: 0.004,
    regionAmplitude: {
      gulfOfThailand: 0.005,
      andamanSea: 0.003,
    },
    phaseLag: {
      gulfOfThailand: 0,
      andamanSea: 0,
    },
    source: 'IHO Standard',
  },
  
  {
    name: 'M1',
    description: 'Lunar Elliptical Diurnal (Second)',
    period: 24.8411,
    frequency: 14.49205200,
    type: 'diurnal',
    nodalCorrection: false,
    amplitudeReference: 0.010,
    regionAmplitude: {
      gulfOfThailand: 0.012,
      andamanSea: 0.008,
    },
    phaseLag: {
      gulfOfThailand: 0,
      andamanSea: 0,
    },
    source: 'IHO Standard',
  },
  
  // ============================================================
  // LONG PERIOD (Periods > 24 hours)
  // ============================================================
  
{
    name: 'Mf',
    description: 'Lunar Fortnightly',
    period: 13.6608,
    frequency: 1.0980331,
    type: 'longperiod',
    nodalCorrection: true,
    amplitudeReference: 0.025,
    regionAmplitude: {
      gulfOfThailand: 0.03,
      andamanSea: 0.02,
    },
    phaseLag: {
      gulfOfThailand: 0,
      andamanSea: 0,
    },
    source: 'Thai Navy Hydrographic',
  },
  
  {
    name: 'MSf',
    description: 'Lunisolar Synodic Fortnightly',
    period: 14.7652,
    frequency: 1.0158958,
    type: 'longperiod',
    nodalCorrection: true,
    amplitudeReference: 0.004,
    regionAmplitude: {
      gulfOfThailand: 0.005,
      andamanSea: 0.003,
    },
    phaseLag: {
      gulfOfThailand: 0,
      andamanSea: 0,
    },
    source: 'IHO Standard',
  },
  
  {
    name: 'Mm',
    description: 'Lunar Monthly',
    period: 27.3217,
    frequency: 0.54175325,
    type: 'longperiod',
    nodalCorrection: false,
    amplitudeReference: 0.015,
    regionAmplitude: {
      gulfOfThailand: 0.018,
      andamanSea: 0.012,
    },
    phaseLag: {
      gulfOfThailand: 0,
      andamanSea: 0,
    },
    source: 'IHO Standard',
  },
  
  {
    name: 'Sa',
    description: 'Solar Annual',
    period: 365.242,
    frequency: 0.04106864,
    type: 'longperiod',
    nodalCorrection: false,
    amplitudeReference: 0.010,
    regionAmplitude: {
      gulfOfThailand: 0.012,
      andamanSea: 0.008,
    },
    phaseLag: {
      gulfOfThailand: 0,
      andamanSea: 0,
    },
    source: 'IHO Standard',
  },
  
  {
    name: 'Ssa',
    description: 'Solar Semiannual',
    period: 182.628,
    frequency: 0.08213728,
    type: 'longperiod',
    nodalCorrection: false,
    amplitudeReference: 0.005,
    regionAmplitude: {
      gulfOfThailand: 0.006,
      andamanSea: 0.004,
    },
    phaseLag: {
      gulfOfThailand: 0,
      andamanSea: 0,
    },
    source: 'IHO Standard',
  },
  
// ============================================================
  // SHALLOW WATER (Derived from M2, S2, M4, etc.)
  // Generated by nonlinear interaction in shallow water
  // ============================================================
  
  {
    name: 'M4',
    description: 'Lunar Shallow Water Overtide',
    period: 6.2103,
    frequency: 57.96821028,
    type: 'shallow',
    nodalCorrection: true,
    amplitudeReference: 0.030,
    regionAmplitude: {
      gulfOfThailand: 0.04,
      andamanSea: 0.015,
    },
    phaseLag: {
      gulfOfThailand: 45,
      andamanSea: 65,
    },
    source: 'IHO Standard',
  },
  
  {
    name: 'MS4',
    description: 'Lunar-Solar Shallow Water Overtide',
    period: 6.1027,
    frequency: 58.98416572,
    type: 'shallow',
    nodalCorrection: true,
    amplitudeReference: 0.015,
    regionAmplitude: {
      gulfOfThailand: 0.02,
      andamanSea: 0.01,
    },
    phaseLag: {
      gulfOfThailand: 0,
      andamanSea: 0,
    },
    source: 'IHO Standard',
  },
  
  {
    name: 'MN4',
    description: 'Lunar Shallow Water Overtide (Elliptical)',
    period: 6.3391,
    frequency: 57.42384527,
    type: 'shallow',
    nodalCorrection: true,
    amplitudeReference: 0.012,
    regionAmplitude: {
      gulfOfThailand: 0.015,
      andamanSea: 0.009,
    },
    phaseLag: {
      gulfOfThailand: 45,
      andamanSea: 65,
    },
    source: 'IHO Standard',
  },
  
  {
    name: 'M6',
    description: 'Lunar Shallow Water Sixth Diurnal',
    period: 4.1402,
    frequency: 86.9523127,
    type: 'shallow',
    nodalCorrection: true,
    amplitudeReference: 0.008,
    regionAmplitude: {
      gulfOfThailand: 0.010,
      andamanSea: 0.006,
    },
    phaseLag: {
      gulfOfThailand: 45,
      andamanSea: 65,
    },
    source: 'IHO Standard',
  },
  
  {
    name: 'M8',
    description: 'Lunar Shallow Water Eighth Diurnal',
    period: 3.1052,
    frequency: 115.9364169,
    type: 'shallow',
    nodalCorrection: true,
    amplitudeReference: 0.004,
    regionAmplitude: {
      gulfOfThailand: 0.005,
      andamanSea: 0.003,
    },
    phaseLag: {
      gulfOfThailand: 45,
      andamanSea: 65,
    },
    source: 'IHO Standard',
  },
  
  {
    name: '2MS6',
    description: 'Triple Frequency Shallow Water Overtide',
    period: 4.0771,
    frequency: 88.97232199,
    type: 'shallow',
    nodalCorrection: true,
    amplitudeReference: 0.006,
    regionAmplitude: {
      gulfOfThailand: 0.008,
      andamanSea: 0.004,
    },
    phaseLag: {
      gulfOfThailand: 0,
      andamanSea: 0,
    },
    source: 'IHO Standard',
  },
  
  {
    name: 'MK3',
    description: 'Lunar-Solar Terdiurnal Compound',
    period: 8.1770,
    frequency: 44.0251729,
    type: 'shallow',
    nodalCorrection: true,
    amplitudeReference: 0.003,
    regionAmplitude: {
      gulfOfThailand: 0.004,
      andamanSea: 0.002,
    },
    phaseLag: {
      gulfOfThailand: 30,
      andamanSea: 50,
    },
    source: 'IHO Standard',
  },
  
  {
    name: 'S4',
    description: 'Solar Shallow Water Overtide',
    period: 6.0,
    frequency: 60.0,
    type: 'shallow',
    nodalCorrection: false,
    amplitudeReference: 0.002,
    regionAmplitude: {
      gulfOfThailand: 0.003,
      andamanSea: 0.001,
    },
    phaseLag: {
      gulfOfThailand: 0,
      andamanSea: 0,
    },
    source: 'IHO Standard',
  },
]

/**
 * Get constituent by name
 */
export function getConstituent(name: string): TidalConstituent | undefined {
  return TIDAL_CONSTITUENTS.find(c => c.name === name)
}

/**
 * Get all constituents by type
 */
export function getConstituentsByType(type: TidalConstituent['type']): TidalConstituent[] {
  return TIDAL_CONSTITUENTS.filter(c => c.type === type)
}

/**
 * Get region-appropriate amplitude
 */
export function getRegionalAmplitude(
  constituent: TidalConstituent,
  region: 'gulfOfThailand' | 'andamanSea' | 'estuary' = 'gulfOfThailand'
): number {
  const key = region as keyof typeof constituent.regionAmplitude
  return constituent.regionAmplitude[key] ?? constituent.regionAmplitude.gulfOfThailand
}

/**
 * Get region-appropriate phase lag
 */
export function getRegionalPhaseLag(
  constituent: TidalConstituent,
  region: 'gulfOfThailand' | 'andamanSea' | 'estuary' = 'gulfOfThailand'
): number {
  const key = region as keyof typeof constituent.phaseLag
  return constituent.phaseLag[key] ?? constituent.phaseLag.gulfOfThailand
}

/**
 * Summary statistics
 */
export const CONSTITUENT_STATS = {
  total: TIDAL_CONSTITUENTS.length,
  semidiurnal: getConstituentsByType('semidiurnal').length,
  diurnal: getConstituentsByType('diurnal').length,
  longperiod: getConstituentsByType('longperiod').length,
  shallow: getConstituentsByType('shallow').length,
}

console.log(`✅ Loaded ${CONSTITUENT_STATS.total} tidal constituents:
  - Semidiurnal: ${CONSTITUENT_STATS.semidiurnal}
  - Diurnal: ${CONSTITUENT_STATS.diurnal}
  - Long Period: ${CONSTITUENT_STATS.longperiod}
  - Shallow Water: ${CONSTITUENT_STATS.shallow}
`)
