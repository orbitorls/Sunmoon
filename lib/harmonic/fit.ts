/**
 * Least-squares fit of tidal constituent amplitude/phase from a continuous
 * water-level time series (e.g. a WorldTides FES2022 height series), instead
 * of hand-guessing them.
 *
 * Model: height(t) = offset + Sum_i [ a_i*c_i(t) + b_i*s_i(t) ]
 *   where c_i(t) = f_i(t)*cos(V_i(t)+u_i(t)), s_i(t) = f_i(t)*sin(V_i(t)+u_i(t))
 *   (f, V+u come from lib/harmonic-tide-core.ts's computeConstituentBasis —
 *   the same function the predictor itself uses, so the fit basis can never
 *   silently drift from prediction behavior).
 *
 * This is a plain linear regression in [offset, a_1, b_1, ..., a_n, b_n],
 * solved via normal equations + Cholesky decomposition (the design matrix is
 * small, ~2N+1 columns, and symmetric positive-definite once collinear
 * columns are excluded — see FIT_ANCHORS below). Cholesky has no pivoting to
 * get wrong and throws exactly when a column is near-singular, which is the
 * safety net that the collinear-pair bookkeeping below is correct.
 */

import { computeConstituentBasis } from './core'

export interface FitSample {
  time: Date
  level: number
}

export interface FittedConstituent {
  name: string
  amplitude: number
  phase: number
}

export interface FitResult {
  offset: number
  constituents: FittedConstituent[]
  rmsResidualMeters: number
}

export interface FitOptions {
  /** Drop recovered constituents below this amplitude (default 0.01 m). */
  minAmplitudeMeters?: number
  /**
   * Keep these names even when below minAmplitudeMeters, as long as amplitude
   * is above a tiny floor (used for shallow-water overtides that are small but
   * phase-critical in the upper Gulf).
   */
  retainNames?: readonly string[]
}

/** Shallow-water compounds prioritised for Gulf stations (hydro-1 / hydro-19). */
export const SHALLOW_WATER_CONSTITUENT_NAMES = ['M4', 'MS4', 'MN4', 'M6'] as const

const RETAIN_FLOOR_METERS = 0.003

/**
 * Upsample a sorted level series to a denser fixed interval via cubic Hermite
 * interpolation (Catmull-Rom tangents). Hourly Navy tables alone quantise the
 * fit design matrix to ~60 min; densifying to 10–15 min improves phase recovery
 * for shallow-water overtides without inventing new observations beyond a
 * smooth interpolation of the official hourly heights.
 */
export function densifySamples(samples: FitSample[], intervalMinutes: number): FitSample[] {
  if (samples.length < 2 || !Number.isFinite(intervalMinutes) || intervalMinutes <= 0) {
    return samples.slice()
  }

  const intervalMs = intervalMinutes * 60 * 1000
  const sorted = samples
    .slice()
    .sort((a, b) => a.time.getTime() - b.time.getTime())

  const densified: FitSample[] = []
  const startMs = sorted[0].time.getTime()
  const endMs = sorted[sorted.length - 1].time.getTime()

  let segment = 0
  for (let t = startMs; t <= endMs; t += intervalMs) {
    while (segment < sorted.length - 2 && sorted[segment + 1].time.getTime() < t) {
      segment += 1
    }

    const i0 = Math.max(0, segment - 1)
    const i1 = segment
    const i2 = Math.min(sorted.length - 1, segment + 1)
    const i3 = Math.min(sorted.length - 1, segment + 2)

    const t1 = sorted[i1].time.getTime()
    const t2 = sorted[i2].time.getTime()
    if (t2 === t1) {
      densified.push({ time: new Date(t), level: sorted[i1].level })
      continue
    }

    const u = (t - t1) / (t2 - t1)
    const y0 = sorted[i0].level
    const y1 = sorted[i1].level
    const y2 = sorted[i2].level
    const y3 = sorted[i3].level
    // Catmull-Rom: tangents from neighbouring samples
    const m1 = (y2 - y0) / 2
    const m2 = (y3 - y1) / 2
    const u2 = u * u
    const u3 = u2 * u
    const level =
      (2 * u3 - 3 * u2 + 1) * y1 +
      (u3 - 2 * u2 + u) * m1 +
      (-2 * u3 + 3 * u2) * y2 +
      (u3 - u2) * m2

    densified.push({ time: new Date(t), level })
  }

  return densified
}

/**
 * Append extra samples with integer weight (duplicates) so least-squares
 * prioritises them. Used to inject Navy high/low extremes whose clock times
 * already carry sub-hour phase from quadratic peak refinement.
 */
export function mergeWeightedSamples(
  base: FitSample[],
  extras: FitSample[],
  weight: number,
): FitSample[] {
  const copies = Math.max(1, Math.floor(weight))
  const weighted: FitSample[] = []
  for (const sample of extras) {
    for (let i = 0; i < copies; i++) {
      weighted.push(sample)
    }
  }
  return base.concat(weighted).sort((a, b) => a.time.getTime() - b.time.getTime())
}

/**
 * Constituent pairs whose frequencies are too close to resolve from a
 * fit window under ~180 days (Rayleigh criterion: K1/P1 and K2/S2 both need
 * ~360/0.082 deg/hr =~ 4390 hours =~ 183 days to separate). Fitting both as
 * free columns over a shorter window makes the normal-equations matrix
 * near-singular. Instead we fit only the free member and infer the other
 * from a fixed equilibrium amplitude ratio (Doodson/Schureman standard
 * ratios) at the SAME phase (P1 and K1 share doodson species 1, K2/S2 share
 * species 2, so no separate phase offset is needed beyond the ratio itself).
 * ponytail: fixed ratios, not fit directly; upgrade to direct fitting only if
 * a fit window >= ~200 days becomes available.
 */
function getInferredFrom(windowDays: number): Record<string, { from: string; ratio: number }> {
  // With a full year of samples the Rayleigh criterion is satisfied for the
  // close K1/P1 and S2/K2 pairs, so we can try to fit them directly.
  if (windowDays >= 200) {
    return {}
  }
  return {
    P1: { from: 'K1', ratio: 0.331 },
    K2: { from: 'S2', ratio: 0.272 },
  }
}

// Drop any recovered constituent whose amplitude is below this: too small to
// distinguish from residual/noise in the source series, not worth storing.
const MIN_AMPLITUDE_METERS = 0.01

/**
 * Solve a symmetric positive-definite linear system `A x = b` via Cholesky
 * decomposition (A = L L^T). Throws if a diagonal pivot goes non-positive,
 * which happens exactly when a design column is collinear/near-singular with
 * the others (e.g. two constituents whose frequencies can't be resolved by
 * the sample window) -- callers must exclude such columns up front instead of
 * relying on this to "sort of" work.
 */
export function choleskySolve(a: number[][], b: number[]): number[] {
  const n = b.length
  const l: number[][] = Array.from({ length: n }, () => new Array(n).fill(0))
  // Non-positive-definite check needs to scale with the matrix's own
  // magnitude (design-matrix entries here are sums over thousands of
  // samples, so diagonals can be in the thousands) -- a fixed absolute
  // epsilon would either never trigger or trigger on well-conditioned data.
  let trace = 0
  for (let i = 0; i < n; i++) trace += Math.abs(a[i][i])
  const epsilon = (trace / n) * 1e-9

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = a[i][j]
      for (let k = 0; k < j; k++) sum -= l[i][k] * l[j][k]
      if (i === j) {
        if (sum <= epsilon) {
          throw new Error(
            `choleskySolve: matrix is not positive-definite at row ${i} (pivot=${sum.toExponential(3)}); ` +
              'this means two or more design columns are collinear (e.g. an unresolvable close-frequency ' +
              'constituent pair was left in as a free column) -- exclude one and infer it instead.',
          )
        }
        l[i][j] = Math.sqrt(sum)
      } else {
        l[i][j] = sum / l[j][j]
      }
    }
  }

  // Solve L y = b (forward substitution)
  const y = new Array(n).fill(0)
  for (let i = 0; i < n; i++) {
    let sum = b[i]
    for (let k = 0; k < i; k++) sum -= l[i][k] * y[k]
    y[i] = sum / l[i][i]
  }

  // Solve L^T x = y (back substitution)
  const x = new Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let sum = y[i]
    for (let k = i + 1; k < n; k++) sum -= l[k][i] * x[k]
    x[i] = sum / l[i][i]
  }

  return x
}

/**
 * Fit amplitude+phase for each named constituent against a real continuous
 * level series. `names` should be the full set you want in the output
 * (including any INFERRED_FROM entries like P1/K2) -- free/inferred columns
 * are split automatically.
 */
export function fitConstituents(
  samples: FitSample[],
  names: string[],
  longitude: number,
  options: FitOptions = {},
): FitResult {
  if (samples.length < 2 * names.length + 10) {
    throw new Error(
      `fitConstituents: need more samples (${samples.length}) than 2x constituent count (${names.length}) with margin`,
    )
  }

  const minAmplitudeMeters = options.minAmplitudeMeters ?? MIN_AMPLITUDE_METERS
  const retainNames = new Set(options.retainNames ?? [])

  const first = samples[0].time.getTime()
  const last = samples[samples.length - 1].time.getTime()
  const windowDays = (last - first) / (1000 * 60 * 60 * 24)
  const inferredFrom = getInferredFrom(windowDays)

  const freeNames = names.filter((name) => !(name in inferredFrom))
  const inferredNames = names.filter((name) => name in inferredFrom)

  // Columns: [offset, a_1, b_1, a_2, b_2, ...] for each free constituent.
  const p = 1 + 2 * freeNames.length
  const basisPerSample: number[][] = samples.map(({ time }) => {
    const row = new Array(p).fill(0)
    row[0] = 1
    freeNames.forEach((name, i) => {
      const { f, angle } = computeConstituentBasis(name, time, longitude)
      const rad = (angle * Math.PI) / 180
      row[1 + 2 * i] = f * Math.cos(rad)
      row[2 + 2 * i] = f * Math.sin(rad)
    })
    return row
  })

  // Normal equations: (X^T X) beta = X^T y
  const ata: number[][] = Array.from({ length: p }, () => new Array(p).fill(0))
  const atb = new Array(p).fill(0)
  for (let s = 0; s < samples.length; s++) {
    const row = basisPerSample[s]
    const y = samples[s].level
    for (let i = 0; i < p; i++) {
      atb[i] += row[i] * y
      for (let j = 0; j < p; j++) {
        ata[i][j] += row[i] * row[j]
      }
    }
  }

  const beta = choleskySolve(ata, atb)
  const offset = beta[0]

  const fitted = new Map<string, FittedConstituent>()
  freeNames.forEach((name, i) => {
    const a = beta[1 + 2 * i]
    const b = beta[2 + 2 * i]
    const amplitude = Math.hypot(a, b)
    const phase = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360
    fitted.set(name, { name, amplitude, phase })
  })

  for (const name of inferredNames) {
    const { from, ratio } = inferredFrom[name]
    const source = fitted.get(from)
    if (!source) {
      throw new Error(`fitConstituents: cannot infer ${name} because its source constituent ${from} was not fitted`)
    }
    fitted.set(name, { name, amplitude: source.amplitude * ratio, phase: source.phase })
  }

  // RMS residual against the fitted free-column model (inferred constituents
  // contribute negligible extra energy relative to their source and aren't
  // worth re-evaluating here).
  let sumSquaredError = 0
  for (let s = 0; s < samples.length; s++) {
    const row = basisPerSample[s]
    let predicted = 0
    for (let i = 0; i < p; i++) predicted += row[i] * beta[i] // row[0]=1 already carries the offset term
    const error = samples[s].level - predicted
    sumSquaredError += error * error
  }
  const rmsResidualMeters = Math.sqrt(sumSquaredError / samples.length)

  const constituents = names
    .map((name) => fitted.get(name)!)
    .filter((c) => {
      if (c.amplitude >= minAmplitudeMeters) {
        return true
      }
      return retainNames.has(c.name) && c.amplitude >= RETAIN_FLOOR_METERS
    })

  return { offset, constituents, rmsResidualMeters }
}
