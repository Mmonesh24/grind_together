import cron from 'node-cron';
import DailyPlan from '../models/DailyPlan.js';
import User from '../models/User.js';
import { sendPushToUser } from '../services/notificationService.js';

export const startWaterJob = (io) => {
  cron.schedule('*/30 * * * *', async () => {
    console.log('💧 Running Hydration Check Job...');

    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    try {
      // 1. Indexed Boundary Filtering (Limit 4 notifications max, respect 2-hour cooldown)
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      
      const plans = await DailyPlan.find({ 
        date: today,
        hydrationNotificationCount: { $lt: 4 },
        $or: [
          { lastHydrationNotification: null },
          { lastHydrationNotification: { $lt: twoHoursAgo } }
        ]
      }).populate('user_id', 'profile email pendingNotifications');

      let notifiedCount = 0;

      for (const plan of plans) {
        // Fast-path: Did they already reach their goal? Skip entirely.
        if (plan.waterConsumed >= plan.waterTarget) continue;

        const user = plan.user_id;
        if (!user || !user.profile) continue;

        // 2. Dynamic Schedule Parsing (Wake/Sleep instead of hardcoded 8-22)
        const wakeStr = user.profile.sleepSchedule?.wakeTime || '08:00';
        const sleepStr = user.profile.sleepSchedule?.sleepTime || '22:00';
        const wakeHour = parseInt(wakeStr.split(':')[0], 10);
        const sleepHour = parseInt(sleepStr.split(':')[0], 10);
        const userTz = user.profile.timezone || 'UTC';
        
        let userHourStr;
        try {
          userHourStr = new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            hourCycle: 'h23',
            timeZone: userTz
          }).format(now);
        } catch {
          userHourStr = now.getUTCHours();
        }
        
        const userHour = parseInt(userHourStr, 10);

        // Outside active hours? Skip.
        if (userHour < wakeHour || userHour >= sleepHour) continue;

        // Calculate Target Expected Ratio
        const activeDuration = sleepHour - wakeHour; // ex: 14
        const elapsedHours = userHour - wakeHour;
        const expectedRatio = Math.min(elapsedHours / (activeDuration > 0 ? activeDuration : 14), 1.0);
        const expectedWater = plan.waterTarget * expectedRatio;

        // 3. Are they behind schedule?
        if (plan.waterConsumed < expectedWater) {
          // 4. Atomic Lock execution
          // Use findOneAndUpdate to strictly bind exactly *this* state, ensuring horizontal scaling safety
          const lockedPlan = await DailyPlan.findOneAndUpdate(
            { _id: plan._id, lastHydrationNotification: plan.lastHydrationNotification },
            { 
              $set: { lastHydrationNotification: now },
              $inc: { hydrationNotificationCount: 1 }
            },
            { new: true }
          );

          if (lockedPlan) {
            const title = '💧 Hydration Warning';
            const message = `You should've drank ${expectedWater.toFixed(1)}L by now. Current: ${plan.waterConsumed.toFixed(1)}L. Please drink water!`;

            // 5. Offline Queue Enqueueing
            // Push to DB queue *and* attempt live socket emit
            await User.findByIdAndUpdate(user._id, {
              $push: {
                pendingNotifications: {
                  title, message, timestamp: now
                }
              }
            });

            if (io) {
               io.to(`user:${user._id.toString()}`).emit('notification:personal', { title, message });
            }

            // 6. Push Notification (NEW)
            await sendPushToUser(user._id, {
              title,
              body: message,
              actions: [
                { action: 'water-drunk', title: 'Drunk 💧' },
                { action: 'dismiss', title: 'Later' }
              ]
            });

            notifiedCount++;
          }
        }
      }

      console.log(`  → Pushed ${notifiedCount} optimized hydration alarms.`);
    } catch (err) {
      console.error('❌ Water job error:', err.message);
    }
  });

  console.log('💧 Optimized Water cron job scheduled (every 30 mins)');
};
