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
      timezone: { type: String, default: 'UTC' },
      sleepSchedule: { 
        wakeTime: { type: String, default: '08:00' }, 
        sleepTime: { type: String, default: '22:00' } 
      },
      startingStats: {
        weight: { type: Number, default: 0 },
        height: { type: Number, default: 0 }, // in cm
        bodyFatPct: { type: Number, default: 0 },
        activity_level: { type: String, enum: ['low', 'medium', 'high', ''], default: '' },
        gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
        fitnessGoal: {
          type: String,
          enum: ['weight_loss', 'muscle_gain', 'maintenance', 'Lose Weight', 'Build Muscle', 'Get Fit', 'Endurance', ''],
          default: '',
        },
        calorieGoal: { type: Number, default: 0 },
      },
      qrCode: { type: String, unique: true, sparse: true },
      onboardingComplete: { type: Boolean, default: false },
    },
    gamification: {
      totalPoints: { type: Number, default: 0 },
      currentStreak: { type: Number, default: 0 },
      longestStreak: { type: Number, default: 0 },
      lastActiveDate: { type: Date, default: null },
      lastSleepStartTime: { type: Date, default: null },
      lastWakeTime: { type: Date, default: null },
    },
    pendingNotifications: [
      {
        title: { type: String },
        message: { type: String },
        timestamp: { type: Date, default: Date.now },
      }
    ],
  },
  { timestamps: true }
);

userSchema.index({ 'profile.gymBranch': 1 });
userSchema.index({ 'gamification.totalPoints': -1 });

const User = mongoose.model('User', userSchema);
export default User;
