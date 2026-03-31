import mongoose from 'mongoose';

const challengeSchema = new mongoose.Schema(
  {
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    targetType: { type: String, enum: ['cardio_km', 'workout_days', 'calories'], required: true },
    targetValue: { type: Number, required: true },
    gymBranch: { type: String, default: '' },
    startDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    status: { type: String, enum: ['active', 'completed', 'expired'], default: 'active' },
    participants: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        currentProgress: { type: Number, default: 0 },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

challengeSchema.index({ gymBranch: 1, status: 1 });
challengeSchema.index({ expiryDate: 1 });

const Challenge = mongoose.model('Challenge', challengeSchema);
export default Challenge;
