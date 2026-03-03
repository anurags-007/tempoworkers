const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            console.warn('⚠️ MONGO_URI is missing. Booting fallback Memory MongoDB...');
            const mongoServer = await MongoMemoryServer.create();
            const uri = mongoServer.getUri();
            await mongoose.connect(uri);
            console.log(`✅ In-Memory MongoDB Connected at ${uri}`);
        } else {
            await mongoose.connect(process.env.MONGO_URI);
            console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);
        }
    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
