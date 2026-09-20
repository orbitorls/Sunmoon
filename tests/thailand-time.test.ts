import {
  formatThailandClock,
  getThailandClockParts,
  getThailandDayBounds,
  getThailandDayBoundsFromIsoDate,
  getThailandDayStart,
  roundToDigits,
  toThailandDayStart,
  toThailandInstant,
} from '../lib/domain/thailand-time'

describe('thailand-time helpers', () => {
  it('formats UTC instants as ICT clock times', () => {
    const utcNoon = new Date('2025-03-24T05:00:00.000Z')
    expect(formatThailandClock(utcNoon)).toBe('12:00')
    expect(getThailandClockParts(utcNoon)).toEqual({ hour: 12, minute: 0 })
  })

  it('anchors graph days to ICT midnight', () => {
    const utcEvening = new Date('2025-03-24T18:30:00.000Z')
    const { start, end } = getThailandDayBounds(utcEvening)

    expect(start.toISOString()).toBe('2025-03-24T17:00:00.000Z')
    expect(end.toISOString()).toBe('2025-03-25T17:00:00.000Z')
    expect(getThailandDayStart(utcEvening).toISOString()).toBe('2025-03-24T17:00:00.000Z')
  })

  it('builds ICT instants from day anchor and clock', () => {
    const day = new Date('2025-03-24T06:00:00.000Z')
    const instant = toThailandInstant(day, { hour: 8, minute: 30 })

    expect(formatThailandClock(instant)).toBe('08:30')
    expect(toThailandDayStart(instant)).toBe(toThailandDayStart(day))
  })

  it('parses ISO date strings in ICT', () => {
    const bounds = getThailandDayBoundsFromIsoDate('2025-03-24')
    expect(bounds.start.toISOString()).toBe('2025-03-23T17:00:00.000Z')
    expect(bounds.date).toBe('2025-03-24')
  })

  it('rounds to a fixed number of decimal places', () => {
    expect(roundToDigits(1.234567, 3)).toBe(1.235)
    expect(roundToDigits(1.2, 2)).toBe(1.2)
  })
})

describe('controls timezone formatting', () => {
  it('does not double-apply ICT offset when formatting Thai time', () => {
    const { tideControlManager } = require('../lib/ui/controls') as typeof import('../lib/ui/controls')
    tideControlManager.updateSetting('timezone', 'thai')

    const sample = new Date('2025-03-24T05:00:00.000Z')
    expect(tideControlManager.formatTime(sample, { use24Hour: true })).toBe('12:00')
  })
})
