# Tide Accuracy Improvement Design

## Date
2026-07-29

## Goal
Improve tide prediction accuracy and coverage with the following targets:

- **A)** Reduce timing error for the 4 pilot stations (Bangkok Inner Gulf, Ko Si Chang, Koh Samui, Phuket Andaman) to within ±15 minutes for high/low tide events.
- **B)** Expand usable harmonic-constant coverage from 4 stations toward as many of the 38 configured stations as possible.
- **C)** Improve water-level (level/datum) accuracy where real datum or observed levels are available.

## Constraints

- Offline-first: predictions must work without network after data pack is loaded.
- No paid API key is guaranteed.
- Existing tooling and data (`scripts/import-ticon-constituents.ts`, `@neaps/tide-database`, `data/tide-validation-events.json`, `lib/harmonic-fit.ts`) may be reused.

## Approach

Use a hybrid of **A (TICON-4 import)** and **C (manual validation fixtures)**, with **B (fixture-driven harmonic fit)** as an optional fallback for stations that accumulate enough dense, continuous or high/low fixtures.

### Why this combination

- TICON-4 provides real published harmonic constants and datums, offline and free. It is the fastest way to get realistic amplitude, phase and `levelOffsetMeters` for many stations.
- Manual fixtures let us correct time and level offsets for the Thai stations where TICON coverage is poor or the nearest gauge is too far.
- Fixture-driven fitting with `lib/harmonic-fit.ts` is only viable when we have a long-enough continuous level series or enough high/low points to synthesize one; the current validation fixtures are mostly high/low only, so this is a later enhancement.

## Architecture

### Components

1. **`scripts/import-ticon-constituents.ts`**  
   Imports real harmonic constants from the TICON-4 dataset (`@neaps/tide-database`) into `data/station-harmonic-constants.json`. For each station it picks the nearest published gauge within 150 km, maps constituents to the project database, applies the documented +180 degree phase correction, and uses the gauge’s published `MSL` and chart-datum values for `levelOffsetMeters`.

2. **`scripts/calibrate-pilots.ts` (extended to cover every station with fixtures)**  
   Reads `data/tide-validation-events.json` and the comparison reports in `reports/`, aggregates `timeOffsetMinutesDelta` and `levelOffsetMetersDelta` per station weighted by matched event count, and writes `data/station-harmonic-constants.calibrated.json`.

3. **`lib/station-harmonic-model.ts`**  
   Loads `data/station-harmonic-constants.calibrated.json` at runtime so the calibrated offsets are applied to predictions.

4. **`lib/tide-comparison.ts` and `scripts/compare-external-tides.ts`**  
   Generates before/after comparison reports for 4 benchmark stations and 38 stations against validation fixtures.

### Data Flow

```
TICON-4 import
      ↓
data/station-harmonic-constants.json (real constants, real datums where available)
      ↓
Manual fixture collection / expansion of data/tide-validation-events.json
      ↓
Calibration script
      ↓
data/station-harmonic-constants.calibrated.json (constants + per-station offsets)
      ↓
lib/station-harmonic-model.ts
      ↓
forecast-facade, API routes, LINE integration
      ↓
compare-external-tides.ts benchmark reports
```

## Per-station constant selection rules

For each station, pick the best available source in this order:

1. **TICON-4 import** if a gauge exists within 150 km and contains the major constituents (M2, S2, K1, O1).
2. **Manual fixture fit** if there is at least one lunar month of matched high/low events (≥60 events or ≥30 days of fixtures) and a reliable continuous or synthesized level series can be built.
3. **Seed constant fallback** for everything else.

## Manual fixture format

`data/tide-validation-events.json` records remain the same shape:

```json
{
  "locationId": "benchmark-upper-gulf-bangkok",
  "stationId": "hydro-1",
  "date": "2026-08-15",
  "source": "official_prediction",
  "events": [
    { "type": "low", "time": "03:40", "level": 0.42 },
    { "type": "high", "time": "08:38", "level": 1.85 }
  ]
}
```

- `level` is optional; where provided it enables level calibration.
- `source` must be one of the allowed validation event sources (`official_prediction`, `field_measurement`, `manual_reference`, etc.).

## Calibration rules

- Aggregate `timeOffsetMinutesDelta` per station across all reports weighted by `matchedEventCount`.
- Use the existing `calibrate-pilots.ts` algorithm, but use a lower minimum threshold (2 matched events) so every station with fixtures can receive a time offset.
- Apply `levelOffsetMetersDelta` only when `supportsHeightComparison` is true in the comparison report.
- Round `timeOffsetMinutes` to 1 decimal and `levelOffsetMeters` to 3 decimals.

## Error handling

- If TICON import finds no gauge within 150 km, keep the seed and log `status: too far`.
- If TICON lacks major constituents, keep the seed and log `status: missing majors`.
- If a station has no fixtures, it keeps the imported/seed constants without offset.
- `npx tsc --noEmit` and `npx jest tests/lib/domain` must pass before any calibration output is promoted.

## Testing and acceptance

1. Run `import-ticon-constituents` and check the summary table for coverage.
2. Run `calibrate-stations` and verify `station-harmonic-constants.calibrated.json` is produced.
3. Run `compare-external-tides.ts` for each validation-fixture date (`2026-06-20` through `2026-08-15`) and read the generated `reports/tide-comparison-<date>.md`.
4. Acceptance thresholds:
   - **Pilot stations** on `2026-08-15`: mean absolute timing error ≤15 minutes.
   - **All 38 stations** when fixtures exist: mean absolute timing error ≤30 minutes.
   - **Level** accuracy is a secondary target; once fixtures include `level`, mean absolute level error ≤0.10 m.

## Out of scope

- Real-time online refitting (offline-first constraint).
- Fetching new WorldTides / Stormglass data without an available API key.
- Rewriting the harmonic engine; the existing `lib/harmonic-tide-core.ts` remains unchanged.

## Risks

- TICON may not have a nearby Thai gauge for every station, especially the Gulf stations.
- Manual fixtures are slow and may be incomplete.
- `level` data is sparse, so level accuracy may not reach 0.10 m in this phase.
