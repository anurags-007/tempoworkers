const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
    job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true,
    },
    worker: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'completed'],
        default: 'pending',
    },
    completedAt: {
        type: Date,
        default: null,
    },
    isRated: {
        type: Boolean,
        default: false,
    },
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'escrow', 'released'],
        default: 'unpaid'
    }
}, { timestamps: true });

// Prevent duplicate applications
applicationSchema.index({ job: 1, worker: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
