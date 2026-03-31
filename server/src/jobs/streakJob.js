import cron from 'node-cron';
import User from '../models/User.js';

export const startStreakJob = () => {
  // Runs every day at 00:05 UTC
  cron.schedule('5 0 * * *', async () => {
    console.log('⏰ Running streak reset job...');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    try {
      const usersToReset = await User.find({
        'gamification.currentStreak': { $gt: 0 },
        'gamification.lastActiveDate': { $lt: yesterday },
      });

      let resetCount = 0;
      for (const user of usersToReset) {
        user.gamification.currentStreak = 0;
        await user.save();
        resetCount++;
      }

      console.log(`  → Reset ${resetCount} user streaks`);
    } catch (err) {
      console.error('❌ Streak job error:', err.message);
    }
  });

  console.log('⏰ Streak cron job scheduled (daily at 00:05 UTC)');
};
