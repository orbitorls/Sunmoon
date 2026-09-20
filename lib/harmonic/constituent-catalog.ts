/**
 * Advanced Harmonic Tide Prediction for Thailand
 * Based on 37+ tidal constituents with astronomical corrections
 * 
 * Major constituents (M2, S2, N2, K2, K1, O1, P1, Q1, etc.)
 * Shallow water constituents (M4, MS4, MN4, etc.)
 * Long-period constituents (Mf, Mm, Sa, Ssa, etc.)
 */

import type { LocationData } from '@/lib/domain/types'
import { calculateAstronomicalArguments, type AstronomicalArguments } from './ephemerides'
export type { AstronomicalArguments } from './ephemerides'
export { getEphemeridesMetadata, getDeltaTSeconds, getLeapSecondOffset } from './ephemerides'

// Re-export LocationData for convenience
export type { LocationData }

/**
 * Doodson Numbers for each constituent (for precise astronomical calculations)
 * Format: [τ, s, h, p, N', ps] where:
 * τ = mean lunar time
 * s = mean longitude of moon
 * h = mean longitude of sun  
 * p = longitude of moon's perigee
 * N' = negative longitude of moon's ascending node
 * ps = longitude of sun's perigee
 */
export interface DoodsonNumber {
  tau: number
  s: number
  h: number
  p: number
  Np: number // N' (negative N)
  ps: number
}

// Tidal constituent definitions (amplitude & phase for Thailand regions)
export interface TidalConstituent {
  name: string
  frequency: number // cycles per hour
  speed: number // degrees per hour
  description: string
  amplitude: number // meters (will be adjusted per location)
  phase: number // degrees
  doodson: DoodsonNumber // Doodson numbers for precise calculation
}

// Thailand-specific tidal constituents
// Gulf of Thailand: Mixed mainly diurnal (K1, O1 dominant)
// Andaman Sea: Mixed mainly semidiurnal (M2, S2 dominant)

export const TIDAL_CONSTITUENTS: Record<string, Omit<TidalConstituent, 'amplitude' | 'phase'>> = {
  // ==================== SEMIDIURNAL CONSTITUENTS ====================
  
  // Principal lunar semidiurnal (Doodson 255.555)
  M2: { 
    name: 'M2', 
    frequency: 2.0, 
    speed: 28.9841042, 
    description: 'Principal lunar semidiurnal',
    doodson: { tau: 2, s: 0, h: 0, p: 0, Np: 0, ps: 0 }
  },
  
  // Principal solar semidiurnal (Doodson 273.555)
  S2: { 
    name: 'S2', 
    frequency: 2.0, 
    speed: 30.0, 
    description: 'Principal solar semidiurnal',
    doodson: { tau: 2, s: 2, h: -2, p: 0, Np: 0, ps: 0 }
  },
  
  // Larger lunar elliptic semidiurnal (Doodson 245.655)
  N2: { 
    name: 'N2', 
    frequency: 2.0, 
    speed: 28.4397295, 
    description: 'Larger lunar elliptic semidiurnal',
    doodson: { tau: 2, s: -1, h: 0, p: 1, Np: 0, ps: 0 }
  },
  
  // Lunisolar semidiurnal (Doodson 275.555)
  K2: { 
    name: 'K2', 
    frequency: 2.0, 
    speed: 30.0821373, 
    description: 'Lunisolar semidiurnal',
    doodson: { tau: 2, s: 2, h: 0, p: 0, Np: 0, ps: 0 }
  },
  
  // Smaller lunar elliptic semidiurnal (Doodson 235.755)
  '2N2': { 
    name: '2N2', 
    frequency: 2.0, 
    speed: 27.8953548, 
    description: 'Lunar elliptic semidiurnal',
    doodson: { tau: 2, s: -2, h: 0, p: 2, Np: 0, ps: 0 }
  },
  
  // Larger lunar evectional (Doodson 247.455)
  'NU2': { 
    name: 'NU2', 
    frequency: 2.0, 
    speed: 28.5125831, 
    description: 'Larger lunar evectional',
    doodson: { tau: 2, s: -1, h: 2, p: -1, Np: 0, ps: 0 }
  },
  
  // Smaller lunar elliptic semidiurnal (Doodson 265.455)
  'L2': { 
    name: 'L2', 
    frequency: 2.0, 
    speed: 29.5284789, 
    description: 'Smaller lunar elliptic semidiurnal',
    doodson: { tau: 2, s: 1, h: 0, p: -1, Np: 0, ps: 0 }
  },
  
  // Larger solar elliptic (Doodson 272.556)
  'T2': { 
    name: 'T2', 
    frequency: 2.0, 
    speed: 29.9589333, 
    description: 'Larger solar elliptic',
    doodson: { tau: 2, s: 2, h: -2, p: 0, Np: 1, ps: 0 }
  },
  
  // Smaller lunar elliptic semidiurnal (Doodson 263.655)
  'LAMBDA2': {
    name: 'LAMBDA2',
    frequency: 2.0,
    speed: 29.4556253,
    description: 'Smaller lunar elliptic',
    doodson: { tau: 2, s: 1, h: -2, p: 1, Np: 0, ps: 0 }
  },
  
  // Lunar elliptical semidiurnal second-order (Doodson 257.555)
  'MU2': {
    name: 'MU2',
    frequency: 2.0,
    speed: 27.9682084,
    description: 'Variational',
    doodson: { tau: 2, s: 0, h: 2, p: 0, Np: 0, ps: 0 }
  },
  
  // Lunar elliptical minor (Doodson 253.755)
  'EPS2': {
    name: 'EPS2',
    frequency: 2.0,
    speed: 28.3230090,
    description: 'Lunar elliptical minor',
    doodson: { tau: 2, s: -1, h: 2, p: 1, Np: 0, ps: 0 }
  },
  
  // ==================== DIURNAL CONSTITUENTS ====================
  
  // Lunisolar diurnal (Doodson 165.555)
  K1: { 
    name: 'K1', 
    frequency: 1.0, 
    speed: 15.0410686, 
    description: 'Lunisolar diurnal',
    doodson: { tau: 1, s: 1, h: 0, p: 0, Np: 0, ps: 0 }
  },
  
  // Principal lunar diurnal (Doodson 145.555)
  O1: { 
    name: 'O1', 
    frequency: 1.0, 
    speed: 13.9430356, 
    description: 'Principal lunar diurnal',
    doodson: { tau: 1, s: -1, h: 0, p: 0, Np: 0, ps: 0 }
  },
  
  // Principal solar diurnal (Doodson 163.555)
  P1: { 
    name: 'P1', 
    frequency: 1.0, 
    speed: 14.9589314, 
    description: 'Principal solar diurnal',
    doodson: { tau: 1, s: 1, h: -2, p: 0, Np: 0, ps: 0 }
  },
  
  // Larger lunar elliptic diurnal (Doodson 135.655)
  Q1: { 
    name: 'Q1', 
    frequency: 1.0, 
    speed: 13.3986609, 
    description: 'Larger lunar elliptic diurnal',
    doodson: { tau: 1, s: -2, h: 0, p: 1, Np: 0, ps: 0 }
  },
  
  // Smaller lunar elliptic diurnal (Doodson 137.455)
  '2Q1': {
    name: '2Q1',
    frequency: 1.0,
    speed: 12.8542862,
    description: 'Larger lunar elliptic diurnal',
    doodson: { tau: 1, s: -3, h: 0, p: 2, Np: 0, ps: 0 }
  },
  
  // Smaller lunar elliptic diurnal (Doodson 155.455)
  'RHO1': {
    name: 'RHO1',
    frequency: 1.0,
    speed: 13.4715145,
    description: 'Larger lunar evectional diurnal',
    doodson: { tau: 1, s: -2, h: 2, p: -1, Np: 0, ps: 0 }
  },
  
  // Smaller lunar elliptic diurnal (Doodson 175.455)
  'J1': { 
    name: 'J1', 
    frequency: 1.0, 
    speed: 15.5854433, 
    description: 'Smaller lunar elliptic diurnal',
    doodson: { tau: 1, s: 2, h: 0, p: -1, Np: 0, ps: 0 }
  },
  
  // Lunar diurnal (Doodson 185.555)
  'OO1': { 
    name: 'OO1', 
    frequency: 1.0, 
    speed: 16.1391017, 
    description: 'Lunar diurnal',
    doodson: { tau: 1, s: 3, h: 0, p: 0, Np: 0, ps: 0 }
  },
  
  // Solar diurnal (Doodson 164.556)
  'S1': {
    name: 'S1',
    frequency: 1.0,
    speed: 15.0,
    description: 'Solar diurnal',
    doodson: { tau: 1, s: 1, h: 0, p: 0, Np: 0, ps: 1 }
  },
  
  // ==================== LONG PERIOD CONSTITUENTS ====================
  
  // Lunar fortnightly (Doodson 075.555)
  Mf: { 
    name: 'Mf', 
    frequency: 0.0, 
    speed: 1.0980331, 
    description: 'Lunar fortnightly',
    doodson: { tau: 0, s: 2, h: 0, p: 0, Np: 0, ps: 0 }
  },
  
  // Lunar monthly (Doodson 065.455)
  Mm: { 
    name: 'Mm', 
    frequency: 0.0, 
    speed: 0.5443747, 
    description: 'Lunar monthly',
    doodson: { tau: 0, s: 1, h: 0, p: -1, Np: 0, ps: 0 }
  },
  
  // Solar annual (Doodson 056.554)
  Sa: { 
    name: 'Sa', 
    frequency: 0.0, 
    speed: 0.0410686, 
    description: 'Solar annual',
    doodson: { tau: 0, s: 0, h: 1, p: 0, Np: 0, ps: 0 }
  },
  
  // Solar semiannual (Doodson 057.555)
  Ssa: { 
    name: 'Ssa', 
    frequency: 0.0, 
    speed: 0.0821373, 
    description: 'Solar semiannual',
    doodson: { tau: 0, s: 0, h: 2, p: 0, Np: 0, ps: 0 }
  },
  
  // Lunisolar synodic fortnightly (Doodson 073.555)
  'MSf': {
    name: 'MSf',
    frequency: 0.0,
    speed: 1.0158958,
    description: 'Lunisolar synodic fortnightly',
    doodson: { tau: 0, s: 2, h: -2, p: 0, Np: 0, ps: 0 }
  },
  
  // Lunisolar fortnightly (Doodson 085.455)
  'MFM': {
    name: 'MFM',
    frequency: 0.0,
    speed: 1.0980331,
    description: 'Lunisolar fortnightly',
    doodson: { tau: 0, s: 2, h: 0, p: 0, Np: 0, ps: 0 }
  },
  
  // ==================== SHALLOW WATER CONSTITUENTS ====================
  
  // Shallow water overtide of M2 (Quarter-diurnal)
  M4: { 
    name: 'M4', 
    frequency: 4.0, 
    speed: 57.9682084, 
    description: 'Shallow water overtide of M2',
    doodson: { tau: 4, s: 0, h: 0, p: 0, Np: 0, ps: 0 }
  },
  
  // Shallow water compound (M2+S2)
  MS4: { 
    name: 'MS4', 
    frequency: 4.0, 
    speed: 58.9841042, 
    description: 'Shallow water compound',
    doodson: { tau: 4, s: 2, h: -2, p: 0, Np: 0, ps: 0 }
  },
  
  // Shallow water compound (M2+N2)
  MN4: { 
    name: 'MN4', 
    frequency: 4.0, 
    speed: 57.4238337, 
    description: 'Shallow water compound',
    doodson: { tau: 4, s: -1, h: 0, p: 1, Np: 0, ps: 0 }
  },
  
  // Shallow water overtide (Sixth-diurnal)
  M6: { 
    name: 'M6', 
    frequency: 6.0, 
    speed: 86.9523127, 
    description: 'Shallow water overtide',
    doodson: { tau: 6, s: 0, h: 0, p: 0, Np: 0, ps: 0 }
  },
  
  // Shallow water overtide (Eighth-diurnal)
  M8: { 
    name: 'M8', 
    frequency: 8.0, 
    speed: 115.9364169, 
    description: 'Shallow water overtide',
    doodson: { tau: 8, s: 0, h: 0, p: 0, Np: 0, ps: 0 }
  },
  
  // Shallow water compound (2M2+S2)
  '2MS6': { 
    name: '2MS6', 
    frequency: 6.0, 
    speed: 87.9682084, 
    description: 'Shallow water compound',
    doodson: { tau: 6, s: 2, h: -2, p: 0, Np: 0, ps: 0 }
  },
  
  // Shallow water compound (3M2+S2)
  '2(MS)8': { 
    name: '2(MS)8', 
    frequency: 8.0, 
    speed: 116.9523127, 
    description: 'Shallow water compound',
    doodson: { tau: 8, s: 2, h: -2, p: 0, Np: 0, ps: 0 }
  },
  
  // Shallow water terdiurnal
  MK3: {
    name: 'MK3',
    frequency: 3.0,
    speed: 44.0251729,
    description: 'Shallow water terdiurnal',
    doodson: { tau: 3, s: 1, h: 0, p: 0, Np: 0, ps: 0 }
  },
  
  // Shallow water quarter diurnal overtide of S2
  'S4': {
    name: 'S4',
    frequency: 4.0,
    speed: 60.0,
    description: 'Shallow water overtide of S2',
    doodson: { tau: 4, s: 4, h: -4, p: 0, Np: 0, ps: 0 }
  },
  
  // Shallow water sixth diurnal
  '2MN6': {
    name: '2MN6',
    frequency: 6.0,
    speed: 86.4079380,
    description: 'Shallow water sixth diurnal',
    doodson: { tau: 6, s: -1, h: 0, p: 1, Np: 0, ps: 0 }
  },
  
  // Shallow water sixth diurnal  
  'MSN6': {
    name: 'MSN6',
    frequency: 6.0,
    speed: 87.4238337,
    description: 'Shallow water sixth diurnal',
    doodson: { tau: 6, s: 1, h: -2, p: 1, Np: 0, ps: 0 }
  }
}

/**
 * Get location-specific constituent amplitudes and phases
 */
export function getLocationConstituents(location: LocationData): TidalConstituent[] {
  const isGulfOfThailand = location.lon > 99 && location.lat < 15 && location.lat > 5
  const isAndamanSea = location.lon < 99 && location.lat < 15 && location.lat > 5
  const isUpperGulf = isGulfOfThailand && location.lat > 12 // Bangkok area
  const isLowerGulf = isGulfOfThailand && location.lat <= 12 // Gulf islands
  
  const constituents: TidalConstituent[] = []
  
  if (isUpperGulf) {
    // Bangkok/Chao Phraya - Mixed mainly diurnal, shallow water effects
    constituents.push(
      { ...TIDAL_CONSTITUENTS.K1, amplitude: 0.45, phase: 120 },
      { ...TIDAL_CONSTITUENTS.O1, amplitude: 0.38, phase: 110 },
      { ...TIDAL_CONSTITUENTS.P1, amplitude: 0.15, phase: 115 },
      { ...TIDAL_CONSTITUENTS.Q1, amplitude: 0.08, phase: 105 },
      { ...TIDAL_CONSTITUENTS.M2, amplitude: 0.25, phase: 180 },
      { ...TIDAL_CONSTITUENTS.S2, amplitude: 0.12, phase: 175 },
      { ...TIDAL_CONSTITUENTS.N2, amplitude: 0.06, phase: 170 },
      { ...TIDAL_CONSTITUENTS.K2, amplitude: 0.04, phase: 178 },
      { ...TIDAL_CONSTITUENTS.Mf, amplitude: 0.08, phase: 0 },
      { ...TIDAL_CONSTITUENTS.Mm, amplitude: 0.05, phase: 0 },
      { ...TIDAL_CONSTITUENTS.M4, amplitude: 0.12, phase: 90 },
      { ...TIDAL_CONSTITUENTS.MS4, amplitude: 0.06, phase: 95 },
      { ...TIDAL_CONSTITUENTS.MN4, amplitude: 0.03, phase: 85 }
    )
  } else if (isLowerGulf) {
    // Ko Samui, Pattaya - Mixed diurnal
    constituents.push(
      { ...TIDAL_CONSTITUENTS.K1, amplitude: 0.55, phase: 115 },
      { ...TIDAL_CONSTITUENTS.O1, amplitude: 0.42, phase: 105 },
      { ...TIDAL_CONSTITUENTS.P1, amplitude: 0.18, phase: 110 },
      { ...TIDAL_CONSTITUENTS.Q1, amplitude: 0.09, phase: 100 },
      { ...TIDAL_CONSTITUENTS.M2, amplitude: 0.35, phase: 185 },
      { ...TIDAL_CONSTITUENTS.S2, amplitude: 0.16, phase: 180 },
      { ...TIDAL_CONSTITUENTS.N2, amplitude: 0.08, phase: 175 },
      { ...TIDAL_CONSTITUENTS.K2, amplitude: 0.05, phase: 183 },
      { ...TIDAL_CONSTITUENTS.Mf, amplitude: 0.06, phase: 0 },
      { ...TIDAL_CONSTITUENTS.Mm, amplitude: 0.04, phase: 0 },
      { ...TIDAL_CONSTITUENTS.M4, amplitude: 0.08, phase: 92 },
      { ...TIDAL_CONSTITUENTS.MS4, amplitude: 0.04, phase: 97 }
    )
  } else if (isAndamanSea) {
    // Phuket, Krabi - Mixed mainly semidiurnal
    constituents.push(
      { ...TIDAL_CONSTITUENTS.M2, amplitude: 0.85, phase: 200 },
      { ...TIDAL_CONSTITUENTS.S2, amplitude: 0.42, phase: 195 },
      { ...TIDAL_CONSTITUENTS.N2, amplitude: 0.18, phase: 190 },
      { ...TIDAL_CONSTITUENTS.K2, amplitude: 0.12, phase: 198 },
      { ...TIDAL_CONSTITUENTS.K1, amplitude: 0.45, phase: 125 },
      { ...TIDAL_CONSTITUENTS.O1, amplitude: 0.32, phase: 115 },
      { ...TIDAL_CONSTITUENTS.P1, amplitude: 0.15, phase: 120 },
      { ...TIDAL_CONSTITUENTS.Q1, amplitude: 0.07, phase: 110 },
      { ...TIDAL_CONSTITUENTS.Mf, amplitude: 0.05, phase: 0 },
      { ...TIDAL_CONSTITUENTS.Mm, amplitude: 0.03, phase: 0 },
      { ...TIDAL_CONSTITUENTS.M4, amplitude: 0.06, phase: 100 },
      { ...TIDAL_CONSTITUENTS.MS4, amplitude: 0.03, phase: 105 }
    )
  } else {
    // Default for other locations
    constituents.push(
      { ...TIDAL_CONSTITUENTS.M2, amplitude: 0.50, phase: 190 },
      { ...TIDAL_CONSTITUENTS.S2, amplitude: 0.25, phase: 185 },
      { ...TIDAL_CONSTITUENTS.K1, amplitude: 0.40, phase: 120 },
      { ...TIDAL_CONSTITUENTS.O1, amplitude: 0.30, phase: 110 },
      { ...TIDAL_CONSTITUENTS.N2, amplitude: 0.10, phase: 180 },
      { ...TIDAL_CONSTITUENTS.K2, amplitude: 0.07, phase: 188 },
      { ...TIDAL_CONSTITUENTS.P1, amplitude: 0.13, phase: 115 },
      { ...TIDAL_CONSTITUENTS.Q1, amplitude: 0.06, phase: 105 }
    )
  }
  
  return constituents
}

/**
 * Calculate nodal corrections (f and u)
 */
export interface NodalCorrection {
  f: number // Amplitude correction factor
  u: number // Phase correction (degrees)
}

export function calculateNodalCorrection(
  constituent: TidalConstituent,
  args: AstronomicalArguments
): NodalCorrection {
  const { N, p } = args
  const name = constituent.name
  
  // Convert to radians
  const N_rad = (N * Math.PI) / 180
  const p_rad = (p * Math.PI) / 180
  
  // Nodal corrections based on IHO standards
  let f = 1.0
  let u = 0.0
  
  switch (name) {
    // ==================== SEMIDIURNAL ====================
    case 'M2':
      f = 1.0 - 0.03731 * Math.cos(N_rad) + 0.00052 * Math.cos(2 * N_rad)
      u = -2.1408 * Math.sin(N_rad) + 0.0138 * Math.sin(2 * N_rad)
      break
    case 'S2':
      f = 1.0 // No nodal correction (solar)
      u = 0.0
      break
    case 'N2':
      f = 1.0 - 0.03731 * Math.cos(N_rad) + 0.00052 * Math.cos(2 * N_rad)
      u = -2.1408 * Math.sin(N_rad) + 0.0138 * Math.sin(2 * N_rad)
      break
    case 'K2':
      f = 1.024 + 0.2852 * Math.cos(N_rad) + 0.0073 * Math.cos(2 * N_rad)
      u = -17.74 * Math.sin(N_rad) + 0.68 * Math.sin(2 * N_rad)
      break
    case '2N2':
      f = 1.0 - 0.03731 * Math.cos(N_rad) + 0.00052 * Math.cos(2 * N_rad)
      u = -2.1408 * Math.sin(N_rad) + 0.0138 * Math.sin(2 * N_rad)
      break
    case 'NU2':
      f = 1.0 - 0.03731 * Math.cos(N_rad) + 0.00052 * Math.cos(2 * N_rad)
      u = -2.1408 * Math.sin(N_rad) + 0.0138 * Math.sin(2 * N_rad)
      break
    case 'L2':
      f = 1.0 - 0.03731 * Math.cos(N_rad) + 0.00052 * Math.cos(2 * N_rad)
      u = -2.1408 * Math.sin(N_rad) + 0.0138 * Math.sin(2 * N_rad) + 0.1643 * Math.sin(p_rad)
      break
    case 'T2':
      f = 1.0
      u = 0.0
      break
    case 'LAMBDA2':
      f = 1.0 - 0.03731 * Math.cos(N_rad) + 0.00052 * Math.cos(2 * N_rad)
      u = -2.1408 * Math.sin(N_rad) + 0.0138 * Math.sin(2 * N_rad) - 0.3285 * Math.sin(p_rad)
      break
    case 'MU2':
      f = 1.0 - 0.03731 * Math.cos(N_rad) + 0.00052 * Math.cos(2 * N_rad)
      u = -2.1408 * Math.sin(N_rad) + 0.0138 * Math.sin(2 * N_rad)
      break
    case 'EPS2':
      f = 1.0 - 0.03731 * Math.cos(N_rad)
      u = -2.1408 * Math.sin(N_rad)
      break
    
    // ==================== DIURNAL ====================
    case 'K1':
      f = 1.006 + 0.1150 * Math.cos(N_rad) - 0.0088 * Math.cos(2 * N_rad)
      u = -8.86 * Math.sin(N_rad) + 0.68 * Math.sin(2 * N_rad) - 0.07 * Math.sin(3 * N_rad)
      break
    case 'O1':
      f = 1.009 + 0.1870 * Math.cos(N_rad) - 0.0147 * Math.cos(2 * N_rad)
      u = 10.8 * Math.sin(N_rad) - 1.34 * Math.sin(2 * N_rad) + 0.19 * Math.sin(3 * N_rad)
      break
    case 'P1':
      f = 1.0
      u = 0.0
      break
    case 'Q1':
      f = 1.009 + 0.1870 * Math.cos(N_rad) - 0.0147 * Math.cos(2 * N_rad)
      u = 10.8 * Math.sin(N_rad) - 1.34 * Math.sin(2 * N_rad) + 0.19 * Math.sin(3 * N_rad)
      break
    case '2Q1':
      f = 1.009 + 0.1870 * Math.cos(N_rad) - 0.0147 * Math.cos(2 * N_rad)
      u = 10.8 * Math.sin(N_rad) - 1.34 * Math.sin(2 * N_rad) + 0.19 * Math.sin(3 * N_rad)
      break
    case 'RHO1':
      f = 1.009 + 0.1870 * Math.cos(N_rad) - 0.0147 * Math.cos(2 * N_rad)
      u = 10.8 * Math.sin(N_rad) - 1.34 * Math.sin(2 * N_rad) + 0.19 * Math.sin(3 * N_rad)
      break
    case 'J1':
      f = 1.006 + 0.1150 * Math.cos(N_rad) - 0.0088 * Math.cos(2 * N_rad)
      u = -8.86 * Math.sin(N_rad) + 0.68 * Math.sin(2 * N_rad) - 0.07 * Math.sin(3 * N_rad)
      break
    case 'OO1':
      f = 1.009 + 0.1870 * Math.cos(N_rad) - 0.0147 * Math.cos(2 * N_rad)
      u = 10.8 * Math.sin(N_rad) - 1.34 * Math.sin(2 * N_rad) + 0.19 * Math.sin(3 * N_rad)
      break
    case 'S1':
      f = 1.0
      u = 0.0
      break
    
    // ==================== LONG PERIOD ====================
    case 'Mf':
      f = 1.043 + 0.414 * Math.cos(N_rad)
      u = -23.7 * Math.sin(N_rad) + 2.7 * Math.sin(2 * N_rad)
      break
    case 'Mm':
      f = 1.0 - 0.130 * Math.cos(N_rad)
      u = 0.0
      break
    case 'Sa':
      f = 1.0
      u = 0.0
      break
    case 'Ssa':
      f = 1.0
      u = 0.0
      break
    case 'MSf':
      f = 1.043 + 0.414 * Math.cos(N_rad)
      u = -23.7 * Math.sin(N_rad)
      break
    case 'MFM':
      f = 1.043 + 0.414 * Math.cos(N_rad)
      u = -23.7 * Math.sin(N_rad)
      break
    
    // ==================== SHALLOW WATER ====================
    case 'M4':
      // M4 = 2 × M2
      const f_M2 = 1.0 - 0.03731 * Math.cos(N_rad) + 0.00052 * Math.cos(2 * N_rad)
      f = f_M2 * f_M2
      const u_M2 = -2.1408 * Math.sin(N_rad) + 0.0138 * Math.sin(2 * N_rad)
      u = 2 * u_M2
      break
    case 'MS4':
      // MS4 = M2 + S2
      const f_M2_ms = 1.0 - 0.03731 * Math.cos(N_rad) + 0.00052 * Math.cos(2 * N_rad)
      f = f_M2_ms
      const u_M2_ms = -2.1408 * Math.sin(N_rad) + 0.0138 * Math.sin(2 * N_rad)
      u = u_M2_ms
      break
    case 'MN4':
      // MN4 = M2 + N2
      const f_M2_mn = 1.0 - 0.03731 * Math.cos(N_rad) + 0.00052 * Math.cos(2 * N_rad)
      f = f_M2_mn * f_M2_mn
      const u_M2_mn = -2.1408 * Math.sin(N_rad) + 0.0138 * Math.sin(2 * N_rad)
      u = 2 * u_M2_mn
      break
    case 'M6':
      // M6 = 3 × M2
      const f_M2_m6 = 1.0 - 0.03731 * Math.cos(N_rad) + 0.00052 * Math.cos(2 * N_rad)
      f = f_M2_m6 * f_M2_m6 * f_M2_m6
      const u_M2_m6 = -2.1408 * Math.sin(N_rad) + 0.0138 * Math.sin(2 * N_rad)
      u = 3 * u_M2_m6
      break
    case 'M8':
      // M8 = 4 × M2
      const f_M2_m8 = 1.0 - 0.03731 * Math.cos(N_rad) + 0.00052 * Math.cos(2 * N_rad)
      f = f_M2_m8 * f_M2_m8 * f_M2_m8 * f_M2_m8
      const u_M2_m8 = -2.1408 * Math.sin(N_rad) + 0.0138 * Math.sin(2 * N_rad)
      u = 4 * u_M2_m8
      break
    case '2MS6':
      // 2MS6 = 2M2 + S2
      const f_M2_2ms = 1.0 - 0.03731 * Math.cos(N_rad) + 0.00052 * Math.cos(2 * N_rad)
      f = f_M2_2ms * f_M2_2ms
      const u_M2_2ms = -2.1408 * Math.sin(N_rad) + 0.0138 * Math.sin(2 * N_rad)
      u = 2 * u_M2_2ms
      break
    case '2(MS)8':
      // Compound shallow water
      const f_M2_2ms8 = 1.0 - 0.03731 * Math.cos(N_rad)
      f = f_M2_2ms8 * f_M2_2ms8
      const u_M2_2ms8 = -2.1408 * Math.sin(N_rad)
      u = 2 * u_M2_2ms8
      break
    case 'MK3':
      // MK3 = M2 + K1
      const f_M2_mk = 1.0 - 0.03731 * Math.cos(N_rad)
      const f_K1_mk = 1.006 + 0.1150 * Math.cos(N_rad)
      f = f_M2_mk * f_K1_mk
      const u_M2_mk = -2.1408 * Math.sin(N_rad)
      const u_K1_mk = -8.86 * Math.sin(N_rad)
      u = u_M2_mk + u_K1_mk
      break
    case 'S4':
      f = 1.0
      u = 0.0
      break
    case '2MN6':
      // 2MN6 = 2M2 + N2
      const f_M2_2mn = 1.0 - 0.03731 * Math.cos(N_rad)
      f = f_M2_2mn * f_M2_2mn * f_M2_2mn
      const u_M2_2mn = -2.1408 * Math.sin(N_rad)
      u = 3 * u_M2_2mn
      break
    case 'MSN6':
      // MSN6 = M2 + S2 + N2
      const f_M2_msn = 1.0 - 0.03731 * Math.cos(N_rad)
      f = f_M2_msn * f_M2_msn
      const u_M2_msn = -2.1408 * Math.sin(N_rad)
      u = 2 * u_M2_msn
      break
    
    default:
      // Default no correction
      f = 1.0
      u = 0.0
  }
  
  return { f, u }
}
