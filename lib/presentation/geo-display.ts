import type { PierLocation } from "@/lib/domain/geo";

/**
 * Display helpers for pier and distance data. Split out of
 * `lib/domain/geo.ts` because the domain layer decides *what* a distance is
 * and this layer decides how it reads; `docs/architecture.md` keeps that
 * boundary thin.
 */

/** Format distance for display. */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${(distanceKm * 1000).toFixed(0)} เมตร`;
  }
  return `${distanceKm.toFixed(2)} กม.`;
}

export type DistanceCategory = "very-close" | "close" | "moderate" | "far";

/** Bucket a distance for display. */
export function getDistanceCategory(distanceKm: number): DistanceCategory {
  if (distanceKm < 5) return "very-close";
  if (distanceKm < 20) return "close";
  if (distanceKm < 50) return "moderate";
  return "far";
}

const DISTANCE_CATEGORY_TEXT: Record<DistanceCategory, string> = {
  "very-close": "ใกล้มาก",
  close: "ใกล้",
  moderate: "ระยะกลาง",
  far: "ไกล",
};

export function getDistanceCategoryText(category: DistanceCategory): string {
  return DISTANCE_CATEGORY_TEXT[category];
}

const DISTANCE_CATEGORY_COLOR: Record<DistanceCategory, string> = {
  "very-close": "text-green-600 bg-green-100",
  close: "text-blue-600 bg-blue-100",
  moderate: "text-yellow-600 bg-yellow-100",
  far: "text-red-600 bg-red-100",
};

export function getDistanceCategoryColor(category: DistanceCategory): string {
  return DISTANCE_CATEGORY_COLOR[category];
}

const PIER_TYPE_ICON: Record<PierLocation["type"], string> = {
  fishing: "🎣",
  commercial: "🏭",
  ferry: "⛴️",
  resort: "🏖️",
};

export function getPierTypeIcon(type: PierLocation["type"]): string {
  return PIER_TYPE_ICON[type];
}

const PIER_TYPE_TEXT: Record<PierLocation["type"], string> = {
  fishing: "ท่าเรือประมง",
  commercial: "ท่าเรือการค้า",
  ferry: "ท่าเรือเฟอร์รี่",
  resort: "ท่าท่องเที่ยว",
};

export function getPierTypeText(type: PierLocation["type"]): string {
  return PIER_TYPE_TEXT[type];
}
