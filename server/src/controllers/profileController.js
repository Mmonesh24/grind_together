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
  const { name, avatar, gymBranch, weight, height, bodyFatPct, fitnessGoal, activity_level, calorieGoal } = req.validatedBody;
  const user = await User.findById(req.user._id);

  if (name !== undefined) user.profile.name = name;
  if (avatar !== undefined) user.profile.avatar = avatar;
  if (gymBranch !== undefined) user.profile.gymBranch = gymBranch;
  
  if (weight !== undefined) user.profile.startingStats.weight = weight;
  if (height !== undefined) user.profile.startingStats.height = height;
  if (bodyFatPct !== undefined) user.profile.startingStats.bodyFatPct = bodyFatPct;
  if (fitnessGoal !== undefined) user.profile.startingStats.fitnessGoal = fitnessGoal;
  if (activity_level !== undefined) user.profile.startingStats.activity_level = activity_level;
  if (calorieGoal !== undefined) user.profile.startingStats.calorieGoal = calorieGoal;

  await user.save();

  const io = req.app.get('io');
  if (io) {
    if (gymBranch !== undefined) {
      const room = `branch:${gymBranch.toLowerCase()}`;
      io.to(room).emit('stats:update', { type: 'totalMembers' });
    }
    
    // Refresh all active socket sessions for this user with their new profile data
    const userRoom = `user:${user._id.toString()}`;
    io.to(userRoom).emit('profile:update', { user });
    
    // Ensure actual socket object session data is updated
    const sockets = await io.in(userRoom).fetchSockets();
    sockets.forEach(s => { s.user = user; });
  }

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

  const io = req.app.get('io');
  if (io) {
    if (gymBranch) {
      const room = `branch:${gymBranch.toLowerCase()}`;
      io.to(room).emit('stats:update', { type: 'totalMembers' });
    }
    
    // Refresh all active socket sessions for this user after onboarding
    const userRoom = `user:${user._id.toString()}`;
    io.to(userRoom).emit('profile:update', { user });
    
    const sockets = await io.in(userRoom).fetchSockets();
    sockets.forEach(s => { s.user = user; });
  }

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

export const syncNotifications = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ status: 'fail', message: 'User not found' });

  const now = Date.now();
  const validNotifications = [];
  const THREE_HOURS = 3 * 60 * 60 * 1000;
  
  for (const notice of user.pendingNotifications || []) {
    if (now - new Date(notice.timestamp).getTime() < THREE_HOURS) {
      validNotifications.push(notice);
    }
  }

  await User.updateOne({ _id: user._id }, { $set: { pendingNotifications: [] } });

  res.json({
    status: 'success',
    data: validNotifications
  });
});