const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // We will use 'mobile' as the primary identifier for workers
    mobile: {
        type: String,
        // Remove strict required/unique because Employers might not have one, or handle uniquely per role
        sparse: true,
        unique: true,
    },
    // We will use 'email' as the primary identifier for employers
    email: {
        type: String,
        sparse: true,
        unique: true,
    },
    role: {
        type: String,
        enum: ['employer', 'worker'],
        required: true,
    },
    // Common fields
    name: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
        city: { type: String, default: '' },
    },
    password: {
        type: String,
        select: false, // Don't return password by default
    },
    // OTP cooldown tracking
    lastOtpSentAt: { type: Date, default: null },
    // Token Version for session revocation
    tokenVersion: { type: Number, default: 0 },
}, { timestamps: true, discriminatorKey: 'role' });

userSchema.index({ location: '2dsphere' });

const User = mongoose.model('User', userSchema);

const Worker = User.discriminator('worker', new mongoose.Schema({
    skills: [{ type: String }], // e.g., 'Mason', 'Plumber'
    baseRate: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: true },
    bookmarkedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],
    razorpayAccountId: { type: String, default: null }, // Linked Account ID for Route payouts
    ratings: [{
        from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        value: { type: Number, min: 1, max: 5 },
        comment: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now }
    }],
}));

const Employer = User.discriminator('employer', new mongoose.Schema({
    companyName: { type: String, default: '' },
    jobsPosted: { type: Number, default: 0 },
}));

module.exports = { User, Worker, Employer };
