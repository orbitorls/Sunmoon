// lib/domain/datum-converter.ts
export type DatumCode = 'MSL' | 'MLLW' | 'LAT' | 'MHWS';
export type Unit = 'm' | 'ft' | 'cm';

const METERS_PER_FOOT = 0.3048;

export function convertLevel(input: {
  value: number;
  from: DatumCode;
  to: DatumCode;
  offsetMeters: number;
  unit?: Unit;
}): number {
  const inMeters = input.value * (input.unit === 'ft' ? METERS_PER_FOOT : input.unit === 'cm' ? 0.01 : 1);
  const converted = input.from === input.to
    ? inMeters
    : inMeters - input.offsetMeters;
  return input.unit === 'ft'
    ? converted / METERS_PER_FOOT
    : input.unit === 'cm'
      ? converted * 100
      : converted;
}
