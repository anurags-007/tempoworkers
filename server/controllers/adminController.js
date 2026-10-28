const { User } = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');

// Middleware to check if user is admin
exports.isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied: Requires Admin role' });
    }
};

const mongoose = require('mongoose');

// ─── User Management ─────────────────────────────────────────
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select('-password -pushSubscriptions -tokenVersion')
            .sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid User ID' });
        }
        if (req.user._id.toString() === userId) {
            return res.status(400).json({ message: 'Cannot delete your own admin account' });
        }
        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (targetUser.role === 'admin') {
            return res.status(403).json({ message: 'Cannot delete an administrator account' });
        }
        await User.findByIdAndDelete(userId);
        // Cascade cleanup to maintain relational integrity
        const Application = require('../models/Application');
        const Job = require('../models/Job');
        const Message = require('../models/Message');
        await Application.deleteMany({ worker: userId });
        await Job.deleteMany({ employer: userId });
        await Message.deleteMany({ sender: userId });
        res.json({ message: 'User and all related records removed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Job & Dispute Management ────────────────────────────────
exports.getAllJobs = async (req, res) => {
    try {
        const jobs = await Job.find().populate('employer', 'name email companyName').sort({ createdAt: -1 });
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({ message: 'Invalid Job ID' });
        }
        await Job.findByIdAndDelete(jobId);
        // Also remove applications for this job
        await Application.deleteMany({ job: jobId });
        res.json({ message: 'Job and its applications removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Platform Stats ──────────────────────────────────────────
exports.getStats = async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        const workerCount = await User.countDocuments({ role: 'worker' });
        const employerCount = await User.countDocuments({ role: 'employer' });
        const jobCount = await Job.countDocuments();
        const activeJobCount = await Job.countDocuments({ status: 'open' });
        const appCount = await Application.countDocuments();

        res.json({
            users: { total: userCount, workers: workerCount, employers: employerCount },
            jobs: { total: jobCount, active: activeJobCount },
            applications: appCount
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
