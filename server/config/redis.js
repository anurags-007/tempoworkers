const Redis = require('ioredis');

const getRedisClient = () => {
    if (!process.env.REDIS_URL) {
        console.warn('⚠️  REDIS_URL not found. Caching and WebSocket scaling will be disabled.');
        return null;
    }

    try {
        const client = new Redis(process.env.REDIS_URL, {
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            maxRetriesPerRequest: 3,
        });

        client.on('error', (err) => {
            console.error('❌ Redis Connection Error:', err.message);
        });

        client.on('connect', () => {
            console.log('✅ Connected to Redis');
        });

        return client;
    } catch (error) {
        console.error('❌ Redis Client Construction Error:', error);
        return null;
    }
};

const redisClient = getRedisClient();
const pubClient = getRedisClient(); // For Socket.io adapter
const subClient = pubClient ? pubClient.duplicate() : null; // For Socket.io adapter

module.exports = { redisClient, pubClient, subClient };
