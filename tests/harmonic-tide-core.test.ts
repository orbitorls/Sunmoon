import {
  CONSTITUENTS_DATABASE,
  calculateNodalCorrections,
  createPredictionSeries,
  findHighLowTides,
  predictTideLevel,
  type TideConstituent,
} from '../lib/harmonic'
import { calculateAstronomicalArguments } from '../lib/ephemerides'

const constituent: TideConstituent = {
  name: 'M2',
  speed: CONSTITUENTS_DATABASE.M2.speed,
  amplitude: 1,
  phase: 0,
  description: CONSTITUENTS_DATABASE.M2.description,
}

describe('harmonic tide core', () => {
  it('repeats M2 with its ~12.4206 hour period (not double-speed)', () => {
    // Regression test for a bug where the equilibrium argument summed both
    // `speed * hoursFromEpoch` AND the full Doodson expansion of the same
    // time-varying astronomical arguments, doubling the effective speed and
    // making the constituent cycle roughly twice too fast.
    const start = new Date('2025-03-24T00:00:00.000Z')
    const periodHours = 360 / CONSTITUENTS_DATABASE.M2.speed // ~12.4206h

    const level0 = predictTideLevel(start, [constituent], 100)
    const levelAfterOnePeriod = predictTideLevel(
      new Date(start.getTime() + periodHours * 3600 * 1000),
      [constituent],
      100,
    )

    expect(levelAfterOnePeriod).toBeCloseTo(level0, 2)
  })

  it('does not drift with distance from the harmonic epoch', () => {
    // A double-counted argument grows the error the further `date` is from
    // 2000-01-01, so compare a prediction made "today" against one made a
    // half-integer number of periods away where a real M2 wave must be near
    // its opposite phase (roughly -amplitude vs +amplitude), not scrambled.
    const periodHours = 360 / CONSTITUENTS_DATABASE.M2.speed
    const farDate = new Date('2030-06-15T00:00:00.000Z')
    const halfPeriodLater = new Date(farDate.getTime() + (periodHours / 2) * 3600 * 1000)

    const levelAtFarDate = predictTideLevel(farDate, [constituent], 100)
    const levelHalfPeriodLater = predictTideLevel(halfPeriodLater, [constituent], 100)

    expect(levelHalfPeriodLater).toBeCloseTo(-levelAtFarDate, 2)
  })

  it('keeps time series generation consistent with predictTideLevel', () => {
    const start = new Date('2025-03-24T00:00:00.000Z')
    const end = new Date('2025-03-24T00:00:00.000Z')
    const epoch = new Date('2025-03-23T00:00:00.000Z')

    const series = createPredictionSeries(start, end, [constituent], 60, 100, epoch)

    expect(series).toHaveLength(1)
    expect(series[0].level).toBeCloseTo(predictTideLevel(start, [constituent], 100, epoch), 6)
  })

  it('refines high and low tide times between coarse sample points', () => {
    const start = new Date('2025-03-24T00:00:00.000Z')
    const end = new Date('2025-03-25T00:00:00.000Z')
    const coarseExtremes = findHighLowTides(start, end, [constituent], 60, 100)
    const fineExtremes = findHighLowTides(start, end, [constituent], 1, 100)
    const coarseHigh = coarseExtremes.find((extreme) => extreme.type === 'high')
    const fineHigh = fineExtremes.find((extreme) => extreme.type === 'high')

    expect(coarseHigh).toBeDefined()
    expect(fineHigh).toBeDefined()

    const coarseMinute = coarseHigh!.time.getUTCMinutes()
    const timeErrorMinutes = Math.abs(coarseHigh!.time.getTime() - fineHigh!.time.getTime()) / 60000

    expect(coarseMinute).not.toBe(0)
    expect(timeErrorMinutes).toBeLessThan(2)
    expect(Math.abs(coarseHigh!.level - fineHigh!.level)).toBeLessThan(0.005)
  })

  it('has a doodson row consistent with its declared speed for every constituent', () => {
    // Fundamental astronomical argument rates (degrees/hour): tau, s, h, p, N, pp.
    // The speed (deg/hr) implied by a constituent's Doodson row is the dot
    // product of the row with these rates. A row that doesn't match the
    // declared `speed` (e.g. MS4 wrongly copied from S2) silently mispredicts
    // that constituent's period.
    const rates = [14.4920521, 0.5490165, 0.0410686, 0.0046418, -0.0022064, 0.0000020]

    for (const [name, { speed, doodson }] of Object.entries(CONSTITUENTS_DATABASE)) {
      const impliedSpeed = doodson.reduce((sum, coeff, i) => sum + coeff * rates[i], 0)
      const diff = Math.abs(impliedSpeed - speed)
      if (diff > 1e-3) {
        throw new Error(`${name}: doodson row implies speed ${impliedSpeed}, declared speed is ${speed}`)
      }
      expect(diff).toBeLessThanOrEqual(1e-3)
    }
  })

  it('matches published Schureman (1958) nodal factors for K1/K2/O1 at a nodal extreme', () => {
    // 2025-01-29 sits at the "major lunar standstill": the moon's ascending
    // node longitude N is within 0.02 deg of zero, which is where K1/K2/O1
    // hit their tabulated maximum nodal factors (Schureman 1958, Table 2:
    // f(K1) max ~1.113, f(K2) max ~1.278, f(O1) max ~1.181; u = 0 at N = 0).
    const date = new Date('2025-01-29T00:00:00Z')
    const { N: nodeLongitude } = calculateAstronomicalArguments(date)
    expect(nodeLongitude).toBeLessThan(0.1) // confirms this really is the N=0 extreme

    const k1 = calculateNodalCorrections('K1', date)
    const k2 = calculateNodalCorrections('K2', date)
    const o1 = calculateNodalCorrections('O1', date)

    expect(k1.f).toBeCloseTo(1.113, 2)
    expect(k1.u).toBeCloseTo(0, 1)
    expect(k2.f).toBeCloseTo(1.278, 2)
    expect(k2.u).toBeCloseTo(0, 1)
    expect(o1.f).toBeCloseTo(1.181, 2)
    expect(o1.u).toBeCloseTo(0, 1)
  })

  it('never falls through to the bare f=1,u=0 default for any active constituent', () => {
    // The switch in calculateNodalCorrections must list every constituent in
    // CONSTITUENTS_DATABASE explicitly (even solar ones whose correction is
    // legitimately f=1,u=0) so that adding a constituent without updating the
    // nodal-correction table fails loudly instead of silently defaulting.
    const date = new Date('2025-06-15T00:00:00Z')
    const { N: nodeLongitude } = calculateAstronomicalArguments(date)
    const N = nodeLongitude * Math.PI / 180
    // Any constituent whose formula genuinely depends on N will differ from
    // the bare default at this date, since cos(N)/sin(N) are not degenerate.
    const isDegenerate = Math.abs(Math.cos(N) - 1) < 1e-9 && Math.abs(Math.sin(N)) < 1e-9
    expect(isDegenerate).toBe(false)

    const solarNoCorrection = new Set(['S2', 'T2', 'P1', 'SSA', 'SA'])

    for (const name of Object.keys(CONSTITUENTS_DATABASE)) {
      const { f, u } = calculateNodalCorrections(name, date)
      if (solarNoCorrection.has(name)) {
        expect(f).toBeCloseTo(1.0, 6)
        expect(u).toBeCloseTo(0.0, 6)
      } else {
        expect(f !== 1.0 || u !== 0.0).toBe(true)
      }
    }
  })
})
