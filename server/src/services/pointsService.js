import User from '../models/User.js';

export const awardPoints = async (userId, logOrAction, io = null) => {
  const user = await User.findById(userId);
  if (!user) return;

  let points = 5; // base points for standard logging if no type specified
  
  // Custom Daily Plan Action Types
  if (logOrAction.type === 'exercise') points = 10;
  if (logOrAction.type === 'meal') points = 5;
  if (logOrAction.type === 'daily_bonus') points = 50;

  user.gamification.totalPoints += points;
  await user.save();

  if (io) {
    io.to(`user:${userId}`).emit('profile:update', { user });
  }

  return points;
};

export const awardStreakBonus = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return 0;

  const streak = user.gamification.currentStreak;
  let bonus = 0;

  if (streak > 0 && streak % 30 === 0) {
    bonus = 500;
  } else if (streak > 0 && streak % 7 === 0) {
    bonus = 100;
  }

  if (bonus > 0) {
    user.gamification.totalPoints += bonus;
    await user.save();
  }

  return bonus;
};
