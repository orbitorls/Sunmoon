/**
 * Offline Storage and Caching Utilities
 * Provides persistent storage for tide data, weather data, and location information
 * Enables the app to work offline with cached data
 */

import { formatBytes } from "./core";

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: string;
  expiresAt?: number;
}

export interface OfflineDataStore {
  tideData: Map<string, CacheEntry<unknown>>;
  weatherData: Map<string, CacheEntry<unknown>>;
  locations: Map<string, CacheEntry<unknown>>;
  piers: Map<string, CacheEntry<unknown>>;
}

const STORAGE_PREFIX = "sunmoon_";
const CURRENT_VERSION = "1.0.0";
const DEFAULT_CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const LOCATION_CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit

/**
 * Get storage key for a location and date combination
 */
export function getStorageKey(
  type: "tide" | "weather" | "location" | "pier",
  lat: number,
  lon: number,
  date?: Date,
): string {
  const dateStr = date ? date.toISOString().split("T")[0] : "current";
  const latStr = lat.toFixed(4);
  const lonStr = lon.toFixed(4);
  return `${STORAGE_PREFIX}${type}_${latStr}_${lonStr}_${dateStr}`;
}

/**
 * Check if data is still valid (not expired)
 */
export function isCacheValid<T>(
  entry: CacheEntry<T> | null,
  maxAgeMs?: number,
): boolean {
  if (!entry) return false;

  const now = Date.now();

  // Check explicit expiration
  if (entry.expiresAt && now > entry.expiresAt) {
    return false;
  }

  // Check age-based expiration
  if (maxAgeMs && now - entry.timestamp > maxAgeMs) {
    return false;
  }

  return true;
}

/**
 * Save data to localStorage with expiration
 */
export function saveToCache<T>(
  key: string,
  data: T,
  cacheDurationMs: number = DEFAULT_CACHE_DURATION_MS,
): boolean {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      version: CURRENT_VERSION,
      expiresAt: Date.now() + cacheDurationMs,
    };

    const serialized = JSON.stringify(entry);
    const size = new Blob([serialized]).size;

    // Check if adding this would exceed storage limit
    if (size > MAX_STORAGE_SIZE) {
      console.warn(`Data too large to cache (${size} bytes)`);
      return false;
    }

    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    console.error("Error saving to cache:", error);
    // Handle QuotaExceededError by clearing old entries
    if (error instanceof DOMException && error.code === 22) {
      clearOldestCacheEntries();
      try {
        const entry: CacheEntry<T> = {
          data,
          timestamp: Date.now(),
          version: CURRENT_VERSION,
          expiresAt: Date.now() + cacheDurationMs,
        };
        localStorage.setItem(key, JSON.stringify(entry));
        return true;
      } catch (retryError) {
        console.error("Error saving to cache after cleanup:", retryError);
        return false;
      }
    }
    return false;
  }
}

/**
 * Load data from localStorage
 */
export function loadFromCache<T>(key: string, maxAgeMs?: number): T | null {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const entry: CacheEntry<T> = JSON.parse(stored);

    if (!isCacheValid(entry, maxAgeMs)) {
      localStorage.removeItem(key);
      return null;
    }

    return entry.data;
  } catch {
    console.error("Error loading from cache");
    return null;
  }
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCacheEntries(): number {
  let clearedCount = 0;
  const now = Date.now();

  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(STORAGE_PREFIX)) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const entry: CacheEntry<unknown> = JSON.parse(stored);
            if (entry.expiresAt && now > entry.expiresAt) {
              localStorage.removeItem(key);
              clearedCount++;
            }
          }
        } catch {
          // Skip invalid entries
          // eslint-disable-next-line no-continue
          continue;
        }
      }
    }
  } catch {
    console.error("Error clearing expired cache entries");
  }

  return clearedCount;
}

/**
 * Clear oldest cache entries when storage is full
 */
function clearOldestCacheEntries(count: number = 10): void {
  try {
    const entries: Array<{ key: string; timestamp: number }> = [];
    const keys = Object.keys(localStorage);

    for (const key of keys) {
      if (key.startsWith(STORAGE_PREFIX)) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const entry: CacheEntry<unknown> = JSON.parse(stored);
            entries.push({ key, timestamp: entry.timestamp });
          }
        } catch {
          // Skip invalid entries
          // eslint-disable-next-line no-continue
          continue;
        }
      }
    }

    // Sort by timestamp and remove oldest
    entries.sort((a, b) => a.timestamp - b.timestamp);
    for (let i = 0; i < Math.min(count, entries.length); i++) {
      localStorage.removeItem(entries[i].key);
    }
  } catch {
    console.error("Error clearing oldest cache entries");
  }
}

/**
 * Save tide data with automatic expiration
 */
export function saveTideDataCache(
  lat: number,
  lon: number,
  date: Date | undefined,
  tideData: unknown,
): boolean {
  const key = getStorageKey("tide", lat, lon, date);
  return saveToCache(key, tideData, DEFAULT_CACHE_DURATION_MS);
}

/**
 * Load tide data from cache
 */
export function loadTideDataCache(
  lat: number,
  lon: number,
  date: Date | undefined,
): unknown {
  const key = getStorageKey("tide", lat, lon, date);
  return loadFromCache(key, DEFAULT_CACHE_DURATION_MS);
}

/**
 * Save weather data with automatic expiration
 */
export function saveWeatherDataCache(
  lat: number,
  lon: number,
  weatherData: unknown,
): boolean {
  const key = getStorageKey("weather", lat, lon);
  return saveToCache(key, weatherData, 3 * 60 * 60 * 1000); // 3 hours
}

/**
 * Load weather data from cache
 */
export function loadWeatherDataCache(lat: number, lon: number): unknown {
  const key = getStorageKey("weather", lat, lon);
  return loadFromCache(key, 3 * 60 * 60 * 1000);
}

/**
 * Save location preferences with long expiration
 */
export function saveLocationCache(
  lat: number,
  lon: number,
  name: string,
  location: unknown,
): boolean {
  const key = getStorageKey("location", lat, lon);
  const base = location && typeof location === "object" ? location : {};
  return saveToCache(key, { ...base, name }, LOCATION_CACHE_DURATION_MS);
}

/**
 * Load location from cache
 */
export function loadLocationCache(lat: number, lon: number): unknown {
  const key = getStorageKey("location", lat, lon);
  return loadFromCache(key, LOCATION_CACHE_DURATION_MS);
}

/**
 * Save pier data with long expiration
 */
export function savePierCache(
  lat: number,
  lon: number,
  nearestPier: unknown,
): boolean {
  const key = getStorageKey("pier", lat, lon);
  return saveToCache(key, nearestPier, 30 * 24 * 60 * 60 * 1000); // 30 days
}

/**
 * Load pier data from cache
 */
export function loadPierCache(lat: number, lon: number): unknown {
  const key = getStorageKey("pier", lat, lon);
  return loadFromCache(key, 30 * 24 * 60 * 60 * 1000);
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  totalEntries: number;
  tideEntries: number;
  weatherEntries: number;
  locationEntries: number;
  pierEntries: number;
  approximateSize: number;
} {
  let totalSize = 0;
  let tideCount = 0;
  let weatherCount = 0;
  let locationCount = 0;
  let pierCount = 0;

  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(STORAGE_PREFIX)) {
        const data = localStorage.getItem(key) || "";
        totalSize += data.length;

        if (key.includes("_tide_")) tideCount++;
        else if (key.includes("_weather_")) weatherCount++;
        else if (key.includes("_location_")) locationCount++;
        else if (key.includes("_pier_")) pierCount++;
      }
    }
  } catch (error) {
    console.error("Error calculating cache stats:", error);
  }

  return {
    totalEntries: tideCount + weatherCount + locationCount + pierCount,
    tideEntries: tideCount,
    weatherEntries: weatherCount,
    locationEntries: locationCount,
    pierEntries: pierCount,
    approximateSize: totalSize,
  };
}

/**
 * Clear all app-related cache
 */
export function clearAllCache(): void {
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.error("Error clearing cache:", error);
  }
}

/**
 * Migrate old cache format to new one (if needed)
 */
export function migrateCache(): void {
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith("sunmoon_") && !key.startsWith(STORAGE_PREFIX)) {
        const oldKey = key;
        const newKey = key.replace("sunmoon_", STORAGE_PREFIX);

        const data = localStorage.getItem(oldKey);
        if (data) {
          // Try to parse and re-save with new format
          try {
            const parsed = JSON.parse(data);
            if (parsed.data !== undefined) {
              // Already has new format
              localStorage.setItem(newKey, data);
            } else {
              // Old format, wrap in new structure
              const entry: CacheEntry<unknown> = {
                data: parsed,
                timestamp: Date.now(),
                version: CURRENT_VERSION,
              };
              localStorage.setItem(newKey, JSON.stringify(entry));
            }
            if (oldKey !== newKey) {
              localStorage.removeItem(oldKey);
            }
          } catch {
            console.error("Error migrating cache entry");
          }
        }
      }
    }
  } catch {
    console.error("Error during cache migration");
  }
}

/**
 * Initialize offline storage (run on app start)
 */
export function initializeOfflineStorage(): void {
  try {
    // Clear expired entries
    const clearedCount = clearExpiredCacheEntries();
    if (clearedCount > 0) {
      console.log(`Cleared ${clearedCount} expired cache entries`);
    }

    // Run migration if needed
    migrateCache();

    // Log cache stats
    const stats = getCacheStats();
    console.log("Offline storage initialized:", {
      ...stats,
      approximateSize: formatBytes(stats.approximateSize),
    });
  } catch (error) {
    console.error("Error initializing offline storage:", error);
  }
}
