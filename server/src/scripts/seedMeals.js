import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

import IndianMeal from '../models/IndianMeal.js';
import WorkoutTemplate from '../models/WorkoutTemplate.js';

const healthySouthIndianMeals = [
  // --- BREAKFAST (Steamed / No Oil / High Fiber) ---
  { name: 'Moringa Leaf Idli (3pcs) with Low-Cal Sambar', calories: 190, protein: 8, carbs: 38, fats: 1, mealType: 'Breakfast', goal_tag: 'weight_loss' },
  { name: 'Foxtail Millet (Thinai) Upma with Veggies', calories: 240, protein: 9, carbs: 46, fats: 4, mealType: 'Breakfast', goal_tag: 'weight_loss' },
  { name: 'Moong Dal Pesarattu (No Oil) with Ginger Chutney', calories: 210, protein: 12, carbs: 35, fats: 2, mealType: 'Breakfast', goal_tag: 'weight_loss' },
  { name: 'Ragi & Oats Steamed Idli (3pcs) with Mint Chutney', calories: 220, protein: 10, carbs: 42, fats: 2, mealType: 'Breakfast', goal_tag: 'maintenance' },
  { name: 'Egg White Podi Mass (4 Eggs) with 1 Steamed Idiyappam', calories: 310, protein: 26, carbs: 40, fats: 4, mealType: 'Breakfast', goal_tag: 'muscle_gain' },
  { name: 'Multi-grain Adai (Minimal Oil) with Avial (No Coconut)', calories: 330, protein: 14, carbs: 45, fats: 8, mealType: 'Breakfast', goal_tag: 'muscle_gain' },

  // --- LUNCH (Millets / Lean Protein / Boiled) ---
  { name: 'Barnyard Millet (Kuthiraivali) with Ridge Gourd Kootu', calories: 340, protein: 11, carbs: 68, fats: 4, mealType: 'Lunch', goal_tag: 'weight_loss' },
  { name: 'Drumstick Leaf (Murungai) Soup with Boiled Sprouted Dal', calories: 260, protein: 16, carbs: 38, fats: 3, mealType: 'Lunch', goal_tag: 'weight_loss' },
  { name: 'Tawa Grilled Fish (Mallore Style) with Steamed Veggies', calories: 420, protein: 45, carbs: 10, fats: 12, mealType: 'Lunch', goal_tag: 'muscle_gain' },
  { name: 'Steamed Chicken Curry Leaf Masala & 1 Ragi Mudde', calories: 490, protein: 52, carbs: 55, fats: 10, mealType: 'Lunch', goal_tag: 'muscle_gain' },
  { name: 'Brown Rice (Small Portion) with Spinach Rasam & Buttermilk', calories: 310, protein: 8, carbs: 62, fats: 3, mealType: 'Lunch', goal_tag: 'maintenance' },
  { name: 'Millet Curd Rice with Pomegranate & Cucumber', calories: 290, protein: 10, carbs: 52, fats: 4, mealType: 'Lunch', goal_tag: 'maintenance' },

  // --- SNACKS (Traditional / Lean / Roasted) ---
  { name: 'Sprouted Horsegram (Kollu) Sundal with Lemon', calories: 130, protein: 11, carbs: 20, fats: 2, mealType: 'Snack', goal_tag: 'weight_loss' },
  { name: 'Roasted Makhana (Foxnuts) with Curry Leaves', calories: 100, protein: 3, carbs: 18, fats: 1, mealType: 'Snack', goal_tag: 'weight_loss' },
  { name: 'Tender Coconut Water (Fresh) with 1 tsp Chia Seeds', calories: 75, protein: 1, carbs: 12, fats: 0, mealType: 'Snack', goal_tag: 'weight_loss' },
  { name: 'Boiled Peanut Salad (Small Bowl) with Carrots', calories: 180, protein: 9, carbs: 12, fats: 14, mealType: 'Snack', goal_tag: 'muscle_gain' },
  { name: 'Amla & Ginger Buttermilk (Sambaram)', calories: 50, protein: 2, carbs: 6, fats: 1, mealType: 'Snack', goal_tag: 'maintenance' },

  // --- DINNER (Light / Soothing / Low Carb) ---
  { name: 'Vegetable Oats Khichdi (No Oil) with Low-fat Curd', calories: 260, protein: 10, carbs: 48, fats: 4, mealType: 'Dinner', goal_tag: 'weight_loss' },
  { name: 'Clear Vegetable Rasam with Boiled Chicken Pieces', calories: 220, protein: 30, carbs: 8, fats: 5, mealType: 'Dinner', goal_tag: 'weight_loss' },
  { name: '2 Ragi Phulkas with Grilled Paneer (Low Fat) Tikkas', calories: 340, protein: 18, carbs: 42, fats: 12, mealType: 'Dinner', goal_tag: 'maintenance' },
  { name: 'Steamed Idiyappam (3pcs) with Egg White Stew', calories: 310, protein: 20, carbs: 45, fats: 6, mealType: 'Dinner', goal_tag: 'maintenance' },
  { name: 'Grilled Chicken Breast (South Indian Herbs) & Broccoli', calories: 380, protein: 55, carbs: 10, fats: 8, mealType: 'Dinner', goal_tag: 'muscle_gain' }
];

const workouts = [
  {
    dayPart: 'push', muscles: ['chest', 'triceps', 'shoulders'], goal_tag: 'muscle_gain',
    exercises: [
      { name: 'Barbell Bench Press', muscle_group: 'Chest', sets: 4, reps: '8-10', instructions: 'Keep back flat against the bench.' },
      { name: 'Overhead Shoulder Press', muscle_group: 'Shoulders', sets: 3, reps: '10', instructions: 'Don\'t arch your lower back.' },
      { name: 'Incline Dumbbell Press', muscle_group: 'Chest', sets: 3, reps: '10', instructions: 'Set bench to 30 degrees.' },
      { name: 'Tricep Rope Pushdown', muscle_group: 'Triceps', sets: 3, reps: '12-15', instructions: 'Keep elbows tucked.' }
    ]
  },
  {
    dayPart: 'pull', muscles: ['back', 'biceps'], goal_tag: 'muscle_gain',
    exercises: [
      { name: 'Deadlift', muscle_group: 'Back', sets: 4, reps: '5-8', instructions: 'Keep spine neutral.' },
      { name: 'Lat Pulldown', muscle_group: 'Back', sets: 3, reps: '10-12', instructions: 'Pull to your upper chest.' },
      { name: 'Barbell Row', muscle_group: 'Back', sets: 3, reps: '10', instructions: 'Keep core tight.' },
      { name: 'Dumbbell Bicep Curl', muscle_group: 'Biceps', sets: 3, reps: '12', instructions: 'Squeeze at the top.' }
    ]
  },
  {
    dayPart: 'legs', muscles: ['quads', 'hamstrings', 'calves'], goal_tag: 'muscle_gain',
    exercises: [
      { name: 'Barbell Squat', muscle_group: 'Legs', sets: 4, reps: '8-10', instructions: 'Go below parallel if mobility allows.' },
      { name: 'Leg Press', muscle_group: 'Legs', sets: 3, reps: '12', instructions: 'Don\'t lock out knees completely.' },
      { name: 'Romanian Deadlift', muscle_group: 'Hamstrings', sets: 3, reps: '10', instructions: 'Hinge at the hips.' },
      { name: 'Calf Raises', muscle_group: 'Calves', sets: 4, reps: '15', instructions: 'Full stretch at the bottom.' }
    ]
  },
  {
    dayPart: 'cardio', muscles: ['full body', 'heart'], goal_tag: 'weight_loss',
    exercises: [
      { name: 'Treadmill Sprints', muscle_group: 'Cardio', sets: 10, reps: '1 min sprint', instructions: '1 min sprint, 1 min walk.' },
      { name: 'Burpees', muscle_group: 'Full Body', sets: 3, reps: '15', instructions: 'Explode up on the jump.' },
      { name: 'Kettlebell Swings', muscle_group: 'Hamstrings & Core', sets: 4, reps: '20', instructions: 'Drive with hips.' },
      { name: 'Cycling / Rower', muscle_group: 'Cardio', sets: 1, reps: '20 mins', instructions: 'Moderate to high intensity.' }
    ]
  }
];

const seed = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/grindtogether';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB for seeding Healthy South Indian menu...');

    await IndianMeal.deleteMany({});
    console.log('🗑️ Cleared existing meals.');
    await IndianMeal.insertMany(healthySouthIndianMeals);
    console.log(`✨ Inserted ${healthySouthIndianMeals.length} Healthy South Indian dishes (Low Oil).`);

    await WorkoutTemplate.deleteMany({});
    console.log('🗑️ Cleared existing workouts.');
    await WorkoutTemplate.insertMany(workouts);
    console.log(`✨ Inserted ${workouts.length} workout templates.`);

    console.log('--- SEEDING COMPLETE ---');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

seed();
