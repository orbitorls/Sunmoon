import { calculateLunarPhase } from '@/lib/domain/lunar-phase';

describe('calculateLunarPhase', () => {
  it('returns a valid Thai lunar phase for 2026-07-29', async () => {
    const result = await calculateLunarPhase(new Date('2026-07-29T07:00:00+07:00'));
    expect(typeof result.isWaxingMoon).toBe('boolean');
    expect(result.lunarPhaseKham).toBeGreaterThanOrEqual(1);
    expect(result.lunarPhaseKham).toBeLessThanOrEqual(15);
  });
});
