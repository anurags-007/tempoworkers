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

// ─── User Management ─────────────────────────────────────────
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        await User.findByIdAndDelete(userId);
        res.json({ message: 'User removed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Job & Dispute Management ────────────────────────────────
exports.getAllJobs = async (req, res) => {
    try {
        const jobs = await Job.find().populate('employer', 'name email mobile').sort({ createdAt: -1 });
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteJob = async (req, res) => {
    try {
        const { jobId } = req.params;
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
