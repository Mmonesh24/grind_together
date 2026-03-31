import Challenge from '../models/Challenge.js';
import { awardPoints } from '../services/pointsService.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';

export const list = catchAsync(async (req, res) => {
  const { status = 'active', branch } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (branch) filter.gymBranch = branch;

  const challenges = await Challenge.find(filter)
    .sort({ createdAt: -1 })
    .populate('participants.userId', 'profile.name profile.avatar');

  res.json({ status: 'success', data: challenges });
});

export const getById = catchAsync(async (req, res, next) => {
  const challenge = await Challenge.findById(req.params.id)
    .populate('participants.userId', 'profile.name profile.avatar');
  if (!challenge) return next(new AppError('Challenge not found', 404));
  res.json({ status: 'success', data: challenge });
});

export const create = catchAsync(async (req, res) => {
  const challenge = await Challenge.create({
    ...req.validatedBody,
    creatorId: req.user._id,
    startDate: new Date(req.validatedBody.startDate),
    expiryDate: new Date(req.validatedBody.expiryDate),
  });
  res.status(201).json({ status: 'success', data: challenge });
});

export const join = catchAsync(async (req, res, next) => {
  const challenge = await Challenge.findById(req.params.id);
  if (!challenge) return next(new AppError('Challenge not found', 404));
  if (challenge.status !== 'active') return next(new AppError('Challenge is not active', 400));

  const already = challenge.participants.find(
    (p) => p.userId.toString() === req.user._id.toString()
  );
  if (already) return next(new AppError('Already joined', 400));

  challenge.participants.push({ userId: req.user._id, currentProgress: 0 });
  await challenge.save();

  // Award 5 points for joining
  const user = await (await import('../models/User.js')).default.findById(req.user._id);
  if (user) {
    user.gamification.totalPoints += 5;
    await user.save();
  }

  res.json({ status: 'success', data: challenge });
});

export const myCreated = catchAsync(async (req, res) => {
  const challenges = await Challenge.find({ creatorId: req.user._id }).sort({ createdAt: -1 });
  res.json({ status: 'success', data: challenges });
});
