jest.mock("@/lib/line/client", () => ({
  broadcast: jest.fn().mockResolvedValue(undefined),
  multicast: jest.fn().mockResolvedValue(undefined),
  push: jest.fn().mockResolvedValue(undefined),
  reply: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("@/lib/services/forecast", () => ({
  fetchForecast: jest.fn(),
}))

jest.mock("@/lib/domain/disaster-analysis", () => ({
  analyzeDisasterRisk: jest.fn(),
  getRiskLevelText: jest.fn(() => "สูงมาก"),
}))

import { analyzeDisasterRisk } from "@/lib/domain/disaster-analysis"
import { broadcast, multicast, push } from "@/lib/line/client"
import { buildWeatherMessages } from "@/lib/line/message-builder"
import { addSubscriber, clearSubscribers } from "@/lib/line/subscriber-store"
import type { LineMessage } from "@/lib/line/types"
import { chunkArray, dispatchWeatherUpdate } from "@/lib/line/weather-dispatch"
import { fetchForecast } from "@/lib/services/forecast"

const broadcastMock = broadcast as jest.Mock
const multicastMock = multicast as jest.Mock
const pushMock = push as jest.Mock
const fetchForecastMock = fetchForecast as jest.Mock
const analyzeDisasterRiskMock = analyzeDisasterRisk as jest.Mock

const LOCATION = { lat: 13.361, lon: 100.984, name: "ชลบุรี" }
const EMPTY_FORECAST = { weatherData: null, tideData: null, error: null }

const ALERT_FORECAST = {
  weatherData: {
    main: { temp: 30, feels_like: 33.5, humidity: 72, pressure: 1005 },
    weather: [{ description: "มีเมฆมาก", icon: "04d" }],
    wind: { speed: 8.5, deg: 200 },
    name: "ชลบุรี",
  },
  tideData: {
    isWaxingMoon: true,
    lunarPhaseKham: 5,
    tideStatus: "น้ำเป็น",
    highTideTime: "09:00",
    lowTideTime: "15:00",
    isSeaLevelHighToday: false,
    currentWaterLevel: 1.2,
    waterLevelStatus: "น้ำขึ้น",
    waterLevelReference: "MSL",
    seaLevelRiseReference: "MSL",
    pierDistance: 800,
    pierReference: "pier",
    tideEvents: [
      { time: "09:00", level: 2.4, type: "high" },
      { time: "15:00", level: 0.6, type: "low" },
    ],
    timeRangePredictions: [],
    graphData: [],
    apiStatus: "success",
    apiStatusMessage: "ok",
    lastUpdated: "2025-03-24T06:00:00.000Z",
  },
  error: null,
}

const API_KEY_ENV = ["OPENWEATHER_API_KEY", "WORLDTIDES_API_KEY", "STORMGLASS_API_KEY"]

describe("chunkArray", () => {
  it("splits a list into fixed-size groups", () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  it("returns no groups for an empty list", () => {
    expect(chunkArray([], 500)).toEqual([])
  })

  it("returns a single group when size is not positive", () => {
    expect(chunkArray([1, 2, 3], 0)).toEqual([[1, 2, 3]])
  })
})

describe("dispatchWeatherUpdate", () => {
  beforeAll(() => {
    jest.useFakeTimers({ doNotFake: ["nextTick"] })
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  beforeEach(async () => {
    jest.setSystemTime(new Date("2025-03-24T06:00:00.000Z"))
    for (const key of API_KEY_ENV) delete process.env[key]
    delete process.env.LINE_SEEDED_USER_IDS
    await clearSubscribers()
    broadcastMock.mockClear()
    multicastMock.mockClear()
    pushMock.mockClear()
    fetchForecastMock.mockReset()
    fetchForecastMock.mockResolvedValue(EMPTY_FORECAST)
    analyzeDisasterRiskMock.mockReset()
  })

  it("broadcasts the shared builder output when broadcast is requested", async () => {
    const result = await dispatchWeatherUpdate({ broadcast: true, location: LOCATION })

    expect(result.broadcast).toBe(true)
    expect(result.targetCount).toBe(0)
    expect(result.messages).toEqual(buildWeatherMessages(LOCATION, EMPTY_FORECAST))
    expect(broadcastMock).toHaveBeenCalledWith(result.messages)
    expect(multicastMock).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it("fans a single multicast out to all subscribers", async () => {
    await addSubscriber({ userId: "U1" })
    await addSubscriber({ userId: "U2" })

    const result = await dispatchWeatherUpdate({ location: LOCATION })

    expect(result.broadcast).toBe(false)
    expect(result.targetCount).toBe(2)
    expect(multicastMock).toHaveBeenCalledTimes(1)
    expect(multicastMock).toHaveBeenCalledWith(["U1", "U2"], result.messages)
    expect(pushMock).not.toHaveBeenCalled()
  })

  it("de-duplicates explicit user ids and drops empty entries", async () => {
    const result = await dispatchWeatherUpdate({
      location: LOCATION,
      userIds: ["U1", "U1", "", "  ", "U2"],
    })

    expect(result.targetCount).toBe(3)
    expect(multicastMock).toHaveBeenCalledWith(["U1", "  ", "U2"], result.messages)
    expect(pushMock).not.toHaveBeenCalled()
  })

  it("chunks recipients at the multicast limit and pushes lone recipients", async () => {
    for (let i = 0; i < 501; i++) {
      await addSubscriber({ userId: `U${i}` })
    }

    const result = await dispatchWeatherUpdate({ location: LOCATION })

    expect(result.targetCount).toBe(501)
    expect(multicastMock).toHaveBeenCalledTimes(1)
    expect(pushMock).toHaveBeenCalledTimes(1)

    const [firstGroup, firstMessages] = multicastMock.mock.calls[0] as [string[], LineMessage[]]
    expect(firstGroup).toHaveLength(500)
    expect(firstGroup[0]).toBe("U0")
    expect(firstGroup[499]).toBe("U499")
    expect(firstMessages).toEqual(result.messages)

    const [pushedUser] = pushMock.mock.calls[0] as [string, LineMessage[]]
    expect(pushedUser).toBe("U500")
  })

  it("sends nothing when there are no recipients", async () => {
    const result = await dispatchWeatherUpdate({ location: LOCATION })

    expect(result.targetCount).toBe(0)
    expect(broadcastMock).not.toHaveBeenCalled()
    expect(multicastMock).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it("appends a disaster alert when risk is critical", async () => {
    fetchForecastMock.mockResolvedValue(ALERT_FORECAST)
    analyzeDisasterRiskMock.mockReturnValue({
      riskLevel: "critical",
      overallRating: 92,
      disasters: [],
      factors: [],
      recommendations: [],
      timestamp: "2025-03-24T06:00:00.000Z",
      headline: "คลื่นลมแรงบริเวณชายฝั่ง",
      advanceWarnings: [],
    })

    const result = await dispatchWeatherUpdate({ broadcast: true, location: LOCATION })

    expect(analyzeDisasterRiskMock).toHaveBeenCalledTimes(1)
    const texts = result.messages.map((message) => message.text)
    expect(texts.some((text) => text.includes("🚨 แจ้งเตือนภัยชายฝั่ง"))).toBe(true)
    expect(broadcastMock).toHaveBeenCalledWith(result.messages)
  })
})
