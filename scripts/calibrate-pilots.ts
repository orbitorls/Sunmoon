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
  const extremes = findHighLowTides(start, end, constituents, 10, station.lon, epoch)

  return extremes.map((event) => {
    const minutes = Math.round((event.time.getTime() - start.getTime()) / (60 * 1000))
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
        type: event.type,
        level: event.level ?? 0,
      })),
    }))

    const predictedByDate = new Map<string, PredictedEvent[]>()
    for (const fixture of fixtures) {
      const events = predictDayEvents(constant, station, fixture.date)
      if (events && events.length > 0) {
        predictedByDate.set(fixture.date, events)
      }
    }

    const totalEventCount = observedEvents.reduce((sum, f) => sum + f.observed.length, 0)
    if (totalEventCount < MIN_MATCHED_EVENTS) {
      console.log(`${constant.stationId}: skipped, only ${totalEventCount} events`)
      continue
    }

    const { offset, mae } = findBestTimeOffset(observedEvents, predictedByDate)
    const levelOffset = computeLevelOffset(observedEvents, predictedByDate, offset)

    constant.timeOffsetMinutes = roundToOne(offset)
    if (levelOffset !== null) {
      constant.levelOffsetMeters = roundToThree(levelOffset)
      constant.datum = 'LLW'
    }
    constant.sourceCitation = `${constant.sourceCitation ?? ''} Calibrated against ${totalEventCount} official Thai Navy tide-table fixtures (2026); timing MAE ${roundToOne(mae)} min`.trim()

    results.push({
      stationId: constant.stationId,
      timeOffsetMinutes: constant.timeOffsetMinutes,
      levelOffsetMeters: constant.levelOffsetMeters,
      maeMinutes: roundToOne(mae),
      matchedEvents: totalEventCount,
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
