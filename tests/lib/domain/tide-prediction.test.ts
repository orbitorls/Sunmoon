import { predictTideEvents } from '@/lib/domain/tide-prediction';
import type { LocationData } from '@/lib/domain/types';

describe('predictTideEvents', () => {
  it('returns high and low tide events for Phuket on 2026-07-29', async () => {
    const location: LocationData = { lat: 8.627, lon: 98.398, name: 'ภูเก็ต' };
    const events = await predictTideEvents(location, new Date('2026-07-29T07:00:00+07:00'));
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events.some((e) => e.type === 'high')).toBe(true);
    expect(events.some((e) => e.type === 'low')).toBe(true);
  });
});
