/**
 * Harmonic Tide Computation Core
 * Based on harmonic constituents + astronomical arguments + nodal corrections
 * 
 * References:
 * - Schureman, P. (1958). Manual of Harmonic Analysis and Prediction of Tides.
 * - Foreman, M. G. G. (1977). Manual for Tidal Heights Analysis and Prediction.
 */

import { calculateAstronomicalArguments, type AstronomicalArguments } from './ephemerides'
export { calculateAstronomicalArguments } from './ephemerides'

const DEFAULT_HARMONIC_EPOCH = new Date('2000-01-01T00:00:00Z')

// Constituent definitions (37+ major constituents)
export interface TideConstituent {
  name: string
  speed: number // degrees per hour
  amplitude: number // meters
  phase: number // degrees (phase lag)
  description: string
}

// Nodal corrections
interface NodalCorrection {
  f: number // nodal factor (amplitude correction)
  u: number // nodal angle (phase correction) in degrees
}

/**
 * Major tide constituents with their speeds (degrees/hour)
 * Sorted by importance and grouped by type
 */
export const CONSTITUENTS_DATABASE: Record<string, { speed: number; doodson: number[]; description: string }> = {
  // Semi-diurnal (Principal lunar)
  M2: { speed: 28.9841042, doodson: [2, 0, 0, 0, 0, 0], description: 'Principal lunar semidiurnal' },
  S2: { speed: 30.0000000, doodson: [2, 2, -2, 0, 0, 0], description: 'Principal solar semidiurnal' },
  N2: { speed: 28.4397295, doodson: [2, -1, 0, 1, 0, 0], description: 'Larger lunar elliptic semidiurnal' },
  K2: { speed: 30.0821373, doodson: [2, 2, 0, 0, 0, 0], description: 'Lunisolar semidiurnal' },
  
  // Diurnal (Principal)
  K1: { speed: 15.0410686, doodson: [1, 1, 0, 0, 0, 0], description: 'Lunisolar diurnal' },
  O1: { speed: 13.9430356, doodson: [1, -1, 0, 0, 0, 0], description: 'Principal lunar diurnal' },
  P1: { speed: 14.9589314, doodson: [1, 1, -2, 0, 0, 0], description: 'Principal solar diurnal' },
  Q1: { speed: 13.3986609, doodson: [1, -2, 0, 1, 0, 0], description: 'Larger lunar elliptic diurnal' },
  
  // Semi-diurnal (Minor)
  NU2: { speed: 28.5125831, doodson: [2, -1, 2, -1, 0, 0], description: 'Larger lunar evectional' },
  MU2: { speed: 27.9682084, doodson: [2, -2, 2, 0, 0, 0], description: 'Variational' },
  '2N2': { speed: 27.8953548, doodson: [2, -2, 0, 2, 0, 0], description: 'Lunar elliptical semidiurnal second-order' },
  LAMBDA2: { speed: 29.4556253, doodson: [2, 1, -2, 1, 0, 0], description: 'Smaller lunar evectional' },
  L2: { speed: 29.5284789, doodson: [2, 1, 0, -1, 0, 0], description: 'Smaller lunar elliptic' },
  T2: { speed: 29.9589333, doodson: [2, 2, -3, 0, 0, 1], description: 'Larger solar elliptic' },
  
  // Diurnal (Minor)
  J1: { speed: 15.5854433, doodson: [1, 2, 0, -1, 0, 0], description: 'Smaller lunar elliptic diurnal' },
  M1: { speed: 14.4966939, doodson: [1, 0, 0, 1, 0, 0], description: 'Smaller lunar elliptic diurnal' },
  OO1: { speed: 16.1391017, doodson: [1, 3, 0, 0, 0, 0], description: 'Lunar diurnal' },
  
  // Long period
  MM: { speed: 0.5443747, doodson: [0, 1, 0, -1, 0, 0], description: 'Lunar monthly' },
  MF: { speed: 1.0980331, doodson: [0, 2, 0, 0, 0, 0], description: 'Lunisolar fortnightly' },
  SSA: { speed: 0.0821373, doodson: [0, 0, 2, 0, 0, 0], description: 'Solar semiannual' },
  SA: { speed: 0.0410686, doodson: [0, 0, 1, 0, 0, -1], description: 'Solar annual' },
  
  // Shallow water constituents (non-linear)
  M4: { speed: 57.9682084, doodson: [4, 0, 0, 0, 0, 0], description: 'Shallow water overtide of M2' },
  MS4: { speed: 58.9841042, doodson: [4, 2, -2, 0, 0, 0], description: 'Shallow water quarter diurnal' },
  MN4: { speed: 57.4238337, doodson: [4, -1, 0, 1, 0, 0], description: 'Shallow water quarter diurnal' },
  M6: { speed: 86.9523127, doodson: [6, 0, 0, 0, 0, 0], description: 'Shallow water overtide of M2' },
  '2MS6': { speed: 87.9682084, doodson: [6, 2, -2, 0, 0, 0], description: 'Shallow water overtide' },
  '2MK6': { speed: 88.0503457, doodson: [6, 2, 0, 0, 0, 0], description: 'Shallow water overtide' },
  
  // Additional constituents
  MSF: { speed: 1.0158958, doodson: [0, 2, -2, 0, 0, 0], description: 'Lunisolar synodic fortnightly' },
  '2Q1': { speed: 12.8542862, doodson: [1, -3, 0, 2, 0, 0], description: 'Larger elliptic diurnal' },
  SIGMA1: { speed: 12.9271398, doodson: [1, -3, 2, 0, 0, 0], description: 'Lunar diurnal' },
  RHO1: { speed: 13.4715145, doodson: [1, -2, 2, -1, 0, 0], description: 'Larger lunar evectional diurnal' },
  
  // Third-order constituents
  M8: { speed: 115.9364169, doodson: [8, 0, 0, 0, 0, 0], description: 'Shallow water eighth diurnal' },
  M3: { speed: 43.4761563, doodson: [3, 0, 0, 0, 0, 0], description: 'Lunar terdiurnal' },
}

/**
 * Calculate nodal corrections for a constituent
 */
function nodalCorrectionsFromArguments(
  constituentName: string,
  args: AstronomicalArguments
): NodalCorrection {
  const N = args.N * Math.PI / 180 // Convert to radians

  // Full multi-term nodal corrections (f and u) per Schureman (1958),
  // matching the formulas in lib/harmonic-engine.ts. Base species are
  // computed once and shared by every constituent in that species group so
  // satellites (2N2/nu2/mu2, L2/lambda2, J1/rho1/M1, ...) and shallow-water
  // compounds (M4/M6/MS4/MN4/...) stay derived from the same nodal argument
  // rather than duplicating truncated first-order approximations.
  const fM2 = 1.0 - 0.03731 * Math.cos(N) + 0.00052 * Math.cos(2 * N)
  const uM2 = -2.1408 * Math.sin(N) + 0.0138 * Math.sin(2 * N)

  const fK2 = 1.0 + 0.2863 * Math.cos(N) - 0.0088 * Math.cos(2 * N)
  const uK2 = -17.7 * Math.sin(N) + 0.68 * Math.sin(2 * N) - 0.07 * Math.sin(3 * N)

  const fK1 = 1.006 + 0.115 * Math.cos(N) - 0.0088 * Math.cos(2 * N)
  const uK1 = -8.86 * Math.sin(N) + 0.68 * Math.sin(2 * N) - 0.07 * Math.sin(3 * N)

  const fO1 = 1.009 + 0.187 * Math.cos(N) - 0.0147 * Math.cos(2 * N)
  const uO1 = 10.8 * Math.sin(N) - 1.34 * Math.sin(2 * N) + 0.19 * Math.sin(3 * N)

  switch (constituentName) {
    // Principal lunar semidiurnal species (M2) and its satellites, which
    // Schureman groups under the same nodal formula as M2.
    case 'M2':
    case 'N2':
    case '2N2':
    case 'NU2':
    case 'MU2':
    case 'LAMBDA2':
    case 'L2':
      return { f: fM2, u: uM2 }

    // Solar semidiurnal species: no lunar nodal dependence.
    case 'S2':
    case 'T2':
      return { f: 1.0, u: 0.0 }

    case 'K2':
      return { f: fK2, u: uK2 }

    case 'K1':
      return { f: fK1, u: uK1 }

    // Principal lunar diurnal species (O1) and its satellites.
    case 'O1':
    case 'Q1':
    case 'J1':
    case 'RHO1':
    case 'M1':
    case '2Q1':
    case 'SIGMA1':
      return { f: fO1, u: uO1 }

    case 'OO1':
      // OO1 shares O1's magnitude but its nodal angle runs the opposite sign.
      return { f: fO1, u: -uO1 }

    case 'P1':
      return { f: 1.0, u: 0.0 }

    // Long period constituents (formulas per Schureman 1958, reused from the
    // same derivation as lib/harmonic-prediction.ts).
    case 'MF':
      return { f: 1.043 + 0.414 * Math.cos(N), u: -23.7 * Math.sin(N) }
    case 'MM':
      return { f: 1.0 - 0.130 * Math.cos(N), u: 0.0 }
    case 'MSF':
      // MSf behaves like Mf (Schureman 1958 Table 2).
      return { f: 1.0 + 0.041 * Math.cos(N), u: 0.0 }
    case 'SSA':
    case 'SA':
      // Solar long-period constituents: no lunar nodal dependence.
      return { f: 1.0, u: 0.0 }

    // Shallow-water compounds: for n x M2 the nodal factor is f_M2^n and the
    // nodal angle is n x u_M2; S2/K2 contribute their own f/u when present.
    case 'M4':
    case 'MN4': // M2 + N2, and N2 shares M2's nodal formula above
      return { f: fM2 * fM2, u: 2 * uM2 }
    case 'MS4': // M2 + S2, S2 contributes no correction
      return { f: fM2, u: uM2 }
    case 'M6':
      return { f: fM2 * fM2 * fM2, u: 3 * uM2 }
    case '2MS6': // 2 x M2 + S2
      return { f: fM2 * fM2, u: 2 * uM2 }
    case '2MK6': // 2 x M2 + K2
      return { f: fM2 * fM2 * fK2, u: 2 * uM2 + uK2 }
    case 'M8':
      return { f: fM2 * fM2 * fM2 * fM2, u: 4 * uM2 }
    case 'M3':
      // Terdiurnal overtide: 3/2 x M2 species.
      return { f: Math.pow(fM2, 1.5), u: 1.5 * uM2 }

    default:
      // Every constituent in CONSTITUENTS_DATABASE is listed above; this
      // fallback only guards against names outside that set.
      return { f: 1.0, u: 0.0 }
  }
}

/**
 * Calculate nodal corrections for a constituent at a date.
 *
 * Thin wrapper over `nodalCorrectionsFromArguments`. Callers that already hold
 * the astronomical arguments for an instant should use that helper directly so
 * the ephemeris is not recomputed once per constituent.
 */
export function calculateNodalCorrections(
  constituentName: string,
  date: Date
): NodalCorrection {
  return nodalCorrectionsFromArguments(constituentName, calculateAstronomicalArguments(date))
}

/**
 * Compute a constituent's nodal-corrected basis at one instant: the nodal
 * factor `f` and the combined angle `V + u` (equilibrium argument plus nodal
 * angle), in degrees. `predictTideLevel` and `lib/harmonic-fit.ts` both call
 * this so the least-squares fit basis is guaranteed to match the predictor
 * exactly — duplicating this formula anywhere else would let the two drift
 * apart silently.
 */
export function computeConstituentBasis(
  name: string,
  date: Date,
  longitude: number = 0,
): { f: number; angle: number } {
  const args = calculateAstronomicalArguments(date, longitude)
  const nodal = nodalCorrectionsFromArguments(name, args)
  const V = calculateEquilibriumArgument(name, args)
  return { f: nodal.f, angle: V + nodal.u }
}

/**
 * Predict tide level at a specific time using harmonic constituents
 */
export function predictTideLevel(
  date: Date,
  constituents: TideConstituent[],
  longitude: number = 0, // in degrees
  // `epoch` is accepted for API compatibility with existing callers (station
  // configs carry an `epoch` field) but is otherwise unused: the equilibrium
  // argument below is computed from full DE430 astronomical arguments at
  // `date` itself, so it needs no separate reference epoch to anchor phase.
  _epoch: Date = DEFAULT_HARMONIC_EPOCH,
): number {
  // One ephemeris evaluation per instant, reused by every constituent. s/h/p/N/pp
  // depend only on the timestamp (and tau on longitude), so evaluating them once
  // outside the loop replaces a per-constituent recomputation.
  const args = calculateAstronomicalArguments(date, longitude)

  let level = 0.0

  for (const constituent of constituents) {
    const { f, u } = nodalCorrectionsFromArguments(constituent.name, args)
    const angle = calculateEquilibriumArgument(constituent.name, args) + u

    // Harmonic formula: H * f * cos(V + u - phase)
    const rad = (angle - constituent.phase) * Math.PI / 180
    level += constituent.amplitude * f * Math.cos(rad)
  }

  return level
}

/**
 * Calculate equilibrium argument (V) for a constituent
 */
function calculateEquilibriumArgument(
  constituentName: string,
  args: AstronomicalArguments,
): number {
  const constituent = CONSTITUENTS_DATABASE[constituentName]
  if (!constituent) return 0

  const doodson = constituent.doodson

  // V = d0*tau + d1*s + d2*h + d3*p - d4*N + d5*pp  (Doodson/Schureman convention).
  // args.s/h/p/N/pp are already cumulative angles at the target date (they carry
  // the full time dependence via their T-polynomials in ephemerides.ts), and
  // args.tau is local mean lunar time in hours, so it's converted to degrees
  // (15 deg/hour) before use. There is no separate "speed * hoursFromEpoch"
  // term: that would double-count the same time dependence already baked into
  // tau/s/h/p/N/pp.
  const tauDeg = args.tau * 15

  let V = 0
  V += doodson[0] * tauDeg
  V += doodson[1] * args.s
  V += doodson[2] * args.h
  V += doodson[3] * args.p
  V -= doodson[4] * args.N
  V += doodson[5] * args.pp

  return normalizeAngle(V)
}

/**
 * Find high and low tides in a time series
 */
export interface TideExtreme {
  time: Date
  level: number
  type: 'high' | 'low'
}

function refineExtreme(
  previousTime: number,
  stepMs: number,
  beforeLevel: number,
  middleLevel: number,
  afterLevel: number,
): { time: Date; level: number } {
  const denominator = beforeLevel - 2 * middleLevel + afterLevel
  if (Math.abs(denominator) < 1e-12) {
    return { time: new Date(previousTime), level: middleLevel }
  }

  const offsetSteps = (beforeLevel - afterLevel) / (2 * denominator)
  if (!Number.isFinite(offsetSteps) || Math.abs(offsetSteps) > 1) {
    return { time: new Date(previousTime), level: middleLevel }
  }

  const slope = (afterLevel - beforeLevel) / 2
  const curve = denominator / 2
  return {
    time: new Date(previousTime + offsetSteps * stepMs),
    level: middleLevel + slope * offsetSteps + curve * offsetSteps * offsetSteps,
  }
}

export function findHighLowTides(
  startDate: Date,
  endDate: Date,
  constituents: TideConstituent[],
  stepMinutes: number = 10,
  longitude: number = 0,
  epoch: Date = DEFAULT_HARMONIC_EPOCH,
): TideExtreme[] {
  const extremes: TideExtreme[] = []
  const stepMs = stepMinutes * 60 * 1000

  let prevLevel: number | null = null
  let prevPrevLevel: number | null = null

  for (let t = startDate.getTime(); t <= endDate.getTime(); t += stepMs) {
    const date = new Date(t)
    const level = predictTideLevel(date, constituents, longitude, epoch)

    if (prevPrevLevel !== null && prevLevel !== null) {
      const isHigh = prevPrevLevel < prevLevel && prevLevel >= level
      const isLow = prevPrevLevel > prevLevel && prevLevel <= level

      if (isHigh || isLow) {
        const refined = refineExtreme(t - stepMs, stepMs, prevPrevLevel, prevLevel, level)
        extremes.push({
          time: refined.time,
          level: refined.level,
          type: isHigh ? 'high' : 'low',
        })
      }
    }

    prevPrevLevel = prevLevel
    prevLevel = level
  }

  return extremes
}

// Helper functions

function normalizeAngle(degrees: number): number {
  let angle = degrees % 360
  if (angle < 0) angle += 360
  return angle
}

/**
 * Create a prediction time series
 */
export interface TidePrediction {
  time: Date
  level: number
  slope: number // rate of change (m/hour)
}

export function createPredictionSeries(
  startDate: Date,
  endDate: Date,
  constituents: TideConstituent[],
  stepMinutes: number = 10,
  longitude: number = 0,
  epoch: Date = DEFAULT_HARMONIC_EPOCH,
): TidePrediction[] {
  const series: TidePrediction[] = []
  const stepMs = stepMinutes * 60 * 1000

  let prevLevel: number | null = null

  for (let t = startDate.getTime(); t <= endDate.getTime(); t += stepMs) {
    const date = new Date(t)
    const level = predictTideLevel(date, constituents, longitude, epoch)

    let slope = 0
    if (prevLevel !== null) {
      slope = (level - prevLevel) / (stepMinutes / 60) // m/hour
    }

    series.push({ time: date, level, slope })
    prevLevel = level
  }

  return series
}
