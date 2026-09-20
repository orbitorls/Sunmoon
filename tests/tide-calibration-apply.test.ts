import { applyCalibrationSuggestions, MIN_MATCHED_EVENTS_FOR_CALIBRATION } from '../lib/comparison/tide-calibration-apply'
import type { TideComparisonReport } from '../lib/comparison'

function buildReport(matchedEventCountForHydro1 = MIN_MATCHED_EVENTS_FOR_CALIBRATION): TideComparisonReport {
  return {
    generatedAt: '2026-06-24T00:00:00.000Z',
    date: '2025-03-24',
    sourcesRequested: ['validation_fixture'],
    summary: {
      totalLocations: 2,
      availableComparisons: 2,
      unavailableComparisons: 0,
      passedComparisons: 0,
      failedComparisons: 2,
      uncheckedComparisons: 0,
      stationConstantsCoverage: {
        configuredStations: 1,
        totalStations: 38,
        missingStations: 37,
        invalidStations: 0,
      },
    },
    locations: [
      {
        location: { id: 'a', name: 'A', lat: 13, lon: 100, stationId: 'hydro-1' },
        baseline: {
          sourceId: 'internal',
          category: 'internal',
          sourceLabel: 'Baseline',
          location: { id: 'a', name: 'A', lat: 13, lon: 100, stationId: 'hydro-1' },
          date: '2025-03-24',
          available: true,
          datum: 'MSL',
          datumConfidence: 'known',
          supportsHeightComparison: true,
          events: [],
          rawEventCount: 0,
          metadata: {},
        },
        comparisons: [
          {
            source: {
              sourceId: 'validation_fixture',
              category: 'validation',
              sourceLabel: 'Validation Fixture',
              location: { id: 'a', name: 'A', lat: 13, lon: 100, stationId: 'hydro-1' },
              date: '2025-03-24',
              available: true,
              datum: 'MSL',
              datumConfidence: 'known',
              supportsHeightComparison: true,
              events: [],
              rawEventCount: 0,
              metadata: {},
            },
            metrics: {
              baselineEventCount: matchedEventCountForHydro1,
              candidateEventCount: matchedEventCountForHydro1,
              matchedEventCount: matchedEventCountForHydro1,
              eventCoverage: 1,
              meanAbsoluteTimingErrorMinutes: 20,
              meanTimingBiasMinutes: 20,
              maxAbsoluteTimingErrorMinutes: 20,
              rmseTimingMinutes: 20,
              meanAbsoluteLevelErrorMeters: 0.1,
              meanLevelBiasMeters: 0.1,
              maxAbsoluteLevelErrorMeters: 0.1,
              rmseLevelMeters: 0.1,
              supportsHeightComparison: true,
              accuracyPass: true,
              thresholdTimingMaeMinutes: 30,
              thresholdLevelMaeMeters: 0.2,
              coverageStatus: 'complete',
              warnings: [],
            },
            calibrationSuggestion: {
              stationId: 'hydro-1',
              locationId: 'a',
              sourceId: 'validation_fixture',
              matchedEventCount: matchedEventCountForHydro1,
              timeOffsetMinutesDelta: 20,
              levelOffsetMetersDelta: 0.1,
              note: 'review first',
            },
            matches: [],
            unmatchedBaselineEvents: [],
            unmatchedCandidateEvents: [],
          },
          {
            source: {
              sourceId: 'validation_fixture',
              category: 'validation',
              sourceLabel: 'Validation Fixture',
              location: { id: 'b', name: 'B', lat: 13, lon: 100, stationId: 'hydro-missing' },
              date: '2025-03-24',
              available: true,
              datum: 'MSL',
              datumConfidence: 'known',
              supportsHeightComparison: true,
              events: [],
              rawEventCount: 0,
              metadata: {},
            },
            metrics: {
              baselineEventCount: 1,
              candidateEventCount: 1,
              matchedEventCount: 1,
              eventCoverage: 1,
              meanAbsoluteTimingErrorMinutes: 10,
              meanTimingBiasMinutes: 10,
              maxAbsoluteTimingErrorMinutes: 10,
              rmseTimingMinutes: 10,
              meanAbsoluteLevelErrorMeters: 0,
              meanLevelBiasMeters: 0,
              maxAbsoluteLevelErrorMeters: 0,
              rmseLevelMeters: 0,
              supportsHeightComparison: true,
              accuracyPass: true,
              thresholdTimingMaeMinutes: 30,
              thresholdLevelMaeMeters: 0.2,
              coverageStatus: 'complete',
              warnings: [],
            },
            calibrationSuggestion: {
              stationId: 'hydro-missing',
              locationId: 'b',
              sourceId: 'validation_fixture',
              matchedEventCount: 1,
              timeOffsetMinutesDelta: 10,
              levelOffsetMetersDelta: 0,
              note: 'review first',
            },
            matches: [],
            unmatchedBaselineEvents: [],
            unmatchedCandidateEvents: [],
          },
        ],
      },
    ],
  }
}

describe('tide calibration application', () => {
  it('applies weighted calibration suggestions to existing station constants only', () => {
    const result = applyCalibrationSuggestions(
      [
        {
          stationId: 'hydro-1',
          levelOffsetMeters: 1.2,
          timeOffsetMinutes: 5,
          sourceCitation: 'seed',
        },
      ],
      buildReport(),
    )

    expect(result.constants[0]).toMatchObject({
      stationId: 'hydro-1',
      levelOffsetMeters: 1.3,
      timeOffsetMinutes: 25,
    })
    expect(result.applied).toEqual([
      {
        stationId: 'hydro-1',
        matchedEventCount: MIN_MATCHED_EVENTS_FOR_CALIBRATION,
        timeOffsetMinutesDelta: 20,
        levelOffsetMetersDelta: 0.1,
      },
    ])
    expect(result.skippedSuggestions).toBe(1)
    expect(result.insufficientSampleStations).toEqual([])
    expect(result.constants[0].sourceCitation).toContain('Calibration pending review')
  })

  it('rejects calibration deltas backed by fewer than a lunar month of matched events', () => {
    const result = applyCalibrationSuggestions(
      [
        {
          stationId: 'hydro-1',
          levelOffsetMeters: 1.2,
          timeOffsetMinutes: 5,
          sourceCitation: 'seed',
        },
      ],
      buildReport(5),
    )

    expect(result.constants[0]).toMatchObject({
      stationId: 'hydro-1',
      levelOffsetMeters: 1.2,
      timeOffsetMinutes: 5,
    })
    expect(result.applied).toEqual([])
    expect(result.insufficientSampleStations).toEqual(['hydro-1'])
  })
})
