/**
 * Tide forecast performance harness.
 *
 * Measures the hot paths behind the forecast facade so optimizations can be
 * compared against a committed baseline. Run:
 *
 *   pnpm tsx scripts/perf/bench-tide.ts --label=baseline --out=reports/perf/bench-tide-baseline.json
 *   pnpm tsx scripts/perf/bench-tide.ts --label=after   --out=reports/perf/bench-tide-after.json
 *
 * The output is a JSON document with median wall-clock times; diff two runs to
 * see the effect of a change. Nothing here is a pass/fail gate on its own.
 */
import { performance } from 'node:perf_hooks';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { CONSTITUENTS_DATABASE, createPredictionSeries, predictTideLevel } from '@/lib/harmonic/core';
import { getStationHarmonicDayPrediction } from '@/lib/harmonic/station-model';

type BenchResult = {
  label: string;
  generatedAt: string;
  node: string;
  runs: Record<string, { iterations: number; medianMs: number; meanMs: number; p95Ms: number }>;
};

const BANGKOK = { lat: 13.6427, lon: 100.5976 };
const BENCH_DATE = new Date('2026-03-24T06:00:00Z');

const CONSTITUENTS = ['M2', 'S2', 'N2', 'K1', 'O1', 'K2', 'P1', 'Q1', 'M4', 'MS4'].map((name) => ({
  name,
  speed: CONSTITUENTS_DATABASE[name].speed,
  amplitude: 0.3,
  phase: 120,
  description: CONSTITUENTS_DATABASE[name].description,
}));

function parseArg(name: string): string | undefined {
  return process.argv
    .slice(2)
    .find((argument) => argument.startsWith(`--${name}=`))
    ?.split('=')
    .slice(1)
    .join('=');
}

function percentile(sorted: number[], fraction: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.floor(fraction * sorted.length));
  return sorted[index];
}

async function measure(
  name: string,
  iterations: number,
  warmup: number,
  fn: (iteration: number) => void | Promise<void>,
): Promise<BenchResult['runs'][string]> {
  for (let i = 0; i < warmup; i++) {
    await fn(i);
  }

  const samples: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn(i);
    samples.push(performance.now() - start);
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const meanMs = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  return {
    iterations,
    medianMs: Number(percentile(sorted, 0.5).toFixed(4)),
    meanMs: Number(meanMs.toFixed(4)),
    p95Ms: Number(percentile(sorted, 0.95).toFixed(4)),
  };
}

async function main(): Promise<void> {
  const label = parseArg('label') ?? 'unlabeled';
  const out = parseArg('out') ?? 'reports/perf/bench-tide.json';

  // Warm the module graph (JSON imports, constituent tables, ephemerides).
  predictTideLevel(BENCH_DATE, CONSTITUENTS, BANGKOK.lon);

  const runs: BenchResult['runs'] = {};

  runs['predictTideLevel (1 point)'] = await measure('predictTideLevel', 2000, 200, () => {
    predictTideLevel(BENCH_DATE, CONSTITUENTS, BANGKOK.lon);
  });

  runs['createPredictionSeries (24h @60min)'] = await measure('series24h60', 100, 10, () => {
    createPredictionSeries(BENCH_DATE, new Date(BENCH_DATE.getTime() + 24 * 3600 * 1000), CONSTITUENTS, 60, BANGKOK.lon);
  });

  runs['getStationHarmonicDayPrediction (24h)'] = await measure('stationDay', 100, 10, () => {
    getStationHarmonicDayPrediction(BANGKOK, BENCH_DATE, 60);
  });

  const result: BenchResult = {
    label,
    generatedAt: new Date().toISOString(),
    node: process.version,
    runs,
  };

  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  console.log(`\nTide forecast benchmark — ${label} (node ${process.version})`);
  console.log('─'.repeat(72));
  for (const [name, run] of Object.entries(runs)) {
    console.log(
      `${name.padEnd(44)} median ${String(run.medianMs).padStart(9)} ms   p95 ${String(run.p95Ms).padStart(9)} ms`,
    );
  }
  console.log(`\nWrote ${out}\n`);
}

main().catch((error) => {
  console.error('Benchmark failed:', error);
  process.exitCode = 1;
});
