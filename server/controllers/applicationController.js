const Application = require('../models/Application');
const { User } = require('../models/User');
const Job = require('../models/Job');
const mongoose = require('mongoose');

// Helper: validate MongoDB ObjectId and return 400 if invalid
const validateObjectId = (id, res, label = 'ID') => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: `Invalid ${label}.` });
        return false;
    }
    return true;
};

// Helper: verify req.user is the employer who owns the given jobId
const isJobOwner = async (jobId, userId) => {
    const job = await Job.findById(jobId).select('employer');
    return job && job.employer.toString() === userId.toString();
};

exports.getJobApplicants = async (req, res) => {
    try {
        if (!validateObjectId(req.params.jobId, res, 'Job ID')) return;

        // Only the employer who owns this job may see applicants
        const owned = await isJobOwner(req.params.jobId, req.user._id);
        if (!owned) {
            return res.status(403).json({ message: 'Not authorized to view applicants for this job.' });
        }

        const applications = await Application.find({ job: req.params.jobId })
            .populate('worker', 'name mobile email skills baseRate ratings avatarUrl isAvailable')
            .sort({ createdAt: -1 });
        res.json(applications);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getWorkerApplications = async (req, res) => {
    try {
        if (!validateObjectId(req.params.workerId, res, 'Worker ID')) return;

        // Workers can only view their own applications
        if (req.user._id.toString() !== req.params.workerId) {
            return res.status(403).json({ message: 'Not authorized to view these applications.' });
        }

        const applications = await Application.find({ worker: req.params.workerId })
            .populate('job')
            .sort({ createdAt: -1 });
        res.json(applications);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getWorkerHistory = async (req, res) => {
    try {
        if (!validateObjectId(req.params.workerId, res, 'Worker ID')) return;

        if (req.user._id.toString() !== req.params.workerId) {
            return res.status(403).json({ message: 'Not authorized to view this history.' });
        }

        const applications = await Application.find({
            worker: req.params.workerId,
            status: 'completed'
        })
            .populate({ path: 'job', populate: { path: 'employer', select: 'name email companyName' } })
            .sort({ completedAt: -1 });
        res.json(applications);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getEmployerHistory = async (req, res) => {
    try {
        if (!validateObjectId(req.params.employerId, res, 'Employer ID')) return;

        // Employers can only view their own history
        if (req.user._id.toString() !== req.params.employerId) {
            return res.status(403).json({ message: 'Not authorized to view this history.' });
        }

        const jobs = await Job.find({ employer: req.params.employerId }, '_id');
        const jobIds = jobs.map(j => j._id);
        const applications = await Application.find({
            job: { $in: jobIds },
            status: 'completed'
        })
            .populate('worker', 'name mobile skills baseRate ratings avatarUrl')
            .populate('job', 'title wage category duration')
            .sort({ completedAt: -1 });
        res.json(applications);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateApplicationStatus = async (req, res) => {
    try {
        if (!validateObjectId(req.params.id, res, 'Application ID')) return;

        const { status } = req.body;
        if (!['accepted', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status. Must be "accepted" or "rejected".' });
        }

        const application = await Application.findById(req.params.id).populate('job', 'title employer');
        if (!application) return res.status(404).json({ message: 'Application not found' });

        // Only the employer who owns the job can change application status
        if (!application.job || application.job.employer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this application.' });
        }

        application.status = status;
        await application.save();

        // ─── Real-time Notification to Worker via Socket.io ───
        const io = req.app.get('io');
        if (io && application.worker) {
            const workerId = application.worker.toString();
            const jobTitle = application.job?.title || 'a job';
            io.to(`user_${workerId}`).emit('notification', {
                type: status === 'accepted' ? 'success' : 'info',
                title: status === 'accepted' ? '🎉 Application Accepted!' : '📋 Application Update',
                message: status === 'accepted'
                    ? `You've been hired for "${jobTitle}"! Contact your employer.`
                    : `Your application for "${jobTitle}" was not selected this time.`,
                applicationId: application._id,
                status,
                timestamp: new Date(),
            });
        }

        res.json(application);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.completeApplication = async (req, res) => {
    try {
        if (!validateObjectId(req.params.id, res, 'Application ID')) return;

        const application = await Application.findById(req.params.id).populate('job', 'title employer');
        if (!application) return res.status(404).json({ message: 'Application not found' });

        // Only the employer who owns the job can mark it complete
        if (!application.job || application.job.employer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to complete this application.' });
        }

        if (application.status !== 'accepted') {
            return res.status(400).json({ message: 'Can only complete accepted applications' });
        }

        application.status = 'completed';
        application.completedAt = new Date();
        await application.save();

        // ─── Real-time Notification to Worker via Socket.io ───
        const io = req.app.get('io');
        if (io && application.worker) {
            const workerId = application.worker.toString();
            const jobTitle = application.job?.title || 'a job';
            io.to(`user_${workerId}`).emit('notification', {
                type: 'success',
                title: '✅ Job Completed!',
                message: `Your work on "${jobTitle}" has been marked complete. Check your history!`,
                applicationId: application._id,
                status: 'completed',
                timestamp: new Date(),
            });
        }

        res.json(application);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.rateWorker = async (req, res) => {
    try {
        if (!validateObjectId(req.params.id, res, 'Application ID')) return;

        const { rating, comment } = req.body;
        const raterId = req.user._id;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }

        const application = await Application.findById(req.params.id).populate('job', 'title employer');
        if (!application) return res.status(404).json({ message: 'Application not found' });

        if (!application.job || application.job.employer.toString() !== raterId.toString()) {
            return res.status(403).json({ message: 'Not authorized to rate this worker.' });
        }

        if (!['accepted', 'completed'].includes(application.status)) {
            return res.status(400).json({ message: 'Can only rate accepted or completed applications' });
        }

        const worker = await User.findById(application.worker);
        if (!worker) return res.status(404).json({ message: 'Worker not found' });

        const alreadyRated = worker.ratings?.some(r => r.from?.toString() === raterId.toString());
        if (alreadyRated) {
            return res.status(400).json({ message: 'You have already rated this worker' });
        }

        const safeComment = typeof comment === 'string'
            ? comment.replace(/<[^>]*>/g, '').trim().slice(0, 500)
            : '';

        worker.ratings = [...(worker.ratings || []), {
            from: raterId,
            value: rating,
            comment: safeComment,
        }];
        await worker.save();

        application.isRated = true;
        await application.save();

        const avgRating = worker.ratings.reduce((sum, r) => sum + r.value, 0) / worker.ratings.length;
        res.json({ message: 'Rating submitted', avgRating: Math.round(avgRating * 10) / 10 });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
