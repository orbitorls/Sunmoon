import { calculateLunarPhase } from '@/lib/domain/lunar-phase';
import { predictTideEvents } from '@/lib/domain/tide-prediction';
import { getWeatherBlend } from '@/lib/domain/weather-blend';
import { convertLevel, type DatumCode } from '@/lib/domain/datum-converter';
import { getThailandDayBounds, formatThailandClock } from '@/lib/thailand-time';

export type LocationData = { lat: number; lon: number; name: string };

export type TideData = {
  location: string;
  date: string;
  isWaxingMoon: boolean;
  lunarPhaseKham: number;
  tideStatus: 'น้ำเป็น' | 'น้ำตาย';
  tideEvents: Array<{ time: string; level: number; type: 'high' | 'low'; prediction: boolean }>;
  timeRangePredictions: Array<{
    startTime: string;
    endTime: string;
    range: string;
    description: string;
    confidence: number;
  }>;
  graphData: Array<{ time: string; level: number }>;
  weather: Awaited<ReturnType<typeof getWeatherBlend>>;
  apiStatus: 'success' | 'error';
  apiStatusMessage: string;
  lastUpdated: string;
};

export async function getForecast(
  location: LocationData,
  date: Date,
  _datum: DatumCode = 'MSL',
): Promise<TideData> {
  const [lunar, events, weather] = await Promise.all([
    calculateLunarPhase(date),
    predictTideEvents(location, date),
    getWeatherBlend(location),
  ]);

  const { start, end } = getThailandDayBounds(date);
  const highTide = events.find((e) => e.type === 'high');
  const lowTide = events.find((e) => e.type === 'low');
  const rangeMax = highTide ? highTide.level : 0;
  const rangeMin = lowTide ? lowTide.level : 0;
  const tideStatus = rangeMax - rangeMin > 1.8 ? 'น้ำเป็น' : 'น้ำตาย';

  const timeRangePredictions = events.slice(0, 2).map((event) => ({
    startTime: event.time,
    endTime: event.time,
    range: event.time,
    description: event.type === 'high' ? 'น้ำขึ้นสูง' : 'น้ำลงต่ำ',
    confidence: 85,
  }));

  const graphData = events.map((event) => ({
    time: event.time,
    level: convertLevel({ value: event.level, from: 'MLLW', to: _datum, offsetMeters: 0.5 }),
  }));

  return {
    location: location.name,
    date: date.toISOString(),
    ...lunar,
    tideStatus,
    tideEvents: events,
    timeRangePredictions,
    graphData,
    weather,
    apiStatus: 'success',
    apiStatusMessage: 'ok',
    lastUpdated: new Date().toISOString(),
    highTideTime: highTide ? highTide.time : '',
    lowTideTime: lowTide ? lowTide.time : '',
  } as TideData;
}
