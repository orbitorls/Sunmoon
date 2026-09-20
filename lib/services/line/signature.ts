import { createHmac } from "node:crypto"

export function verifyLineSignature(body: string, signature: string | null): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET

  if (!secret) {
    console.error("LINE_CHANNEL_SECRET not set; rejecting webhook signature verification")
    return false
  }

  if (!signature) {
    return false
  }

  const computed = createHmac("sha256", secret).update(body).digest("base64")
  return computed === signature
}
