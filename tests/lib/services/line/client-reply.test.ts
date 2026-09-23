import { readFile, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { LINE_API_BASE, broadcast, multicast, push, reply } from "@/lib/services/line/client"
import { sendLineMessage, sendWelcomeMessage } from "@/lib/services/line/reply"
import type { LineMessage } from "@/lib/services/line/types"

function okResponse(): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    text: async () => "",
    headers: { get: () => null },
  } as unknown as Response
}

function errorResponse(status: number, statusText = "Bad Request"): Response {
  return {
    ok: false,
    status,
    statusText,
    text: async () => "boom",
    headers: { get: () => null },
  } as unknown as Response
}

const MESSAGES: LineMessage[] = [{ type: "text", text: "สวัสดีชาวประมง" }]

describe("line client transport", () => {
  const fetchMock = jest.fn()
  const originalToken = process.env.LINE_CHANNEL_ACCESS_TOKEN

  beforeEach(() => {
    fetchMock.mockReset()
    global.fetch = fetchMock as unknown as typeof fetch
    process.env.LINE_CHANNEL_ACCESS_TOKEN = "unit-test-token"
  })

  afterAll(() => {
    if (originalToken === undefined) {
      delete process.env.LINE_CHANNEL_ACCESS_TOKEN
    } else {
      process.env.LINE_CHANNEL_ACCESS_TOKEN = originalToken
    }
  })

  it("posts broadcasts with the messages and auth header", async () => {
    fetchMock.mockResolvedValue(okResponse())

    await broadcast(MESSAGES)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${LINE_API_BASE}/message/broadcast`)
    expect(init.method).toBe("POST")
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      Authorization: "Bearer unit-test-token",
    })
    expect(JSON.parse(init.body)).toEqual({ messages: MESSAGES })
  })

  it("posts a push to a single user id", async () => {
    fetchMock.mockResolvedValue(okResponse())

    await push("U-single", MESSAGES)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${LINE_API_BASE}/message/push`)
    expect(JSON.parse(init.body)).toEqual({ to: "U-single", messages: MESSAGES })
  })

  it("posts a multicast to a list of user ids", async () => {
    fetchMock.mockResolvedValue(okResponse())

    await multicast(["U1", "U2"], MESSAGES)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${LINE_API_BASE}/message/multicast`)
    expect(JSON.parse(init.body)).toEqual({ to: ["U1", "U2"], messages: MESSAGES })
  })

  it("posts a reply with the reply token", async () => {
    fetchMock.mockResolvedValue(okResponse())

    await reply("reply-token-1", MESSAGES)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${LINE_API_BASE}/message/reply`)
    expect(JSON.parse(init.body)).toEqual({ replyToken: "reply-token-1", messages: MESSAGES })
  })

  it("skips the request when there are no recipients", async () => {
    await multicast([], MESSAGES)
    await push("", MESSAGES)
    await reply("", MESSAGES)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("throws when the channel access token is missing", async () => {
    delete process.env.LINE_CHANNEL_ACCESS_TOKEN

    await expect(broadcast(MESSAGES)).rejects.toThrow("LINE_CHANNEL_ACCESS_TOKEN is not configured")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("surfaces a non-retryable API error", async () => {
    fetchMock.mockResolvedValue(errorResponse(400))

    await expect(broadcast(MESSAGES)).rejects.toThrow("LINE API request failed (400)")
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe("reply helpers", () => {
  const fetchMock = jest.fn()
  const originalToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
  const originalLogPath = process.env.LINE_OFFLINE_LOG_PATH
  const logPath = path.join(os.tmpdir(), `sunmoon-line-offline-${process.pid}-${Date.now()}.log`)

  beforeEach(() => {
    fetchMock.mockReset()
    global.fetch = fetchMock as unknown as typeof fetch
    process.env.LINE_CHANNEL_ACCESS_TOKEN = "unit-test-token"
    process.env.LINE_OFFLINE_LOG_PATH = logPath
  })

  afterAll(async () => {
    if (originalToken === undefined) {
      delete process.env.LINE_CHANNEL_ACCESS_TOKEN
    } else {
      process.env.LINE_CHANNEL_ACCESS_TOKEN = originalToken
    }
    if (originalLogPath === undefined) {
      delete process.env.LINE_OFFLINE_LOG_PATH
    } else {
      process.env.LINE_OFFLINE_LOG_PATH = originalLogPath
    }
    await rm(logPath, { force: true })
  })

  it("sends through the shared client reply endpoint", async () => {
    fetchMock.mockResolvedValue(okResponse())

    await sendLineMessage("reply-token-2", MESSAGES)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${LINE_API_BASE}/message/reply`)
    expect(JSON.parse(init.body)).toEqual({ replyToken: "reply-token-2", messages: MESSAGES })
  })

  it("requires the channel access token", async () => {
    delete process.env.LINE_CHANNEL_ACCESS_TOKEN

    await expect(sendLineMessage("reply-token-3", MESSAGES)).rejects.toThrow(
      "LINE_CHANNEL_ACCESS_TOKEN is not configured",
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("falls back to the offline log instead of crashing outside production", async () => {
    fetchMock.mockResolvedValue(errorResponse(400))

    await expect(sendLineMessage("reply-token-4", MESSAGES)).resolves.toBeUndefined()

    const logged = await readFile(logPath, "utf8")
    expect(logged).toContain("reply-token-4")
    expect(logged).toContain("สวัสดีชาวประมง")
  })

  it("sends the shared welcome message text on follow", async () => {
    fetchMock.mockResolvedValue(okResponse())

    await sendWelcomeMessage("reply-token-5")

    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(init.body)
    expect(body.replyToken).toBe("reply-token-5")
    expect(body.messages).toHaveLength(1)
    expect(body.messages[0].type).toBe("text")
    expect(body.messages[0].text).toContain("ยินดีต้อนรับ")
    expect(body.messages[0].text).toContain("SEAPALO")
  })
})
