"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";
import type { WaterLevelGraphData } from "@/lib/domain/types";

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { level: number; prediction: boolean } }>;
  label?: string;
  referenceLevel: number;
}

const CustomTooltip = ({ active, payload, label, referenceLevel }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const { level, prediction } = payload[0].payload;
  const diff = level - referenceLevel;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-950">
      <p className="text-sm font-bold tabular-nums text-slate-800 dark:text-slate-100">{label}</p>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
        ระดับน้ำ: <span className="font-bold tabular-nums">{level.toFixed(2)} ม.</span>
      </p>
      <p className="text-xs text-slate-600 dark:text-slate-400">
        เทียบอ้างอิง: <span className={cn("font-medium tabular-nums", diff > 0 ? "text-orange-600 dark:text-orange-400" : "text-emerald-600 dark:text-emerald-400")}>
          {diff > 0 ? "+" : ""}{diff.toFixed(2)} ม.
        </span>
      </p>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
        {prediction ? "ค่าทำนาย" : "ค่าจริง"}
      </p>
    </div>
  );
};

interface WaterLevelChartProps {
  data: WaterLevelGraphData[];
  domain: [number, number];
  referenceLevel: number;
  warningThresholdMeters?: number;
  floodThresholdMeters?: number;
}

/**
 * The recharts canvas for WaterLevelGraph. Extracted so recharts can be loaded
 * with next/dynamic (ssr: false) from water-level-graph.tsx and kept out of the
 * main client bundle. Markup, props, data mapping, tooltip and reference lines
 * are byte-for-byte the same as the inline chart it replaced.
 */
export default function WaterLevelChart({
  data,
  domain,
  referenceLevel,
  warningThresholdMeters,
  floodThresholdMeters,
}: WaterLevelChartProps) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.45} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis
            domain={domain}
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v.toFixed(1)}`}
            width={40}
          />
          <ReferenceLine
            y={referenceLevel}
            stroke="#10b981"
            strokeDasharray="5 5"
            strokeWidth={2}
            label={{
              value: `MSL ${referenceLevel.toFixed(2)}m`,
              position: "right",
              fill: "#059669",
              fontSize: 11,
              fontWeight: 600,
            }}
          />
          {warningThresholdMeters && (
            <ReferenceLine
              y={referenceLevel + warningThresholdMeters}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{
                value: "เตือน",
                position: "right",
                fill: "#d97706",
                fontSize: 10,
                fontWeight: 600,
              }}
            />
          )}
          {floodThresholdMeters && (
            <ReferenceLine
              y={referenceLevel + floodThresholdMeters}
              stroke="#ef4444"
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{
                value: "วิกฤต",
                position: "right",
                fill: "#dc2626",
                fontSize: 10,
                fontWeight: 600,
              }}
            />
          )}
          <Tooltip content={<CustomTooltip referenceLevel={referenceLevel} />} cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: "4 4" }} />
          <Area type="monotone" dataKey="level" stroke="#2563eb" strokeWidth={3} fill="url(#colorLevel)" animationDuration={800} activeDot={{ r: 6, strokeWidth: 0 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
