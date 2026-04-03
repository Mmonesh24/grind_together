import User from '../models/User.js';

export const markActive = async (userId, io = null) => {
  const user = await User.findById(userId);
  if (!user) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastActive = user.gamification.lastActiveDate;

  if (lastActive) {
    const lastDate = new Date(lastActive);
    lastDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return user.gamification.currentStreak;
    } else if (diffDays === 1) {
      user.gamification.currentStreak += 1;
    } else {
      user.gamification.currentStreak = 1;
    }
  } else {
    user.gamification.currentStreak = 1;
  }

  user.gamification.lastActiveDate = today;

  if (user.gamification.currentStreak > user.gamification.longestStreak) {
    user.gamification.longestStreak = user.gamification.currentStreak;
  }

  await user.save();

  if (io) {
    io.to(`user:${userId}`).emit('profile:update', { user });
  }

  return user.gamification.currentStreak;
};
