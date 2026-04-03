import mongoose from 'mongoose';

const dailyPlanSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  goal: { type: String, required: true }, // Added goal to track objective changes
  exercises: [
    {
      name: { type: String, required: true },
      muscle_group: { type: String },
      sets: { type: Number },
      reps: { type: String },
      instructions: { type: String },
      completed: { type: Boolean, default: false },
    }
  ],
  meals: [
    {
      name: { type: String, required: true },
      mealType: { type: String },
      calories: { type: Number, default: 0 },
      protein: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      fats: { type: Number, default: 0 },
      completed: { type: Boolean, default: false },
    }
  ],
  calories_target: { type: Number, default: 0 },
  protein_target: { type: Number, default: 0 },
  carbs_target: { type: Number, default: 0 },
  fats_target: { type: Number, default: 0 },
  calories_consumed: { type: Number, default: 0 },
  waterTarget: { type: Number, default: 3 }, // Fixed Liters, or dynamically calculated initially
  waterConsumed: { type: Number, default: 0 },
  lastHydrationNotification: { type: Date, default: null },
  hydrationNotificationCount: { type: Number, default: 0 },
  isCompleted: { type: Boolean, default: false } // Bonus tracking
}, { timestamps: true });

// Requested optimization: Compound index
dailyPlanSchema.index({ user_id: 1, date: -1 }, { unique: true });

export default mongoose.model('DailyPlan', dailyPlanSchema);
