const webpush = require('web-push');
const { User } = require('../models/User');

// Configure VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        'mailto:support@tempoworkers.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

/**
 * Send a push notification to all subscriptions of a specific user
 * @param {string} userId - ID of the recipient user
 * @param {object} payload - Notification payload (title, body, icon, url, etc.)
 */
exports.sendPushNotification = async (userId, payload) => {
    try {
        const user = await User.findById(userId);
        if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
            return { success: false, message: 'No subscriptions found' };
        }

        const notificationPayload = JSON.stringify({
            title: payload.title || 'TempoWorkers',
            body: payload.body || 'New update available!',
            icon: payload.icon || '/icons/icon-192x192.png',
            data: {
                url: payload.url || '/'
            }
        });

        const sendPromises = user.pushSubscriptions.map(async (subscription) => {
            try {
                await webpush.sendNotification(subscription, notificationPayload);
                return { success: true };
            } catch (error) {
                // If subscription is expired or invalid, remove it
                if (error.statusCode === 410 || error.statusCode === 404) {
                    await User.findByIdAndUpdate(userId, {
                        $pull: { pushSubscriptions: { endpoint: subscription.endpoint } }
                    });
                }
                console.error(`Push Notification failed for endpoint: ${subscription.endpoint}`, error.message);
                return { success: false, error: error.message };
            }
        });

        const results = await Promise.all(sendPromises);
        return { success: true, results };
    } catch (error) {
        console.error('Push Notification Service Error:', error);
        return { success: false, error: error.message };
    }
};
