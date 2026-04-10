const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    identifier: {
        type: String,
        required: true,
    },
    otp: {
        type: String,
        required: true,
    },
    failedAttempts: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 300, // OTP expires in 5 minutes (300 seconds)
    }
});

module.exports = mongoose.model('Otp', otpSchema);
