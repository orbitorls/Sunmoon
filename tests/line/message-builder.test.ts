import {
  buildErrorMessage,
  buildUnsupportedLocationMessage,
  buildWeatherMessages,
  buildWelcomeMessage,
} from "@/lib/services/line/message-builder"
import type { ForecastResult } from "@/lib/services/forecast"

// These literals are intentionally duplicated here: they are the byte-for-byte
// contract for Thai text that moved out of the reply/handler modules into the
// shared builder layer. Any drift is a rendered-message regression.
describe("shared LINE message builders", () => {
  it("pins the welcome text byte-for-byte", () => {
    expect(buildWelcomeMessage()).toEqual({
      type: "text",
      text: '👋 สวัสดี! ยินดีต้อนรับ 🌊 SEAPALO\n\n' +
            '━━━━━━━━━━━━━━━━━━\n' +
            '⚡ การใช้งาน:\n' +
            '📝 ทำนายน้ำ [จังหวัด]\n' +
            '   เช่น: ทำนายน้ำ ชลบุรี\n\n' +
            '📍 แชร์ GPS\n' +
            '   ระบบจะหาพื้นที่ให้อัตโนมัติ\n\n' +
            '🔗 ดูข้อมูลเต็มได้บนเว็บ\n' +
            '━━━━━━━━━━━━━━━━━━\n\n' +
            '🎯 ระดับน้ำ • อุณหภูมิ • ลมและความชื้น\n' +
            '💡 สำหรับชาวประมง ณ ทะเล',
    })
  })

  it("pins the unsupported-location text byte-for-byte", () => {
    expect(buildUnsupportedLocationMessage()).toEqual({
      type: "text",
      text: '🌊 โปรดแจ้งสถานที่\n\n' +
            '━━━━━━━━━━━━━━━━━━\n' +
            '📍 จังหวัดที่รองรับ:\n\n' +
            '🔵 ภาคใต้:\n' +
            'ภูเก็ต • ระยอง • หาดใหญ่\n' +
            'สตูล • ชุมพร • กระบี่\n' +
            'สงขลา • พังงา • ตรัง\n\n' +
            '🔵 ภาคตะวันออก:\n' +
            'ชลบุรี • ระนอง • บันฉุง\n' +
            'กำแพงแสน • เพชรบุรี • ประจวบฯ\n\n' +
            '🔵 เกาะและอื่นๆ:\n' +
            'เกาะสมุย • ชลบุรีศรีราชา\n\n' +
            '━━━━━━━━━━━━━━━━━━\n' +
            '💡 ลองใหม่: ทำนายน้ำ ชลบุรี\n' +
            '📍 หรือแชร์ตำแหน่ง GPS',
    })
  })

  it("pins the generic error text byte-for-byte", () => {
    expect(buildErrorMessage()).toEqual({
      type: "text",
      text: "⚠️ ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
    })
  })

  it("appends the shared broadcast tip after the weather body", () => {
    const forecast: ForecastResult = { weatherData: null, tideData: null, error: null }
    const messages = buildWeatherMessages({ lat: 13.361, lon: 100.984, name: "ชลบุรี" }, forecast)

    expect(messages).toHaveLength(2)
    expect(messages[1]).toEqual({
      type: "text",
      text: "💡 ระบบจะส่งอัปเดตทุก 2 ชั่วโมง หรือสั่งทันทีได้ที่แดชบอร์ด Sunmoon",
    })
  })
})
