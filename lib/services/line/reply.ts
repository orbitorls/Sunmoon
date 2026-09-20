import { mkdir, appendFile } from 'node:fs/promises'
import path from 'node:path'

import { LINE_API_BASE } from './client'
import { buildWelcomeMessage } from './message-builder'

async function logOfflineReply(payload: { replyToken: string; messages: Record<string, unknown>[] }) {
  const fallbackPath =
    process.env.LINE_OFFLINE_LOG_PATH || path.join(process.cwd(), '.next', 'logs', 'line-offline-replies.log')
  const directory = path.dirname(fallbackPath)

  try {
    await mkdir(directory, { recursive: true })
    const line = `${new Date().toISOString()} ${JSON.stringify(payload)}\n`
    await appendFile(fallbackPath, line, 'utf8')
    console.log(`[LINE] Offline reply recorded at ${fallbackPath}`)
  } catch (error) {
    console.warn('[LINE] Failed to record offline reply log:', error)
  }
}

/**
 * Send message to LINE user
 */
export async function sendLineMessage(
  replyToken: string,
  messages: Record<string, unknown>[]
): Promise<void> {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not configured')
  }

  try {
    console.log(`📤 Sending ${messages.length} message(s) to LINE`)

    const messageArray = Array.isArray(messages) ? messages : [messages]

    const response = await fetch(`${LINE_API_BASE}/message/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        replyToken,
        messages: messageArray
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('❌ LINE API error:', error)
      throw new Error(`LINE API error: ${response.statusText}`)
    }

    console.log('✅ Message sent successfully')
  } catch (error) {
    console.error('❌ Send message failed:', error)
    // In development, log but don't crash
    if (process.env.NODE_ENV !== 'production') {
      await logOfflineReply({ replyToken, messages })
      console.warn('⚠️ Warning: Message send failed, storing offline log instead.')
    } else {
      throw error
    }
  }
}

/**
 * Send welcome message on follow
 */
export async function sendWelcomeMessage(replyToken: string): Promise<void> {
  await sendLineMessage(replyToken, [buildWelcomeMessage()])
}

