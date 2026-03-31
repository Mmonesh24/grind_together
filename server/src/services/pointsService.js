import User from '../models/User.js';

export const awardPoints = async (userId, log) => {
  const user = await User.findById(userId);
  if (!user) return;

  let points = 5; // base points for logging

  const { water, protein, workout } = log.checklist || {};
  if (water && protein && workout) {
    points += 10; // full checklist bonus
  }

  user.gamification.totalPoints += points;
  await user.save();
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
