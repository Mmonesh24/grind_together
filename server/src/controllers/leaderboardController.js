import User from '../models/User.js';
import catchAsync from '../utils/catchAsync.js';

export const getByPoints = catchAsync(async (req, res) => {
  const { branch, limit = 20 } = req.query;
  const filter = {};
  if (branch) filter['profile.gymBranch'] = branch;

  const users = await User.find(filter)
    .sort({ 'gamification.totalPoints': -1 })
    .limit(parseInt(limit))
    .select('profile.name profile.avatar profile.gymBranch gamification');

  const leaderboard = users.map((u, i) => ({
    rank: i + 1,
    id: u._id,
    name: u.profile.name || u.email,
    avatar: u.profile.avatar,
    gymBranch: u.profile.gymBranch,
    totalPoints: u.gamification.totalPoints,
    currentStreak: u.gamification.currentStreak,
  }));

  res.json({ status: 'success', data: leaderboard });
});

export const getByStreaks = catchAsync(async (req, res) => {
  const { branch, limit = 20 } = req.query;
  const filter = {};
  if (branch) filter['profile.gymBranch'] = branch;

  const users = await User.find(filter)
    .sort({ 'gamification.currentStreak': -1 })
    .limit(parseInt(limit))
    .select('profile.name profile.avatar profile.gymBranch gamification');

  const leaderboard = users.map((u, i) => ({
    rank: i + 1,
    id: u._id,
    name: u.profile.name || u.email,
    avatar: u.profile.avatar,
    gymBranch: u.profile.gymBranch,
    totalPoints: u.gamification.totalPoints,
    currentStreak: u.gamification.currentStreak,
  }));

  res.json({ status: 'success', data: leaderboard });
});
