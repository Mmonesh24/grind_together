import mongoose from 'mongoose';

const workoutTemplateSchema = new mongoose.Schema({
  dayPart: {
    type: String,
    enum: ['push', 'pull', 'legs', 'cardio'],
    required: true,
  },
  muscles: [{ type: String }],
  exercises: [
    {
      name: { type: String, required: true },
      muscle_group: { type: String },
      sets: { type: Number, default: 3 },
      reps: { type: String, default: '10' },
      instructions: { type: String },
      category: { type: String },
    }
  ],
  goal_tag: {
    type: String,
    enum: ['weight_loss', 'muscle_gain', 'maintenance'],
    required: true,
  }
});

export default mongoose.model('WorkoutTemplate', workoutTemplateSchema);
