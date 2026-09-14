import type { LocationData } from "@/lib/tide-service"
import { getDefaultLineLocation } from "./config"

export type LineSubscriber = {
  userId: string
  displayName?: string
  location?: LocationData
  subscribedAt: string
}

type SubscriberMap = Map<string, LineSubscriber>

declare global {
  // eslint-disable-next-line no-var
  var __sunmoonLineSubscriberStore: SubscriberMap | undefined
}

function getStore(): SubscriberMap {
  if (!globalThis.__sunmoonLineSubscriberStore) {
    globalThis.__sunmoonLineSubscriberStore = new Map<string, LineSubscriber>()
    seedFromEnv(globalThis.__sunmoonLineSubscriberStore)
  }
  return globalThis.__sunmoonLineSubscriberStore
}

function seedFromEnv(store: SubscriberMap): void {
  const envValue = process.env.LINE_SEEDED_USER_IDS
  if (!envValue) return
  for (const raw of envValue.split(",")) {
    const trimmed = raw.trim()
    if (!trimmed) continue
    if (!store.has(trimmed)) {
      store.set(trimmed, {
        userId: trimmed,
        subscribedAt: new Date().toISOString(),
        location: getDefaultLineLocation(),
      })
    }
  }
}

export async function listSubscribers(): Promise<LineSubscriber[]> {
  return Array.from(getStore().values())
}

export async function addSubscriber(subscriber: { userId: string; displayName?: string; location?: LocationData }): Promise<LineSubscriber> {
  if (!subscriber.userId) {
    throw new Error("LINE subscriber userId is required")
  }

  const store = getStore()
  const record: LineSubscriber = {
    userId: subscriber.userId,
    displayName: subscriber.displayName,
    location: subscriber.location ?? getDefaultLineLocation(),
    subscribedAt: new Date().toISOString(),
  }
  store.set(record.userId, record)
  return record
}

export async function removeSubscriber(userId: string): Promise<void> {
  if (!userId) return
  getStore().delete(userId)
}

export async function clearSubscribers(): Promise<void> {
  getStore().clear()
}
