import mongoose from 'mongoose';

const indianMealSchema = new mongoose.Schema({
  name: { type: String, required: true },
  calories: { type: Number, required: true },
  protein: { type: Number, required: true },
  carbs: { type: Number, required: true },
  fats: { type: Number, required: true },
  mealType: {
    type: String,
    enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
    required: true,
  },
  goal_tag: {
    type: String,
    enum: ['weight_loss', 'muscle_gain', 'maintenance'],
    required: true,
  },
});

export default mongoose.model('IndianMeal', indianMealSchema);
