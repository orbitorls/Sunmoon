import { createHmac } from "node:crypto"

export function verifyLineSignature(body: string, signature: string | null): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET

  if (!secret) {
    console.warn("LINE_CHANNEL_SECRET not set; skipping webhook signature verification")
    return true
  }

  if (!signature) {
    return false
  }

  const computed = createHmac("sha256", secret).update(body).digest("base64")
  return computed === signature
}
