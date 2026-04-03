import User from '../models/User.js';
import DailyLog from '../models/DailyLog.js';
import Notification from '../models/Notification.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

// Get all trainees in the trainer's branch
export const getBranchMembers = catchAsync(async (req, res) => {
  const branch = req.user.profile?.gymBranch;
  if (!branch) return res.json({ status: 'success', data: [] });

  const branchRegex = new RegExp(`^${branch}$`, 'i');

  const members = await User.find({
    'profile.gymBranch': { $regex: branchRegex },
    role: 'trainee',
  }).select('email profile gamification createdAt');

  // Attach today's log status for each member
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const enriched = await Promise.all(
    members.map(async (m) => {
      const todayLog = await DailyLog.findOne({ userId: m._id, date: today });
      const lastActive = m.gamification.lastActiveDate;
      const daysSinceActive = lastActive
        ? Math.floor((new Date() - new Date(lastActive)) / (1000 * 60 * 60 * 24))
        : null;

      return {
        id: m._id,
        email: m.email,
        name: m.profile.name || 'Anonymous',
        avatar: m.profile.avatar,
        gymBranch: m.profile.gymBranch,
        totalPoints: m.gamification.totalPoints,
        currentStreak: m.gamification.currentStreak,
        longestStreak: m.gamification.longestStreak,
        lastActiveDate: m.gamification.lastActiveDate,
        daysSinceActive,
        loggedToday: !!todayLog,
        joinedAt: m.createdAt,
        status: daysSinceActive === null ? 'new' : daysSinceActive === 0 ? 'active' : daysSinceActive <= 2 ? 'idle' : 'inactive',
      };
    })
  );

  res.json({ status: 'success', data: enriched });
});

// Nudge an inactive trainee
export const nudgeUser = catchAsync(async (req, res, next) => {
  const { userId, message } = req.body;
  if (!userId) return next(new AppError('userId is required', 400));

  const target = await User.findById(userId);
  if (!target) return next(new AppError('User not found', 404));

  await Notification.create({
    userId: target._id,
    type: 'nudge',
    title: `💪 Nudge from ${req.user.profile?.name || 'your trainer'}`,
    body: message || "Don't break your streak! Your trainer wants to see you at the gym.",
    metadata: { trainerId: req.user._id },
  });

  // Emit via Socket.io if online
  const io = req.app.get('io');
  if (io) {
    io.to(`user:${target._id}`).emit('notification:nudge', {
      title: `💪 Nudge from ${req.user.profile?.name || 'your trainer'}`,
      body: message || "Don't break your streak!",
    });
  }

  res.json({ status: 'success', message: 'Nudge sent' });
});

// Get branch stats summary for trainer dashboard
export const getBranchStats = catchAsync(async (req, res) => {
  const branch = req.user.profile?.gymBranch;
  if (!branch) return res.json({ status: 'success', data: {} });

  const branchRegex = new RegExp(`^${branch}$`, 'i');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const totalMembers = await User.countDocuments({ 
    'profile.gymBranch': { $regex: branchRegex }, 
    role: 'trainee' 
  });
  
  // Find IDs of trainees in this branch
  const trainees = await User.find({ 
    'profile.gymBranch': { $regex: branchRegex }, 
    role: 'trainee' 
  }).select('_id');
  const traineeIds = trainees.map(u => u._id);

  const activeToday = await DailyLog.countDocuments({
    date: { $gte: today, $lt: tomorrow },
    userId: { $in: traineeIds },
  });

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);

  const weeklyLogs = await DailyLog.countDocuments({
    date: { $gte: weekAgo, $lt: tomorrow },
    userId: { $in: traineeIds },
  });

  const avgStreak = await User.aggregate([
    { $match: { 'profile.gymBranch': { $regex: branchRegex }, role: 'trainee' } },
    { $group: { _id: null, avg: { $avg: '$gamification.currentStreak' } } },
  ]);

  // Get Online Count from Socket.io (using lowercased room)
  const io = req.app.get('io');
  let onlineCount = 0;
  if (io && branch) {
    const room = `branch:${branch.toLowerCase()}`;
    const roomInfo = io.sockets.adapter.rooms.get(room);
    onlineCount = roomInfo ? roomInfo.size : 0;
  }

  res.json({
    status: 'success',
    data: {
      totalMembers,
      activeToday,
      weeklyLogs,
      onlineCount,
      avgStreak: Math.round(avgStreak[0]?.avg || 0),
      attendanceRate: totalMembers > 0 ? Math.round((activeToday / totalMembers) * 100) : 0,
    },
  });
});
