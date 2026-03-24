import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { generatePredictionTimeSeries } from './harmonic-prediction'
import { WorldTidesClient } from './worldtides-client'

export type ComparisonSourceId = 'internal' | 'worldtides' | 'stormglass' | 'website'
export type ComparisonSourceCategory = 'internal' | 'api' | 'website'
export type DatumConfidence = 'known' | 'assumed' | 'unknown'
export type ComparisonEventType = 'high' | 'low'

export interface ComparisonLocation {
  id: string
  name: string
  lat: number
  lon: number
  region?: string
  zone?: string
  notes?: string
}

export interface ComparisonEvent {
  type: ComparisonEventType
  timestamp: string
  clockTime: string
  level: number | null
  confidence: number | null
}

export interface ComparisonSourceSnapshot {
  sourceId: ComparisonSourceId
  category: ComparisonSourceCategory
  sourceLabel: string
  location: ComparisonLocation
  date: string
  available: boolean
  unavailableReason?: string
  datum: string | null
  datumConfidence: DatumConfidence
  supportsHeightComparison: boolean
  events: ComparisonEvent[]
  rawEventCount: number
  metadata: Record<string, string | number | boolean | null>
}

export interface MatchedComparisonEvent {
  baseline: ComparisonEvent
  candidate: ComparisonEvent
  timingDeltaMinutes: number
  absoluteTimingDeltaMinutes: number
  levelDeltaMeters: number | null
  absoluteLevelDeltaMeters: number | null
}

export interface ComparisonMetrics {
  baselineEventCount: number
  candidateEventCount: number
  matchedEventCount: number
  eventCoverage: number
  meanAbsoluteTimingErrorMinutes: number | null
  meanTimingBiasMinutes: number | null
  maxAbsoluteTimingErrorMinutes: number | null
  meanAbsoluteLevelErrorMeters: number | null
  maxAbsoluteLevelErrorMeters: number | null
  supportsHeightComparison: boolean
  warnings: string[]
}

export interface SourceComparisonResult {
  source: ComparisonSourceSnapshot
  metrics: ComparisonMetrics
  matches: MatchedComparisonEvent[]
  unmatchedBaselineEvents: ComparisonEvent[]
  unmatchedCandidateEvents: ComparisonEvent[]
}

export interface LocationComparisonReport {
  location: ComparisonLocation
  baseline: ComparisonSourceSnapshot
  comparisons: SourceComparisonResult[]
}

export interface TideComparisonReport {
  generatedAt: string
  date: string
  locations: LocationComparisonReport[]
  sourcesRequested: ComparisonSourceId[]
  summary: {
    totalLocations: number
    availableComparisons: number
    unavailableComparisons: number
  }
}

export interface RunComparisonOptions {
  date: string
  locations: ComparisonLocation[]
  sources: ComparisonSourceId[]
  maxMatchDeltaMinutes?: number
}

const THAILAND_OFFSET_MINUTES = 7 * 60
const DEFAULT_MATCH_WINDOW_MINUTES = 180

function formatThailandTimestamp(date: Date): string {
  const thailandDate = new Date(date.getTime() + THAILAND_OFFSET_MINUTES * 60 * 1000)
  const year = thailandDate.getUTCFullYear()
  const month = String(thailandDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(thailandDate.getUTCDate()).padStart(2, '0')
  const hours = String(thailandDate.getUTCHours()).padStart(2, '0')
  const minutes = String(thailandDate.getUTCMinutes()).padStart(2, '0')
  const seconds = String(thailandDate.getUTCSeconds()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+07:00`
}

function formatThailandClock(date: Date): string {
  const thailandDate = new Date(date.getTime() + THAILAND_OFFSET_MINUTES * 60 * 1000)
  const hours = String(thailandDate.getUTCHours()).padStart(2, '0')
  const minutes = String(thailandDate.getUTCMinutes()).padStart(2, '0')

  return `${hours}:${minutes}`
}

function getThailandDayBounds(dateInput: string): { date: string; start: Date; end: Date } {
  const start = new Date(`${dateInput}T00:00:00+07:00`)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)

  return {
    date: dateInput,
    start,
    end,
  }
}

function clockMinutes(clockTime: string): number {
  const [hours, minutes] = clockTime.split(':').map(Number)
  return hours * 60 + minutes
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function max(values: number[]): number | null {
  if (values.length === 0) {
    return null
  }

  return Math.max(...values)
}

function round(value: number | null, digits = 3): number | null {
  if (value === null) {
    return null
  }

  return Number(value.toFixed(digits))
}

export function deriveExtremesFromSeries(
  series: Array<{ time: Date; level: number }>,
): ComparisonEvent[] {
  const events: ComparisonEvent[] = []

  for (let index = 1; index < series.length - 1; index++) {
    const previous = series[index - 1].level
    const current = series[index].level
    const next = series[index + 1].level
    const currentTime = series[index].time

    if (current > previous && current > next && (current - previous > 0.05 || current - next > 0.05)) {
      events.push({
        type: 'high',
        timestamp: formatThailandTimestamp(currentTime),
        clockTime: formatThailandClock(currentTime),
        level: Number(current.toFixed(3)),
        confidence: 68,
      })
    } else if (
      current < previous &&
      current < next &&
      (previous - current > 0.05 || next - current > 0.05)
    ) {
      events.push({
        type: 'low',
        timestamp: formatThailandTimestamp(currentTime),
        clockTime: formatThailandClock(currentTime),
        level: Number(current.toFixed(3)),
        confidence: 68,
      })
    }
  }

  return events
}

export async function fetchInternalComparisonSnapshot(
  location: ComparisonLocation,
  dateInput: string,
): Promise<ComparisonSourceSnapshot> {
  const { date, start, end } = getThailandDayBounds(dateInput)
  const intervalMinutes = 30
  const paddedStart = new Date(start.getTime() - intervalMinutes * 60 * 1000)
  const paddedEnd = new Date(end.getTime() + intervalMinutes * 60 * 1000)
  const series = generatePredictionTimeSeries(paddedStart, paddedEnd, location, intervalMinutes)
  const events = deriveExtremesFromSeries(series).filter((event) => event.timestamp.startsWith(date))

  return {
    sourceId: 'internal',
    category: 'internal',
    sourceLabel: 'Canonical Harmonic Forecast',
    location,
    date,
    available: true,
    datum: 'MSL',
    datumConfidence: 'known',
    supportsHeightComparison: true,
    events,
    rawEventCount: series.length,
    metadata: {
      engine: 'canonical-harmonic-v1',
      intervalMinutes,
      constituents: 'regional-harmonic',
    },
  }
}

export async function fetchWorldTidesComparisonSnapshot(
  location: ComparisonLocation,
  dateInput: string,
  apiKey = process.env.WORLDTIDES_API_KEY || process.env.NEXT_PUBLIC_WORLDTIDES_API_KEY || '',
): Promise<ComparisonSourceSnapshot> {
  const { date, start, end } = getThailandDayBounds(dateInput)

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

  const client = new WorldTidesClient(apiKey)
  const extremes = await client.getExtremesForCoordinates(location.lat, location.lon, start, end)
  const events = [...extremes.highs, ...extremes.lows]
    .sort((left, right) => left.timestamp - right.timestamp)
    .map((event) => ({
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
    datum: 'provider-specific',
    datumConfidence: 'unknown',
    supportsHeightComparison: false,
    events,
    rawEventCount: events.length,
    metadata: {
      provider: 'worldtides',
      requestMode: 'coordinate-extremes',
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
  const { date, start, end } = getThailandDayBounds(dateInput)

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

export function compareSnapshots(
  baseline: ComparisonSourceSnapshot,
  candidate: ComparisonSourceSnapshot,
  maxMatchDeltaMinutes = DEFAULT_MATCH_WINDOW_MINUTES,
): SourceComparisonResult {
  const matches: MatchedComparisonEvent[] = []
  const unmatchedBaselineEvents: ComparisonEvent[] = []
  const remainingCandidateEvents = [...candidate.events]
  const warnings: string[] = []

  for (const baselineEvent of baseline.events) {
    let bestIndex = -1
    let bestDelta = Number.POSITIVE_INFINITY

    for (let index = 0; index < remainingCandidateEvents.length; index++) {
      const candidateEvent = remainingCandidateEvents[index]
      if (candidateEvent.type !== baselineEvent.type) {
        continue
      }

      const delta = clockMinutes(candidateEvent.clockTime) - clockMinutes(baselineEvent.clockTime)
      const absoluteDelta = Math.abs(delta)
      if (absoluteDelta <= maxMatchDeltaMinutes && absoluteDelta < bestDelta) {
        bestIndex = index
        bestDelta = absoluteDelta
      }
    }

    if (bestIndex === -1) {
      unmatchedBaselineEvents.push(baselineEvent)
      continue
    }

    const matchedCandidate = remainingCandidateEvents.splice(bestIndex, 1)[0]
    const timingDeltaMinutes = clockMinutes(matchedCandidate.clockTime) - clockMinutes(baselineEvent.clockTime)
    const levelDeltaMeters =
      baseline.supportsHeightComparison &&
      candidate.supportsHeightComparison &&
      baselineEvent.level !== null &&
      matchedCandidate.level !== null
        ? matchedCandidate.level - baselineEvent.level
        : null

    matches.push({
      baseline: baselineEvent,
      candidate: matchedCandidate,
      timingDeltaMinutes,
      absoluteTimingDeltaMinutes: Math.abs(timingDeltaMinutes),
      levelDeltaMeters: levelDeltaMeters === null ? null : Number(levelDeltaMeters.toFixed(3)),
      absoluteLevelDeltaMeters: levelDeltaMeters === null ? null : Number(Math.abs(levelDeltaMeters).toFixed(3)),
    })
  }

  if (!candidate.available && candidate.unavailableReason) {
    warnings.push(candidate.unavailableReason)
  }

  if (!(baseline.supportsHeightComparison && candidate.supportsHeightComparison)) {
    warnings.push('Height metrics are suppressed because datum alignment is unknown or unsupported')
  }

  const timingErrors = matches.map((match) => match.absoluteTimingDeltaMinutes)
  const timingBiases = matches.map((match) => match.timingDeltaMinutes)
  const levelErrors = matches
    .map((match) => match.absoluteLevelDeltaMeters)
    .filter((value): value is number => value !== null)

  return {
    source: candidate,
    matches,
    unmatchedBaselineEvents,
    unmatchedCandidateEvents: remainingCandidateEvents,
    metrics: {
      baselineEventCount: baseline.events.length,
      candidateEventCount: candidate.events.length,
      matchedEventCount: matches.length,
      eventCoverage: baseline.events.length === 0 ? 0 : Number((matches.length / baseline.events.length).toFixed(3)),
      meanAbsoluteTimingErrorMinutes: round(average(timingErrors), 2),
      meanTimingBiasMinutes: round(average(timingBiases), 2),
      maxAbsoluteTimingErrorMinutes: round(max(timingErrors), 2),
      meanAbsoluteLevelErrorMeters: round(average(levelErrors), 3),
      maxAbsoluteLevelErrorMeters: round(max(levelErrors), 3),
      supportsHeightComparison: baseline.supportsHeightComparison && candidate.supportsHeightComparison,
      warnings,
    },
  }
}

async function fetchSnapshotForSource(
  location: ComparisonLocation,
  date: string,
  source: ComparisonSourceId,
): Promise<ComparisonSourceSnapshot> {
  switch (source) {
    case 'internal':
      return fetchInternalComparisonSnapshot(location, date)
    case 'worldtides':
      return fetchWorldTidesComparisonSnapshot(location, date)
    case 'stormglass':
      return fetchStormglassComparisonSnapshot(location, date)
    case 'website':
      return fetchWebsiteComparisonSnapshot(location, date)
  }
}

export async function runTideComparisonReport(
  options: RunComparisonOptions,
): Promise<TideComparisonReport> {
  const locations: LocationComparisonReport[] = []
  let availableComparisons = 0
  let unavailableComparisons = 0

  for (const location of options.locations) {
    const baseline = await fetchInternalComparisonSnapshot(location, options.date)
    const comparisons: SourceComparisonResult[] = []

    for (const sourceId of options.sources) {
      if (sourceId === 'internal') {
        continue
      }

      const snapshot = await fetchSnapshotForSource(location, options.date, sourceId)
      const comparison = compareSnapshots(
        baseline,
        snapshot,
        options.maxMatchDeltaMinutes ?? DEFAULT_MATCH_WINDOW_MINUTES,
      )

      if (snapshot.available) {
        availableComparisons += 1
      } else {
        unavailableComparisons += 1
      }

      comparisons.push(comparison)
    }

    locations.push({
      location,
      baseline,
      comparisons,
    })
  }

  return {
    generatedAt: new Date().toISOString(),
    date: options.date,
    locations,
    sourcesRequested: options.sources,
    summary: {
      totalLocations: options.locations.length,
      availableComparisons,
      unavailableComparisons,
    },
  }
}

export function renderComparisonMarkdown(report: TideComparisonReport): string {
  const lines: string[] = []

  lines.push(`# Tide Comparison Report`)
  lines.push('')
  lines.push(`- Date: ${report.date}`)
  lines.push(`- Generated: ${report.generatedAt}`)
  lines.push(`- Locations: ${report.summary.totalLocations}`)
  lines.push(`- Available comparisons: ${report.summary.availableComparisons}`)
  lines.push(`- Unavailable comparisons: ${report.summary.unavailableComparisons}`)
  lines.push('')

  for (const locationReport of report.locations) {
    lines.push(`## ${locationReport.location.name}`)
    lines.push('')
    lines.push(`- Coordinates: ${locationReport.location.lat}, ${locationReport.location.lon}`)
    if (locationReport.location.zone) {
      lines.push(`- Zone: ${locationReport.location.zone}`)
    }
    lines.push(`- Baseline events: ${locationReport.baseline.events.length}`)
    lines.push('')
    lines.push('| Source | Available | Coverage | Mean abs timing error (min) | Mean abs level error (m) | Notes |')
    lines.push('|---|---:|---:|---:|---:|---|')

    for (const comparison of locationReport.comparisons) {
      const warnings = comparison.metrics.warnings.join('; ') || '-'
      lines.push(
        `| ${comparison.source.sourceLabel} | ${comparison.source.available ? 'yes' : 'no'} | ${comparison.metrics.eventCoverage} | ${comparison.metrics.meanAbsoluteTimingErrorMinutes ?? '-'} | ${comparison.metrics.meanAbsoluteLevelErrorMeters ?? '-'} | ${warnings} |`,
      )
    }

    lines.push('')
  }

  return lines.join('\n')
}

export async function writeComparisonArtifacts(
  outputDirectory: string,
  report: TideComparisonReport,
): Promise<{ jsonPath: string; markdownPath: string }> {
  await mkdir(outputDirectory, { recursive: true })

  const safeDate = report.date.replace(/[^0-9-]/g, '')
  const jsonPath = path.join(outputDirectory, `tide-comparison-${safeDate}.json`)
  const markdownPath = path.join(outputDirectory, `tide-comparison-${safeDate}.md`)

  await writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf8')
  await writeFile(markdownPath, renderComparisonMarkdown(report), 'utf8')

  return {
    jsonPath,
    markdownPath,
  }
}