import webPush from 'web-push';
import PushSubscription from '../models/PushSubscription.js';

// Configure Web Push with VAPID keys
webPush.setVapidDetails(
  'mailto:support@grindtogether.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/**
 * Utility to send push to all devices of a user
 */
export const sendPushToUser = async (userId, notification) => {
  const subscriptions = await PushSubscription.find({ userId });
  
  const promises = subscriptions.map(sub => {
    const pushConfig = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      },
    };

    return webPush.sendNotification(pushConfig, JSON.stringify(notification))
      .catch(err => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription expired/invalid, remove it
          return PushSubscription.findByIdAndDelete(sub._id);
        }
        console.error('Error sending push to endpoint:', sub.endpoint, err.message);
      });
  });

  return Promise.all(promises);
};
