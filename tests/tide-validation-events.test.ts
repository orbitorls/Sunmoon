import validationEvents from '../data/tide-validation-events.json'
import { MIN_MATCHED_EVENTS_FOR_CALIBRATION } from '../lib/tide-calibration-apply'

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

  it('gives every station enough matched events to clear the documented minimum', () => {
    // The threshold lives in lib/tide-calibration-apply.ts (>=1 lunar month of
    // matched high/low pairs). Assert it against the fixture itself, so the
    // guard cannot drift from the data that actually feeds calibration.
    const matchedByStation = new Map<string, number>()

    for (const record of records) {
      matchedByStation.set(
        record.stationId,
        (matchedByStation.get(record.stationId) ?? 0) + record.events.length,
      )
    }

    expect(matchedByStation.size).toBeGreaterThan(0)

    const undersourced = [...matchedByStation.entries()]
      .filter(([, matchedEventCount]) => matchedEventCount < MIN_MATCHED_EVENTS_FOR_CALIBRATION)
      .map(([stationId]) => stationId)

    expect(undersourced).toEqual([])
  })
})
