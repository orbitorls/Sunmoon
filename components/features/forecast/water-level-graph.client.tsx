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
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
      <p className="text-sm font-bold tabular-nums text-slate-800">{label}</p>
      <p className="mt-1 text-xs text-slate-600">
        ระดับน้ำ: <span className="font-bold tabular-nums">{level.toFixed(2)} ม.</span>
      </p>
      <p className="text-xs text-slate-600">
        เทียบอ้างอิง: <span className={cn("font-medium tabular-nums", diff > 0 ? "text-orange-600" : "text-emerald-600")}>
          {diff > 0 ? "+" : ""}{diff.toFixed(2)} ม.
        </span>
      </p>
      <p className="mt-1 text-xs text-slate-600">
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
  const levels = data.map((d) => d.level);
  const chartSummary = data.length
    ? `กราฟระดับน้ำ ${data.length} จุด สูงสุด ${Math.max(...levels).toFixed(2)} เมตร ต่ำสุด ${Math.min(...levels).toFixed(2)} เมตร เทียบเส้นอ้างอิง ${referenceLevel.toFixed(2)} เมตร ตารางค่าทั้งหมดอยู่ในส่วนรายละเอียดด้านล่าง`
    : "ยังไม่มีข้อมูลกราฟ";

  return (
    <div
      className="h-[320px] w-full"
      role="img"
      aria-label={chartSummary}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0284C7" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#0284C7" stopOpacity={0.04} />
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
              value: `เส้นอ้างอิง ม.รทก. ${referenceLevel.toFixed(2)}m`,
              position: "right",
              fill: "#059669",
              fontSize: 11,
              fontWeight: 600,
            }}
          />
          {warningThresholdMeters && (
            <ReferenceLine
              y={referenceLevel + warningThresholdMeters}
              stroke="#DC2626"
              strokeDasharray="6 4"
              strokeWidth={2}
              label={{
                value: `วิกฤต ${(referenceLevel + warningThresholdMeters).toFixed(2)} ม. (±2.40)`,
                position: "right",
                fill: "#DC2626",
                fontSize: 11,
                fontWeight: 700,
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
          <Area type="monotone" dataKey="level" stroke="#0284C7" strokeWidth={3} fill="url(#colorLevel)" animationDuration={800} activeDot={{ r: 6, strokeWidth: 0 }} style={{ filter: "drop-shadow(0 4px 8px rgba(3,105,161,0.15))" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
