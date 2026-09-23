import { readFile, writeFile } from 'node:fs/promises'

import stationConstants from '@/data/station-harmonic-constants.json'
import { applyCalibrationSuggestions } from '@/lib/comparison/tide-calibration-apply'
import type { TideComparisonReport } from '@/lib/comparison'

function parseArgument(name: string): string | undefined {
  return process.argv
    .slice(2)
    .find((argument) => argument.startsWith(`--${name}=`))
    ?.split('=')
    .slice(1)
    .join('=')
}

async function readReport(path: string): Promise<TideComparisonReport> {
  return JSON.parse(await readFile(path, 'utf8')) as TideComparisonReport
}

async function main(): Promise<void> {
  const reportPath = parseArgument('report')
  if (!reportPath) {
    throw new Error('Missing --report=<path-to-tide-comparison-json>')
  }

  const outputPath = parseArgument('output') ?? 'data/station-harmonic-constants.calibrated.json'
  const report = await readReport(reportPath)
  const result = applyCalibrationSuggestions(stationConstants, report)

  await writeFile(`${outputPath}.summary.json`, JSON.stringify(result.applied, null, 2), 'utf8')
  await writeFile(outputPath, `${JSON.stringify(result.constants, null, 2)}\n`, 'utf8')

  console.log(`Applied calibration suggestions: ${result.applied.length}`)
  console.log(`Skipped calibration suggestions: ${result.skippedSuggestions}`)
  console.log(
    `Stations below minimum sample size (need >=1 lunar month of matched events): ${result.insufficientSampleStations.join(', ') || 'none'}`,
  )
  console.log(`Calibrated constants: ${outputPath}`)
  console.log(`Calibration summary: ${outputPath}.summary.json`)
}

main().catch((error) => {
  console.error('Failed to apply tide calibration suggestions:', error)
  process.exitCode = 1
})
