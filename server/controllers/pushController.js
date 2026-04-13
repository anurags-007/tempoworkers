const { User } = require('../models/User');

exports.subscribe = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) return res.status(401).json({ message: 'Not authorized' });

        const subscription = req.body;
        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ message: 'Invalid subscription' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Add subscription if it doesn't already exist
        const exists = user.pushSubscriptions.some(sub => sub.endpoint === subscription.endpoint);
        if (!exists) {
            user.pushSubscriptions.push(subscription);
            await user.save();
        }

        res.status(201).json({ message: 'Subscription saved' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.unsubscribe = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) return res.status(401).json({ message: 'Not authorized' });

        const { endpoint } = req.body;
        if (!endpoint) return res.status(400).json({ message: 'Endpoint required' });

        await User.findByIdAndUpdate(userId, {
            $pull: { pushSubscriptions: { endpoint } }
        });

        res.json({ message: 'Unsubscribed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
