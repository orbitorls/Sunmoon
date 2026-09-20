import { CONSTITUENTS_DATABASE, createPredictionSeries, findHighLowTides } from '../lib/harmonic/core'
import {
  createTileManifest,
  createTilePackage,
  decompressToString,
  verifyManifestSignature,
} from '../lib/tile-packaging'

const AMPLITUDES: Record<string, number> = { M2: 0.95, S2: 0.28, K1: 0.35, O1: 0.21 }

const CONSTITUENTS = Object.entries(AMPLITUDES).map(([name, amplitude]) => ({
  name,
  speed: CONSTITUENTS_DATABASE[name].speed,
  amplitude,
  phase: 0,
  description: CONSTITUENTS_DATABASE[name].description,
}))

const START = new Date('2026-03-24T00:00:00Z')
const END = new Date('2026-03-25T00:00:00Z')
const LONGITUDE = 100.5

describe('harmonic prediction end-to-end', () => {
  it('synthesizes a continuous tidal series from the real constituent database', () => {
    const series = createPredictionSeries(START, END, CONSTITUENTS, 60, LONGITUDE)

    expect(series).toHaveLength(25)
    const levels = series.map((point) => point.level)
    expect(levels.every((level) => Number.isFinite(level))).toBe(true)
    expect(Math.max(...levels)).toBeGreaterThan(Math.min(...levels))
  })

  it('finds alternating high and low extremes across the day', () => {
    const extremes = findHighLowTides(START, END, CONSTITUENTS, 10, LONGITUDE)

    expect(extremes.length).toBeGreaterThanOrEqual(2)
    for (let i = 1; i < extremes.length; i++) {
      expect(extremes[i].type).not.toBe(extremes[i - 1].type)
    }
  })

  it('packages the synthesized prediction into a signed, verifiable tile', async () => {
    const { tile, payload } = await createTilePackage(
      'tile-100.5',
      [13, 100, 14, 101],
      [13.5, 100.5],
      CONSTITUENTS.map(({ name, amplitude, phase }) => ({ name, amplitude, phase })),
    )

    const json = await decompressToString(payload)
    expect((JSON.parse(json) as { tileId: string }).tileId).toBe('tile-100.5')

    const manifest = await createTileManifest([{ tile, payload }], {
      version: '1.0.0',
      hmacSecret: 'secret',
    })
    await expect(verifyManifestSignature(manifest, 'secret')).resolves.toBe(true)
  })
})
