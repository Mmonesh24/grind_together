import mongoose from "mongoose";

const progressLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    date: {
      type: String,
      required: true,
    },

    caloriesBurned: { type: Number, default: 0 },
    cardioMinutesDone: { type: Number, default: 0 },

    workoutsCompleted: [String],

    goalCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

progressLogSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model("ProgressLog", progressLogSchema);