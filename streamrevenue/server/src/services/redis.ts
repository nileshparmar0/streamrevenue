import Redis from 'ioredis';

// Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => {
  console.log('✅ Connected to Redis');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
});

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  REVENUE_SUMMARY: 60,      // 1 minute
  SUBSCRIBERS: 120,         // 2 minutes
  BITS_LEADERBOARD: 60,     // 1 minute
  USER_PROFILE: 300,        // 5 minutes
  PREDICTIONS: 600,         // 10 minutes
};

/**
 * Get cached data
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    if (data) {
      console.log(`🎯 Cache HIT: ${key}`);
      return JSON.parse(data);
    }
    console.log(`❌ Cache MISS: ${key}`);
    return null;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
}

/**
 * Set cached data with TTL
 */
export async function setCache(key: string, data: any, ttlSeconds: number): Promise<void> {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
    console.log(`💾 Cache SET: ${key} (TTL: ${ttlSeconds}s)`);
  } catch (error) {
    console.error('Redis set error:', error);
  }
}

/**
 * Delete cached data
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    await redis.del(key);
    console.log(`🗑️ Cache DELETE: ${key}`);
  } catch (error) {
    console.error('Redis delete error:', error);
  }
}

/**
 * Delete cached data by pattern
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`🗑️ Cache DELETE pattern: ${pattern} (${keys.length} keys)`);
    }
  } catch (error) {
    console.error('Redis delete pattern error:', error);
  }
}

/**
 * Cache wrapper - get from cache or fetch and cache
 */
export async function cacheWrapper<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Try cache first
  const cached = await getCache<T>(key);
  if (cached) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetchFn();
  
  // Cache it
  await setCache(key, data, ttlSeconds);
  
  return data;
}

/**
 * Track real-time metrics
 */
export async function incrementMetric(metric: string, value: number = 1): Promise<void> {
  try {
    await redis.incrbyfloat(`metrics:${metric}`, value);
  } catch (error) {
    console.error('Redis increment error:', error);
  }
}

/**
 * Get real-time metrics
 */
export async function getMetrics(): Promise<Record<string, number>> {
  try {
    const keys = await redis.keys('metrics:*');
    const metrics: Record<string, number> = {};
    
    for (const key of keys) {
      const value = await redis.get(key);
      const metricName = key.replace('metrics:', '');
      metrics[metricName] = parseFloat(value || '0');
    }
    
    return metrics;
  } catch (error) {
    console.error('Redis get metrics error:', error);
    return {};
  }
}

export default redis;