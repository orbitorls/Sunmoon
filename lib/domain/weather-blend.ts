function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

type OpenWeatherApiResponse = {
  main?: {
    temp?: number;
    feels_like?: number;
    humidity?: number;
    pressure?: number;
  };
  weather?: Array<{
    description?: string;
    icon?: string;
  }>;
  wind?: {
    speed?: number;
    deg?: number;
  };
  name?: string;
};

function isOpenWeatherApiResponse(
  value: unknown,
): value is OpenWeatherApiResponse {
  if (!isRecord(value)) {
    return false;
  }

  const { main, weather, wind } = value as {
    main?: unknown;
    weather?: unknown;
    wind?: unknown;
  };

  if (main !== undefined && !isRecord(main)) {
    return false;
  }

  if (weather !== undefined && !Array.isArray(weather)) {
    return false;
  }

  if (wind !== undefined && !isRecord(wind)) {
    return false;
  }

  return true;
}

export type WeatherData = {
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
  };
  weather: Array<{
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
    deg: number;
  };
  name: string;
};

export async function getWeatherBlend(location: {
  lat: number;
  lon: number;
  name: string;
}): Promise<WeatherData> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (apiKey) {
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&appid=${apiKey}&units=metric&lang=th`;
      const requestOptions: RequestInit & { next: { revalidate: number } } = {
        cache: "default",
        next: { revalidate: 3600 },
      };

      const response = await fetch(url, requestOptions);

      if (response.ok) {
        const payload: unknown = await response.json();
        if (isOpenWeatherApiResponse(payload)) {
          const main = payload.main ?? {};
          const weatherArray = Array.isArray(payload.weather)
            ? payload.weather
            : [];
          const wind = payload.wind ?? {};
          const primaryWeather =
            weatherArray.find(
              (entry): entry is { description?: string; icon?: string } =>
                typeof entry === "object" && entry !== null,
            ) ?? {};

          return {
            main: {
              temp:
                typeof main.temp === "number"
                  ? Number.parseFloat(main.temp.toFixed(1))
                  : 0,
              feels_like:
                typeof main.feels_like === "number"
                  ? Number.parseFloat(main.feels_like.toFixed(1))
                  : 0,
              humidity:
                typeof main.humidity === "number"
                  ? Math.round(main.humidity)
                  : 0,
              pressure:
                typeof main.pressure === "number"
                  ? Math.round(main.pressure)
                  : 0,
            },
            weather: [
              {
                description:
                  typeof primaryWeather.description === "string"
                    ? primaryWeather.description
                    : "ไม่ทราบ",
                icon:
                  typeof primaryWeather.icon === "string"
                    ? primaryWeather.icon
                    : "01d",
              },
            ],
            wind: {
              speed:
                typeof wind.speed === "number"
                  ? Number.parseFloat(wind.speed.toFixed(1))
                  : 0,
              deg: typeof wind.deg === "number" ? wind.deg : 0,
            },
            name:
              typeof payload.name === "string" && payload.name.trim()
                ? payload.name
                : location.name,
          };
        }
      }
    } catch (error) {
      console.error("OpenWeatherMap API error:", error);
    }
  }

  return {
    main: { temp: 30.5, feels_like: 34.2, humidity: 78, pressure: 1008 },
    weather: [{ description: "scattered clouds", icon: "03d" }],
    wind: { speed: 3.2, deg: 120 },
    name: location.name,
  };
}
