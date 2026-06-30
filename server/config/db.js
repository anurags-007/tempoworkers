const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            console.warn('⚠️ MONGO_URI is missing. Attempting connection to local MongoDB service...');
            try {
                await mongoose.connect('mongodb://127.0.0.1:27017/tempoworkers', {
                    serverSelectionTimeoutMS: 2000
                });
                console.log(`✅ Connected to local MongoDB service`);
            } catch (localError) {
                console.warn('⚠️ Local MongoDB service not available. Booting fallback Memory MongoDB...');
                const { MongoMemoryServer } = require('mongodb-memory-server');
                const mongoServer = await MongoMemoryServer.create();
                const uri = mongoServer.getUri();
                await mongoose.connect(uri);
                console.log(`✅ In-Memory MongoDB Connected at ${uri}`);
            }
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
