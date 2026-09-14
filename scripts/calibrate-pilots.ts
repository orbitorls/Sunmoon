import { writeFile } from 'node:fs/promises'

import stationConstants from '../data/station-harmonic-constants.json'
import hydroStations from '../data/hydro-stations.json'
import validationFixtures from '../data/tide-validation-events.json'
import { CONSTITUENTS_DATABASE, findHighLowTides, type TideConstituent } from '../lib/harmonic-tide-core'
import { getThailandDayBoundsFromIsoDate } from '../lib/thailand-time'

const MIN_MATCHED_EVENTS = 4
const TIME_OFFSET_RANGE_MINUTES = { min: -360, max: 360, step: 1 }
const DEFAULT_EPOCH = new Date('2000-01-01T00:00:00Z')

type StationConstant = (typeof stationConstants)[number]
type ValidationFixture = (typeof validationFixtures)[number]
type HydroStation = (typeof hydroStations)[number]

function toConstituents(constants: StationConstant): TideConstituent[] {
  return constants.constituents
    .map((item) => {
      const definition = CONSTITUENTS_DATABASE[item.name]
      if (!definition || !Number.isFinite(item.amplitude) || !Number.isFinite(item.phase)) {
        return null
      }
      return {
        name: item.name,
        speed: definition.speed,
        amplitude: item.amplitude,
        phase: item.phase,
        description: definition.description,
      }
    })
    .filter((item): item is TideConstituent => item !== null)
}

function parseEpoch(epoch: string): Date {
  const parsed = new Date(epoch)
  return Number.isFinite(parsed.getTime()) ? parsed : DEFAULT_EPOCH
}

function clockMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

const MINUTES_PER_DAY = 24 * 60

function normalizeDayMinutes(m: number): number {
  return ((m % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
}

function dayMinutesDistance(a: number, b: number): number {
  const diff = Math.abs(normalizeDayMinutes(a) - normalizeDayMinutes(b))
  return Math.min(diff, MINUTES_PER_DAY - diff)
}

function roundToOne(value: number): number {
  return Number(value.toFixed(1))
}

function roundToThree(value: number): number {
  return Number(value.toFixed(3))
}

interface PredictedEvent {
  minutes: number
  level: number
  type: 'high' | 'low'
}

interface FixtureEvents {
  date: string
  observed: Array<{ minutes: number; type: 'high' | 'low'; level: number }>
}

function predictDayEvents(
  constant: StationConstant,
  station: HydroStation,
  date: string,
): PredictedEvent[] | null {
  const { start, end } = getThailandDayBoundsFromIsoDate(date)
  const constituents = toConstituents(constant)
  if (constituents.length === 0) {
    return null
  }

  const epoch = parseEpoch(constant.epoch)
  // Match lib/station-harmonic-model.ts: shift the synthesis window by
  // -timeOffsetMinutes, then add the offset back onto reported event times.
  const timeOffsetMinutes = Number.isFinite(constant.timeOffsetMinutes)
    ? constant.timeOffsetMinutes ?? 0
    : 0
  const shiftedStart = new Date(start.getTime() - timeOffsetMinutes * 60 * 1000)
  const shiftedEnd = new Date(end.getTime() - timeOffsetMinutes * 60 * 1000)
  const extremes = findHighLowTides(shiftedStart, shiftedEnd, constituents, 5, station.lon, epoch)

  return extremes.map((event) => {
    const actualTime = new Date(event.time.getTime() + timeOffsetMinutes * 60 * 1000)
    const minutes = Math.round((actualTime.getTime() - start.getTime()) / (60 * 1000))
    return {
      minutes,
      level: event.level,
      type: event.type,
    }
  })
}

function scoreOffset(
  fixtures: FixtureEvents[],
  predictedByDate: Map<string, PredictedEvent[]>,
  offset: number,
): { mae: number; matched: number } {
  let totalError = 0
  let matched = 0

  for (const fixture of fixtures) {
    const predicted = predictedByDate.get(fixture.date)
    if (!predicted || predicted.length === 0) {
      continue
    }

    for (const obs of fixture.observed) {
      const sameType = predicted.filter((p) => p.type === obs.type)
      if (sameType.length === 0) {
        continue
      }

      let best = Infinity
      for (const p of sameType) {
        // When predictions already embed timeOffsetMinutes (runtime-aligned
        // predictDayEvents), pass offset=0. During the offset search, predictions
        // are built with timeOffsetMinutes=0 and offset is applied here.
        const predictedMinutes = p.minutes + offset
        const dist = dayMinutesDistance(obs.minutes, predictedMinutes)
        if (dist < best) {
          best = dist
        }
      }

      totalError += best
      matched++
    }
  }

  if (matched === 0) {
    return { mae: Infinity, matched: 0 }
  }
  return { mae: totalError / matched, matched }
}

function findBestTimeOffset(
  fixtures: FixtureEvents[],
  predictedByDate: Map<string, PredictedEvent[]>,
): { offset: number; mae: number } {
  let bestOffset = 0
  let bestMae = Infinity

  for (
    let offset = TIME_OFFSET_RANGE_MINUTES.min;
    offset <= TIME_OFFSET_RANGE_MINUTES.max;
    offset += TIME_OFFSET_RANGE_MINUTES.step
  ) {
    const { mae } = scoreOffset(fixtures, predictedByDate, offset)
    if (mae < bestMae) {
      bestMae = mae
      bestOffset = offset
    }
  }

  return { offset: bestOffset, mae: bestMae }
}

function computeLevelOffset(
  fixtures: FixtureEvents[],
  predictedByDate: Map<string, PredictedEvent[]>,
  timeOffset: number,
): number | null {
  let total = 0
  let count = 0

  for (const fixture of fixtures) {
    const predicted = predictedByDate.get(fixture.date)
    if (!predicted || predicted.length === 0) {
      continue
    }

    for (const obs of fixture.observed) {
      const sameType = predicted.filter((p) => p.type === obs.type)
      if (sameType.length === 0) {
        continue
      }

      let best: PredictedEvent | null = null
      let bestDist = Infinity
      for (const p of sameType) {
        const predictedMinutes = p.minutes + timeOffset
        const dist = dayMinutesDistance(obs.minutes, predictedMinutes)
        if (dist < bestDist) {
          bestDist = dist
          best = p
        }
      }

      if (best) {
        total += obs.level - best.level
        count++
      }
    }
  }

  return count > 0 ? total / count : null
}

function rebuildPredictedByDate(
  constant: StationConstant,
  station: HydroStation,
  fixtures: ValidationFixture[],
): Map<string, PredictedEvent[]> {
  const predictedByDate = new Map<string, PredictedEvent[]>()
  for (const fixture of fixtures) {
    const events = predictDayEvents(constant, station, fixture.date)
    if (events && events.length > 0) {
      predictedByDate.set(fixture.date, events)
    }
  }
  return predictedByDate
}

const PHASE_REFINE_NAMES = ['M2', 'S2', 'N2', 'K1', 'O1', 'M4', 'MS4', 'MN4', 'M6']

/**
 * Coordinate-descent phase nudge for major / shallow-water constituents.
 * Candidate phases are accepted only when full-set MAE improves (subsample
 * search proposes; full set decides) to avoid overfitting a day subsample.
 */
function refineConstituentPhases(
  constant: StationConstant,
  station: HydroStation,
  fixtures: ValidationFixture[],
  observedEvents: FixtureEvents[],
  timeOffset: number,
): { mae: number; adjusted: string[] } {
  const sampleFixtures = fixtures.filter((_, index) => index % 6 === 0)
  const sampleObserved = observedEvents.filter((_, index) => index % 6 === 0)
  let fullPredicted = rebuildPredictedByDate(constant, station, fixtures)
  let { mae: bestFullMae } = scoreOffset(observedEvents, fullPredicted, timeOffset)
  const adjusted: string[] = []

  for (let pass = 0; pass < 2; pass++) {
    for (const name of PHASE_REFINE_NAMES) {
      const constituent = constant.constituents.find((item) => item.name === name)
      if (!constituent) {
        continue
      }

      const originalPhase = constituent.phase
      let samplePredicted = rebuildPredictedByDate(constant, station, sampleFixtures)
      let { mae: sampleMae } = scoreOffset(sampleObserved, samplePredicted, timeOffset)
      let proposedPhase = originalPhase

      for (const delta of [-8, -6, -4, -2, -1, 1, 2, 4, 6, 8]) {
        constituent.phase = (originalPhase + delta + 360) % 360
        samplePredicted = rebuildPredictedByDate(constant, station, sampleFixtures)
        const { mae } = scoreOffset(sampleObserved, samplePredicted, timeOffset)
        if (mae < sampleMae - 0.05) {
          sampleMae = mae
          proposedPhase = constituent.phase
        }
      }

      // Fine search around the subsample proposal
      const fineCenter = proposedPhase
      for (const delta of [-1.5, -0.5, 0.5, 1.5]) {
        constituent.phase = (fineCenter + delta + 360) % 360
        samplePredicted = rebuildPredictedByDate(constant, station, sampleFixtures)
        const { mae } = scoreOffset(sampleObserved, samplePredicted, timeOffset)
        if (mae < sampleMae - 0.05) {
          sampleMae = mae
          proposedPhase = constituent.phase
        }
      }

      constituent.phase = proposedPhase
      fullPredicted = rebuildPredictedByDate(constant, station, fixtures)
      const { mae: fullMae } = scoreOffset(observedEvents, fullPredicted, timeOffset)
      if (fullMae < bestFullMae - 0.05) {
        bestFullMae = fullMae
        adjusted.push(`${name}:${originalPhase.toFixed(1)}→${proposedPhase.toFixed(1)}`)
      } else {
        constituent.phase = originalPhase
      }
    }
  }

  return { mae: bestFullMae, adjusted }
}

async function main() {
  const fixturesByStation = new Map<string, ValidationFixture[]>()
  for (const fixture of validationFixtures) {
    const stationId = fixture.stationId
    if (!stationId) {
      continue
    }
    const list = fixturesByStation.get(stationId) ?? []
    list.push(fixture)
    fixturesByStation.set(stationId, list)
  }

  const calibrated = structuredClone(stationConstants) as StationConstant[]
  const results: Array<{
    stationId: string
    timeOffsetMinutes: number
    levelOffsetMeters: number
    maeMinutes: number
    matchedEvents: number
    phaseAdjustments: string
  }> = []

  for (let i = 0; i < calibrated.length; i++) {
    const constant = calibrated[i]
    const fixtures = fixturesByStation.get(constant.stationId)
    const station = (hydroStations as HydroStation[]).find((s) => s.id === constant.stationId)

    if (!fixtures || fixtures.length === 0 || !station) {
      continue
    }

    const observedEvents: FixtureEvents[] = fixtures.map((fixture) => ({
      date: fixture.date,
      observed: fixture.events.map((event) => ({
        minutes: clockMinutes(event.time),
        type: event.type as "high" | "low",
        level: event.level ?? 0,
      })),
    }))

    // Offset search must start from an unshifted synthesis (timeOffsetMinutes=0).
    constant.timeOffsetMinutes = 0
    let predictedByDate = rebuildPredictedByDate(constant, station, fixtures)

    const totalEventCount = observedEvents.reduce((sum, f) => sum + f.observed.length, 0)
    if (totalEventCount < MIN_MATCHED_EVENTS) {
      console.log(`${constant.stationId}: skipped, only ${totalEventCount} events`)
      continue
    }

    const { offset, mae: offsetMae } = findBestTimeOffset(observedEvents, predictedByDate)
    console.log(`${constant.stationId}: offset ${offset} min → MAE ${roundToOne(offsetMae)} (pre-phase)`)

    // Embed the offset into predictions the same way runtime does, then refine
    // phases against offset=0 scoring on those shifted predictions.
    constant.timeOffsetMinutes = roundToOne(offset)
    const { adjusted } = refineConstituentPhases(constant, station, fixtures, observedEvents, 0)
    predictedByDate = rebuildPredictedByDate(constant, station, fixtures)
    const { mae: finalMae } = scoreOffset(observedEvents, predictedByDate, 0)
    const levelOffset = computeLevelOffset(observedEvents, predictedByDate, 0)

    if (levelOffset !== null) {
      constant.levelOffsetMeters = roundToThree(levelOffset)
      constant.datum = 'LLW'
    }
    const phaseNote =
      adjusted.length > 0 ? ` Phase refined (${adjusted.join(', ')}).` : ''
    constant.sourceCitation =
      `${constant.sourceCitation ?? ''} Calibrated against ${totalEventCount} official Thai Navy tide-table fixtures (2026); timing MAE ${roundToOne(finalMae)} min.${phaseNote}`.trim()

    results.push({
      stationId: constant.stationId,
      timeOffsetMinutes: constant.timeOffsetMinutes,
      levelOffsetMeters: constant.levelOffsetMeters,
      maeMinutes: roundToOne(finalMae),
      matchedEvents: totalEventCount,
      phaseAdjustments: adjusted.join('; ') || '(none)',
    })
  }

  const outputPath = 'data/station-harmonic-constants.calibrated.json'
  await writeFile(outputPath, `${JSON.stringify(calibrated, null, 2)}\n`, 'utf8')

  console.log('Calibration results:')
  console.table(results)
  console.log(`Wrote ${outputPath}`)
}

main().catch((error) => {
  console.error('Failed to calibrate pilot stations:', error)
  process.exitCode = 1
})
