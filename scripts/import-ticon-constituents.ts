// One-off import: pull real published harmonic constituents from the free,
// no-API-key TICON-4 dataset (@neaps/tide-database, CC BY 4.0) for our
// configured hydro stations, replacing the internal placeholder "seed"
// constants where a close-enough TICON gauge exists.
import { writeFile } from 'node:fs/promises'

import hydroStations from '../data/hydro-stations.json'
import stationConstants from '../data/station-harmonic-constants.json'
import { CONSTITUENTS_DATABASE } from '../lib/harmonic-tide-core'

// Same threshold lib/station-harmonic-model.ts uses to refuse a
// too-far station match -- a TICON gauge further than this is not a
// trustworthy proxy for the station's own tide.
const DEFAULT_MAX_STATION_DISTANCE_KM = 150

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

function hasFlag(name: string): boolean {
  return process.argv.slice(2).includes(`--${name}`)
}

function parseArgument(name: string): string | undefined {
  return process.argv
    .slice(2)
    .find((argument) => argument.startsWith(`--${name}=`))
    ?.split('=')
    .slice(1)
    .join('=')
}

async function main(): Promise<void> {
  // Dynamic import: @neaps/tide-database's ESM/CJS interop for its bundled
  // kdbush dependency breaks under tsx's CJS transform on a static import;
  // a dynamic import resolves it via Node's native ESM loader instead.
  const { near } = await import('@neaps/tide-database')

  const write = hasFlag('write')
  const stationArg = parseArgument('station') ?? 'all'
  const maxDistanceArg = parseArgument('max-distance')
  const maxDistanceKm = maxDistanceArg ? Number(maxDistanceArg) : DEFAULT_MAX_STATION_DISTANCE_KM
  const outputPath = parseArgument('output') ?? 'data/station-harmonic-constants.json'

  const constants = stationConstants as StationConstant[]
  const stations = hydroStations as HydroStation[]
  const stationsById = new Map(stations.map((s) => [s.id, s]))

  const targets = stationArg === 'all' ? constants : constants.filter((c) => c.stationId === stationArg)
  if (targets.length === 0) {
    throw new Error(`No configured station matches --station=${stationArg}`)
  }

  const updated: StationConstant[] = JSON.parse(JSON.stringify(constants))
  const rows: Array<{
    stationId: string
    gauge: string
    distanceKm: string
    mapped: number
    dropped: number
    status: string
  }> = []
  const unmappedNames = new Set<string>()

  for (const constant of targets) {
    const station = stationsById.get(constant.stationId)
    if (!station) {
      console.warn(`Skipping ${constant.stationId}: not found in hydro-stations.json`)
      continue
    }

    const matches = near({ lat: station.lat, lon: station.lon, includeAll: true, maxResults: 1 })
    if (matches.length === 0) {
      rows.push({ stationId: constant.stationId, gauge: '(none)', distanceKm: '-', mapped: 0, dropped: 0, status: 'no TICON data' })
      continue
    }

    const [gauge, distanceKm] = matches[0]
    if (distanceKm > maxDistanceKm) {
      rows.push({
        stationId: constant.stationId,
        gauge: `${gauge.name}, ${gauge.country}`,
        distanceKm: distanceKm.toFixed(1),
        mapped: 0,
        dropped: 0,
        status: `too far (>${maxDistanceKm}km) -- skipped`,
      })
      continue
    }

    // TICON-4's published phase and lib/harmonic-tide-core.ts's `cos(angle -
    // phase)` reconstruction disagree by a fixed 180 degrees -- verified by
    // comparing predicted vs. official DHN high/low events on two separate
    // dates for the one station this script actually writes (hydro-36):
    // without the correction every high/low label comes out inverted while
    // turning-point *times* already line up closely; with it, labels match
    // and mean timing error drops to ~12-34min. Applying it here (once, at
    // import) rather than in the shared engine keeps this TICON-specific
    // convention fix out of harmonic-tide-core.ts, which every other source
    // (including the WorldTides-fitted stations) still relies on unchanged.
    const TICON_PHASE_CORRECTION_DEGREES = 180
    const mappedConstituents: Array<{ name: string; amplitude: number; phase: number }> = []
    for (const c of gauge.harmonic_constituents ?? []) {
      if (CONSTITUENTS_DATABASE[c.name]) {
        mappedConstituents.push({
          name: c.name,
          amplitude: c.amplitude,
          phase: Number(((c.phase + TICON_PHASE_CORRECTION_DEGREES) % 360).toFixed(3)),
        })
      } else {
        unmappedNames.add(c.name)
      }
    }

    const majorNames = ['M2', 'S2', 'K1', 'O1']
    const hasMajors = majorNames.every((n) => mappedConstituents.some((m) => m.name === n))
    if (mappedConstituents.length === 0 || !hasMajors) {
      rows.push({
        stationId: constant.stationId,
        gauge: `${gauge.name}, ${gauge.country}`,
        distanceKm: distanceKm.toFixed(1),
        mapped: mappedConstituents.length,
        dropped: (gauge.harmonic_constituents?.length ?? 0) - mappedConstituents.length,
        status: 'missing major constituents -- skipped',
      })
      continue
    }

    // TICON constituents describe the oscillation around the gauge's own
    // MSL. Our levelOffsetMeters is added to that oscillation as the level
    // above the *displayed* datum. TICON publishes its own observed datums
    // (CC BY 4.0), so prefer MSL-above-chart-datum from the gauge itself
    // over the existing seed's guessed 1.2m when available.
    const datums = gauge.datums ?? {}
    const msl = datums.MSL
    const chartDatumValue = datums[gauge.chart_datum as string]
    const hasRealDatum = typeof msl === 'number' && typeof chartDatumValue === 'number'
    const levelOffsetMeters = hasRealDatum ? Number((msl - chartDatumValue).toFixed(3)) : constant.levelOffsetMeters
    const datum = hasRealDatum ? gauge.chart_datum : constant.datum

    const target = updated.find((c) => c.stationId === constant.stationId)!
    target.constituents = mappedConstituents
    target.datum = datum as string
    target.levelOffsetMeters = levelOffsetMeters
    // No basis for a manual clock correction on an imported nearest-gauge
    // fit (unlike fit-harmonic-constituents.ts, which fits against the
    // station's own WorldTides series) -- leave uncorrected rather than
    // carry over the old seed's fitted offset for a different signal.
    target.timeOffsetMinutes = 0
    target.sourceKind = 'field_fit'
    target.source = `TICON-4 nearest-gauge import (${gauge.name}, ${gauge.country}), ${distanceKm.toFixed(1)}km away`
    target.sourceCitation =
      `TICON-4 (Piccioni et al., GESLA-4 sea-level records, CC BY 4.0, https://www.seanoe.org/data/00980/109129/) -- ` +
      `nearest published gauge "${gauge.name}" (${gauge.country}) at ${distanceKm.toFixed(1)}km, not this station's own ` +
      `observation. ${hasRealDatum ? `levelOffsetMeters is the gauge's observed MSL-above-${gauge.chart_datum} (${levelOffsetMeters}m).` : 'levelOffsetMeters carried over from prior placeholder (no observed datum published).'} ` +
      `${mappedConstituents.length}/${gauge.harmonic_constituents?.length ?? 0} published constituents matched our constituent database. ` +
      `Phase values shifted +${TICON_PHASE_CORRECTION_DEGREES} degrees vs TICON-4's raw publication to align with this ` +
      `engine's cos(angle - phase) convention -- verified against official DHN validation events in ` +
      'data/tide-validation-events.json (high/low labels only match with this shift applied), not an unverified guess.'

    rows.push({
      stationId: constant.stationId,
      gauge: `${gauge.name}, ${gauge.country}`,
      distanceKm: distanceKm.toFixed(1),
      mapped: mappedConstituents.length,
      dropped: (gauge.harmonic_constituents?.length ?? 0) - mappedConstituents.length,
      status: write ? 'written' : 'would write (dry run)',
    })
  }

  console.log('\nStation      | Matched TICON gauge          | Dist(km) | Mapped | Dropped | Status')
  console.log('-------------|-------------------------------|----------|--------|---------|-------')
  for (const r of rows) {
    console.log(
      `${r.stationId.padEnd(12)} | ${r.gauge.padEnd(29)} | ${r.distanceKm.padStart(8)} | ${String(r.mapped).padStart(6)} | ${String(r.dropped).padStart(7)} | ${r.status}`,
    )
  }

  if (unmappedNames.size > 0) {
    console.log(`\nTICON constituent names with no match in CONSTITUENTS_DATABASE (dropped): ${[...unmappedNames].sort().join(', ')}`)
  }

  if (write) {
    await writeFile(outputPath, `${JSON.stringify(updated, null, 2)}\n`, 'utf8')
    console.log(`\nWrote ${outputPath} (--write)`)
  } else {
    console.log(`\nDry run only (pass --write to promote to ${outputPath})`)
  }
}

main().catch((error) => {
  console.error('Failed to import TICON-4 constituents:', error)
  process.exitCode = 1
})
