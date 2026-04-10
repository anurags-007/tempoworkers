const Message = require('../models/Message');
const Application = require('../models/Application');
const mongoose = require('mongoose');

// Helper: validate MongoDB ObjectId and return 400 if invalid
const validateObjectId = (id, res, label = 'ID') => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: `Invalid ${label}.` });
        return false;
    }
    return true;
};

exports.getMessages = async (req, res) => {
    try {
        const { applicationId } = req.params;
        if (!validateObjectId(applicationId, res, 'Application ID')) return;

        // Verify the user is authorized for this application
        const application = await Application.findById(applicationId).populate('job', 'employer');
        if (!application) return res.status(404).json({ message: 'Application not found' });

        const userId = req.user._id.toString();
        const isWorker = application.worker.toString() === userId;
        const isEmployer = application.job && application.job.employer.toString() === userId;

        if (!isWorker && !isEmployer) {
            return res.status(403).json({ message: 'Not authorized to view these messages' });
        }

        const messages = await Message.find({ application: applicationId })
            .populate('sender', 'name role avatarUrl')
            .sort({ createdAt: 1 });

        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const { applicationId } = req.params;
        const { text } = req.body;
        if (!validateObjectId(applicationId, res, 'Application ID')) return;
        if (!text || text.trim() === '') {
            return res.status(400).json({ message: 'Message text is required' });
        }

        const application = await Application.findById(applicationId).populate('job', 'employer');
        if (!application) return res.status(404).json({ message: 'Application not found' });

        const userId = req.user._id.toString();
        const isWorker = application.worker.toString() === userId;
        const isEmployer = application.job && application.job.employer.toString() === userId;

        if (!isWorker && !isEmployer) {
            return res.status(403).json({ message: 'Not authorized to send messages in this application' });
        }

        if (application.status === 'completed' || application.status === 'rejected') {
             return res.status(403).json({ message: 'Cannot send messages on closed applications.' });
        }

        const message = new Message({
            application: applicationId,
            sender: req.user._id,
            text: text.slice(0, 500) // max 500 chars limit
        });
        
        await message.save();

        const populatedMessage = await message.populate('sender', 'name role avatarUrl');

        // Determine the receiver ID
        const receiverId = isWorker ? application.job.employer.toString() : application.worker.toString();

        // Broadcast to the receiver via Socket.io
        const io = req.app.get('io');
        if (io) {
             io.to(`user_${receiverId}`).emit('chat_message', populatedMessage);
             
             // Also send a general notification to the receiver if they are offline/not looking at chat,
             // only if we haven't recently (basic implementation is just emitting a general read notification too)
             io.to(`user_${receiverId}`).emit('notification', {
                 type: 'info',
                 title: `New Message from ${req.user.name || 'User'}`,
                 message: text.substring(0, 30) + (text.length > 30 ? '...' : ''),
                 applicationId: application._id,
                 isMessage: true,
             });
        }

        res.status(201).json(populatedMessage);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
