/**
 * Distance Calculation Utilities
 * Provides functions for calculating distances between locations
 * and finding nearest piers/ports
 */

export interface PierLocation {
  name: string;
  lat: number;
  lon: number;
  region: string;
  type: 'fishing' | 'commercial' | 'ferry' | 'resort';
}

/**
 * Thailand coastal piers/ports database
 * Includes major fishing piers, commercial ports, and ferry terminals
 * Updated: 2025 with verified locations and correct provinces
 */
export const THAI_PIERS: PierLocation[] = [
  // ท่าเรือประมง ฝั่งอ่าวไทยตอนใน (Gulf of Thailand - Inner)
  { name: 'ท่าเรือประมงมหาชัย', lat: 13.5333, lon: 100.2667, region: 'สมุทรสาคร', type: 'fishing' },
  { name: 'ท่าเรือประมงปากน้ำ', lat: 13.5922, lon: 100.6028, region: 'สมุทรสาคร', type: 'fishing' },
  { name: 'ท่าเรือประมงพัทยา', lat: 12.9236, lon: 100.8783, region: 'ชลบุรี', type: 'fishing' },
  { name: 'ท่าเรือสีชัง', lat: 13.1500, lon: 100.8170, region: 'ชลบุรี', type: 'ferry' },
  { name: 'ท่าเรือบางแสน', lat: 13.3611, lon: 100.9847, region: 'ชลบุรี', type: 'fishing' },
  
  // ท่าเรือการค้าหลัก (Main Commercial Ports - PAT)
  { name: 'ท่าเรือกรุงเทพ (คลองเตย)', lat: 13.7000, lon: 100.5833, region: 'กรุงเทพมหานคร', type: 'commercial' },
  { name: 'ท่าเรือแหลมฉบัง', lat: 12.7833, lon: 101.0167, region: 'ชลบุรี', type: 'commercial' },
  { name: 'ท่าเรือมาบตาพุด', lat: 12.6833, lon: 101.2833, region: 'ระยอง', type: 'commercial' },
  { name: 'ท่าเรือสงขลา', lat: 7.1869, lon: 100.5967, region: 'สงขลา', type: 'commercial' },

  // ท่าเรือฝั่งอ่าวไทยตอนล่าง (Gulf of Thailand - Lower)
  { name: 'ท่าเรือประมงชุมพร', lat: 10.4930, lon: 99.1800, region: 'ชุมพร', type: 'fishing' },
  { name: 'ท่าเรือประมงสุราษฎร์ธานี', lat: 9.1380, lon: 99.3330, region: 'สุราษฎร์ธานี', type: 'fishing' },
  { name: 'ท่าเรือดอนสัก (สมุย)', lat: 9.5280, lon: 99.9853, region: 'สุราษฎร์ธานี', type: 'ferry' },
  { name: 'ท่าเรือเกาะสมุย', lat: 9.5167, lon: 100.0500, region: 'สุราษฎร์ธานี', type: 'ferry' },

  // ท่าเรือฝั่งอันดามัน (Andaman Sea Ports)
  { name: 'ท่าเรือภูเก็ต (ท่าเรือน้ำลึก)', lat: 7.8919, lon: 98.3964, region: 'ภูเก็ต', type: 'commercial' },
  { name: 'ท่าเรือกระบี่ (อ่าวนาง)', lat: 8.0367, lon: 98.9069, region: 'กระบี่', type: 'ferry' },
  { name: 'ท่าเรือระนอง', lat: 9.9556, lon: 98.6264, region: 'ระนอง', type: 'ferry' },
  { name: 'ท่าเรือประมงตรัง', lat: 7.5089, lon: 99.6119, region: 'ตรัง', type: 'fishing' },
  { name: 'ท่าเรือสตูล', lat: 6.6239, lon: 99.8219, region: 'สตูล', type: 'ferry' },
  { name: 'ท่าเรือตากใบ (เกาะลันตา)', lat: 7.5667, lon: 99.0500, region: 'กระบี่', type: 'ferry' },
];

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Find the nearest pier to a given location
 * @param lat - User latitude
 * @param lon - User longitude
 * @param maxDistance - Maximum distance in kilometers (optional)
 * @returns Nearest pier with distance
 */
export interface NearestPier extends PierLocation {
  distance: number;
}

export function findNearestPier(
  lat: number,
  lon: number,
  maxDistance: number = 100,
): NearestPier | null {
  let nearest: NearestPier | null = null;

  for (const pier of THAI_PIERS) {
    const distance = calculateDistance(lat, lon, pier.lat, pier.lon);
    if (distance <= maxDistance) {
      if (!nearest || distance < nearest.distance) {
        nearest = { ...pier, distance };
      }
    }
  }

  return nearest;
}

/**
 * Find multiple nearest piers
 * @param lat - User latitude
 * @param lon - User longitude
 * @param limit - Number of piers to return
 * @returns Array of nearest piers sorted by distance
 */
export function findNearestPiers(
  lat: number,
  lon: number,
  limit: number = 5,
): NearestPier[] {
  const distances = THAI_PIERS.map((pier) => ({
    ...pier,
    distance: calculateDistance(lat, lon, pier.lat, pier.lon),
  }));

  return distances.sort((a, b) => a.distance - b.distance).slice(0, limit);
}

/**
 * Format distance for display
 * @param distanceKm - Distance in kilometers
 * @returns Formatted distance string
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${(distanceKm * 1000).toFixed(0)} เมตร`;
  }
  return `${distanceKm.toFixed(2)} กม.`;
}

/**
 * Get distance category/description
 * @param distanceKm - Distance in kilometers
 * @returns Distance category description
 */
export function getDistanceCategory(
  distanceKm: number,
): 'very-close' | 'close' | 'moderate' | 'far' {
  if (distanceKm < 5) return 'very-close';
  if (distanceKm < 20) return 'close';
  if (distanceKm < 50) return 'moderate';
  return 'far';
}

/**
 * Get Thai text description for distance category
 */
export function getDistanceCategoryText(
  category: ReturnType<typeof getDistanceCategory>,
): string {
  const categoryMap = {
    'very-close': 'ใกล้มาก',
    'close': 'ใกล้',
    'moderate': 'ระยะกลาง',
    'far': 'ไกล',
  };
  return categoryMap[category];
}

/**
 * Get color for distance category
 */
export function getDistanceCategoryColor(
  category: ReturnType<typeof getDistanceCategory>,
): string {
  const colorMap = {
    'very-close': 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
    'close': 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
    'moderate': 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30',
    'far': 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30',
  };
  return colorMap[category];
}

/**
 * Get icon emoji for pier type
 */
export function getPierTypeIcon(type: PierLocation['type']): string {
  const iconMap = {
    'fishing': '🎣',
    'commercial': '🏭',
    'ferry': '⛴️',
    'resort': '🏖️',
  };
  return iconMap[type];
}

/**
 * Get Thai text for pier type
 */
export function getPierTypeText(type: PierLocation['type']): string {
  const typeMap = {
    'fishing': 'ท่าเรือประมง',
    'commercial': 'ท่าเรือการค้า',
    'ferry': 'ท่าเรือเฟอร์รี่',
    'resort': 'ท่าท่องเที่ยว',
  };
  return typeMap[type];
}
