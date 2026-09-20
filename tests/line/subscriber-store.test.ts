import {
  addSubscriber,
  clearSubscribers,
  listSubscribers,
  removeSubscriber,
} from "@/lib/line/subscriber-store"

const MANAGED_ENV = [
  "LINE_SEEDED_USER_IDS",
  "LINE_DEFAULT_LAT",
  "LINE_DEFAULT_LON",
  "LINE_DEFAULT_LOCATION_NAME",
]

describe("LINE subscriber store", () => {
  let envSnapshot: Record<string, string | undefined>

  beforeEach(async () => {
    envSnapshot = Object.fromEntries(MANAGED_ENV.map((key) => [key, process.env[key]]))
    for (const key of MANAGED_ENV) delete process.env[key]
    await clearSubscribers()
  })

  afterAll(() => {
    for (const key of MANAGED_ENV) {
      const value = envSnapshot?.[key]
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  })

  it("adds and lists a subscriber", async () => {
    const record = await addSubscriber({ userId: "U1", displayName: "Pom" })

    expect(record).toMatchObject({ userId: "U1", displayName: "Pom" })
    expect(record.subscribedAt).toEqual(expect.any(String))
    expect(record.location).toBeDefined()

    const all = await listSubscribers()
    expect(all.map((subscriber) => subscriber.userId)).toEqual(["U1"])
  })

  it("applies the default LINE location when none is provided", async () => {
    const record = await addSubscriber({ userId: "U2" })

    expect(record.location).toEqual({ lat: 13.7563, lon: 100.5018, name: "กรุงเทพมหานคร" })
  })

  it("keeps an explicitly provided location", async () => {
    const location = { lat: 8.627, lon: 98.398, name: "ภูเก็ต" }
    const record = await addSubscriber({ userId: "U3", location })

    expect(record.location).toEqual(location)
  })

  it("overwrites the previous record when a user is re-added", async () => {
    await addSubscriber({ userId: "U4", displayName: "ก" })
    await addSubscriber({ userId: "U4", displayName: "ข" })

    const all = await listSubscribers()
    expect(all).toHaveLength(1)
    expect(all[0]!.displayName).toBe("ข")
  })

  it("removes subscribers and ignores an empty id", async () => {
    await addSubscriber({ userId: "U5" })
    await removeSubscriber("U5")
    await removeSubscriber("")

    expect(await listSubscribers()).toEqual([])
  })

  it("validates the user id", async () => {
    await expect(addSubscriber({ userId: "" })).rejects.toThrow("LINE subscriber userId is required")
  })

  it("clears every subscriber", async () => {
    await addSubscriber({ userId: "U6" })
    await addSubscriber({ userId: "U7" })
    await clearSubscribers()

    expect(await listSubscribers()).toEqual([])
  })
})
