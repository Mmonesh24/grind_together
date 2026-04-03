import Challenge from '../models/Challenge.js';
import ChallengeSubmission from '../models/ChallengeSubmission.js';
import User from '../models/User.js';
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
    ...req.validatedBody, // title, description, targetType, targetValue, etc
    creatorId: req.user._id,
    mediaUrl: req.body.mediaUrl || '',
    challengeType: req.body.challengeType || 'manual',
    startDate: new Date(req.body.startDate || Date.now()),
    expiryDate: new Date(req.body.expiryDate),
  });

  // Broadcast new challenge to branch (lowercased)
  const io = req.app.get('io');
  if (io && req.user.profile?.gymBranch) {
    const room = `branch:${req.user.profile.gymBranch.toLowerCase()}`;
    io.to(room).emit('challenge:update', { challengeId: challenge._id, type: 'new' });
  }

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
  const user = await User.findById(req.user._id);
  if (user) {
    user.gamification.totalPoints += 5;
    await user.save();
    
    // Broadcast participation update
    const io = req.app.get('io');
    if (io && user.profile?.gymBranch) {
      const room = `branch:${user.profile.gymBranch.toLowerCase()}`;
      io.to(room).emit('challenge:update', { challengeId: challenge._id });
      io.to(room).emit('stats:update', { type: 'points' });
      io.to(`user:${user._id}`).emit('points:update', { points: user.gamification.totalPoints });
    }
  }

  res.json({ status: 'success', data: challenge });
});

export const myCreated = catchAsync(async (req, res) => {
  const challenges = await Challenge.find({ creatorId: req.user._id }).sort({ createdAt: -1 });
  res.json({ status: 'success', data: challenges });
});

// --- NEW SUBMISSION & REVIEW LOGIC ---

export const submitProof = catchAsync(async (req, res, next) => {
  const { proofUrl, proofText } = req.body;
  const challenge = await Challenge.findById(req.params.id);
  
  if (!challenge) return next(new AppError('Challenge not found', 404));
  if (challenge.status !== 'active') return next(new AppError('Challenge is not active', 400));
  if (challenge.challengeType !== 'manual') return next(new AppError('This challenge does not require manual proof', 400));

  // Verify participation
  const isParticipant = challenge.participants.some(p => p.userId.toString() === req.user._id.toString());
  if (!isParticipant) return next(new AppError('You have not joined this challenge', 400));

  // Check existing submission
  const existing = await ChallengeSubmission.findOne({ challengeId: challenge._id, traineeId: req.user._id });
  if (existing) return next(new AppError('Proof already submitted', 400));

  const submission = await ChallengeSubmission.create({
    challengeId: challenge._id,
    traineeId: req.user._id,
    trainerId: challenge.creatorId,
    proofUrl,
    proofText,
    status: 'pending'
  });

  // Notify Trainer
  const io = req.app.get('io');
  if (io) {
    io.to(`user:${challenge.creatorId}`).emit('proof:new', { 
      challengeId: challenge._id, 
      traineeId: req.user._id 
    });
  }

  res.status(201).json({ status: 'success', data: submission });
});

export const getPendingSubmissions = catchAsync(async (req, res) => {
  const submissions = await ChallengeSubmission.find({ 
    trainerId: req.user._id, 
    status: 'pending' 
  })
  .populate('challengeId', 'title')
  .populate('traineeId', 'profile.name profile.avatar')
  .sort({ createdAt: 1 });

  res.json({ status: 'success', data: submissions });
});

export const reviewSubmission = catchAsync(async (req, res, next) => {
  const { status, feedback } = req.body; // 'accepted' or 'rejected'
  const submission = await ChallengeSubmission.findById(req.params.id);

  if (!submission) return next(new AppError('Submission not found', 404));
  if (submission.trainerId.toString() !== req.user._id.toString()) {
    return next(new AppError('Unauthorized review', 403));
  }
  if (submission.status !== 'pending') return next(new AppError('Already reviewed', 400));

  submission.status = status;
  submission.adminFeedback = feedback;
  submission.reviewedAt = Date.now();
  await submission.save();

  if (status === 'accepted') {
    // Award 150 points as requested
    const trainee = await User.findById(submission.traineeId);
    if (trainee) {
      trainee.gamification.totalPoints += 150;
      await trainee.save();
      
      // Notify Trainee of Points & Approval
      const io = req.app.get('io');
      if (io) {
        const branch = trainee.profile?.gymBranch;
        if (branch) {
          const room = `branch:${branch.toLowerCase()}`;
          io.to(room).emit('stats:update', { type: 'points' });
        }
        io.to(`user:${trainee._id}`).emit('points:update', { points: trainee.gamification.totalPoints });
        io.to(`user:${trainee._id}`).emit('proof:status_update', { submissionId: submission._id, status: 'accepted' });
      }
    }
  } else {
    // Notify Trainee of Rejection
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${submission.traineeId}`).emit('proof:status_update', { submissionId: submission._id, status: 'rejected' });
    }
  }

  res.json({ status: 'success', data: submission });
});

export const getMySubmissions = catchAsync(async (req, res) => {
  const submissions = await ChallengeSubmission.find({ traineeId: req.user._id })
    .populate('challengeId', 'title mediaUrl description challengeType')
    .sort({ createdAt: -1 });
    
  res.json({ status: 'success', data: submissions });
});
