# Sunmoon Domain Glossary

## Accuracy Threshold
The maximum error the system tolerates before a tide prediction is considered unacceptable. Current target: ±15 minutes for high/low tide event timing, ±0.10 m for water level when a datum is available.

## Horizon
The lead time into the future the forecast must remain inside the accuracy threshold. Primary horizon is 24–72 hours; 7-day forecasts are secondary; anything beyond 30 days is out of scope.

## Pilot Station
One of four stations used to validate accuracy before scaling: Bangkok Inner Gulf, Ko Si Chang, Koh Samui, and Phuket Andaman.

## Harmonic Synthesis
The core calculation that combines tidal constituents, nodal factors, and astronomical arguments to produce a time series of water levels.

## Calibration Offset
A per-station time and/or level correction derived from validation fixtures, applied to raw harmonic predictions before they reach the user interface.

## Fitted Constants
Harmonic constants (amplitude, phase, and offsets) produced by the offline fitting process and stored in `data/station-harmonic-constants.fitted.json`.

## Validation Fixture
A verified high/low tide observation used to measure and calibrate predictions.

## Forecast Facade
The narrow public interface the UI and LINE integration use to consume tide, weather, and lunar data. It is responsible for applying calibration offsets and unit/datum conversion. Implemented in `lib/domain/forecast-facade.ts` (`getTideData`); weather lives in `lib/domain/weather-blend.ts` and lunar phase in `lib/domain/lunar-phase.ts`.

## Offline-First
The constraint that the app must provide useful predictions without a network connection after the initial tile/data pack is downloaded.
