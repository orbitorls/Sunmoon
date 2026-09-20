/**
 * Redis Caching Service
 * Provides caching for API responses using Redis
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck - ioredis is an optional dependency; this file is intentionally JS-style until types are added

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  hitCount: number;
}

interface CacheOptions {
  ttl?: number;
  prefix?: string;
  compression?: boolean;
}

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

class RedisCacheService {
  private isConnected: boolean = false;
  private redisClient: any = null;
  private localCache: Map<string, any> = new Map();
  private config: RedisConfig | null = null;
  private fallbackMode: boolean = true;
  private memoryCacheLimit: number = 1000;

  constructor() {
    this.initializeConnection();
  }

  private async initializeConnection(): Promise<void> {
    try {
      const redisHost = process.env?.REDIS_HOST;
      const redisPort = process.env?.REDIS_PORT;
      
      if (redisHost && redisPort) {
        this.config = {
          host: redisHost,
          port: parseInt(redisPort, 10),
          password: process.env?.REDIS_PASSWORD,
          db: parseInt(process.env?.REDIS_DB || '0', 10),
        };
        
        try {
          const RedisModule = await import('ioredis');
          if (RedisModule.default) {
            this.redisClient = new RedisModule.default({
              host: this.config.host,
              port: this.config.port,
              password: this.config.password,
              db: this.config.db,
              retryStrategy: (times) => {
                if (times > 3) {
                  console.log('[Redis] Max retries reached, falling back to memory cache');
                  this.fallbackMode = true;
                  return null;
                }
                return Math.min(times * 200, 2000);
              },
              maxRetriesPerRequest: 3,
            });

            this.redisClient.on('connect', () => {
              console.log('[Redis] Connected successfully');
              this.isConnected = true;
              this.fallbackMode = false;
            });

            this.redisClient.on('error', (error) => {
              console.error('[Redis] Connection error:', error.message);
              this.isConnected = false;
              this.fallbackMode = true;
            });

            this.redisClient.on('close', () => {
              console.log('[Redis] Connection closed, using fallback');
              this.isConnected = false;
              this.fallbackMode = true;
            });
          } else {
            this.fallbackMode = true;
          }
        } catch (importError) {
          console.log('[Redis] ioredis not available, using memory cache');
          this.fallbackMode = true;
        }
      } else {
        console.log('[Redis] No config found, using memory cache only');
        this.fallbackMode = true;
      }
    } catch (error) {
      console.error('[Redis] Initialization error:', error);
      this.fallbackMode = true;
    }
  }

  private getCacheKey(prefix, key) {
    return `seapalo:${prefix}:${key}`;
  }

  private async getFromMemoryCache(key) {
    const entry = this.localCache.get(key);
    
    if (!entry) {
      return null;
    }
    
    if (Date.now() > entry.expiresAt) {
      this.localCache.delete(key);
      return null;
    }
    
    entry.hitCount++;
    return entry.data;
  }

  private async setInMemoryCache(key, data, ttlSeconds) {
    const now = Date.now();
    const entry = {
      data,
      timestamp: now,
      expiresAt: now + ttlSeconds * 1000,
      hitCount: 0,
    };
    
    this.localCache.set(key, entry);
    
    if (this.localCache.size > this.memoryCacheLimit) {
      this.evictOldestEntries();
    }
  }

  private evictOldestEntries() {
    const entries = Array.from(this.localCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = Math.floor(this.memoryCacheLimit * 0.2);
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      this.localCache.delete(entries[i][0]);
    }
  }

  async get(key, options) {
    const cacheKey = this.getCacheKey(options?.prefix || 'api', key);
    
    if (this.fallbackMode || !this.isConnected) {
      return this.getFromMemoryCache(cacheKey);
    }

    try {
      const cached = await this.redisClient.get(cacheKey);
      
      if (!cached) {
        return null;
      }

      const entry = JSON.parse(cached);
      
      if (Date.now() > entry.expiresAt) {
        await this.redisClient.del(cacheKey);
        return null;
      }

      entry.hitCount++;
      await this.redisClient.setex(
        cacheKey,
        Math.floor((entry.expiresAt - Date.now()) / 1000),
        JSON.stringify(entry)
      );

      return entry.data;
    } catch (error) {
      console.error('[Redis] Get error:', error);
      this.fallbackMode = true;
      return this.getFromMemoryCache(cacheKey);
    }
  }

  async set(key, data, options) {
    const cacheKey = this.getCacheKey(options?.prefix || 'api', key);
    const ttl = options?.ttl || 300;
    const now = Date.now();
    
    const entry = {
      data,
      timestamp: now,
      expiresAt: now + ttl * 1000,
      hitCount: 0,
    };

    if (this.fallbackMode || !this.isConnected) {
      await this.setInMemoryCache(cacheKey, data, ttl);
      return;
    }

    try {
      await this.redisClient.setex(cacheKey, ttl, JSON.stringify(entry));
    } catch (error) {
      console.error('[Redis] Set error:', error);
      this.fallbackMode = true;
      await this.setInMemoryCache(cacheKey, data, ttl);
    }
  }

  async delete(key, options) {
    const cacheKey = this.getCacheKey(options?.prefix || 'api', key);
    
    this.localCache.delete(cacheKey);
    
    if (!this.fallbackMode && this.isConnected) {
      try {
        await this.redisClient.del(cacheKey);
      } catch (error) {
        console.error('[Redis] Delete error:', error);
      }
    }
  }

  async clear(pattern) {
    this.localCache.clear();
    
    if (!this.fallbackMode && this.isConnected) {
      try {
        if (pattern) {
          const keys = await this.redisClient.keys(this.getCacheKey('api', pattern));
          if (keys.length > 0) {
            await this.redisClient.del(...keys);
          }
        } else {
          await this.redisClient.flushdb();
        }
      } catch (error) {
        console.error('[Redis] Clear error:', error);
      }
    }
  }

  async getStats() {
    let hits = 0;
    let misses = 0;
    let memorySize = 0;
    
    this.localCache.forEach((entry) => {
      memorySize += JSON.stringify(entry).length;
      if (entry.hitCount > 0) {
        hits += entry.hitCount;
      } else {
        misses++;
      }
    });

    return {
      hits,
      misses,
      size: this.localCache.size,
      memorySize,
      redisConnected: this.isConnected && !this.fallbackMode,
    };
  }

  async invalidatePattern(pattern) {
    await this.clear(pattern);
  }

  async healthCheck() {
    const stats = await this.getStats();
    
    return {
      status: this.isConnected && !this.fallbackMode ? 'healthy' : 'degraded',
      redis: this.isConnected && !this.fallbackMode,
      memory: true,
      memoryUsage: stats.memorySize,
    };
  }
}

export const redisCache = new RedisCacheService();

export function withCache(
  key,
  fetchFn,
  options
) {
  return async () => {
    const cached = await redisCache.get(key, options);
    if (cached) {
      return cached;
    }
    
    const data = await fetchFn();
    await redisCache.set(key, data, options);
    return data;
  };
}

export function createCacheKey(...parts) {
  return parts.join(':');
}

export type { CacheOptions, CacheEntry, RedisConfig };
