import { readFile, writeFile } from 'node:fs/promises'

import hydroStations from '../data/hydro-stations.json'
import stationConstants from '../data/station-harmonic-constants.json'
import { fitConstituents, type FitSample } from '../lib/harmonic-fit'

type HydroStation = { id: string; lat: number; lon: number; name: string }
type StationConstant = {
  stationId: string
  datum: string
  epoch: string
  levelOffsetMeters: number
  timeOffsetMinutes?: number
  qualityScore: number
  source: string
  sourceKind?: string
  sourceCitation?: string
  constituents: Array<{ name: string; amplitude: number; phase: number }>
}

function parseArgument(name: string): string | undefined {
  return process.argv
    .slice(2)
    .find((argument) => argument.startsWith(`--${name}=`))
    ?.split('=')
    .slice(1)
    .join('=')
}

function hasFlag(name: string): boolean {
  return process.argv.slice(2).includes(`--${name}`)
}

async function main(): Promise<void> {
  const stationArg = parseArgument('station') ?? 'all'
  const outputPath = parseArgument('output') ?? 'data/station-harmonic-constants.fitted.json'
  const samplesPath = parseArgument('samples') ?? 'data/tide-hourly-samples.json'
  const write = hasFlag('write')

  const samplesByStation = JSON.parse(await readFile(samplesPath, 'utf8')) as Record<
    string,
    Array<{ time: string; level: number }>
  >

  const constants = stationConstants as StationConstant[]
  const stations = hydroStations as HydroStation[]
  const stationsById = new Map(stations.map((s) => [s.id, s]))

  const targets = stationArg === 'all' ? constants : constants.filter((c) => c.stationId === stationArg)
  if (targets.length === 0) {
    throw new Error(`No configured station matches --station=${stationArg}`)
  }

  const updated: StationConstant[] = JSON.parse(JSON.stringify(constants))
  const summary: Array<{ stationId: string; rmsResidualMeters: number; constituentCount: number; levelOffsetMeters: number }> =
    []
  const failed: Array<{ stationId: string; reason: string }> = []

  for (const constant of targets) {
    const station = stationsById.get(constant.stationId)
    if (!station) {
      console.warn(`Skipping ${constant.stationId}: not found in hydro-stations.json`)
      continue
    }

    const rawSamples = samplesByStation[constant.stationId]
    if (!rawSamples || rawSamples.length === 0) {
      console.warn(`Skipping ${constant.stationId}: no hourly samples`)
      continue
    }

    console.log(`Fitting ${constant.stationId} (${station.name}) from ${rawSamples.length} hourly samples...`)

    const samples: FitSample[] = rawSamples.map((s) => ({ time: new Date(s.time), level: s.level }))
    // Fit the widest set of constituents supported by a one-year sample window.
    // P1/K1 and K2/S2 are inferred from fixed ratios by harmonic-fit.ts to avoid
    // near-singular normal equations, so all other named constituents can be fit.
    const names = [
      'M2',
      'S2',
      'N2',
      'K2',
      '2N2',
      'NU2',
      'MU2',
      'L2',
      'LAMBDA2',
      'T2',
      'K1',
      'O1',
      'P1',
      'Q1',
      'J1',
      'M1',
      'OO1',
      'RHO1',
      '2Q1',
      'M4',
      'MS4',
      'MN4',
      'M6',
      'M8',
      'MM',
      'MF',
      'MSF',
      'SA',
      'SSA',
      'M3',
      '2MS6',
    ]

    let result
    try {
      result = fitConstituents(samples, names, station.lon)
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      console.warn(`  Skipping ${constant.stationId}: ${reason}`)
      failed.push({ stationId: constant.stationId, reason })
      continue
    }

    const target = updated.find((c) => c.stationId === constant.stationId)!
    target.constituents = result.constituents
    target.levelOffsetMeters = Number(result.offset.toFixed(3))
    target.timeOffsetMinutes = 0
    target.datum = 'LLW'
    target.sourceKind = 'field_fit'
    target.source = 'least-squares fit against Thai Navy 2026 tide table hourly heights'
    const windowDays = (samples[samples.length - 1].time.getTime() - samples[0].time.getTime()) / (1000 * 60 * 60 * 24)
    const closePairs = windowDays >= 200
      ? 'K1/P1 and S2/K2 fit directly (Rayleigh criterion satisfied for the one-year window).'
      : 'P1 inferred from K1 and K2 from S2 via fixed equilibrium ratios.'
    target.sourceCitation =
      'Amplitude/phase least-squares fit against Royal Thai Navy Hydrographic Department 2026 tide tables ' +
      `(Thai Waters, https://hydro.navy.mi.th/waterlaveltable), ${samples.length} hourly samples. ${closePairs} ` +
      'Datum: Lowest Low Water (LLW).'

    summary.push({
      stationId: constant.stationId,
      rmsResidualMeters: Number(result.rmsResidualMeters.toFixed(4)),
      constituentCount: result.constituents.length,
      levelOffsetMeters: target.levelOffsetMeters,
    })
    console.log(
      `  RMS residual: ${result.rmsResidualMeters.toFixed(4)}m, ${result.constituents.length} constituents, levelOffset ${target.levelOffsetMeters}m`,
    )
  }

  if (failed.length > 0) {
    console.log(`\n${failed.length} station(s) skipped (kept existing constituents unchanged):`)
    for (const f of failed) console.log(`  ${f.stationId}: ${f.reason}`)
  }

  await writeFile(outputPath, `${JSON.stringify(updated, null, 2)}\n`, 'utf8')
  console.log(`Wrote fitted constants: ${outputPath}`)
  console.log(JSON.stringify(summary, null, 2))

  if (write) {
    await writeFile('data/station-harmonic-constants.json', `${JSON.stringify(updated, null, 2)}\n`, 'utf8')
    console.log('Promoted fitted constants to data/station-harmonic-constants.json (--write)')
  } else {
    console.log('Dry run only (pass --write to promote to data/station-harmonic-constants.json)')
  }
}

main().catch((error) => {
  console.error('Failed to fit harmonic constituents:', error)
  process.exitCode = 1
})
