import { choleskySolve, fitConstituents, type FitSample } from '../lib/harmonic-fit'
import { predictTideLevel, CONSTITUENTS_DATABASE, type TideConstituent } from '../lib/harmonic-tide-core'

const LONGITUDE = 100.58 // Bangkok, matches the constituent-basis longitude convention

function buildConstituent(name: string, amplitude: number, phase: number): TideConstituent {
  return {
    name,
    speed: CONSTITUENTS_DATABASE[name].speed,
    amplitude,
    phase,
    description: CONSTITUENTS_DATABASE[name].description,
  }
}

// A synthetic "true" station using only the resolvable set (no K1/P1 or
// K2/S2 pair in here -- that pair is exercised separately below).
const TRUE_OFFSET = 1.2
const TRUE_CONSTITUENTS: Array<{ name: string; amplitude: number; phase: number }> = [
  { name: 'M2', amplitude: 0.6, phase: 210 },
  { name: 'S2', amplitude: 0.22, phase: 190 },
  { name: 'N2', amplitude: 0.12, phase: 200 },
  { name: 'K1', amplitude: 0.35, phase: 95 },
  { name: 'O1', amplitude: 0.3, phase: 80 },
  { name: 'Q1', amplitude: 0.07, phase: 70 },
  { name: 'M4', amplitude: 0.05, phase: 300 },
]

function buildSyntheticSeries(days: number, stepMinutes: number, noiseAmplitude = 0): FitSample[] {
  const constituents = TRUE_CONSTITUENTS.map((c) => buildConstituent(c.name, c.amplitude, c.phase))
  const start = new Date('2026-01-01T00:00:00Z')
  const stepMs = stepMinutes * 60 * 1000
  const totalSteps = Math.floor((days * 24 * 60) / stepMinutes)

  const samples: FitSample[] = []
  for (let i = 0; i < totalSteps; i++) {
    const time = new Date(start.getTime() + i * stepMs)
    // Deterministic pseudo-noise (no Math.random dependency) so the test is
    // reproducible: a small, fast-varying sinusoid unrelated to any tidal
    // constituent frequency.
    const noise = noiseAmplitude * Math.sin(i * 1.7)
    const level = TRUE_OFFSET + predictTideLevel(time, constituents, LONGITUDE) + noise
    samples.push({ time, level })
  }
  return samples
}

describe('harmonic-fit', () => {
  it('recovers known amplitude/phase/offset from a clean synthetic 60-day series', () => {
    const samples = buildSyntheticSeries(60, 30)
    const names = TRUE_CONSTITUENTS.map((c) => c.name)
    const result = fitConstituents(samples, names, LONGITUDE)

    expect(result.offset).toBeCloseTo(TRUE_OFFSET, 2)
    expect(result.rmsResidualMeters).toBeLessThan(1e-3)

    for (const truth of TRUE_CONSTITUENTS) {
      const fitted = result.constituents.find((c) => c.name === truth.name)
      expect(fitted).toBeDefined()
      expect(fitted!.amplitude).toBeCloseTo(truth.amplitude, 2)

      // Phase is a mod-360 angle -- compare via the wrapped difference.
      const diff = Math.abs(((fitted!.phase - truth.phase + 540) % 360) - 180)
      expect(diff).toBeLessThan(0.5)
    }
  })

  it('still recovers amplitude/phase within a wider tolerance under small noise', () => {
    const samples = buildSyntheticSeries(60, 30, 0.01) // 1cm synthetic noise
    const names = TRUE_CONSTITUENTS.map((c) => c.name)
    const result = fitConstituents(samples, names, LONGITUDE)

    for (const truth of TRUE_CONSTITUENTS) {
      const fitted = result.constituents.find((c) => c.name === truth.name)
      expect(fitted).toBeDefined()
      expect(fitted!.amplitude).toBeCloseTo(truth.amplitude, 1)
      const diff = Math.abs(((fitted!.phase - truth.phase + 540) % 360) - 180)
      expect(diff).toBeLessThan(2)
    }
  })

  it('infers P1 from K1 by a fixed ratio instead of fitting it directly', () => {
    const samples = buildSyntheticSeries(60, 30)
    const names = [...TRUE_CONSTITUENTS.map((c) => c.name), 'P1']
    const result = fitConstituents(samples, names, LONGITUDE)

    const k1 = result.constituents.find((c) => c.name === 'K1')!
    const p1 = result.constituents.find((c) => c.name === 'P1')!
    expect(p1.amplitude).toBeCloseTo(k1.amplitude * 0.331, 5)
    expect(p1.phase).toBeCloseTo(k1.phase, 5)
  })

  it('choleskySolve throws on a collinear (non-positive-definite) system', () => {
    // Two identical rows/columns make the matrix singular -- this is the
    // shape of failure you'd get from leaving both K1 and P1 in as free
    // columns over a fit window too short to resolve them.
    const collinear = [
      [1, 1, 0],
      [1, 1, 0],
      [0, 0, 1],
    ]
    expect(() => choleskySolve(collinear, [1, 1, 1])).toThrow(/not positive-definite/)
  })

  it('choleskySolve recovers a well-conditioned known solution', () => {
    // x + 0y = 3, 0x + 2y = 4 => x=3, y=2 (encoded as a trivial diagonal SPD system)
    const result = choleskySolve(
      [
        [1, 0],
        [0, 2],
      ],
      [3, 4],
    )
    expect(result[0]).toBeCloseTo(3, 6)
    expect(result[1]).toBeCloseTo(2, 6)
  })
})
