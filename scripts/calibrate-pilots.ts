import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import stationConstants from '../data/station-harmonic-constants.json'
import type { CalibrationSuggestion, TideComparisonReport } from '../lib/tide-comparison'

type StationConstant = (typeof stationConstants)[number]

type AggregatedSuggestion = {
  matchedEventCount: number
  weightedTimeDelta: number
  weightedLevelDelta: number
  levelWeight: number
}

function parseArgument(name: string): string | undefined {
  return process.argv
    .slice(2)
    .find((argument) => argument.startsWith(`--${name}=`))
    ?.split('=')
    .slice(1)
    .join('=')
}

async function readReports(): Promise<TideComparisonReport[]> {
  const reportDir = path.resolve('reports')
  const entries = await readdir(reportDir)
  const jsonFiles = entries.filter((name) => /^tide-comparison-.*\.json$/.test(name))
  const reports: TideComparisonReport[] = []
  for (const file of jsonFiles) {
    const raw = await readFile(path.join(reportDir, file), 'utf8')
    reports.push(JSON.parse(raw) as TideComparisonReport)
  }
  return reports
}

function collectSuggestions(reports: TideComparisonReport[]): CalibrationSuggestion[] {
  const suggestions: CalibrationSuggestion[] = []
  for (const report of reports) {
    for (const location of report.locations) {
      for (const comparison of location.comparisons) {
        if (comparison.calibrationSuggestion) {
          suggestions.push(comparison.calibrationSuggestion)
        }
      }
    }
  }
  return suggestions
}

function roundToOne(value: number): number {
  return Number(value.toFixed(1))
}

function roundToThree(value: number): number {
  return Number(value.toFixed(3))
}

async function main(): Promise<void> {
  const minEventsArg = parseArgument('min-events')
  const minMatchedEventsForCalibration = minEventsArg ? Number(minEventsArg) : 2

  const reports = await readReports()
  if (reports.length === 0) {
    throw new Error('No tide-comparison reports found in reports/')
  }
  console.log(`Aggregating ${reports.length} comparison reports`)

  const suggestions = collectSuggestions(reports)
  const aggregated = new Map<string, AggregatedSuggestion>()

  for (const suggestion of suggestions) {
    if (suggestion.matchedEventCount <= 0 || suggestion.timeOffsetMinutesDelta === null) {
      continue
    }
    const prior = aggregated.get(suggestion.stationId) ?? {
      matchedEventCount: 0,
      weightedTimeDelta: 0,
      weightedLevelDelta: 0,
      levelWeight: 0,
    }
    prior.matchedEventCount += suggestion.matchedEventCount
    prior.weightedTimeDelta += suggestion.timeOffsetMinutesDelta * suggestion.matchedEventCount
    if (suggestion.levelOffsetMetersDelta !== null) {
      prior.weightedLevelDelta += suggestion.levelOffsetMetersDelta * suggestion.matchedEventCount
      prior.levelWeight += suggestion.matchedEventCount
    }
    aggregated.set(suggestion.stationId, prior)
  }

  const constants = structuredClone(stationConstants) as StationConstant[]
  const applied: Array<{ stationId: string; timeOffsetMinutes: number; matchedEvents: number }> = []
  const skipped: string[] = []

  for (let i = 0; i < constants.length; i++) {
    const constant = constants[i]
    const suggestion = aggregated.get(constant.stationId)
    if (!suggestion) {
      skipped.push(`${constant.stationId}: no suggestions`)
      continue
    }
    if (suggestion.matchedEventCount < minMatchedEventsForCalibration) {
      skipped.push(`${constant.stationId}: only ${suggestion.matchedEventCount} matched events`)
      continue
    }

    const timeDelta = roundToOne(suggestion.weightedTimeDelta / suggestion.matchedEventCount)
    const levelDelta =
      suggestion.levelWeight > 0
        ? roundToThree(suggestion.weightedLevelDelta / suggestion.levelWeight)
        : null

    constants[i].timeOffsetMinutes = roundToOne((constant.timeOffsetMinutes ?? 0) + timeDelta)
    if (levelDelta !== null) {
      constants[i].levelOffsetMeters = roundToThree(constant.levelOffsetMeters + levelDelta)
    }
    constants[i].sourceCitation = `${constant.sourceCitation ?? ''} Pilot calibration: ${suggestion.matchedEventCount} matched validation events, timeDelta ${timeDelta}${levelDelta !== null ? `, levelDelta ${levelDelta}` : ''}.`.trim()

    applied.push({
      stationId: constant.stationId,
      timeOffsetMinutes: constants[i].timeOffsetMinutes,
      matchedEvents: suggestion.matchedEventCount,
    })
  }

  const outputPath = 'data/station-harmonic-constants.calibrated.json'
  await writeFile(outputPath, `${JSON.stringify(constants, null, 2)}\n`, 'utf8')

  console.log('Applied calibration:')
  console.table(applied)
  console.log('Skipped:', skipped.length > 0 ? skipped : 'none')
  console.log(`Wrote ${outputPath}`)
}

main().catch((error) => {
  console.error('Failed to calibrate pilot stations:', error)
  process.exitCode = 1
})
