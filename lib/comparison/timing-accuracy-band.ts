/**
 * Trust-UI bands vs the ±15 min product target (Wave C).
 * Kept free of Node/server imports so client components can use it.
 */

export type TimingAccuracyBand = 'within_target' | 'near_target' | 'outside_target'

export function getTimingAccuracyBand(meanAbsoluteTimingErrorMinutes: number): TimingAccuracyBand {
  if (meanAbsoluteTimingErrorMinutes <= 15) {
    return 'within_target'
  }
  if (meanAbsoluteTimingErrorMinutes <= 30) {
    return 'near_target'
  }
  return 'outside_target'
}

export function timingAccuracyBandLabel(band: TimingAccuracyBand): string {
  switch (band) {
    case 'within_target':
      return 'ในเป้า ±15 นาที'
    case 'near_target':
      return 'ใกล้เป้า (≤30 นาที)'
    case 'outside_target':
      return 'นอกเป้า (>30 นาที)'
    default: {
      const _exhaustive: never = band
      return _exhaustive
    }
  }
}
