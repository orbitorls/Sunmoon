import { getWeatherBlend } from '@/lib/domain/weather-blend';

describe('getWeatherBlend', () => {
  const envKeys = ['OPENWEATHER_API_KEY'];
  let envSnapshot: Record<string, string | undefined>;

  beforeEach(() => {
    envSnapshot = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
    for (const key of envKeys) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(envSnapshot)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    jest.restoreAllMocks();
  });

  it('returns a deterministic fallback record without calling the network when no API key is configured', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');

    const weather = await getWeatherBlend({ lat: 8.627, lon: 98.398, name: 'ภูเก็ต' });

    expect(weather.name).toBe('ภูเก็ต');
    expect(typeof weather.main.temp).toBe('number');
    expect(typeof weather.wind.speed).toBe('number');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('maps an OpenWeatherMap response when an API key is configured', async () => {
    process.env.OPENWEATHER_API_KEY = 'test-key';
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        main: { temp: 31.234, feels_like: 36.0, humidity: 74.6, pressure: 1009.2 },
        weather: [{ description: 'มีเมฆบางส่วน', icon: '02d' }],
        wind: { speed: 4.56, deg: 180 },
        name: 'กะปง',
      }),
    } as unknown as Response);

    const weather = await getWeatherBlend({ lat: 8.627, lon: 98.398, name: 'ภูเก็ต' });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(weather).toEqual({
      main: { temp: 31.2, feels_like: 36, humidity: 75, pressure: 1009 },
      weather: [{ description: 'มีเมฆบางส่วน', icon: '02d' }],
      wind: { speed: 4.6, deg: 180 },
      name: 'กะปง',
    });
  });
});
