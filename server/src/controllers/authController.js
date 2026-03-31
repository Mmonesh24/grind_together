import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/tokenUtils.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import crypto from 'crypto';

export const register = catchAsync(async (req, res, next) => {
  const { email, password, role } = req.validatedBody;

  const existing = await User.findOne({ email });
  if (existing) {
    return next(new AppError('Email already registered', 409));
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const qrCode = crypto.randomUUID();

  const user = await User.create({
    email,
    passwordHash,
    role: role || 'trainee',
    profile: { qrCode },
  });

  const accessToken = signAccessToken({ userId: user._id, role: user.role });
  const refreshToken = signRefreshToken({ userId: user._id });

  user.refreshToken = refreshToken;
  await user.save();

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(201).json({
    status: 'success',
    data: {
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        gamification: user.gamification,
      },
    },
  });
});

export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.validatedBody;

  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError('Invalid email or password', 401));
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return next(new AppError('Invalid email or password', 401));
  }

  const accessToken = signAccessToken({ userId: user._id, role: user.role });
  const refreshToken = signRefreshToken({ userId: user._id });

  user.refreshToken = refreshToken;
  await user.save();

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    status: 'success',
    data: {
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        gamification: user.gamification,
      },
    },
  });
});

export const refresh = catchAsync(async (req, res, next) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    return next(new AppError('No refresh token', 401));
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    return next(new AppError('Invalid refresh token', 401));
  }

  const user = await User.findById(decoded.userId);
  if (!user || user.refreshToken !== token) {
    return next(new AppError('Invalid refresh token', 401));
  }

  const accessToken = signAccessToken({ userId: user._id, role: user.role });
  const newRefreshToken = signRefreshToken({ userId: user._id });

  user.refreshToken = newRefreshToken;
  await user.save();

  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ status: 'success', data: { accessToken } });
});

export const logout = catchAsync(async (req, res) => {
  const user = req.user;
  if (user) {
    await User.findByIdAndUpdate(user._id, { refreshToken: null });
  }
  res.clearCookie('refreshToken');
  res.json({ status: 'success', message: 'Logged out' });
});
