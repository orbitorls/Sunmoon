import { getForecast } from '@/lib/domain/forecast-facade';
import type { LocationData } from '@/lib/tide-service';

describe('getForecast', () => {
  it('returns a complete TideData object for 2026-07-29', async () => {
    const location: LocationData = { lat: 8.627, lon: 98.398, name: 'ภูเก็ต' };
    const forecast = await getForecast(location, new Date('2026-07-29T07:00:00+07:00'));
    expect(forecast.location).toBe('ภูเก็ต');
    expect(forecast.tideEvents.length).toBeGreaterThanOrEqual(2);
    expect(typeof forecast.weather.main.temp).toBe('number');
    expect(forecast.apiStatus).toBe('success');
  });
});
