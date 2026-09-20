/**
 * LINE service — the public surface consumed by routes and server actions.
 *
 * Thin re-export over `lib/services/line/*` so callers have one import path
 * (and the webhook, the weather-update route, and the LINE server action all
 * agree on it) while the implementation stays split by concern.
 */

export { verifyLineSignature } from "./line/signature"

export { getDefaultLineLocation, getLineDispatchToken } from "./line/config"

export {
  handleLineMessage,
  parseLocationFromText,
  type LineEvent,
} from "./line/message-handler"

export { sendLineMessage, sendWelcomeMessage } from "./line/reply"

export {
  dispatchWeatherUpdate,
  ensureSubscriber,
  chunkArray,
  type WeatherDispatchOptions,
  type WeatherDispatchResult,
} from "./line/weather-dispatch"

export {
  buildWeatherMessages,
  buildDisasterAlertMessages,
  buildWelcomeMessage,
  buildUnsupportedLocationMessage,
  buildErrorMessage,
  formatForecastMessage,
  handleWeatherError,
} from "./line/message-builder"

export {
  addSubscriber,
  removeSubscriber,
  listSubscribers,
  clearSubscribers,
  type LineSubscriber,
} from "./line/subscriber-store"

export type {
  LineMessage,
  LineTextMessage,
  LineWebhookRequest,
  LineWebhookEvent,
  LineMessageEvent,
  LineFollowEvent,
  LineUnfollowEvent,
  LineEventSource,
  LineEventMessage,
} from "./line/types"
