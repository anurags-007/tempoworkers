const { redisClient } = require('../config/redis');

/**
 * Generate a cache key based on route and query parameters
 */
exports.generateCacheKey = (prefix, params) => {
    const sortedKeys = Object.keys(params).sort();
    const queryStr = sortedKeys.map(key => `${key}=${params[key]}`).join('&');
    return `${prefix}:${queryStr || 'default'}`;
};

/**
 * Get data from cache
 */
exports.getCache = async (key) => {
    if (!redisClient) return null;
    try {
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Redis Get Error:', error);
        return null;
    }
};

/**
 * Set data in cache with TTL
 */
exports.setCache = async (key, data, ttlSeconds = 300) => {
    if (!redisClient) return;
    try {
        await redisClient.set(key, JSON.stringify(data), 'EX', ttlSeconds);
    } catch (error) {
        console.error('Redis Set Error:', error);
    }
};

/**
 * Invalidate cache by pattern (e.g., 'jobs:*')
 */
exports.invalidateCachePattern = async (pattern) => {
    if (!redisClient) return;
    try {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
            await redisClient.del(...keys);
            console.log(`🧹 Cache invalidated for pattern: ${pattern}`);
        }
    } catch (error) {
        console.error('Redis Invalidation Error:', error);
    }
};
