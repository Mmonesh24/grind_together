import DailyLog from '../models/DailyLog.js';
import User from '../models/User.js';
import { markActive } from '../services/streakService.js';
import { awardPoints, awardStreakBonus } from '../services/pointsService.js';
import { broadcastActivity } from '../sockets/feedHandler.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';

const getStartOfDay = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const getToday = catchAsync(async (req, res) => {
  const today = getStartOfDay();
  const log = await DailyLog.findOne({ userId: req.user._id, date: today });

  if (!log) {
    return res.status(200).json({ status: 'success', data: null });
  }

  res.json({ status: 'success', data: log });
});

export const createLog = catchAsync(async (req, res, next) => {
  const today = getStartOfDay();
  const existing = await DailyLog.findOne({ userId: req.user._id, date: today });

  if (existing) {
    return next(new AppError('Log already exists for today. Use PUT to update.', 400));
  }

  const log = await DailyLog.create({
    userId: req.user._id,
    date: today,
    ...req.validatedBody,
  });

  const io = req.app.get('io');
  
  // Side effects
  const streak = await markActive(req.user._id, io);
  const points = await awardPoints(req.user._id, log, io);
  const streakBonus = await awardStreakBonus(req.user._id);

  // Broadcast to activity feed via Socket.io
  if (io) {
    const user = await User.findById(req.user._id);
    broadcastActivity(io, user, log);
    if (user.profile?.gymBranch) {
      const room = `branch:${user.profile.gymBranch.toLowerCase()}`;
      io.to(room).emit('stats:update', { type: 'activeToday' });
    }
    // Also notify personal devices
    io.to(`user:${req.user._id}`).emit('plan:update', { plan: log });
  }

  res.status(201).json({
    status: 'success',
    data: { log, pointsEarned: points, streakBonus, currentStreak: streak },
  });
});

export const updateLog = catchAsync(async (req, res, next) => {
  const log = await DailyLog.findOne({ _id: req.params.id, userId: req.user._id });

  if (!log) {
    return next(new AppError('Log not found', 404));
  }

  const body = req.validatedBody;
  if (body.checklist) Object.assign(log.checklist, body.checklist);
  if (body.metrics) Object.assign(log.metrics, body.metrics);
  if (body.notes !== undefined) log.notes = body.notes;

  await log.save();

  // Notify personal devices
  const io = req.app.get('io');
  if (io) {
    io.to(`user:${req.user._id}`).emit('plan:update', { plan: log });
  }

  res.json({ status: 'success', data: log });
});

export const getHistory = catchAsync(async (req, res) => {
  const range = parseInt(req.query.range) || 30;
  const since = new Date();
  since.setDate(since.getDate() - range);
  since.setHours(0, 0, 0, 0);

  const logs = await DailyLog.find({
    userId: req.user._id,
    date: { $gte: since },
  }).sort({ date: -1 });

  res.json({ status: 'success', data: logs });
});

export const getBranchFeed = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);
  const branch = user?.profile?.gymBranch;
  
  if (!branch) {
    return res.json({ status: 'success', data: [] });
  }

  // Find users in same branch
  const branchUsers = await User.find({ 'profile.gymBranch': branch }).select('_id profile.name profile.avatar');
  const userMap = new Map();
  branchUsers.forEach(u => userMap.set(u._id.toString(), u));

  // Find their recent logs
  const logs = await DailyLog.find({
    userId: { $in: branchUsers.map(u => u._id) },
  }).sort({ createdAt: -1 }).limit(50);

  const feed = logs.map(log => {
    const u = userMap.get(log.userId.toString());
    const summary = [];
    if (log.checklist?.workout) summary.push('completed a workout');
    if (log.checklist?.water) summary.push('hydrated');
    if (log.checklist?.protein) summary.push('hit protein goal');
    if (log.metrics?.caloriesBurned > 0) summary.push(`burned ${log.metrics.caloriesBurned} cal`);

    return {
      userId: log.userId,
      name: u?.profile?.name || 'Anonymous',
      avatar: u?.profile?.avatar || '',
      summary: summary.join(', ') || 'logged activity',
      time: log.createdAt,
    };
  });

  res.json({ status: 'success', data: feed });
});
