import { getTideData } from "@/lib/domain/forecast-facade";
import { getWeatherBlend as getWeatherData } from "@/lib/domain/weather-blend";
import type { LocationData, TideData, WeatherData } from "@/lib/domain/types";
import { getThailandClockParts } from "@/lib/thailand-time"

export type ForecastResult = {
  weatherData: WeatherData | null
  tideData: TideData | null
  error: string | null
}

const DEFAULT_TIME_RESOLVER = () => getThailandClockParts(new Date())

type FetchForecastOptions = {
  date?: Date
  currentTime?: { hour: number; minute: number }
}

export async function fetchForecast(
  location: LocationData,
  options: FetchForecastOptions = {},
): Promise<ForecastResult> {
  const { date = new Date(), currentTime = DEFAULT_TIME_RESOLVER() } = options

  let weatherData: WeatherData | null = null
  let tideData: TideData | null = null
  let errorMessage: string | null = null

  const apiKey = process.env.OPENWEATHER_API_KEY
  if (apiKey) {
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&appid=${apiKey}&units=metric&lang=th`
      const res = await fetch(url, {
        cache: "default",
        next: { revalidate: 3600 },
      } as RequestInit)
      if (!res.ok) {
        errorMessage = `ไม่สามารถดึงข้อมูลสภาพอากาศได้: ${res.statusText}`
      } else {
        const raw = await res.json()
        weatherData = mapOpenWeatherToWeatherData(raw, location.name)
      }
    } catch (error) {
      console.error("Weather API error:", error)
      errorMessage = "ไม่สามารถเชื่อมต่อกับบริการสภาพอากาศได้"
    }
  }

  if (!weatherData) {
    weatherData = await getWeatherData(location)
  }

  try {
    tideData = await getTideData(location, date, currentTime)
  } catch (error) {
    console.error("Tide service error:", error)
    errorMessage = errorMessage
      ? `${errorMessage} และไม่สามารถดึงข้อมูลน้ำขึ้นน้ำลงได้`
      : "ไม่สามารถดึงข้อมูลน้ำขึ้นน้ำลงได้"
  }

  return { weatherData, tideData, error: errorMessage }
}

function mapOpenWeatherToWeatherData(raw: unknown, fallbackName: string): WeatherData {
  const record = (raw ?? {}) as Record<string, unknown>
  const main = (record.main ?? {}) as Record<string, unknown>
  const wind = (record.wind ?? {}) as Record<string, unknown>
  const weatherArray = Array.isArray(record.weather) ? record.weather : []
  const weather0 = (weatherArray[0] ?? {}) as Record<string, unknown>

  return {
    main: {
      temp: toNumber(main.temp, 1),
      feels_like: toNumber(main.feels_like, 1),
      humidity: toInteger(main.humidity),
      pressure: toInteger(main.pressure),
    },
    weather: [
      {
        description: typeof weather0.description === "string" && weather0.description.trim().length > 0
          ? weather0.description
          : "ไม่ทราบ",
        icon: typeof weather0.icon === "string" && weather0.icon.trim().length > 0
          ? weather0.icon
          : "01d",
      },
    ],
    wind: {
      speed: toNumber(wind.speed, 1),
      deg: toInteger(wind.deg),
    },
    name: typeof record.name === "string" && record.name.trim().length > 0
      ? record.name
      : fallbackName,
  }
}

function toNumber(value: unknown, fractionDigits?: number): number {
  const numericValue = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""))
  if (!Number.isFinite(numericValue)) {
    return 0
  }
  if (typeof fractionDigits === "number") {
    return Number.parseFloat(numericValue.toFixed(fractionDigits))
  }
  return numericValue
}

function toInteger(value: unknown): number {
  const numericValue = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""))
  return Number.isFinite(numericValue) ? Math.round(numericValue) : 0
}
