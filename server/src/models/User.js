import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['trainee', 'trainer', 'admin'], default: 'trainee' },
    refreshToken: { type: String, default: null },
    profile: {
      name: { type: String, default: '' },
      avatar: { type: String, default: '' },
      gymBranch: { type: String, default: '' },
      startingStats: {
        weight: { type: Number, default: 0 },
        bodyFatPct: { type: Number, default: 0 },
        fitnessGoal: {
          type: String,
          enum: ['Lose Weight', 'Build Muscle', 'Get Fit', 'Endurance', ''],
          default: '',
        },
      },
      qrCode: { type: String, unique: true, sparse: true },
      onboardingComplete: { type: Boolean, default: false },
    },
    gamification: {
      totalPoints: { type: Number, default: 0 },
      currentStreak: { type: Number, default: 0 },
      longestStreak: { type: Number, default: 0 },
      lastActiveDate: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

userSchema.index({ 'profile.gymBranch': 1 });
userSchema.index({ 'gamification.totalPoints': -1 });

const User = mongoose.model('User', userSchema);
export default User;
