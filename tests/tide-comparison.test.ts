import { readFileSync } from 'node:fs'
import path from 'node:path'

import {
  buildCalibrationRecommendation,
  buildCalibrationSuggestion,
  compareSnapshots,
  DEFAULT_LEVEL_MAE_THRESHOLD_METERS,
  DEFAULT_TIMING_MAE_THRESHOLD_MINUTES,
  deriveExtremesFromSeries,
  fetchInternalComparisonSnapshot,
  fetchStormglassComparisonSnapshot,
  fetchValidationFixtureSnapshot,
  fetchWorldTidesComparisonSnapshot,
  runTideComparisonReport,
  type ComparisonSourceSnapshot,
} from '../lib/comparison'
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

  it('calculates timing and level errors for matched validation events', () => {
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
        { type: 'high', timestamp: '2025-03-24T06:00:00+07:00', clockTime: '06:00', level: 2, confidence: 68 },
        { type: 'low', timestamp: '2025-03-24T12:00:00+07:00', clockTime: '12:00', level: 0.5, confidence: 68 },
      ],
    }
    const candidate: ComparisonSourceSnapshot = {
      sourceId: 'validation_fixture',
      category: 'validation',
      sourceLabel: 'Validation Fixture',
      location: baseline.location,
      date: '2025-03-24',
      available: true,
      datum: 'MSL',
      datumConfidence: 'known',
      supportsHeightComparison: true,
      rawEventCount: 2,
      metadata: {},
      events: [
        { type: 'high', timestamp: '2025-03-24T06:30:00+07:00', clockTime: '06:30', level: 2.2, confidence: 95 },
        { type: 'low', timestamp: '2025-03-24T12:30:00+07:00', clockTime: '12:30', level: 0.7, confidence: 95 },
      ],
    }

    const comparison = compareSnapshots(baseline, candidate, 90)

    expect(comparison.metrics.meanAbsoluteTimingErrorMinutes).toBe(30)
    expect(comparison.metrics.maxAbsoluteTimingErrorMinutes).toBe(30)
    expect(comparison.metrics.meanTimingBiasMinutes).toBe(30)
    expect(comparison.metrics.meanAbsoluteLevelErrorMeters).toBe(0.2)
    expect(comparison.metrics.meanLevelBiasMeters).toBe(0.2)
    expect(comparison.metrics.accuracyPass).toBe(true)
    expect(comparison.metrics.coverageStatus).toBe('complete')
    expect(comparison.metrics.thresholdTimingMaeMinutes).toBe(DEFAULT_TIMING_MAE_THRESHOLD_MINUTES)
    expect(comparison.metrics.thresholdLevelMaeMeters).toBe(DEFAULT_LEVEL_MAE_THRESHOLD_METERS)
    expect(buildCalibrationRecommendation(comparison.metrics)).toBe(
      'phase_shift_minutes=30; review_level_offset_mae_m=0.2',
    )
  })

  it('adds structured calibration suggestions to validation reports', async () => {
    const baseline: ComparisonSourceSnapshot = {
      sourceId: 'internal',
      category: 'internal',
      sourceLabel: 'Baseline',
      location: { id: 'a', name: 'A', lat: 13, lon: 100, stationId: 'hydro-1' },
      date: '2025-03-24',
      available: true,
      datum: 'MSL',
      datumConfidence: 'known',
      supportsHeightComparison: true,
      rawEventCount: 2,
      metadata: { stationId: 'hydro-1' },
      events: [
        { type: 'high', timestamp: '2025-03-24T06:00:00+07:00', clockTime: '06:00', level: 2, confidence: 68 },
        { type: 'low', timestamp: '2025-03-24T12:00:00+07:00', clockTime: '12:00', level: 0.5, confidence: 68 },
      ],
    }
    const candidate: ComparisonSourceSnapshot = {
      ...baseline,
      sourceId: 'validation_fixture',
      category: 'validation',
      sourceLabel: 'Validation Fixture',
      rawEventCount: 2,
      events: [
        { type: 'high', timestamp: '2025-03-24T06:20:00+07:00', clockTime: '06:20', level: 2.1, confidence: 95 },
        { type: 'low', timestamp: '2025-03-24T12:20:00+07:00', clockTime: '12:20', level: 0.6, confidence: 95 },
      ],
    }
    const comparison = compareSnapshots(baseline, candidate, 90)

    expect(buildCalibrationSuggestion(baseline.location, baseline, comparison)).toMatchObject({
      stationId: 'hydro-1',
      locationId: 'a',
      sourceId: 'validation_fixture',
      matchedEventCount: 2,
      timeOffsetMinutesDelta: 20,
      levelOffsetMetersDelta: 0.1,
    })
  })

  it('fails validation comparisons that exceed the accuracy threshold', () => {
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
      rawEventCount: 1,
      metadata: {},
      events: [
        { type: 'high', timestamp: '2025-03-24T06:00:00+07:00', clockTime: '06:00', level: 2, confidence: 68 },
      ],
    }
    const candidate: ComparisonSourceSnapshot = {
      ...baseline,
      sourceId: 'validation_fixture',
      category: 'validation',
      sourceLabel: 'Validation Fixture',
      rawEventCount: 1,
      events: [
        { type: 'high', timestamp: '2025-03-24T06:45:00+07:00', clockTime: '06:45', level: 2, confidence: 95 },
      ],
    }

    expect(compareSnapshots(baseline, candidate, 90).metrics.accuracyPass).toBe(false)
  })

  it('returns unavailable validation snapshots when no fixture events exist', async () => {
    const snapshot = await fetchValidationFixtureSnapshot(
      { id: 'missing', name: 'Missing', lat: 13, lon: 100 },
      '2025-03-24',
    )

    expect(snapshot).toMatchObject({
      sourceId: 'validation_fixture',
      category: 'validation',
      available: false,
      unavailableReason: 'No validation fixture events for this location/date',
      metadata: {
        validationEventCount: 0,
      },
    })
  })

  it('marks internal snapshots unavailable when no station harmonic model can be used', async () => {
    const snapshot = await fetchInternalComparisonSnapshot(
      { id: 'far-offshore', name: 'Far Offshore', lat: 0, lon: 0 },
      '2025-03-24',
    )

    expect(snapshot).toMatchObject({
      sourceId: 'internal',
      available: false,
      unavailableReason: 'Station harmonic prediction is unavailable for this location/date',
      events: [],
      rawEventCount: 0,
      metadata: {
        stationId: null,
        constituents: 0,
      },
    })
  })

  it('does not create usable comparisons when the internal baseline is unavailable', async () => {
    const report = await runTideComparisonReport({
      date: '2025-03-24',
      locations: [{ id: 'far-offshore', name: 'Far Offshore', lat: 0, lon: 0 }],
      sources: ['validation_fixture'],
    })

    expect(report.summary).toMatchObject({
      availableComparisons: 0,
      unavailableComparisons: 1,
      uncheckedComparisons: 1,
    })
    expect(report.locations[0].baseline.available).toBe(false)
    expect(report.locations[0].comparisons[0].source.available).toBe(false)
    expect(report.locations[0].comparisons[0].calibrationSuggestion).toBeNull()
    expect(report.locations[0].comparisons[0].metrics.coverageStatus).toBe('unavailable')
  })

  it('keeps validation fixtures out of runtime tide prediction paths', () => {
    const runtimeFiles = [
      'lib/domain/forecast-facade.ts',
      'lib/harmonic/station-model.ts',
      'app/api/predict-tide/route.ts',
      'app/api/hydro-tide/route.ts',
    ]

    for (const runtimeFile of runtimeFiles) {
      const source = readFileSync(path.join(process.cwd(), runtimeFile), 'utf8')
      expect(source).not.toContain('tide-validation-events')
    }
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
