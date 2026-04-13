const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    employer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true, // e.g., 'Plumber', 'Construction'
    },
    wage: {
        type: Number,
        required: true,
    },
    payType: {
        type: String,
        enum: ['Hourly', 'Daily', 'Fixed'],
        default: 'Daily',
    },
    duration: {
        type: String, // e.g., '2 days', '1 week'
        required: true,
    },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true }, // [longitude, latitude]
        address: { type: String },
    },
    status: {
        type: String,
        enum: ['open', 'closed'],
        default: 'open',
    },
    bookmarkedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

jobSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Job', jobSchema);
