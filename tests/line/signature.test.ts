import { createHmac } from "node:crypto"

import { verifyLineSignature } from "@/lib/services/line/signature"

const SECRET = "unit-test-channel-secret"
const BODY = JSON.stringify({ destination: "U000", events: [{ type: "message" }] })

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64")
}

describe("verifyLineSignature", () => {
  const originalSecret = process.env.LINE_CHANNEL_SECRET

  beforeEach(() => {
    process.env.LINE_CHANNEL_SECRET = SECRET
  })

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.LINE_CHANNEL_SECRET
    } else {
      process.env.LINE_CHANNEL_SECRET = originalSecret
    }
  })

  it("accepts a signature computed with the configured secret", () => {
    expect(verifyLineSignature(BODY, sign(BODY, SECRET))).toBe(true)
  })

  it("rejects a tampered body", () => {
    const signature = sign(BODY, SECRET)
    const tampered = BODY.replace("message", "follow")
    expect(tampered).not.toBe(BODY)
    expect(verifyLineSignature(tampered, signature)).toBe(false)
  })

  it("rejects a signature computed with the wrong secret", () => {
    expect(verifyLineSignature(BODY, sign(BODY, "some-other-secret"))).toBe(false)
  })

  it("rejects when the channel secret is not configured", () => {
    delete process.env.LINE_CHANNEL_SECRET
    expect(verifyLineSignature(BODY, sign(BODY, SECRET))).toBe(false)
  })

  it("rejects a missing (null) signature", () => {
    expect(verifyLineSignature(BODY, null)).toBe(false)
  })
})
