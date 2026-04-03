import DailyPlan from '../models/DailyPlan.js';
import User from '../models/User.js';
import IndianMeal from '../models/IndianMeal.js';
import WorkoutTemplate from '../models/WorkoutTemplate.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import { markActive } from '../services/streakService.js';
import { awardPoints, awardStreakBonus } from '../services/pointsService.js';
import axios from 'axios';
import DailyLog from '../models/DailyLog.js';

// In-memory cache for API calls (Redis alternative)
const apiCache = new Map();

// --- NUTRITION & MACRO HELPERS ---
const calculateMacroTargets = (user) => {
  const stats = user.profile?.startingStats || {};
  const weight = stats.weight || 70; // kg
  const height = stats.height || 170; // cm
  const goal = stats.fitnessGoal?.toLowerCase().replace(' ', '_');
  const gender = stats.gender === 'female' ? 'female' : 'male';

  // 1. Check for manual override
  const manualGoal = user.profile.startingStats?.calorieGoal || 0;
  
  // 1. Calculate BMR (Mifflin-St Jeor)
  let bmr = (10 * weight) + (6.25 * height) - (5 * 25); // Age 25 default
  bmr = gender === 'female' ? bmr - 161 : bmr + 5;

  // 2. TDEE based on activity
  let multiplier = 1.2; 
  if (stats.activity_level === 'medium') multiplier = 1.55;
  if (stats.activity_level === 'high') multiplier = 1.725;
  const tdee = Math.round(bmr * multiplier);

  // 3. Calorie Target based on Goal
  let targetCalories = manualGoal > 0 ? manualGoal : tdee;
  let proteinPerKg = 1.8; // default
  let fatPct = 0.25; // 25% of calories

  if (manualGoal === 0) {
    if (goal === 'weight_loss' || goal === 'lose_weight') {
      targetCalories = tdee - 500;
      proteinPerKg = 2.2; 
      fatPct = 0.20;
    } else if (goal === 'muscle_gain' || goal === 'build_muscle') {
      targetCalories = tdee + 300;
      proteinPerKg = 2.0; 
      fatPct = 0.30;
    }
  }

  // 4. Macro Splits
  const proteinTarget = Math.round(weight * proteinPerKg); 
  const fatTarget = Math.round((targetCalories * fatPct) / 9);
  const remainingCals = targetCalories - (proteinTarget * 4) - (fatTarget * 9);
  const carbTarget = Math.max(0, Math.round(remainingCals / 4));

  return {
    calories: targetCalories,
    protein: proteinTarget,
    carbs: carbTarget,
    fats: fatTarget
  };
};

const normalizeGoal = (goal) => {
  const str = goal?.toLowerCase().replace(' ', '_');
  if (str === 'weight_loss' || str === 'lose_weight') return 'weight_loss';
  if (str === 'muscle_gain' || str === 'build_muscle') return 'muscle_gain';
  return 'maintenance';
};

// --- WORKOUT GENERATOR ---
const getSplitForToday = (user) => {
  const created = user.createdAt ? new Date(user.createdAt).getTime() : Date.now();
  const dayIndex = Math.floor((Date.now() - created) / 86400000);
  const splits = ['push', 'pull', 'legs', 'cardio'];
  // Guarantee positive index
  return splits[Math.abs(dayIndex) % 4];
};

const fetchWorkoutFromAPI = async (muscle) => {
  const cacheKey = `workout_api_${muscle}`;
  if (apiCache.has(cacheKey)) return apiCache.get(cacheKey);

  const apiKey = process.env.API_NINJAS_KEY;
  if (!apiKey) return null; // API not configured

  try {
    const { data } = await axios.get(`https://api.api-ninjas.com/v1/exercises?muscle=${muscle}`, {
      headers: { 'X-Api-Key': apiKey }
    });
    if (data && data.length > 0) {
      const formatted = data.slice(0, 4).map(ex => ({
        name: ex.name,
        muscle_group: ex.muscle,
        sets: 3,
        reps: '10',
        instructions: ex.instructions
      }));
      apiCache.set(cacheKey, formatted);
      return formatted;
    }
  } catch (error) {
    console.error('API Ninjas error:', error.message);
  }
  return null;
};

const generateWorkout = async (normalizedGoal, user) => {
  let split = getSplitForToday(user);
  if (normalizedGoal === 'weight_loss') split = 'cardio';

  // Attempt API fetch first (if muscles are mapped)
  let exercises = null;
  const mappedMuscle = split === 'push' ? 'chest' : split === 'pull' ? 'lats' : split === 'legs' ? 'quadriceps' : null;
  if (mappedMuscle) {
    exercises = await fetchWorkoutFromAPI(mappedMuscle);
  }

  // Fallback DB
  if (!exercises) {
    const template = await WorkoutTemplate.findOne({ dayPart: split, goal_tag: normalizedGoal });
    if (template) {
      exercises = template.exercises;
    } else {
      // Very basic fallback
      exercises = [
        { name: 'Pushups', muscle_group: 'Chest', sets: 3, reps: '15' },
        { name: 'Squats', muscle_group: 'Legs', sets: 3, reps: '20' }
      ];
    }
  }
  return exercises.map(ex => ({ ...ex, completed: false }));
};

// --- MEAL GENERATOR ---
const generateMeals = async (normalizedGoal, targets) => {
  const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
  const planMeals = [];
  const usedMealIds = new Set();

  for (const type of mealTypes) {
    const meals = await IndianMeal.aggregate([
      { $match: { 
          mealType: type, 
          goal_tag: normalizedGoal,
          _id: { $nin: Array.from(usedMealIds) }
      } },
      { $sample: { size: 1 } }
    ]);
    
    let meal = meals.length > 0 ? meals[0] : null;
    
    // Fallback if missing specific goal tag
    if (!meal) {
      const generic = await IndianMeal.aggregate([ 
        { $match: { mealType: type, _id: { $nin: Array.from(usedMealIds) } } }, 
        { $sample: { size: 1 } } 
      ]);
      meal = generic.length > 0 ? generic[0] : { name: `Generic ${type}`, calories: 400, protein: 15, carbs: 50, fats: 10 };
    }

    usedMealIds.add(meal._id);
    planMeals.push(meal);
  }

  // Scaling Factor to hit targets (primarily calories/protein)
  const comboCals = planMeals.reduce((sum, m) => sum + m.calories, 0);
  const ratio = targets.calories / (comboCals || 1);

  return planMeals.map(m => ({
    ...m,
    calories: Math.round(m.calories * ratio),
    protein: Math.round(m.protein * ratio),
    carbs: Math.round(m.carbs * ratio),
    fats: Math.round(m.fats * ratio),
    completed: false
  }));
};

// --- EXPORTS ---
export const getDailyPlan = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);
  const tzOffset = user.profile?.timezone === 'IST' ? 330 : 0; // minutes
  
  const now = new Date();
  const localNow = new Date(now.getTime() + (tzOffset * 60000));
  const today = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate()));

  const normalizedGoal = normalizeGoal(user.profile?.startingStats?.fitnessGoal);

  // Use Atomic operations to prevent duplicate plan generation
  let plan = await DailyPlan.findOne({ user_id: req.user._id, date: today });

  // REGENERATE IF MISMATCH, MISSING, OR OLD VERSION (missing macro targets)
  const isOldSchema = plan && typeof plan.protein_target === 'undefined';
  
  if (!plan || plan.goal !== normalizedGoal || isOldSchema) {
    const targets = calculateMacroTargets(user);

    const exercises = await generateWorkout(normalizedGoal, user);
    const meals = await generateMeals(normalizedGoal, targets);

    // Dynamic water calculation
    const weight = user.profile?.startingStats?.weight || 0;
    const act = user.profile?.startingStats?.activity_level;
    let computedWater = weight > 0 ? weight * 0.033 : 3.0;
    if (act === 'high') computedWater += 0.5;
    if (act === 'medium') computedWater += 0.2;
    // ensure at least 2 liters
    computedWater = Math.max(2.0, computedWater);

    const updateDoc = {
      $set: {
        goal: normalizedGoal,
        exercises,
        meals,
        calories_target: targets.calories,
        protein_target: targets.protein,
        carbs_target: targets.carbs,
        fats_target: targets.fats,
        waterTarget: Number(computedWater.toFixed(1)),
      },
      $setOnInsert: {
        calories_consumed: 0,
        waterConsumed: 0,
        isCompleted: false
      }
    };

    plan = await DailyPlan.findOneAndUpdate(
      { user_id: req.user._id, date: today },
      updateDoc,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  res.json({ status: 'success', data: plan });
});

export const updateWater = catchAsync(async (req, res, next) => {
  const plan = await DailyPlan.findOne({ user_id: req.user._id, _id: req.body.planId });
  if (!plan) return next(new AppError('Plan not found', 404));

  const amount = Number(req.body.amount || 0);
  plan.waterConsumed += amount;
  if (plan.waterConsumed < 0) plan.waterConsumed = 0;
  
  await plan.save();

  // Socket emissions for real-time sync
  const io = req.app.get('io');
  if (io) {
    io.to(`user:${req.user._id}`).emit('plan:update', { plan });
    if (req.user.profile?.gymBranch) {
      const room = `branch:${req.user.profile.gymBranch.toLowerCase()}`;
      io.to(room).emit('stats:update', { type: 'water' });
    }
  }

  res.json({ status: 'success', data: plan });
});

export const completeExercise = catchAsync(async (req, res, next) => {
  const plan = await DailyPlan.findOne({ user_id: req.user._id, _id: req.body.planId });
  if (!plan) return next(new AppError('Plan not found', 404));

  const ex = plan.exercises.id(req.params.exerciseId);
  if (!ex) return next(new AppError('Exercise not found', 404));
  
  if (!ex.completed) {
    ex.completed = true;
    await plan.save();
    
    // Gamification Points : +10 for Exercise
    await awardPoints(req.user._id, { type: 'exercise' });

    // Sync to DailyLog metrics (Auto-detection)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let log = await DailyLog.findOne({ userId: req.user._id, date: today });
    if (!log) log = await DailyLog.create({ userId: req.user._id, date: today });
    
    log.metrics.caloriesBurned += 75; // Estimate: 75 kcal per exercise
    log.checklist.workout = plan.exercises.every(e => e.completed);
    await log.save();

    const io = req.app.get('io');
    
    // Gamification Points : +10 for Exercise
    await awardPoints(req.user._id, { type: 'exercise' }, io);
    
    // Check if fully completed
    const allExDone = plan.exercises.every(e => e.completed);
    const allMealsDone = plan.meals.every(m => m.completed);
    if (allExDone && allMealsDone && !plan.isCompleted) {
       plan.isCompleted = true;
       await plan.save();
       await awardPoints(req.user._id, { type: 'daily_bonus' }, io);
       
       if (io) {
         const room = `branch:${(req.user.profile?.gymBranch || '').toLowerCase()}`;
         io.to(room).emit('daily_plan_completed', { userId: req.user._id });
       }
    }
  }

  // Socket emissions for real-time sync
  const io = req.app.get('io');
  if (io) {
    io.to(`user:${req.user._id}`).emit('plan:update', { plan });
    if (req.user.profile?.gymBranch) {
      const room = `branch:${req.user.profile.gymBranch.toLowerCase()}`;
      io.to(room).emit('stats:update', { type: 'exercise' });
    }
  }

  res.json({ status: 'success', data: plan });
});

export const completeMeal = catchAsync(async (req, res, next) => {
  const plan = await DailyPlan.findOne({ user_id: req.user._id, _id: req.body.planId });
  if (!plan) return next(new AppError('Plan not found', 404));

  const meal = plan.meals.id(req.params.mealId);
  if (!meal) return next(new AppError('Meal not found', 404));

  if (!meal.completed) {
    meal.completed = true;
    plan.calories_consumed += meal.calories || 0;
    await plan.save();

    // Sync to DailyLog metrics (Auto-detection)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let log = await DailyLog.findOne({ userId: req.user._id, date: today });
    if (!log) log = await DailyLog.create({ userId: req.user._id, date: today });

    log.metrics.proteinGrams += meal.protein || 0;
    
    // Update checklist if all meals are done or just track individually
    const mealType = meal.mealType?.toLowerCase();
    if (mealType && log.checklist[mealType] !== undefined) {
      log.checklist[mealType] = true;
    }
    
    await log.save();

    const io = req.app.get('io');

    // Gamification Points : +5 for Meal
    await awardPoints(req.user._id, { type: 'meal' }, io);

    // Check if fully completed
    const allExDone = plan.exercises.every(e => e.completed);
    const allMealsDone = plan.meals.every(m => m.completed);
    if (allExDone && allMealsDone && !plan.isCompleted) {
       plan.isCompleted = true;
       await plan.save();
       await awardPoints(req.user._id, { type: 'daily_bonus' }, io);
       
       if (io) {
         const room = `branch:${(req.user.profile?.gymBranch || '').toLowerCase()}`;
         io.to(room).emit('daily_plan_completed', { userId: req.user._id });
       }
    }
  }

  // Socket emissions for real-time sync
  const io = req.app.get('io');
  if (io) {
    io.to(`user:${req.user._id}`).emit('plan:update', { plan });
    if (req.user.profile?.gymBranch) {
      const room = `branch:${req.user.profile.gymBranch.toLowerCase()}`;
      io.to(room).emit('stats:update', { type: 'meal' });
    }
  }

  res.json({ status: 'success', data: plan });
});
