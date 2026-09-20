import { getTimingAccuracyBand, timingAccuracyBandLabel } from '../../lib/comparison/timing-accuracy-band'

describe('timing accuracy band', () => {
  it('maps MAE to within / near / outside target bands', () => {
    expect(getTimingAccuracyBand(10)).toBe('within_target')
    expect(getTimingAccuracyBand(15)).toBe('within_target')
    expect(getTimingAccuracyBand(16)).toBe('near_target')
    expect(getTimingAccuracyBand(30)).toBe('near_target')
    expect(getTimingAccuracyBand(31)).toBe('outside_target')
  })

  it('returns Thai labels for each band', () => {
    expect(timingAccuracyBandLabel('within_target')).toContain('15')
    expect(timingAccuracyBandLabel('near_target')).toContain('30')
    expect(timingAccuracyBandLabel('outside_target')).toContain('30')
  })
})
