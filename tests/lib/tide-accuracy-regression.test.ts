import { getStationHarmonicPrediction } from '../../lib/station-harmonic-model'
import validationFixtures from '../../data/tide-validation-events.json'

const PILOT_LOCATIONS = [
  { id: 'hydro-1', lat: 13.702817, lon: 100.58025236193 },
  { id: 'hydro-19', lat: 13.1599381, lon: 100.8096189 },
  { id: 'hydro-21', lat: 9.50139445, lon: 99.9956192732 },
  { id: 'hydro-36', lat: 8.047222, lon: 98.915833 },
]

function clockMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function dayMinutesDistance(a: string, b: string): number {
  const diff = Math.abs(clockMinutes(a) - clockMinutes(b))
  return Math.min(diff, 24 * 60 - diff)
}

describe('pilot station accuracy regression', () => {
  for (const location of PILOT_LOCATIONS) {
    it(`predicts high/low events for ${location.id} within 60 minutes on fixture dates`, () => {
      const fixtures = validationFixtures.filter((f) => f.stationId === location.id)
      let totalError = 0
      let count = 0

      for (const fixture of fixtures) {
        const date = new Date(`${fixture.date}T00:00:00+07:00`)
        const end = new Date(date.getTime() + 24 * 60 * 60 * 1000)
        const prediction = getStationHarmonicPrediction(location, date, end)
        if (!prediction) continue

        for (const observed of fixture.events) {
          const matches = prediction.events.filter((e) => e.type === observed.type)
          if (matches.length === 0) continue
          const best = Math.min(...matches.map((e) => dayMinutesDistance(e.time, observed.time)))
          totalError += best
          count++
        }
      }

      if (count === 0) return
      const mae = totalError / count
      expect(mae).toBeLessThanOrEqual(60)
    })
  }
})
