export type LineTextMessage = {
  type: "text"
  text: string
}

export type LineMessage = LineTextMessage

export type LineWebhookRequest = {
  destination?: string
  events?: LineWebhookEvent[]
}

export type LineWebhookEvent =
  | LineFollowEvent
  | LineUnfollowEvent
  | LineMessageEvent

export type LineFollowEvent = {
  type: "follow"
  replyToken?: string
  source: LineEventSource
  timestamp: number
}

export type LineUnfollowEvent = {
  type: "unfollow"
  source: LineEventSource
  timestamp: number
}

export type LineMessageEvent = {
  type: "message"
  replyToken: string
  source: LineEventSource
  timestamp: number
  message: LineEventMessage
}

export type LineEventSource =
  | { type: "user"; userId?: string }
  | { type: "group"; groupId: string; userId?: string }
  | { type: "room"; roomId: string; userId?: string }

export type LineEventMessage =
  | { type: "text"; id: string; text: string }
  | { type: "image"; id: string }
  | { type: "video"; id: string }
  | { type: "audio"; id: string }
  | { type: "file"; id: string; fileName: string; fileSize: number }
  | { type: "location"; id: string; latitude: number; longitude: number; address?: string }
