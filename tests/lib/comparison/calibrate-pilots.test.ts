import { applyCalibrationSuggestions } from '@/lib/comparison/tide-calibration-apply'
import { type TideComparisonReport } from '@/lib/comparison'

describe('applyCalibrationSuggestions', () => {
  it('applies a weighted time offset to a station with enough matched events', () => {
    const constants = [
      {
        stationId: 'hydro-1',
        datum: 'MSL',
        epoch: '2000-01-01T00:00:00Z',
        levelOffsetMeters: 1.2,
        timeOffsetMinutes: 0,
        qualityScore: 72,
        source: 'test',
        constituents: [{ name: 'M2', amplitude: 0.25, phase: 180 }],
      },
    ]

    const report = {
      generatedAt: '2026-07-29T00:00:00Z',
      date: '2026-08-15',
      sourcesRequested: ['validation_fixture'],
      summary: {} as any,
      locations: [
        {
          location: { id: 'benchmark-upper-gulf-bangkok', name: 'Bangkok', lat: 0, lon: 0, stationId: 'hydro-1' },
          baseline: {} as any,
          comparisons: [
            {
              source: {} as any,
              metrics: {} as any,
              matches: [],
              unmatchedBaselineEvents: [],
              unmatchedCandidateEvents: [],
              calibrationSuggestion: {
                stationId: 'hydro-1',
                locationId: 'benchmark-upper-gulf-bangkok',
                sourceId: 'validation_fixture',
                matchedEventCount: 60,
                timeOffsetMinutesDelta: 18.5,
                levelOffsetMetersDelta: null,
                note: 'test',
              },
            },
          ],
        },
      ],
    } as TideComparisonReport

    const result = applyCalibrationSuggestions(constants, report)
    expect(result.constants[0].timeOffsetMinutes).toBe(18.5)
  })
})
