/**
 * Harmonic tide computation — public barrel.
 *
 * There is exactly one prediction engine: `./core` is the only implementation of
 * `predictTideLevel` (the former legacy `./engine` variant and its
 * `./constituents` table were dead and have been removed).
 *
 * Constituent metadata and per-region constituent selection live in
 * `./constituent-catalog` (`TIDAL_CONSTITUENTS` / `getLocationConstituents`).
 * Its values are the ones the live forecast path has always used, so they are
 * kept as-is rather than merged into `./core`'s `CONSTITUENTS_DATABASE` — the two
 * tables overlap but disagree on a handful of speeds, and merging them would
 * change predicted tide levels.
 */

// Core harmonic synthesis (live forecast path)
export * from "./core";

// Constituent fitting
export * from "./fit";

// Station-configured predictions
export * from "./station-model";

// Constituent catalog + per-region constituent selection
export type {
  DoodsonNumber,
  TidalConstituent,
  NodalCorrection,
  AstronomicalArguments,
  LocationData,
} from "./constituent-catalog";
export {
  TIDAL_CONSTITUENTS,
  getLocationConstituents,
  calculateNodalCorrection,
  getEphemeridesMetadata,
  getDeltaTSeconds,
  getLeapSecondOffset,
} from "./constituent-catalog";
