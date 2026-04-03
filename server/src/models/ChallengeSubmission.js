import mongoose from 'mongoose';

const challengeSubmissionSchema = new mongoose.Schema(
  {
    challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true },
    traineeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Trainer who created the challenge
    proofUrl: { type: String, required: true }, // Image/Video URL
    proofText: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    adminFeedback: { type: String, default: '' }, // Feedback from trainer
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

challengeSubmissionSchema.index({ challengeId: 1, traineeId: 1 }, { unique: true });
challengeSubmissionSchema.index({ trainerId: 1, status: 1 });

const ChallengeSubmission = mongoose.model('ChallengeSubmission', challengeSubmissionSchema);
export default ChallengeSubmission;
