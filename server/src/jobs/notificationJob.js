import cron from 'node-cron';
import User from '../models/User.js';
import DailyPlan from '../models/DailyPlan.js';
import Challenge from '../models/Challenge.js';
import { sendPushToUser } from '../services/notificationService.js';

export const startNotificationJob = (io) => {
  // Run every hour at the top of the hour
  cron.schedule('0 * * * *', async () => {
    console.log('🔔 Running Notification Scheduler...');
    const now = new Date();
    
    try {
      const users = await User.find({ 'profile.onboardingComplete': true });

      for (const user of users) {
        const userTz = user.profile.timezone || 'UTC';
        let userHour;
        
        try {
          userHour = parseInt(new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            hourCycle: 'h23',
            timeZone: userTz
          }).format(now), 10);
        } catch {
          userHour = now.getUTCHours();
        }

        // 1. Breakfast Reminder (8 AM)
        if (userHour === 8) {
          await sendPushToUser(user._id, {
            title: '🍳 Breakfast Time!',
            body: 'Fuel your day! Have you eaten your planned breakfast?',
            actions: [
              { action: 'meal-ate', title: 'Yes, Ate!', payload: { mealType: 'breakfast' } },
              { action: 'dismiss', title: 'Later' }
            ]
          });
        }

        // 2. Challenge Reminder (9 AM)
        if (userHour === 9) {
          const challenge = await Challenge.findOne({ status: 'active' }).sort({ createdAt: -1 });
          if (challenge) {
            await sendPushToUser(user._id, {
              title: '🏆 New Challenge Awaits!',
              body: `Today's Challenge: ${challenge.title}. Don't miss out!`,
              icon: '/icons/challenge.png'
            });
          }
        }

        // 3. Lunch Reminder (13 PM / 1 PM)
        if (userHour === 13) {
          await sendPushToUser(user._id, {
            title: '🍱 Lunch Reminder',
            body: 'Time for lunch! Did you stick to your nutrition plan?',
            actions: [
              { action: 'meal-ate', title: 'Yes, Ate!', payload: { mealType: 'lunch' } },
              { action: 'other-food', title: 'Ate something else' }
            ]
          });
        }

        // 4. Midday Dormancy Check (14 PM / 2 PM)
        if (userHour === 14) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const plan = await DailyPlan.findOne({ user_id: user._id, date: today });
          const hasActivity = plan && (plan.waterConsumed > 0 || plan.exercises.some(e => e.completed) || plan.meals.some(m => m.completed));

          if (!hasActivity) {
            await sendPushToUser(user._id, {
              title: '🧘 Halfway through the day!',
              body: "You haven't logged any activity yet. Let's get moving!",
              icon: '/icons/warning.png'
            });
          }
        }

        // 5. Dinner Reminder (20 PM / 8 PM)
        if (userHour === 20) {
          await sendPushToUser(user._id, {
            title: '🍲 Dinner Time',
            body: 'Final meal of the day! Have you had your dinner?',
            actions: [
              { action: 'meal-ate', title: 'Yes, Ate!', payload: { mealType: 'dinner' } },
              { action: 'dismiss', title: 'Later' }
            ]
          });
        }

        // 6. Sleep Reminder (at user's sleepTime)
        const userSleepStr = user.profile.sleepSchedule?.sleepTime || '22:00';
        const userSleepHour = parseInt(userSleepStr.split(':')[0], 10);
        if (userHour === userSleepHour) {
          // Record sleep start time for duration calculation
          user.gamification.lastSleepStartTime = now;
          await user.save();

          await sendPushToUser(user._id, {
            title: '🌙 Time for Sleep',
            body: 'Your body needs recovery. Get a good night\'s rest!',
            icon: '/icons/sleep.png'
          });
        }

        // 7. Wake-up Alarm (at user's wakeTime)
        const userWakeStr = user.profile.sleepSchedule?.wakeTime || '08:00';
        const userWakeHour = parseInt(userWakeStr.split(':')[0], 10);
        if (userHour === userWakeHour) {
          await sendPushToUser(user._id, {
            title: '☀️ Rise & Grind!',
            body: 'Good morning! Have you woken up and started your day?',
            actions: [
              { action: 'woke-up', title: 'I\'m up! ☕' },
              { action: 'dismiss', title: '10 more mins...' }
            ],
            icon: '/icons/sun.png'
          });
        }
      }

    } catch (err) {
      console.error('❌ Notification job error:', err.message);
    }
  });

  console.log('🔔 Notification scheduler started (Hourly checks)');
};
