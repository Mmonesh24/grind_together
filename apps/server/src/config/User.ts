import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    email: { type: String, required: true, unique: true },

    password: { type: String, required: true },

    age: Number,
    weight: Number,
    height: Number,

    fitnessLevel: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },

    goals: {
      dailyCalories: Number,
      cardioMinutes: Number,
    },

    workoutSplit: [String],

    streak: { type: Number, default: 0 },
    maxStreak: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);