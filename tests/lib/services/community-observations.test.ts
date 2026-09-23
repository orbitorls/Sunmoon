import { accumulateCalibrationSuggestion, buildCommunityCalibrationReview, store, type CommunityObservation } from '@/lib/services/community-observations'
import { applyCalibrationSuggestions, MIN_MATCHED_EVENTS_FOR_CALIBRATION } from '@/lib/comparison/tide-calibration-apply'
import { fetchInternalComparisonSnapshot, type ComparisonLocation } from '@/lib/comparison'
import stationConstants from '@/data/station-harmonic-constants.json'
import hydroStations from '@/data/hydro-stations.json'

const STATION_ID = 'hydro-1'
const station = (hydroStations as Array<{ id: string; lat: number; lon: number }>).find((s) => s.id === STATION_ID)!
const location: ComparisonLocation = { id: STATION_ID, name: STATION_ID, lat: station.lat, lon: station.lon, stationId: STATION_ID }

function isoDate(daysFromEpoch: number): string {
  const date = new Date(Date.UTC(2026, 0, 1) + daysFromEpoch * 24 * 60 * 60 * 1000)
  return date.toISOString().slice(0, 10)
}

/**
 * Report an observation for every real predicted high/low on `date`, timed
 * exactly on the predicted event so it's guaranteed to match (0 min delta).
 * Exercises the real internal harmonic model end to end instead of mocking it.
 */
async function reportAllPredictedEventsForDate(date: string): Promise<number> {
  const snapshot = await fetchInternalComparisonSnapshot(location, date)
  for (const event of snapshot.events) {
    const observation: CommunityObservation = {
      stationId: STATION_ID,
      lat: station.lat,
      lon: station.lon,
      observedAt: event.timestamp,
      type: event.type,
      userId: 'test-user',
    }
    await store(observation)
  }
  return snapshot.events.length
}

describe('community observation accumulation', () => {
  it('stays below the calibration threshold with only a few dates reported', async () => {
    for (let day = 0; day < 3; day++) {
      await reportAllPredictedEventsForDate(isoDate(day))
    }

    const report = await accumulateCalibrationSuggestion(STATION_ID)
    const result = applyCalibrationSuggestions(stationConstants, report)

    expect(result.applied).toEqual([])
    expect(result.insufficientSampleStations).toContain(STATION_ID)
  })

  it('accumulates matched events across many distinct dates until an appliable suggestion emerges', async () => {
    let totalMatched = 0
    let day = 100 // separate date range from the "few dates" test above
    // Real stations produce 1-4 events/day, so keep reporting dates until the
    // real matched-event total clears the lunar-month threshold.
    while (totalMatched < MIN_MATCHED_EVENTS_FOR_CALIBRATION) {
      totalMatched += await reportAllPredictedEventsForDate(isoDate(day))
      day += 1
    }

    const report = await accumulateCalibrationSuggestion(STATION_ID)
    const result = applyCalibrationSuggestions(stationConstants, report)

    const applied = result.applied.find((entry) => entry.stationId === STATION_ID)
    expect(applied).toBeDefined()
    expect(applied!.matchedEventCount).toBeGreaterThanOrEqual(MIN_MATCHED_EVENTS_FOR_CALIBRATION)
    expect(result.insufficientSampleStations).not.toContain(STATION_ID)

    const review = await buildCommunityCalibrationReview(STATION_ID)
    expect(review.autoWriteAllowed).toBe(false)
    expect(review.timingReady).toBe(true)
    expect(review.suggestedTimeOffsetMinutes).not.toBeNull()
  })
})
