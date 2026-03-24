"use client";

import * as React from "react";
import {
  ArrowUp,
  ArrowDown,
  Droplets,
  TrendingUp,
  Info,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type {
  TideData,
  TideEvent,
  WaterLevelGraphData,
} from "@/lib/tide-service";
import { tideControlManager } from "@/lib/controls";
import { cn } from "@/lib/utils";

type TideAnimationProps = { tideData: TideData };

const TIDE_VISUAL_MAX = 3.5;
const TIDE_VISUAL_MIN = -0.5;
const VISUAL_RANGE = TIDE_VISUAL_MAX - TIDE_VISUAL_MIN;

function pointsToSmoothPath(points: { x: number; y: number }[]) {
  if (!points || points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  const d = points.map((p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const p0 = points[i - 1];
    const p1 = p;
    const p2 = points[i + 1] || p1;
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    return `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  });

  return d.join(" ");
}

export default function TideAnimationNew({ tideData }: TideAnimationProps) {
  const {
    currentWaterLevel = 0,
    tideEvents = [],
    waterLevelStatus = "ไม่ทราบ",
    apiStatus = "error",
  } = tideData || {};

  const [showHigh, setShowHigh] = React.useState(true);
  const [showLow, setShowLow] = React.useState(true);
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [zoomLevel, setZoomLevel] = React.useState(1);
  const [hoveredPoint, setHoveredPoint] = React.useState<{
    x: number;
    y: number;
    time: string;
    level: number;
  } | null>(null);
  const [panX, setPanX] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const svgRef = React.useRef<SVGSVGElement>(null);

  const graphData = React.useMemo<WaterLevelGraphData[]>(() => {
    return Array.isArray(tideData.graphData) ? tideData.graphData : [];
  }, [tideData.graphData]);

  // Better responsive sizing
  const [size, setSize] = React.useState({ w: 800, h: 450 });
  React.useEffect(() => {
    function update() {
      const w = Math.min(1200, Math.max(320, window.innerWidth - 32));
      const h = window.innerWidth < 768 ? 350 : 450;
      setSize({ w, h });
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const { points, pathD } = React.useMemo<{
    points: Array<{ x: number; y: number; time: string; level: number }>;
    pathD: string;
  }>(() => {
    if (!graphData || graphData.length === 0) {
      return { points: [], pathD: "" };
    }

    const pts = graphData.map((point, index) => {
      const baseX =
        (index / Math.max(1, graphData.length - 1)) * (size.w - 80) + 60;
      const x = baseX * zoomLevel + (size.w / 2) * (1 - zoomLevel) + panX;
      const y =
        size.h -
        ((point.level - TIDE_VISUAL_MIN) / VISUAL_RANGE) * (size.h - 60);
      return { x, y, time: point.time, level: point.level };
    });

    const path = pointsToSmoothPath(pts.map((pt) => ({ x: pt.x, y: pt.y })));
    return { points: pts, pathD: path || "" };
  }, [graphData, size, zoomLevel, panX]);

  return (
    <div className="space-y-8" aria-live="polite">
      {/* Current Status Cards - 3 Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current Level */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800/50 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">
                ระดับน้ำปัจจุบัน
              </p>
              <p className="text-4xl font-bold text-blue-700 dark:text-blue-300">
                {tideControlManager.adjustHeightForDatum(currentWaterLevel).toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                เมตร
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
              <Droplets className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800/30">
            <span
              className={cn(
                "inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold",
                waterLevelStatus === "น้ำขึ้น"
                  ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                  : waterLevelStatus === "น้ำลง"
                    ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
              )}
            >
              {waterLevelStatus}
            </span>
          </div>
        </div>

        {/* High Tide */}
        <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-2xl p-6 border border-red-200 dark:border-red-800/50 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">
                น้ำขึ้นสูงสุด
              </p>
              <p className="text-4xl font-bold text-red-700 dark:text-red-300">
                {tideEvents.find((e) => e.type === "high")?.level.toFixed(2) ||
                  "--"}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                เมตร
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/40 rounded-xl">
              <ArrowUp className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-800/30">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              เวลา: {tideEvents.find((e) => e.type === "high")?.time || "--:--"}
            </p>
          </div>
        </div>

        {/* Low Tide */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800/50 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">
                น้ำลงต่ำสุด
              </p>
              <p className="text-4xl font-bold text-blue-700 dark:text-blue-300">
                {tideEvents.find((e) => e.type === "low")?.level.toFixed(2) ||
                  "--"}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                เมตร
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
              <ArrowDown className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800/30">
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
              เวลา: {tideEvents.find((e) => e.type === "low")?.time || "--:--"}
            </p>
          </div>
        </div>
      </div>

      {/* Graph Section - Full Width */}
      <div className="bg-gradient-to-br from-white to-blue-50/50 dark:from-slate-800 dark:to-slate-900 rounded-3xl border-2 border-blue-200 dark:border-blue-900/50 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-6 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 dark:from-blue-900 dark:via-cyan-900 dark:to-teal-900 border-b-2 border-blue-300 dark:border-blue-700">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-3 bg-white/20 dark:bg-white/10 rounded-xl backdrop-blur-sm">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                กราฟระดับน้ำ 24 ชั่วโมง
              </h2>
              <p className="text-xs text-white/80">
                ข้อมูลสภาพน้ำตามเวลาแบบเรียลไทม์
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 backdrop-blur-sm",
                apiStatus === "success"
                  ? "bg-green-400/30 text-white"
                  : apiStatus === "loading"
                    ? "bg-yellow-400/30 text-white"
                    : "bg-red-400/30 text-white",
              )}
            >
              <span
                className={cn(
                  "w-2.5 h-2.5 rounded-full",
                  apiStatus === "success"
                    ? "bg-green-300 animate-pulse"
                    : apiStatus === "loading"
                      ? "bg-yellow-300 animate-pulse"
                      : "bg-red-300",
                )}
              />
              {apiStatus === "loading"
                ? "กำลังโหลด"
                : apiStatus === "success"
                  ? "พร้อมใช้งาน"
                  : "ออฟไลน์"}
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 hover:bg-white/20 dark:hover:bg-white/10 rounded-lg transition-colors"
              aria-label={isExpanded ? "ซ่อนกราฟ" : "แสดงกราฟ"}
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-white" />
              ) : (
                <ChevronDown className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Graph Content - Expandable */}
        {isExpanded && (
          <div className="p-8 w-full">
            {/* Zoom Controls */}
            <div className="flex items-center justify-between mb-4 px-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoomLevel(Math.max(1, zoomLevel - 0.2))}
                  disabled={zoomLevel <= 1}
                  className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="ซูมออก"
                  title="ซูมออก"
                >
                  <ZoomOut className="w-4 h-4 text-blue-600 dark:text-blue-300" />
                </button>
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-300 min-w-[60px] text-center px-3 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  {(zoomLevel * 100).toFixed(0)}%
                </span>
                <button
                  onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.2))}
                  disabled={zoomLevel >= 2}
                  className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="ซูมเข้า"
                  title="ซูมเข้า"
                >
                  <ZoomIn className="w-4 h-4 text-blue-600 dark:text-blue-300" />
                </button>
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-300 font-medium">
                ลากเพื่อเลื่อน • Hover เพื่อดูค่า
              </div>
            </div>

            {/* SVG Graph */}
            <div className="w-full overflow-x-auto">
              <svg
                ref={svgRef}
                role="img"
                aria-label="กราฟระดับน้ำ 24 ชั่วโมง"
                viewBox={`0 0 ${size.w} ${size.h}`}
                width="100%"
                preserveAspectRatio="xMidYMid meet"
                className={`bg-gradient-to-b from-blue-50/50 to-cyan-50/50 dark:from-slate-900 dark:to-slate-800 rounded-2xl border-2 border-blue-200 dark:border-blue-900/50 w-full shadow-inner ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
                onMouseDown={(e) => {
                  setIsDragging(true);
                  setDragStart({ x: e.clientX, y: e.clientY });
                }}
                onMouseMove={(e) => {
                  if (isDragging && svgRef.current) {
                    const deltaX = e.clientX - dragStart.x;
                    const maxPan = (size.w * (zoomLevel - 1)) / 2;
                    setPanX(
                      Math.max(-maxPan, Math.min(maxPan, panX + deltaX * 0.5)),
                    );
                    setDragStart({ x: e.clientX, y: e.clientY });
                    return;
                  }

                  const svg = e.currentTarget;
                  const rect = svg.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  const viewBoxX = (x / rect.width) * size.w - panX;
                  const viewBoxY = (y / rect.height) * size.h;

                  // Find nearest point
                  let nearest: (typeof points)[number] | null = null;
                  let minDist = Infinity;

                  points.forEach((pt) => {
                    const dist = Math.sqrt(
                      Math.pow(pt.x - viewBoxX, 2) +
                        Math.pow(pt.y - viewBoxY, 2),
                    );
                    if (dist < minDist && dist < 40) {
                      minDist = dist;
                      nearest = pt;
                    }
                  });

                  setHoveredPoint(nearest);
                }}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => {
                  setHoveredPoint(null);
                  setIsDragging(false);
                }}
              >
                <defs>
                  <linearGradient
                    id="grad-tide-fill-new"
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.2" />
                    <stop
                      offset="100%"
                      stopColor="#06b6d4"
                      stopOpacity="0.05"
                    />
                  </linearGradient>
                  <linearGradient
                    id="grad-tide-line-new"
                    x1="0"
                    x2="1"
                    y1="0"
                    y2="0"
                  >
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="50%" stopColor="#0ea5e9" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>

                {/* Grid */}
                {Array.from({ length: 5 }).map((_, i) => {
                  const y = (i / 4) * size.h;
                  const label = (
                    TIDE_VISUAL_MAX -
                    (i * VISUAL_RANGE) / 4
                  ).toFixed(1);
                  return (
                    <g key={`grid-${i}`}>
                      <line
                        x1={60}
                        y1={y}
                        x2={size.w - 20}
                        y2={y}
                        stroke={i === 2 ? "#cbd5e1" : "#e2e8f0"}
                        strokeWidth={i === 2 ? 2 : 1}
                        strokeDasharray={i === 2 ? "0" : "5,5"}
                        opacity={i === 2 ? 1 : 0.5}
                      />
                      <text
                        x={20}
                        y={y + 6}
                        fontSize={13}
                        fill="#64748b"
                        fontWeight="600"
                      >
                        {label}
                      </text>
                    </g>
                  );
                })}

                {/* Y-axis unit */}
                <text
                  x={10}
                  y={25}
                  fontSize={12}
                  fill="#64748b"
                  fontWeight="700"
                >
                  ม.
                </text>

                {/* Area fill */}
                {points.length > 1 && (
                  <path
                    d={`${pathD} L ${size.w - 20} ${size.h} L 60 ${size.h} Z`}
                    fill="url(#grad-tide-fill-new)"
                  />
                )}

                {/* Line */}
                {points.length > 1 && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="url(#grad-tide-line-new)"
                    strokeWidth={4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Markers */}
                {tideEvents
                  .filter(
                    (event: TideEvent) =>
                      (event.type === "high" && showHigh) ||
                      (event.type === "low" && showLow),
                  )
                  .map((event: TideEvent, idx: number) => {
                    if (points.length === 0) {
                      return null;
                    }

                    const match = points.reduce((best, point) => {
                      const bestDiff = Math.abs(best.level - event.level);
                      const pointDiff = Math.abs(point.level - event.level);
                      return pointDiff < bestDiff ? point : best;
                    }, points[0]);

                    const isHigh = event.type === "high";
                    return (
                      <g
                        key={`marker-${idx}`}
                        transform={`translate(${match.x},${match.y})`}
                      >
                        <circle
                          r={12}
                          fill={isHigh ? "#ef4444" : "#3b82f6"}
                          opacity={0.2}
                        />
                        <circle
                          r={8}
                          fill={isHigh ? "#ef4444" : "#3b82f6"}
                          stroke="#fff"
                          strokeWidth={2.5}
                        />
                        <text
                          x={0}
                          y={3}
                          fontSize={12}
                          fill="#fff"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {isHigh ? "▲" : "▼"}
                        </text>
                      </g>
                    );
                  })}

                {/* Time labels */}
                {[0, 6, 12, 18, 23].map((hour) => {
                  const x = (hour / 23) * (size.w - 80) + 60;
                  return (
                    <g key={`time-${hour}`}>
                      <line
                        x1={x}
                        y1={size.h - 10}
                        x2={x}
                        y2={size.h}
                        stroke="#e2e8f0"
                        strokeWidth={1}
                      />
                      <text
                        x={x}
                        y={size.h + 20}
                        fontSize={13}
                        fill="#64748b"
                        textAnchor="middle"
                        fontWeight="600"
                      >
                        {hour.toString().padStart(2, "0")}:00
                      </text>
                    </g>
                  );
                })}

                {/* Hover Tooltip */}
                {hoveredPoint && (
                  <g>
                    {/* Vertical guide line */}
                    <line
                      x1={hoveredPoint.x}
                      y1={0}
                      x2={hoveredPoint.x}
                      y2={size.h}
                      stroke="#cbd5e1"
                      strokeWidth={1}
                      strokeDasharray="4,4"
                      opacity={0.6}
                    />
                    {/* Point highlight */}
                    <circle
                      cx={hoveredPoint.x}
                      cy={hoveredPoint.y}
                      r={6}
                      fill="#3b82f6"
                      stroke="#fff"
                      strokeWidth={2}
                    />
                    {/* Tooltip background */}
                    <rect
                      x={Math.max(
                        10,
                        Math.min(hoveredPoint.x - 60, size.w - 130),
                      )}
                      y={hoveredPoint.y - 50}
                      width={120}
                      height={45}
                      rx={6}
                      fill="#1e293b"
                      opacity={0.95}
                    />
                    {/* Tooltip text - Time */}
                    <text
                      x={
                        Math.max(
                          10,
                          Math.min(hoveredPoint.x - 60, size.w - 130),
                        ) + 60
                      }
                      y={hoveredPoint.y - 30}
                      fontSize={12}
                      fill="#f1f5f9"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {hoveredPoint.time}
                    </text>
                    {/* Tooltip text - Level */}
                    <text
                      x={
                        Math.max(
                          10,
                          Math.min(hoveredPoint.x - 60, size.w - 130),
                        ) + 60
                      }
                      y={hoveredPoint.y - 14}
                      fontSize={13}
                      fill="#3b82f6"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {hoveredPoint.level.toFixed(2)}ม.
                    </text>
                  </g>
                )}
              </svg>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="px-6 sm:px-8 py-6 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-t-2 border-blue-200 dark:border-blue-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-blue-700 dark:text-blue-300 uppercase">
              แสดง:
            </span>
            <button
              onClick={() => setShowHigh(!showHigh)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 border-2",
                showHigh
                  ? "bg-red-500 dark:bg-red-600 text-white border-red-600 dark:border-red-700 shadow-md"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600",
              )}
            >
              <ArrowUp className="w-4 h-4" /> น้ำขึ้น
            </button>
            <button
              onClick={() => setShowLow(!showLow)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 border-2",
                showLow
                  ? "bg-blue-500 dark:bg-blue-600 text-white border-blue-600 dark:border-blue-700 shadow-md"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600",
              )}
            >
              <ArrowDown className="w-4 h-4" /> น้ำลง
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <Info className="w-4 h-4" />
            <span>ลงกดที่ปุ่มเพื่อซ่อน/แสดงตัวหนี</span>
          </div>
        </div>
      </div>
    </div>
  );
}
