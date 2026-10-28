process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_for_automated_testing_1234567890';
process.env.RAZORPAY_KEY_ID = 'rzp_test_1234567890';
process.env.RAZORPAY_KEY_SECRET = 'test_razorpay_secret_key_1234567890';

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const setupTestDB = async () => {
    if (mongoose.connection.readyState !== 1) {
        await new Promise((resolve) => {
            if (mongoose.connection.readyState === 1) return resolve();
            mongoose.connection.once('open', resolve);
        });
    }
};

const teardownTestDB = async () => {
    if (mongoose.connection.readyState === 1) {
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            await collections[key].deleteMany({});
        }
        await mongoose.disconnect();
    }
    if (global.__MONGO_MEMORY_SERVER__) {
        await global.__MONGO_MEMORY_SERVER__.stop();
    }
};

const clearCollections = async () => {
    if (mongoose.connection.readyState === 1) {
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            await collections[key].deleteMany({});
        }
    }
};

const { generateToken } = require('../middleware/auth');

const createTestToken = (user) => {
    return generateToken(user);
};

module.exports = {
    setupTestDB,
    teardownTestDB,
    clearCollections,
    createTestToken,
};
