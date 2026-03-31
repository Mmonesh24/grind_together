import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';

export const getMe = catchAsync(async (req, res) => {
  res.json({
    status: 'success',
    data: {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role,
      profile: req.user.profile,
      gamification: req.user.gamification,
    },
  });
});

export const updateProfile = catchAsync(async (req, res) => {
  const { name, avatar, gymBranch } = req.validatedBody;
  const user = await User.findById(req.user._id);

  if (name !== undefined) user.profile.name = name;
  if (avatar !== undefined) user.profile.avatar = avatar;
  if (gymBranch !== undefined) user.profile.gymBranch = gymBranch;

  await user.save();

  res.json({
    status: 'success',
    data: {
      id: user._id,
      email: user.email,
      role: user.role,
      profile: user.profile,
      gamification: user.gamification,
    },
  });
});

export const completeOnboarding = catchAsync(async (req, res) => {
  const { name, gymBranch, weight, bodyFatPct, fitnessGoal } = req.validatedBody;
  const user = await User.findById(req.user._id);

  user.profile.name = name;
  user.profile.gymBranch = gymBranch;
  user.profile.onboardingComplete = true;
  if (weight) user.profile.startingStats.weight = weight;
  if (bodyFatPct) user.profile.startingStats.bodyFatPct = bodyFatPct;
  if (fitnessGoal) user.profile.startingStats.fitnessGoal = fitnessGoal;

  await user.save();

  res.json({
    status: 'success',
    data: {
      id: user._id,
      email: user.email,
      role: user.role,
      profile: user.profile,
      gamification: user.gamification,
    },
  });
});
