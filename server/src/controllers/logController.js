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
    return res.status(404).json({ status: 'fail', message: 'No log for today' });
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

  // Side effects
  const streak = await markActive(req.user._id);
  const points = await awardPoints(req.user._id, log);
  const streakBonus = await awardStreakBonus(req.user._id);

  // Broadcast to activity feed via Socket.io
  const io = req.app.get('io');
  if (io) {
    const user = await User.findById(req.user._id);
    broadcastActivity(io, user, log);
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
