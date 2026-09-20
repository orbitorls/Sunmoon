/**
 * Report orchestration + rendering + artifact writing for tide comparison.
 *
 * Split out of lib/tide-comparison.ts (god module). Orchestrates fetching
 * snapshots, running comparisons, and writing JSON/Markdown artifacts.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { getStationHarmonicDiagnostics } from '../harmonic'
import {
  DEFAULT_MATCH_WINDOW_MINUTES,
  getSourceLabel,
  type ComparisonLocation,
  type ComparisonSourceId,
  type ComparisonSourceSnapshot,
  type SourceComparisonResult,
  type TideComparisonReport,
  type RunComparisonOptions,
} from './types'
import {
  fetchInternalComparisonSnapshot,
  fetchStormglassComparisonSnapshot,
  fetchValidationFixtureSnapshot,
  fetchWebsiteComparisonSnapshot,
  fetchWorldTidesComparisonSnapshot,
} from './sources'
import {
  buildCalibrationRecommendation,
  buildCalibrationSuggestion,
  compareSnapshots,
} from './metrics'

async function fetchSnapshotForSource(
  location: ComparisonLocation,
  date: string,
  source: ComparisonSourceId,
): Promise<ComparisonSourceSnapshot> {
  switch (source) {
    case 'internal':
      return fetchInternalComparisonSnapshot(location, date)
    case 'validation_fixture':
      return fetchValidationFixtureSnapshot(location, date)
    case 'worldtides':
      return fetchWorldTidesComparisonSnapshot(location, date)
    case 'stormglass':
      return fetchStormglassComparisonSnapshot(location, date)
    case 'website':
      return fetchWebsiteComparisonSnapshot(location, date)
  }
}

function buildUnavailableComparison(
  location: ComparisonLocation,
  date: string,
  source: ComparisonSourceId,
  reason: string,
): SourceComparisonResult {
  return compareSnapshots(
    {
      sourceId: 'internal',
      category: 'internal',
      sourceLabel: getSourceLabel('internal'),
      location,
      date,
      available: false,
      unavailableReason: reason,
      datum: null,
      datumConfidence: 'unknown',
      supportsHeightComparison: false,
      events: [],
      rawEventCount: 0,
      metadata: {},
    },
    {
      sourceId: source,
      category: source === 'validation_fixture' ? 'validation' : source === 'website' ? 'website' : 'api',
      sourceLabel: getSourceLabel(source),
      location,
      date,
      available: false,
      unavailableReason: reason,
      datum: null,
      datumConfidence: 'unknown',
      supportsHeightComparison: false,
      events: [],
      rawEventCount: 0,
      metadata: {},
    },
  )
}

export async function runTideComparisonReport(
  options: RunComparisonOptions,
): Promise<TideComparisonReport> {
  const locations: TideComparisonReport['locations'] = []
  let availableComparisons = 0
  let unavailableComparisons = 0
  let passedComparisons = 0
  let failedComparisons = 0
  let uncheckedComparisons = 0

  for (const location of options.locations) {
    const baseline = await fetchInternalComparisonSnapshot(location, options.date)
    const comparisons: SourceComparisonResult[] = []

    for (const sourceId of options.sources) {
      if (sourceId === 'internal') {
        continue
      }

      if (!baseline.available) {
        unavailableComparisons += 1
        uncheckedComparisons += 1
        comparisons.push(
          buildUnavailableComparison(
            location,
            options.date,
            sourceId,
            baseline.unavailableReason ?? 'Internal baseline is unavailable',
          ),
        )
        continue
      }

      const snapshot = await fetchSnapshotForSource(location, options.date, sourceId)
      const comparison = compareSnapshots(
        baseline,
        snapshot,
        options.maxMatchDeltaMinutes ?? DEFAULT_MATCH_WINDOW_MINUTES,
      )
      comparison.source.metadata.calibrationRecommendation = buildCalibrationRecommendation(comparison.metrics)
      comparison.calibrationSuggestion = buildCalibrationSuggestion(location, baseline, comparison)

      if (snapshot.available) {
        availableComparisons += 1
      } else {
        unavailableComparisons += 1
      }

      if (comparison.metrics.accuracyPass === true) {
        passedComparisons += 1
      } else if (comparison.metrics.accuracyPass === false) {
        failedComparisons += 1
      } else {
        uncheckedComparisons += 1
      }

      comparisons.push(comparison)
    }

    locations.push({
      location,
      baseline,
      comparisons,
    })
  }

  const stationDiagnostics = getStationHarmonicDiagnostics()

  return {
    generatedAt: new Date().toISOString(),
    date: options.date,
    locations,
    sourcesRequested: options.sources,
    summary: {
      totalLocations: options.locations.length,
      availableComparisons,
      unavailableComparisons,
      passedComparisons,
      failedComparisons,
      uncheckedComparisons,
      stationConstantsCoverage: {
        configuredStations: stationDiagnostics.configuredStations,
        totalStations: stationDiagnostics.totalStations,
        missingStations: stationDiagnostics.missingStationIds.length,
        invalidStations: stationDiagnostics.invalidStationIds.length,
      },
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
  lines.push(`- Passed comparisons: ${report.summary.passedComparisons}`)
  lines.push(`- Failed comparisons: ${report.summary.failedComparisons}`)
  lines.push(`- Unchecked comparisons: ${report.summary.uncheckedComparisons}`)
  lines.push(
    `- Station constants coverage: ${report.summary.stationConstantsCoverage.configuredStations}/${report.summary.stationConstantsCoverage.totalStations}`,
  )
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
    lines.push('| Source | Available | Pass | Coverage | Mean abs timing error (min) | Mean abs level error (m) | Notes |')
    lines.push('|---|---:|---:|---:|---:|---:|---|')

    for (const comparison of locationReport.comparisons) {
      const calibrationRecommendation = comparison.source.metadata.calibrationRecommendation
      const notes = [
        comparison.metrics.warnings.join('; '),
        typeof calibrationRecommendation === 'string' ? `calibration: ${calibrationRecommendation}` : '',
        comparison.calibrationSuggestion
          ? `suggested constants delta: timeOffsetMinutes ${comparison.calibrationSuggestion.timeOffsetMinutesDelta}, levelOffsetMeters ${comparison.calibrationSuggestion.levelOffsetMetersDelta ?? '-'}`
          : '',
      ].filter(Boolean)
      const passLabel =
        comparison.metrics.accuracyPass === null ? '-' : comparison.metrics.accuracyPass ? 'yes' : 'no'
      lines.push(
        `| ${comparison.source.sourceLabel} | ${comparison.source.available ? 'yes' : 'no'} | ${passLabel} | ${comparison.metrics.coverageStatus} (${comparison.metrics.eventCoverage}) | ${comparison.metrics.meanAbsoluteTimingErrorMinutes ?? '-'} | ${comparison.metrics.meanAbsoluteLevelErrorMeters ?? '-'} | ${notes.join('; ') || '-'} |`,
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