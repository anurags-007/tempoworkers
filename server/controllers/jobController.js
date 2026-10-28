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

const { getCache, setCache, generateCacheKey, invalidateCachePattern } = require('../utils/cacheService');

exports.createJob = async (req, res) => {
    try {
        const employerId = req.user._id;
        const { title, category, wage, payType, duration, location } = req.body;
        if (!title || !category || !wage || !duration || !location) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        const safeTitle = typeof title === 'string' ? title.replace(/<[^>]*>/g, '').trim().slice(0, 120) : '';
        const safeCategory = typeof category === 'string' ? category.replace(/<[^>]*>/g, '').trim().slice(0, 50) : '';
        const safeDuration = typeof duration === 'string' ? duration.replace(/<[^>]*>/g, '').trim().slice(0, 50) : '';
        const numericWage = Number(wage);

        if (!safeTitle || !safeCategory || !safeDuration || isNaN(numericWage) || numericWage <= 0) {
            return res.status(400).json({ message: 'Valid title, category, duration, and positive wage are required.' });
        }

        const validPayTypes = ['Hourly', 'Daily', 'Fixed'];
        const chosenPayType = validPayTypes.includes(payType) ? payType : 'Daily';

        // Validate GeoJSON location coordinates
        if (!location || !Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
            return res.status(400).json({ message: 'Valid location coordinates [longitude, latitude] are required.' });
        }
        const [lng, lat] = location.coordinates.map(Number);
        if (isNaN(lng) || isNaN(lat) || lng < -180 || lng > 180 || lat < -90 || lat > 90) {
            return res.status(400).json({ message: 'Coordinates must be valid numbers: longitude between -180 and 180, latitude between -90 and 90.' });
        }

        const safeLocation = {
            type: 'Point',
            coordinates: [lng, lat],
            address: typeof location.address === 'string' ? location.address.replace(/<[^>]*>/g, '').trim().slice(0, 200) : ''
        };

        const job = new Job({ 
            title: safeTitle, 
            category: safeCategory, 
            wage: numericWage, 
            payType: chosenPayType, 
            duration: safeDuration, 
            employer: employerId, 
            location: safeLocation 
        });
        await job.save();

        await User.findByIdAndUpdate(employerId, { $inc: { jobsPosted: 1 } });

        const io = req.app.get('io');
        if (io) {
            io.emit('notification', {
                type: 'job_posted',
                title: '🏢 New Job Posted!',
                message: `A new ${safeCategory} role is available! (${safeTitle})`,
                jobId: job._id,
                timestamp: new Date(),
            });
        }

        // Invalidate jobs cache
        await invalidateCachePattern('jobs:*');

        res.status(201).json(job);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getJobs = async (req, res) => {
    const { lat, lng, radius = 50, category, minWage, maxWage, search } = req.query;
    const workerId = req.user?._id;

    const cacheKey = generateCacheKey(`jobs:${workerId || 'guest'}`, req.query);

    try {
        const cachedJobs = await getCache(cacheKey);
        if (cachedJobs) {
            console.log('🚀 Serving jobs from cache');
            return res.json(cachedJobs);
        }

        let query = { status: 'open' };

        if (lat && lng) {
            const parsedLat = parseFloat(lat);
            const parsedLng = parseFloat(lng);
            const parsedRadius = parseFloat(radius);
            if (
                !isNaN(parsedLat) && !isNaN(parsedLng) && !isNaN(parsedRadius) &&
                parsedLat >= -90 && parsedLat <= 90 &&
                parsedLng >= -180 && parsedLng <= 180 &&
                parsedRadius > 0 && parsedRadius <= 500
            ) {
                query.location = {
                    $near: {
                        $geometry: { type: 'Point', coordinates: [parsedLng, parsedLat] },
                        $maxDistance: parsedRadius * 1000,
                    },
                };
            }
        }

        if (category && category !== 'All' && typeof category === 'string') {
            query.category = category.slice(0, 50);
        }

        if (minWage || maxWage) {
            query.wage = {};
            const parsedMin = parseFloat(minWage);
            const parsedMax = parseFloat(maxWage);
            if (!isNaN(parsedMin) && parsedMin >= 0) query.wage.$gte = parsedMin;
            if (!isNaN(parsedMax) && parsedMax >= 0) query.wage.$lte = parsedMax;
        }

        if (search && typeof search === 'string') {
            const trimmedSearch = search.trim().slice(0, 80);
            const escapedSearch = trimmedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.title = { $regex: escapedSearch, $options: 'i' };
        }

        // SECURITY: Protect employer PII by only populating name and companyName publicly
        const jobs = await Job.find(query)
            .populate('employer', 'name companyName')
            .sort({ createdAt: -1 });

        let result = jobs;
        if (workerId) {
            const applications = await Application.find({ worker: workerId }, 'job');
            const appliedJobIds = new Set(applications.map(a => a.job.toString()));
            const workerUser = await User.findById(workerId, 'bookmarkedJobs');
            const bookmarkedSet = new Set((workerUser?.bookmarkedJobs || []).map(id => id.toString()));

            result = jobs.map(j => ({
                ...j.toObject(),
                hasApplied: appliedJobIds.has(j._id.toString()),
                isBookmarked: bookmarkedSet.has(j._id.toString()),
            }));
        }

        await setCache(cacheKey, result, 300);
        res.json(result);
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

        const job = await Job.findById(jobId).populate('employer', 'name');
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }
        if (job.status !== 'open') {
            return res.status(400).json({ message: 'This job is no longer accepting applications.' });
        }
        if (job.employer && job.employer._id.toString() === workerId.toString()) {
            return res.status(400).json({ message: 'Employers cannot apply to their own jobs.' });
        }

        const existing = await Application.findOne({ job: jobId, worker: workerId });
        if (existing) {
            return res.status(400).json({ message: 'You have already applied for this job' });
        }
        const application = new Application({ job: jobId, worker: workerId });
        await application.save();

        // ─── Notify Employer via Socket.IO ───
        const io = req.app.get('io');
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
            .populate('worker', 'name mobile skills dailyRate hourlyRate ratings avatarUrl')
            .populate('job', 'title');
        res.json(applications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
