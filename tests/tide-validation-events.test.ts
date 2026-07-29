import calibrationSummaryJson from '../data/station-harmonic-constants.calibrated.json.summary.json'
import validationEvents from '../data/tide-validation-events.json'
import { MIN_MATCHED_EVENTS_FOR_CALIBRATION, type AppliedStationCalibration } from '../lib/tide-calibration-apply'

// The threshold lives in lib/tide-calibration-apply.ts (requires >=1 lunar
// month of matched high/low pairs) so this test can't drift from the actual
// guard applied when the calibrated summary was generated.
const calibrationSummary = calibrationSummaryJson as AppliedStationCalibration[]

type ValidationRecord = {
  locationId: string
  stationId: string
  date: string
  source: string
  events: Array<{ type: 'high' | 'low'; time: string }>
}

const records = validationEvents as ValidationRecord[]

describe('tide-validation-events fixture integrity', () => {
  it('has no two distinct stationIds sharing an identical event-time array on the same date', () => {
    const byDate = new Map<string, Array<{ stationId: string; signature: string }>>()

    for (const record of records) {
      const signature = record.events.map((event) => `${event.type}:${event.time}`).join('|')
      const bucket = byDate.get(record.date) ?? []
      bucket.push({ stationId: record.stationId, signature })
      byDate.set(record.date, bucket)
    }

    const collisions: string[] = []
    for (const [date, entries] of byDate) {
      for (let i = 0; i < entries.length; i += 1) {
        for (let j = i + 1; j < entries.length; j += 1) {
          if (entries[i].stationId !== entries[j].stationId && entries[i].signature === entries[j].signature) {
            collisions.push(`${date}: ${entries[i].stationId} == ${entries[j].stationId}`)
          }
        }
      }
    }

    expect(collisions).toEqual([])
  })

  it('every station used for calibration meets the documented minimum matchedEventCount', () => {
    const undersourced = calibrationSummary.filter(
      (entry) => entry.matchedEventCount < MIN_MATCHED_EVENTS_FOR_CALIBRATION,
    )

    expect(undersourced).toEqual([])
  })
})
