import { analyzeDisasterRisk, formatDisasterHeadline } from '../lib/domain/disaster-analysis'
import type { TideData, TideEvent, WeatherData } from '../lib/domain/types'

function makeTideData(overrides: Partial<TideData> = {}): TideData {
  const tideEvents: TideEvent[] = overrides.tideEvents ?? [
    { time: '15:00', level: 2.7, type: 'high' },
    { time: '09:00', level: 0.5, type: 'low' },
  ]

  return {
    isWaxingMoon: true,
    lunarPhaseKham: 15,
    tideStatus: 'น้ำเป็น',
    highTideTime: '15:00',
    lowTideTime: '09:00',
    isSeaLevelHighToday: true,
    currentWaterLevel: 2.0,
    waterLevelStatus: 'น้ำขึ้น',
    waterLevelReference: '',
    seaLevelRiseReference: '',
    pierDistance: 0,
    pierReference: '',
    tideEvents,
    timeRangePredictions: [],
    graphData: [],
    apiStatus: 'success',
    apiStatusMessage: '',
    lastUpdated: new Date().toISOString(),
    ...overrides,
  }
}

function makeWeatherData(overrides: Partial<WeatherData> = {}): WeatherData {
  return {
    main: { temp: 30, feels_like: 32, humidity: 80, pressure: 1005 },
    weather: [{ description: 'มีเมฆมาก', icon: '04d' }],
    wind: { speed: 12, deg: 180 }, // ลมใต้
    name: 'ทดสอบ',
    ...overrides,
  }
}

describe('disaster-analysis headline', () => {
  it('produces a specific Thai sentence with time, level, and wind for a high-risk case', () => {
    const analysis = analyzeDisasterRisk(
      makeTideData(),
      makeWeatherData(),
      new Date('2026-07-07T08:00:00+07:00'),
      'ริมคลองทดสอบ',
      1.5, // ground elevation below the 2.7m high tide -> flood risk
    )

    expect(['high', 'critical']).toContain(analysis.riskLevel)
    expect(analysis.headline).not.toBeNull()
    // Specific: contains the actual time, the actual water level, and wind speed --
    // not a generic "risk detected" message.
    expect(analysis.headline).toContain('15:00')
    expect(analysis.headline).toContain('2.7m')
    expect(analysis.headline).toContain('12m/s')
    expect(analysis.headline).toMatch(/เสี่ยงท่วม/)
  })

  it('returns null for low risk (nothing generic to show)', () => {
    const lowRiskTide = makeTideData({
      isSeaLevelHighToday: false,
      tideStatus: 'น้ำตาย',
      lunarPhaseKham: 8,
      tideEvents: [
        { time: '15:00', level: 1.2, type: 'high' },
        { time: '09:00', level: 0.3, type: 'low' },
      ],
    })
    const calmWeather = makeWeatherData({ wind: { speed: 2, deg: 0 }, main: { temp: 30, feels_like: 31, humidity: 70, pressure: 1012 } })

    // Use a transition-monsoon month (March) so the seasonal risk multiplier doesn't push this over "low".
    const analysis = analyzeDisasterRisk(lowRiskTide, calmWeather, new Date('2026-03-15T08:00:00+07:00'), 'พื้นที่ปลอดภัย', 5)

    expect(analysis.riskLevel).toBe('low')
    expect(analysis.headline).toBeNull()
  })

  it('formatDisasterHeadline formats directly from already-computed fields without new risk math', () => {
    const headline = formatDisasterHeadline(
      {
        riskLevel: 'critical',
        floodPrediction: {
          expectedLevel: 50,
          peakTime: '15:00',
          duration: 180,
          affectedAreas: ['บ้านเรือนริมคลอง'],
          floodType: 'major',
          causedBy: [],
          confidence: 80,
        },
        advanceWarnings: [
          {
            type: 'high_tide',
            warningLevel: 'warning',
            title: 'น้ำหนุนสูง 2.70 ม.',
            message: '',
            timeUntil: '1 ชั่วโมง',
            expectedTime: '15:00',
            actionRequired: [],
          },
        ],
        riskTimeline: [
          { startTime: '13:00', endTime: '17:00', riskLevel: 'critical', mainRisk: '', description: '', tideLevel: 2.7 },
        ],
        factors: [
          { id: 'wind', name: 'ลม', value: 12, unit: 'm/s', description: '', contributeToRisk: true, riskContribution: 15, icon: 'Wind' },
        ],
      },
      180,
    )

    expect(headline).toBe('วันนี้ 15:00 น. น้ำหนุนสูง 2.7m + ลมใต้ 12m/s เสี่ยงท่วมหนักบ้านเรือนริมคลอง')
  })
})
