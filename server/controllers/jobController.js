const Job = require('../models/Job');
const Application = require('../models/Application');
const { User } = require('../models/User');
const mongoose = require('mongoose');

// Helper: validate MongoDB ObjectId and return 400 if invalid
const validateObjectId = (id, res, label = 'ID') => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: `Invalid ${label}.` });
        return false;
    }
    return true;
};

exports.createJob = async (req, res) => {
    try {
        // SECURITY: always use JWT-authenticated employer ID, never req.body.employer
        const employerId = req.user._id;
        const { title, category, wage, duration, location } = req.body;
        if (!title || !category || !wage || !duration || !location) {
            return res.status(400).json({ message: 'All fields are required.' });
        }
        const job = new Job({ title, category, wage, duration, employer: employerId, location });
        await job.save();

        // Track jobsPosted count on employer
        await User.findByIdAndUpdate(employerId, { $inc: { jobsPosted: 1 } });

        res.status(201).json(job);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getJobs = async (req, res) => {
    const { lat, lng, radius = 50, category, minWage, maxWage, search } = req.query;

    try {
        let query = { status: 'open' };

        // Geo filter
        if (lat && lng) {
            const parsedLat = parseFloat(lat);
            const parsedLng = parseFloat(lng);
            const parsedRadius = parseFloat(radius);
            if (isNaN(parsedLat) || isNaN(parsedLng) || isNaN(parsedRadius)) {
                return res.status(400).json({ message: 'Invalid geo coordinates.' });
            }
            query.location = {
                $near: {
                    $geometry: { type: 'Point', coordinates: [parsedLng, parsedLat] },
                    $maxDistance: parsedRadius * 1000,
                },
            };
        }

        // Category filter
        if (category && category !== 'All') query.category = category;

        // Wage range filter
        if (minWage || maxWage) {
            query.wage = {};
            if (minWage) query.wage.$gte = parseFloat(minWage);
            if (maxWage) query.wage.$lte = parseFloat(maxWage);
        }

        // Text search on title (escape special regex chars from user input)
        if (search) {
            const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.title = { $regex: escapedSearch, $options: 'i' };
        }

        const jobs = await Job.find(query)
            .populate('employer', 'name email mobile companyName')
            .sort({ createdAt: -1 });

        // If worker is logged in via JWT, attach hasApplied + isBookmarked per job
        const workerId = req.user?._id;
        if (workerId) {
            const applications = await Application.find({ worker: workerId }, 'job');
            const appliedJobIds = new Set(applications.map(a => a.job.toString()));
            const workerUser = await User.findById(workerId, 'bookmarkedJobs');
            const bookmarkedSet = new Set((workerUser?.bookmarkedJobs || []).map(id => id.toString()));

            const enriched = jobs.map(j => ({
                ...j.toObject(),
                hasApplied: appliedJobIds.has(j._id.toString()),
                isBookmarked: bookmarkedSet.has(j._id.toString()),
            }));
            return res.json(enriched);
        }

        res.json(jobs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getMyJobs = async (req, res) => {
    const { employerId } = req.params;
    try {
        if (!validateObjectId(employerId, res, 'Employer ID')) return;

        // SECURITY: only allow employers to see their own jobs
        if (req.user._id.toString() !== employerId) {
            return res.status(403).json({ message: 'Not authorized to view these jobs.' });
        }

        const jobs = await Job.find({ employer: employerId }).sort({ createdAt: -1 });
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.toggleJobStatus = async (req, res) => {
    const { jobId } = req.params;
    try {
        if (!validateObjectId(jobId, res, 'Job ID')) return;

        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        // SECURITY: always use JWT-authenticated user, never req.body.employerId
        if (job.employer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to modify this job' });
        }

        job.status = job.status === 'open' ? 'closed' : 'open';
        await job.save();
        res.json({ message: `Job is now ${job.status}`, job });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.toggleBookmark = async (req, res) => {
    const { jobId } = req.params;
    try {
        if (!validateObjectId(jobId, res, 'Job ID')) return;

        // SECURITY: always use JWT-authenticated user, never req.body.workerId
        const workerId = req.user._id;
        const worker = await User.findById(workerId);
        if (!worker) return res.status(404).json({ message: 'Worker not found' });

        const bookmarks = worker.bookmarkedJobs || [];
        const idx = bookmarks.findIndex(id => id.toString() === jobId);

        if (idx > -1) {
            bookmarks.splice(idx, 1); // Remove
        } else {
            bookmarks.push(jobId);     // Add
        }

        worker.bookmarkedJobs = bookmarks;
        await worker.save();

        const isBookmarked = idx === -1;
        res.json({ isBookmarked, message: isBookmarked ? 'Job bookmarked' : 'Bookmark removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getBookmarkedJobs = async (req, res) => {
    try {
        // SECURITY: always use JWT-authenticated user
        const workerId = req.user._id;
        const worker = await User.findById(workerId).populate({
            path: 'bookmarkedJobs',
            populate: { path: 'employer', select: 'name email companyName' }
        });
        res.json(worker?.bookmarkedJobs || []);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.applyForJob = async (req, res) => {
    try {
        const jobId = req.body.jobId;
        if (!jobId || !validateObjectId(jobId, res, 'Job ID')) return;

        // SECURITY: always use JWT-authenticated user
        const workerId = req.user._id;

        const existing = await Application.findOne({ job: jobId, worker: workerId });
        if (existing) {
            return res.status(400).json({ message: 'You have already applied for this job' });
        }
        const application = new Application({ job: jobId, worker: workerId });
        await application.save();

        // ─── Notify Employer via Socket.IO ───
        const io = req.app.get('io');
        const job = await Job.findById(jobId).populate('employer', 'name');
        if (io && job?.employer) {
            const employerId = job.employer._id.toString();
            const worker = await User.findById(workerId, 'name mobile');
            const workerName = worker?.name || worker?.mobile || 'A worker';
            io.to(`user_${employerId}`).emit('notification', {
                type: 'info',
                title: '👷 New Application!',
                message: `${workerName} has applied for "${job.title}". Review their profile now.`,
                applicationId: application._id,
                jobId: job._id,
                status: 'pending',
                timestamp: new Date(),
            });
        }

        res.status(201).json(application);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getJobApplicants = async (req, res) => {
    const { jobId } = req.params;
    try {
        if (!validateObjectId(jobId, res, 'Job ID')) return;

        // SECURITY: only the employer who owns the job can see applicants
        const job = await Job.findById(jobId).select('employer');
        if (!job) return res.status(404).json({ message: 'Job not found' });
        if (job.employer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to view applicants for this job.' });
        }

        const applications = await Application.find({ job: jobId })
            .populate('worker', 'name mobile skills baseRate ratings avatarUrl')
            .populate('job', 'title');
        res.json(applications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
