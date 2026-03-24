import {
  compareSnapshots,
  deriveExtremesFromSeries,
  fetchStormglassComparisonSnapshot,
  fetchWorldTidesComparisonSnapshot,
  type ComparisonSourceSnapshot,
} from '../lib/tide-comparison'
import { WorldTidesClient } from '../lib/worldtides-client'

describe('tide comparison', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('derives high and low extremes from the canonical series', () => {
    const events = deriveExtremesFromSeries([
      { time: new Date('2025-03-24T00:00:00Z'), level: 1.0 },
      { time: new Date('2025-03-24T01:00:00Z'), level: 1.8 },
      { time: new Date('2025-03-24T02:00:00Z'), level: 1.1 },
      { time: new Date('2025-03-24T03:00:00Z'), level: 0.2 },
      { time: new Date('2025-03-24T04:00:00Z'), level: 0.9 },
    ])

    expect(events).toHaveLength(2)
    expect(events[0]).toMatchObject({ type: 'high', clockTime: '08:00' })
    expect(events[1]).toMatchObject({ type: 'low', clockTime: '10:00' })
  })

  it('suppresses height metrics when candidate datum is unknown', () => {
    const baseline: ComparisonSourceSnapshot = {
      sourceId: 'internal',
      category: 'internal',
      sourceLabel: 'Baseline',
      location: { id: 'a', name: 'A', lat: 13, lon: 100 },
      date: '2025-03-24',
      available: true,
      datum: 'MSL',
      datumConfidence: 'known',
      supportsHeightComparison: true,
      rawEventCount: 2,
      metadata: {},
      events: [
        { type: 'high', timestamp: '2025-03-24T06:00:00+07:00', clockTime: '06:00', level: 2.1, confidence: 68 },
        { type: 'low', timestamp: '2025-03-24T12:00:00+07:00', clockTime: '12:00', level: 0.5, confidence: 68 },
      ],
    }
    const candidate: ComparisonSourceSnapshot = {
      sourceId: 'worldtides',
      category: 'api',
      sourceLabel: 'WorldTides',
      location: baseline.location,
      date: '2025-03-24',
      available: true,
      datum: 'provider-specific',
      datumConfidence: 'unknown',
      supportsHeightComparison: false,
      rawEventCount: 2,
      metadata: {},
      events: [
        { type: 'high', timestamp: '2025-03-24T06:20:00+07:00', clockTime: '06:20', level: 2.4, confidence: 95 },
        { type: 'low', timestamp: '2025-03-24T12:10:00+07:00', clockTime: '12:10', level: 0.7, confidence: 95 },
      ],
    }

    const comparison = compareSnapshots(baseline, candidate, 90)

    expect(comparison.metrics.matchedEventCount).toBe(2)
    expect(comparison.metrics.meanAbsoluteTimingErrorMinutes).toBe(15)
    expect(comparison.metrics.meanAbsoluteLevelErrorMeters).toBeNull()
    expect(comparison.metrics.warnings).toContain(
      'Height metrics are suppressed because datum alignment is unknown or unsupported',
    )
  })

  it('returns unavailable provider snapshots when API keys are missing', async () => {
    const location = { id: 'bench', name: 'Bench', lat: 13.1, lon: 100.8 }

    const [worldTides, stormglass] = await Promise.all([
      fetchWorldTidesComparisonSnapshot(location, '2025-03-24', ''),
      fetchStormglassComparisonSnapshot(location, '2025-03-24', ''),
    ])

    expect(worldTides).toMatchObject({
      available: false,
      unavailableReason: 'WORLDTIDES_API_KEY is not configured',
    })
    expect(stormglass).toMatchObject({
      available: false,
      unavailableReason: 'STORMGLASS_API_KEY is not configured',
    })
  })

  it('includes the API key in coordinate-based WorldTides requests', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        extremes: [
          { timestamp: 1742788800, height: 2.3, type: 'High' },
          { timestamp: 1742810400, height: 0.4, type: 'Low' },
        ],
      }),
      statusText: 'OK',
    } as Response)

    const client = new WorldTidesClient('secret-key')
    const result = await client.getExtremesForCoordinates(
      13.1599,
      100.8096,
      new Date('2025-03-24T00:00:00+07:00'),
      new Date('2025-03-24T23:59:59+07:00'),
    )

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('key=secret-key'),
    )
    expect(result.highs).toHaveLength(1)
    expect(result.lows).toHaveLength(1)
  })
})