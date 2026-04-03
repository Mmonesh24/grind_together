import cron from 'node-cron';
import User from '../models/User.js';

export const startStreakJob = () => {
  // Runs every hour to check user local midnights
  cron.schedule('0 * * * *', async () => {
    console.log('⏰ Running hourly streak reset monitor...');

    try {
      const users = await User.find({ 'gamification.currentStreak': { $gt: 0 } });
      let resetCount = 0;

      const now = new Date();

      for (const user of users) {
        const tzOffset = user.profile?.timezone === 'IST' ? 330 : 0;
        const localNow = new Date(now.getTime() + (tzOffset * 60000));
        
        // If it's early in the local morning (e.g., 00:00 - 01:00), 
        // check if they were active "Local Yesterday"
        const localYesterdayStart = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate() - 1));
        
        if (user.gamification.lastActiveDate < localYesterdayStart) {
          user.gamification.currentStreak = 0;
          await user.save();
          resetCount++;
        }
      }

      if (resetCount > 0) console.log(`  → Reset ${resetCount} user streaks`);
    } catch (err) {
      console.error('❌ Streak job error:', err.message);
    }
  });

  console.log('⏰ Streak cron job scheduled (daily at 00:05 UTC)');
};
