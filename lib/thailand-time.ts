/**
 * Thailand (ICT, UTC+7) time helpers for consistent tide display and calculations.
 * All tide clock times in Sunmoon use ICT regardless of server/browser timezone.
 */

export const THAILAND_OFFSET_MS = 7 * 60 * 60 * 1000
export const THAILAND_OFFSET_MINUTES = 7 * 60
const MS_PER_DAY = 24 * 60 * 60 * 1000

/** UTC instant of 00:00 ICT on the calendar day containing `date`. */
export function toThailandDayStart(date: Date): number {
  return (
    Math.floor((date.getTime() + THAILAND_OFFSET_MS) / MS_PER_DAY) * MS_PER_DAY -
    THAILAND_OFFSET_MS
  )
}

export function getThailandDayStart(date: Date): Date {
  return new Date(toThailandDayStart(date))
}

export function getThailandDayBounds(date: Date): { start: Date; end: Date } {
  const start = getThailandDayStart(date)
  const end = new Date(start.getTime() + MS_PER_DAY)
  return { start, end }
}

export function getThailandDayBoundsFromIsoDate(dateInput: string): {
  date: string
  start: Date
  end: Date
} {
  const start = new Date(`${dateInput}T00:00:00+07:00`)
  const end = new Date(start.getTime() + MS_PER_DAY)
  return { date: dateInput, start, end }
}

export function formatThailandClock(date: Date): string {
  const thailandDate = new Date(date.getTime() + THAILAND_OFFSET_MS)
  const hours = String(thailandDate.getUTCHours()).padStart(2, '0')
  const minutes = String(thailandDate.getUTCMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export function formatThailandTimestamp(date: Date): string {
  const thailandDate = new Date(date.getTime() + THAILAND_OFFSET_MS)
  const year = thailandDate.getUTCFullYear()
  const month = String(thailandDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(thailandDate.getUTCDate()).padStart(2, '0')
  const hours = String(thailandDate.getUTCHours()).padStart(2, '0')
  const minutes = String(thailandDate.getUTCMinutes()).padStart(2, '0')
  const seconds = String(thailandDate.getUTCSeconds()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+07:00`
}

export function getThailandClockParts(date: Date): { hour: number; minute: number } {
  const thailandDate = new Date(date.getTime() + THAILAND_OFFSET_MS)
  return {
    hour: thailandDate.getUTCHours(),
    minute: thailandDate.getUTCMinutes(),
  }
}

/** Build a UTC instant from an ICT calendar day + HH:MM clock. */
export function toThailandInstant(
  dayAnchor: Date,
  clock: { hour: number; minute: number },
): Date {
  const start = getThailandDayStart(dayAnchor)
  return new Date(start.getTime() + (clock.hour * 60 + clock.minute) * 60 * 1000)
}

export function roundToDigits(value: number, digits = 3): number {
  return Number.parseFloat(value.toFixed(digits))
}
