import { getWeatherBlend } from '@/lib/domain/weather-blend';

describe('getWeatherBlend', () => {
  it('returns a weather record for a known Thai location', async () => {
    const weather = await getWeatherBlend({ lat: 8.627, lon: 98.398, name: 'ภูเก็ต' });
    expect(weather.name).toBe('ภูเก็ต');
    expect(typeof weather.main.temp).toBe('number');
    expect(typeof weather.wind.speed).toBe('number');
  });
});
