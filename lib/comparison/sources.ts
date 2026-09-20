/**
 * Source snapshot fetchers for tide comparison.
 *
 * Split out of lib/tide-comparison.ts (god module). Each fetcher produces a
 * ComparisonSourceSnapshot from one provider (internal harmonic prediction,
 * validation fixtures, WorldTides, Stormglass, website placeholder).
 */

import validationFixtures from '../../data/tide-validation-events.json'
import { getStationHarmonicPrediction } from '../harmonic'
import {
  formatThailandClock,
  formatThailandTimestamp,
  getThailandDayBoundsFromIsoDate,
} from '../thailand-time'
import { WorldTidesClient } from '../worldtides-client'
import {
  VALIDATION_EVENT_SOURCES,
  getSourceLabel,
  type ComparisonEvent,
  type ComparisonEventType,
  type ComparisonLocation,
  type ComparisonSourceSnapshot,
  type ValidationEventSource,
  type ValidationFixtureRecord,
} from './types'

function toValidationRecord(value: unknown): ValidationFixtureRecord | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Partial<ValidationFixtureRecord>
  const source = record.source
  if (
    typeof record.locationId !== 'string' ||
    typeof record.date !== 'string' ||
    typeof source !== 'string' ||
    !VALIDATION_EVENT_SOURCES.includes(source as ValidationEventSource) ||
    !Array.isArray(record.events)
  ) {
    return null
  }

  const events = record.events.filter(
    (event): event is ValidationFixtureRecord['events'][number] =>
      event !== null &&
      typeof event === 'object' &&
      (event.type === 'high' || event.type === 'low') &&
      typeof event.time === 'string' &&
      /^\d{2}:\d{2}$/.test(event.time),
  )

  if (events.length === 0) {
    return null
  }

  return {
    locationId: record.locationId,
    stationId: typeof record.stationId === 'string' ? record.stationId : undefined,
    date: record.date,
    datum: typeof record.datum === 'string' ? record.datum : undefined,
    source: source as ValidationEventSource,
    events,
  }
}

/**
 * Validation-fixture records parsed from data/tide-validation-events.json.
 *
 * Exported for the metrics/calibration sub-modules; not part of the public
 * facade surface.
 */
export function getValidationFixtureRecords(): ValidationFixtureRecord[] {
  if (!Array.isArray(validationFixtures)) {
    return []
  }

  return (validationFixtures as unknown[])
    .map(toValidationRecord)
    .filter((record): record is ValidationFixtureRecord => record !== null)
}

/**
 * Derive high/low events from a level series using a prominence (zigzag)
 * filter rather than a delta-vs-immediate-neighbor gate.
 *
 * A fixed delta-vs-immediate-neighbor threshold is unreliable at 30-min
 * sampling: a real extremum's neighboring deltas shrink toward zero as the
 * curve flattens near the peak/trough — exactly where a "significant change"
 * gate rejects the very point it's meant to detect. But a plain
 * sign-change-of-slope test with no gate at all is too sensitive: shallow-
 * water overtide constituents (M4/MS4/MN4) add small compound wobbles on top
 * of the main tide, which register as spurious extra highs/lows every few
 * hours. `minSwingMeters` requires a candidate extreme to give up at least
 * that much level before the opposite extreme is confirmed (classic
 * zigzag/prominence filter), so minor wobbles get absorbed into the
 * dominant swing instead of reported as their own events.
 */
export function deriveExtremesFromSeries(
  series: Array<{ time: Date; level: number }>,
  minSwingMeters = 0.05,
): ComparisonEvent[] {
  const events: ComparisonEvent[] = []
  if (series.length < 3) {
    return events
  }

  let direction: 'up' | 'down' | null = null
  let candidateIndex = 0

  const pushEvent = (type: ComparisonEventType, index: number) => {
    const point = series[index]
    events.push({
      type,
      timestamp: formatThailandTimestamp(point.time),
      clockTime: formatThailandClock(point.time),
      level: Number(point.level.toFixed(3)),
      confidence: 68,
    })
  }

  for (let index = 1; index < series.length; index++) {
    const candidateLevel = series[candidateIndex].level
    const current = series[index].level

    if (direction === null) {
      if (current > candidateLevel) {
        direction = 'up'
        candidateIndex = index
      } else if (current < candidateLevel) {
        direction = 'down'
        candidateIndex = index
      }
      continue
    }

    if (direction === 'up') {
      if (current >= candidateLevel) {
        candidateIndex = index
      } else if (candidateLevel - current >= minSwingMeters) {
        pushEvent('high', candidateIndex)
        direction = 'down'
        candidateIndex = index
      }
    } else {
      if (current <= candidateLevel) {
        candidateIndex = index
      } else if (current - candidateLevel >= minSwingMeters) {
        pushEvent('low', candidateIndex)
        direction = 'up'
        candidateIndex = index
      }
    }
  }

  return events
}

export async function fetchInternalComparisonSnapshot(
  location: ComparisonLocation,
  dateInput: string,
): Promise<ComparisonSourceSnapshot> {
  const { date, start, end } = getThailandDayBoundsFromIsoDate(dateInput)
  const intervalMinutes = 30
  const paddedStart = new Date(start.getTime() - intervalMinutes * 60 * 1000)
  const paddedEnd = new Date(end.getTime() + intervalMinutes * 60 * 1000)
  const prediction = getStationHarmonicPrediction(location, paddedStart, paddedEnd, intervalMinutes)
  if (!prediction || prediction.series.length === 0) {
    return {
      sourceId: 'internal',
      category: 'internal',
      sourceLabel: getSourceLabel('internal'),
      location,
      date,
      available: false,
      unavailableReason: 'Station harmonic prediction is unavailable for this location/date',
      datum: null,
      datumConfidence: 'unknown',
      supportsHeightComparison: false,
      events: [],
      rawEventCount: 0,
      metadata: {
        engine: 'station-harmonic-v1',
        intervalMinutes,
        stationId: null,
        constituents: 0,
      },
    }
  }

  const series = prediction?.series ?? []
  const events = deriveExtremesFromSeries(series).filter((event) => event.timestamp.startsWith(date))

  return {
    sourceId: 'internal',
    category: 'internal',
    sourceLabel: getSourceLabel('internal'),
    location,
    date,
    available: true,
    datum: 'MSL',
    datumConfidence: 'known',
    supportsHeightComparison: true,
    events,
    rawEventCount: series.length,
    metadata: {
      engine: 'station-harmonic-v1',
      intervalMinutes,
      stationId: prediction?.stationId ?? null,
      constituents: prediction?.constituentsCount ?? 0,
      dominantConstituentQuarterPeriodMinutes: prediction?.dominantConstituentQuarterPeriodMinutes ?? null,
    },
  }
}

export async function fetchWorldTidesComparisonSnapshot(
  location: ComparisonLocation,
  dateInput: string,
  apiKey = process.env.WORLDTIDES_API_KEY || process.env.NEXT_PUBLIC_WORLDTIDES_API_KEY || '',
): Promise<ComparisonSourceSnapshot> {
  const { date, start, end } = getThailandDayBoundsFromIsoDate(dateInput)

  if (!apiKey) {
    return {
      sourceId: 'worldtides',
      category: 'api',
      sourceLabel: 'WorldTides',
      location,
      date,
      available: false,
      unavailableReason: 'WORLDTIDES_API_KEY is not configured',
      datum: null,
      datumConfidence: 'unknown',
      supportsHeightComparison: false,
      events: [],
      rawEventCount: 0,
      metadata: {},
    }
  }

  // WorldTidesClient defaults to datum=MSL on every request (see
  // worldtides-client.ts), matching the internal model's reference, so the
  // datum here is pinned rather than provider-defined and height comparison
  // is safe to enable.
  const datum = 'MSL'
  const client = new WorldTidesClient(apiKey, datum)
  const extremes = await client.getExtremesForCoordinates(location.lat, location.lon, start, end)
  const events: ComparisonEvent[] = [...extremes.highs, ...extremes.lows]
    .sort((left, right) => left.timestamp - right.timestamp)
    .map((event): ComparisonEvent => ({
      type: event.type === 'high' ? 'high' : 'low',
      timestamp: formatThailandTimestamp(new Date(event.timestamp)),
      clockTime: formatThailandClock(new Date(event.timestamp)),
      level: Number(event.height.toFixed(3)),
      confidence: event.confidence ?? 95,
    }))

  return {
    sourceId: 'worldtides',
    category: 'api',
    sourceLabel: 'WorldTides',
    location,
    date,
    available: events.length > 0,
    unavailableReason: events.length > 0 ? undefined : 'WorldTides returned no extremes for the requested window',
    datum,
    datumConfidence: 'known',
    supportsHeightComparison: true,
    events,
    rawEventCount: events.length,
    metadata: {
      provider: 'worldtides',
      requestMode: 'coordinate-extremes',
      datum,
    },
  }
}

type StormglassPayload = {
  data?: Array<{
    height: number
    time: string
    type?: string
  }>
}

export async function fetchStormglassComparisonSnapshot(
  location: ComparisonLocation,
  dateInput: string,
  apiKey = process.env.STORMGLASS_API_KEY || '',
): Promise<ComparisonSourceSnapshot> {
  const { date, start, end } = getThailandDayBoundsFromIsoDate(dateInput)

  if (!apiKey) {
    return {
      sourceId: 'stormglass',
      category: 'api',
      sourceLabel: 'Stormglass',
      location,
      date,
      available: false,
      unavailableReason: 'STORMGLASS_API_KEY is not configured',
      datum: null,
      datumConfidence: 'unknown',
      supportsHeightComparison: false,
      events: [],
      rawEventCount: 0,
      metadata: {},
    }
  }

  const url = `https://api.stormglass.io/v2/tide/extremes/point?lat=${location.lat}&lng=${location.lon}&start=${start.toISOString()}&end=${end.toISOString()}`
  const response = await fetch(url, {
    headers: {
      Authorization: apiKey,
    },
  })

  if (!response.ok) {
    return {
      sourceId: 'stormglass',
      category: 'api',
      sourceLabel: 'Stormglass',
      location,
      date,
      available: false,
      unavailableReason: `Stormglass request failed with HTTP ${response.status}`,
      datum: null,
      datumConfidence: 'unknown',
      supportsHeightComparison: false,
      events: [],
      rawEventCount: 0,
      metadata: {
        status: response.status,
      },
    }
  }

  const payload = (await response.json()) as StormglassPayload
  const events = (payload.data ?? [])
    .filter((event) => Number.isFinite(event.height) && typeof event.time === 'string')
    .map((event) => {
      const eventDate = new Date(event.time)
      return {
        type: event.type?.toLowerCase() === 'high' ? 'high' : 'low',
        timestamp: formatThailandTimestamp(eventDate),
        clockTime: formatThailandClock(eventDate),
        level: Number(event.height.toFixed(3)),
        confidence: 90,
      } as ComparisonEvent
    })

  return {
    sourceId: 'stormglass',
    category: 'api',
    sourceLabel: 'Stormglass',
    location,
    date,
    available: events.length > 0,
    unavailableReason: events.length > 0 ? undefined : 'Stormglass returned no extremes for the requested window',
    datum: 'provider-specific',
    datumConfidence: 'unknown',
    supportsHeightComparison: false,
    events,
    rawEventCount: events.length,
    metadata: {
      provider: 'stormglass',
      requestMode: 'extremes',
    },
  }
}

export async function fetchWebsiteComparisonSnapshot(
  location: ComparisonLocation,
  dateInput: string,
): Promise<ComparisonSourceSnapshot> {
  return {
    sourceId: 'website',
    category: 'website',
    sourceLabel: 'Public Tide Website',
    location,
    date: dateInput,
    available: false,
    unavailableReason: 'No stable public website adapter has been configured yet',
    datum: null,
    datumConfidence: 'unknown',
    supportsHeightComparison: false,
    events: [],
    rawEventCount: 0,
    metadata: {},
  }
}

export async function fetchValidationFixtureSnapshot(
  location: ComparisonLocation,
  dateInput: string,
): Promise<ComparisonSourceSnapshot> {
  const records = getValidationFixtureRecords().filter(
    (record) =>
      record.date === dateInput &&
      (record.locationId === location.id || (location.stationId !== undefined && record.stationId === location.stationId)),
  )

  if (records.length === 0) {
    return {
      sourceId: 'validation_fixture',
      category: 'validation',
      sourceLabel: 'Validation Fixture',
      location,
      date: dateInput,
      available: false,
      unavailableReason: 'No validation fixture events for this location/date',
      datum: null,
      datumConfidence: 'unknown',
      supportsHeightComparison: false,
      events: [],
      rawEventCount: 0,
      metadata: {
        validationEventCount: 0,
      },
    }
  }

  const datum = records.find((record) => record.datum)?.datum ?? null
  const events: ComparisonEvent[] = records.flatMap((record) =>
    record.events.map((event): ComparisonEvent => {
      const hasLevel = typeof event.level === 'number' && Number.isFinite(event.level)
      return {
        type: event.type,
        timestamp: `${record.date}T${event.time}:00+07:00`,
        clockTime: event.time,
        level: hasLevel ? Number(event.level?.toFixed(3)) : null,
        confidence: record.source === 'field_measurement' ? 100 : 95,
      }
    }),
  )

  return {
    sourceId: 'validation_fixture',
    category: 'validation',
    sourceLabel: 'Validation Fixture',
    location,
    date: dateInput,
    available: events.length > 0,
    unavailableReason: events.length > 0 ? undefined : 'No validation fixture events for this location/date',
    datum,
    datumConfidence: datum === null ? 'unknown' : 'known',
    supportsHeightComparison: datum !== null && events.every((event) => event.level !== null),
    events,
    rawEventCount: events.length,
    metadata: {
      validationEventCount: events.length,
    },
  }
}