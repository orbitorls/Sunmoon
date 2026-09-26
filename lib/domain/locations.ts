import type { LocationData } from "@/lib/domain/types";

/**
 * The default point when nothing is chosen or geolocation fails. Named rather
 * than inlined because the fallback also decides what a fresh visitor sees.
 */
export const BANGKOK_DEFAULT: LocationData = {
  name: "กรุงเทพมหานคร",
  lat: 13.7563,
  lon: 100.5018,
};

/**
 * Coastal points offered in the UI. One list for every picker: the quick
 * actions, the favourites picker and the map fallback all read from here, so
 * the same place cannot appear under two names or at two coordinates.
 */
export const POPULAR_LOCATIONS: LocationData[] = [
  { name: "กรุงเทพมหานคร", lat: 13.7563, lon: 100.5018 },
  { name: "พัทยา, ชลบุรี", lat: 12.93, lon: 100.88 },
  { name: "หัวหิน, ประจวบคีรีขันธ์", lat: 12.57, lon: 99.96 },
  { name: "ภูเก็ต", lat: 7.89, lon: 98.4 },
  { name: "เกาะสมุย, สุราษฎร์ธานี", lat: 9.51, lon: 100.06 },
  { name: "กระบี่", lat: 8.09, lon: 98.91 },
  { name: "เกาะช้าง, ตราด", lat: 12.05, lon: 102.36 },
  { name: "ระยอง", lat: 12.68, lon: 101.28 },
  { name: "ชะอำ, เพชรบุรี", lat: 12.8, lon: 99.97 },
  { name: "สมุทรปราการ", lat: 13.6, lon: 100.6 },
  { name: "สมุทรสาคร", lat: 13.55, lon: 100.28 },
  { name: "ชุมพร", lat: 10.49, lon: 99.18 },
];

/** Case-insensitive substring match over the name, for the location search. */
export function searchPopularLocations(query: string): LocationData[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return POPULAR_LOCATIONS;
  return POPULAR_LOCATIONS.filter((location) => location.name.toLowerCase().includes(trimmed));
}
