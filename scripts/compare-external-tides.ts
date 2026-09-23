import benchmarkLocations from '@/data/forecast-benchmark-thai-coastal.json'
import hydroStations from '@/data/hydro-stations.json'
import userLocations from '@/data/accuracy-user-locations.json'
import {
  runTideComparisonReport,
  writeComparisonArtifacts,
  type ComparisonLocation,
  type ComparisonSourceId,
} from '@/lib/comparison'

function parseArgument(name: string): string | undefined {
  return process.argv
    .slice(2)
    .find((argument) => argument.startsWith(`--${name}=`))
    ?.split('=')
    .slice(1)
    .join('=')
}

function getDateArgument(): string {
  const requested = parseArgument('date')
  if (requested) {
    return requested
  }

  const now = new Date()
  const thailandNow = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return thailandNow.toISOString().slice(0, 10)
}

function getSourcesArgument(): ComparisonSourceId[] {
  const requested = parseArgument('sources')
  if (!requested) {
    return ['internal', 'validation_fixture', 'worldtides', 'stormglass', 'website']
  }

  return requested
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter((value): value is ComparisonSourceId =>
      ['internal', 'validation_fixture', 'worldtides', 'stormglass', 'website'].includes(value),
    )
}

function hasFlag(name: string): boolean {
  return process.argv.slice(2).includes(`--${name}`)
}

function buildLocations(): ComparisonLocation[] {
  const requested = parseArgument('locations')
  const sourceLocations =
    requested === 'benchmarks'
      ? [...benchmarkLocations, ...userLocations]
      : [...hydroStations, ...userLocations]

  return sourceLocations.map((location) => ({
    id: location.id,
    name: location.name,
    lat: location.lat,
    lon: location.lon,
    stationId: 'expectedStationId' in location ? location.expectedStationId : location.id,
    region: 'region' in location ? location.region : undefined,
    zone: 'zone' in location ? location.zone : undefined,
    notes: 'notes' in location ? location.notes : undefined,
  }))
}

async function main(): Promise<void> {
  const date = getDateArgument()
  const sources = getSourcesArgument()
  const locations = buildLocations()
  const report = await runTideComparisonReport({
    date,
    sources,
    locations,
  })

  const outputDirectory = parseArgument('output') ?? 'reports'
  const artifactPaths = await writeComparisonArtifacts(outputDirectory, report)

  console.log(`Compared ${report.summary.totalLocations} locations for ${report.date}`)
  console.log(`Available comparisons: ${report.summary.availableComparisons}`)
  console.log(`Unavailable comparisons: ${report.summary.unavailableComparisons}`)
  console.log(`Passed comparisons: ${report.summary.passedComparisons}`)
  console.log(`Failed comparisons: ${report.summary.failedComparisons}`)
  console.log(`Unchecked comparisons: ${report.summary.uncheckedComparisons}`)
  console.log(
    `Station constants coverage: ${report.summary.stationConstantsCoverage.configuredStations}/${report.summary.stationConstantsCoverage.totalStations}`,
  )
  console.log(`JSON report: ${artifactPaths.jsonPath}`)
  console.log(`Markdown report: ${artifactPaths.markdownPath}`)

  if (hasFlag('strict') && report.summary.failedComparisons > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('Failed to generate external tide comparison report:', error)
  process.exitCode = 1
})
