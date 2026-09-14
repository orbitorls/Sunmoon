import { setTimeout as delay } from "node:timers/promises"
import type { LineMessage } from "./types"

function resolveLineApiBaseUrl(): string {
  const raw = process.env.LINE_API_BASE_URL?.trim()
  const fallback = "https://api.line.me"

  if (!raw) return fallback

  try {
    const url = new URL(raw)
    if (url.hostname === "api.line.biz") {
      console.warn("[LINE] LINE_API_BASE_URL uses deprecated api.line.biz, switching to api.line.me")
      url.hostname = "api.line.me"
    }
    return url.toString().replace(/\/+$/, "")
  } catch {
    console.warn("[LINE] Invalid LINE_API_BASE_URL value, falling back to https://api.line.me")
    return fallback
  }
}

const LINE_API_BASE = `${resolveLineApiBaseUrl()}/v2/bot`
const DEFAULT_RETRY_ATTEMPTS = 3

function getChannelAccessToken(): string {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not configured")
  }
  return token
}

async function lineFetch<TBody extends object>(
  path: string,
  body: TBody,
  attempts = DEFAULT_RETRY_ATTEMPTS,
): Promise<void> {
  const token = getChannelAccessToken()

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const response = await fetch(`${LINE_API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })

    if (response.ok) {
      return
    }

    const errorText = await safeReadBody(response)
    const shouldRetry = response.status >= 500 || response.status === 429

    console.error(`LINE API error (${response.status}) attempt ${attempt}:`, errorText)

    if (!shouldRetry || attempt === attempts) {
      throw new Error(`LINE API request failed (${response.status})`)
    }

    const retryAfter = response.headers.get("retry-after")
    const waitMs = retryAfter ? Number.parseInt(retryAfter, 10) * 1000 : attempt * 500
    await delay(waitMs)
  }
}

async function safeReadBody(response: Response): Promise<string> {
  try {
    return await response.text()
  } catch (error) {
    console.error("Failed to read LINE API response body", error)
    return ""
  }
}

export async function broadcast(messages: LineMessage[]): Promise<void> {
  await lineFetch("/message/broadcast", { messages })
}

export async function multicast(userIds: string[], messages: LineMessage[]): Promise<void> {
  if (userIds.length === 0) return
  await lineFetch("/message/multicast", { to: userIds, messages })
}

export async function push(userId: string, messages: LineMessage[]): Promise<void> {
  if (!userId) return
  await lineFetch("/message/push", { to: userId, messages })
}

export async function reply(replyToken: string, messages: LineMessage[]): Promise<void> {
  if (!replyToken) return
  await lineFetch("/message/reply", { replyToken, messages })
}
