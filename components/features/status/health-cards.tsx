import { cn } from "@/lib/utils";
import type { HealthProvider, HealthProviderStatus } from "@/hooks/use-api-health";

export type HealthStatus = "online" | "offline" | "degraded" | "maintenance";

type HealthCardsProps = {
  tideStatus: HealthStatus;
  tideMessage: string;
  weatherStatus: HealthStatus;
  weatherMessage: string;
  lastUpdated: string;
  /** Real per-provider results from GET /api/health. */
  providers: Record<string, HealthProvider>;
  className?: string;
};

const PROVIDER_LABELS: Record<string, string> = {
  openweather: "OpenWeather",
  stormglass: "Stormglass",
};

/** A provider with no key is not "offline" — it was never probed. */
export function providerToHealthStatus(status: HealthProviderStatus): HealthStatus {
  if (status === "ok") return "online";
  if (status === "disabled") return "maintenance";
  return "offline";
}

function StatusPill({ status }: { status: HealthStatus }) {
  const text =
    status === "online"
      ? "ONLINE"
      : status === "degraded"
        ? "DEGRADED"
        : status === "maintenance"
          ? "NOT CONFIGURED"
          : "OFFLINE";
  const tone =
    status === "online"
      ? "badge-nominal"
      : status === "degraded"
        ? "badge-warning"
        : status === "maintenance"
          ? "badge-neutral"
          : "badge-critical";
  return (
    <span className={tone} role="status">
      ● {text}
    </span>
  );
}

export default function HealthCards({
  tideStatus,
  tideMessage,
  weatherStatus,
  weatherMessage,
  lastUpdated,
  providers,
  className,
}: HealthCardsProps) {
  const providerCards = Object.entries(providers).map(([key, provider]) => ({
    key,
    title: PROVIDER_LABELS[key] ?? key,
    subtitle: provider.message,
    metricLabel: "Round-trip latency",
    metricValue: provider.latencyMs !== undefined ? `${provider.latencyMs} ms` : "ไม่ได้ตรวจ",
    status: providerToHealthStatus(provider.status),
  }));

  const cards = [
    {
      key: "tide",
      title: "ระบบพยากรณ์น้ำขึ้นน้ำลง",
      subtitle: "ฮาร์มอนิกภายใน",
      metricLabel: "อัปเดตล่าสุด",
      metricValue: lastUpdated || "—",
      status: tideStatus,
      message: tideMessage,
    },
    {
      key: "weather",
      title: "ระบบสภาพอากาศ",
      subtitle: "ผสมสภาพอากาศกับการคำนวณน้ำขึ้น",
      metricLabel: "แหล่งข้อมูล",
      metricValue: weatherStatus === "online" ? "ออนไลน์" : "ใช้ข้อมูลสำรอง",
      status: weatherStatus,
      message: weatherMessage,
    },
    ...providerCards.map((card) => ({ ...card, message: card.subtitle })),
  ];

  return (
    <div className={cn("grid gap-4 md:grid-cols-3", className)}>
      {cards.map((card) => (
        <div key={card.key} className="card-l1 p-4">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-bold text-ink">
                {card.title}
              </div>
              <div className="micro-label mt-1 truncate text-ink-faint">{card.subtitle}</div>
            </div>
            <StatusPill status={card.status} />
          </div>
          <div className="flex items-baseline justify-between gap-2 border-t border-line bg-canvas px-1 py-2">
            <span className="micro-label text-ink-faint">{card.metricLabel}</span>
            <span className="telemetry-num text-sm font-bold text-brand-600">
              {card.metricValue}
            </span>
          </div>
          {"message" in card && card.message ? (
            <p className="mt-2 text-xs leading-5 text-ink-muted">{card.message}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
