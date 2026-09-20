jest.mock("@/lib/compression/compact-client", () => ({
  compactClient: { fetchCompactForecast: jest.fn() },
}))

jest.mock("@/lib/line/reply", () => ({
  sendLineMessage: jest.fn().mockResolvedValue(undefined),
  sendWelcomeMessage: jest.fn().mockResolvedValue(undefined),
}))

import { compactClient } from "@/lib/compression/compact-client"
import {
  handleLineMessage,
  parseLocationFromText,
  type LineEvent,
} from "@/lib/line/message-handler"
import { sendLineMessage } from "@/lib/line/reply"

const fetchCompactForecast = compactClient.fetchCompactForecast as jest.Mock
const sendLineMessageMock = sendLineMessage as jest.Mock

const COMPACT_FRAME = {
  type: "combined" as const,
  timestamp: 1_700_000_000,
  tide: { h: 1.5, trend: 1, ht: 2.1, ht_time: 3 },
  weather: { t: 25, w: 4, c: 50, wd: 90 },
}

const API_KEY_ENV = ["OPENWEATHER_API_KEY", "WORLDTIDES_API_KEY", "STORMGLASS_API_KEY"]

function clearApiKeys(): void {
  for (const key of API_KEY_ENV) {
    delete process.env[key]
  }
}

describe("parseLocationFromText", () => {
  it("resolves a supported province from a 'ทำนายน้ำ' command", () => {
    expect(parseLocationFromText("ทำนายน้ำ ชลบุรี")).toEqual({
      lat: 13.361,
      lon: 100.984,
      name: "ชลบุรี",
    })
  })

  it("resolves a province embedded inside free-form Thai text", () => {
    expect(parseLocationFromText("น้ำขึ้นที่ภูเก็ตวันนี้")).toMatchObject({
      lat: 8.627,
      lon: 98.398,
      name: "ภูเก็ต",
    })
  })

  it("resolves the trailing word of a multi-token command", () => {
    expect(parseLocationFromText("ทำนายน้ำ   ระยอง")).toMatchObject({
      lat: 6.8495,
      lon: 101.9674,
      name: "ระยอง",
    })
  })

  it("returns null when no known location is present", () => {
    expect(parseLocationFromText("สวัสดีครับ")).toBeNull()
  })
})

describe("handleLineMessage", () => {
  beforeEach(() => {
    clearApiKeys()
    fetchCompactForecast.mockReset()
    fetchCompactForecast.mockResolvedValue({ data: COMPACT_FRAME, error: undefined })
    sendLineMessageMock.mockReset()
    sendLineMessageMock.mockResolvedValue(undefined)
  })

  it("replies with a forecast for a text location and caches it", async () => {
    await handleLineMessage({
      type: "message",
      replyToken: "token-text",
      source: { userId: "U-text-1" },
      message: { type: "text", text: "ทำนายน้ำ ชลบุรี" },
    })

    expect(fetchCompactForecast).toHaveBeenCalledWith(13.361, 100.984)
    expect(sendLineMessageMock).toHaveBeenCalledTimes(1)
    const [token, messages] = sendLineMessageMock.mock.calls[0]
    expect(token).toBe("token-text")
    expect(messages).toHaveLength(1)
    expect(messages[0].type).toBe("text")
    expect(messages[0].text).toContain("🌊")
    expect(messages[0].text).toContain("ชลบุรี")
  })

  it("asks for a location when the text names none", async () => {
    await handleLineMessage({
      type: "message",
      replyToken: "token-help",
      source: { userId: "U-help-1" },
      message: { type: "text", text: "สวัสดีครับ" },
    })

    expect(fetchCompactForecast).not.toHaveBeenCalled()
    const [, messages] = sendLineMessageMock.mock.calls[0]
    expect(messages[0].text).toContain("โปรดแจ้งสถานที่")
  })

  it("handles a GPS location message using its coordinates and title", async () => {
    await handleLineMessage({
      type: "message",
      replyToken: "token-gps",
      source: { userId: "U-gps-1" },
      message: { type: "location", latitude: 13.5, longitude: 100.5, title: "ท่าเรือระยอง" },
    })

    expect(fetchCompactForecast).toHaveBeenCalledWith(13.5, 100.5)
    const [, messages] = sendLineMessageMock.mock.calls[0]
    expect(messages[0].text).toContain("ท่าเรือระยอง")
  })

  it("reuses the cached location for a follow-up message", async () => {
    await handleLineMessage({
      type: "message",
      replyToken: "token-cache-1",
      source: { userId: "U-cache-1" },
      message: { type: "text", text: "ทำนายน้ำ ชุมพร" },
    })

    sendLineMessageMock.mockClear()
    fetchCompactForecast.mockClear()

    await handleLineMessage({
      type: "message",
      replyToken: "token-cache-2",
      source: { userId: "U-cache-1" },
      message: { type: "text", text: "อัปเดตอีกครั้ง" },
    })

    expect(fetchCompactForecast).toHaveBeenCalledWith(8.6682, 99.1807)
    const [, messages] = sendLineMessageMock.mock.calls[0]
    expect(messages[0].text).toContain("ชุมพร")
  })

  it("replies with the shared error message when handling fails", async () => {
    fetchCompactForecast.mockRejectedValueOnce(new Error("network down"))

    await handleLineMessage({
      type: "message",
      replyToken: "token-error",
      source: { userId: "U-error-1" },
      message: { type: "text", text: "ทำนายน้ำ ตรัง" },
    })

    expect(sendLineMessageMock).toHaveBeenCalledTimes(1)
    const [, messages] = sendLineMessageMock.mock.calls[0]
    expect(messages[0].text).toBe("⚠️ ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง")
  })

  it("ignores events without a message payload", async () => {
    await handleLineMessage({
      type: "follow",
      replyToken: "token-follow",
      source: { userId: "U-follow-1" },
    })

    expect(fetchCompactForecast).not.toHaveBeenCalled()
    expect(sendLineMessageMock).not.toHaveBeenCalled()
  })
})
