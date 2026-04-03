import mongoose from 'mongoose';

const dailyLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    checklist: {
      water: { type: Boolean, default: false },
      protein: { type: Boolean, default: false },
      workout: { type: Boolean, default: false },
      breakfast: { type: Boolean, default: false },
      lunch: { type: Boolean, default: false },
      dinner: { type: Boolean, default: false },
      snacks: { type: Boolean, default: false },
    },
    metrics: {
      caloriesBurned: { type: Number, default: 0 },
      calorieGoal: { type: Number, default: 0 },
      cardioDistanceKm: { type: Number, default: 0 },
      cardioTimeMin: { type: Number, default: 0 },
      muscleSplit: {
        type: String,
        enum: ['Push', 'Pull', 'Legs', 'Full Body', 'Upper', 'Lower', 'Rest', ''],
        default: '',
      },
      weightKg: { type: Number, default: 0 },
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

dailyLogSchema.index({ userId: 1, date: -1 }, { unique: true });

const DailyLog = mongoose.model('DailyLog', dailyLogSchema);
export default DailyLog;
