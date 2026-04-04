import { sendPushToUser } from '../services/notificationService.js';
import PushSubscription from '../models/PushSubscription.js';
import User from '../models/User.js';
import DailyLog from '../models/DailyLog.js';
import DailyPlan from '../models/DailyPlan.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

export const subscribe = catchAsync(async (req, res) => {
  const { subscription } = req.body;
  const userId = req.user._id;

  // Check if this subscription already exists for this user
  let existing = await PushSubscription.findOne({ endpoint: subscription.endpoint });

  if (existing) {
    existing.userId = userId; // In case user changed
    existing.keys = subscription.keys;
    await existing.save();
  } else {
    await PushSubscription.create({
      userId,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
    });
  }

  res.status(201).json({ status: 'success', message: 'Subscribed to push notifications' });
});

export const unsubscribe = catchAsync(async (req, res) => {
  const { endpoint } = req.body;
  await PushSubscription.findOneAndDelete({ endpoint, userId: req.user._id });
  res.status(200).json({ status: 'success', message: 'Unsubscribed' });
});

export const handleAction = catchAsync(async (req, res, next) => {
  const { action, payload, endpoint } = req.body;
  let userId = req.user?._id;

  if (!userId && endpoint) {
    const sub = await PushSubscription.findOne({ endpoint });
    if (sub) {
      userId = sub.userId;
    }
  }

  if (!userId) {
    return next(new AppError('Unauthorized: Individual not recognized from notification action', 401));
  }

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  // 1. Update DailyLog (Metric tracking)
  let log = await DailyLog.findOne({ userId, date: today });
  if (!log) {
    log = await DailyLog.create({ userId, date: today });
  }

  // 2. Update DailyPlan (UI tracking/Circles/Tank)
  let plan = await DailyPlan.findOne({ user_id: userId, date: today });
  if (!plan) {
    plan = await DailyPlan.create({ user_id: userId, date: today });
  }

  let toastMessage = '';

  switch (action) {
    case 'woke-up':
      const user = await User.findById(userId);
      if (user && user.gamification.lastSleepStartTime) {
        const sleepStart = new Date(user.gamification.lastSleepStartTime);
        const wakeTime = new Date();
        const diffMs = wakeTime - sleepStart;
        const sleepHours = Number((diffMs / (1000 * 60 * 60)).toFixed(1));

        log.metrics.sleepHours = sleepHours;
        user.gamification.lastWakeTime = wakeTime;
        user.gamification.points += 50; // Wake up on time bonus
        await user.save();
        toastMessage = `🌅 Good morning! You slept ${sleepHours}h. +50XP`;
      }
      break;

    case 'water-drunk':
      const waterIncrement = 0.25; // 250ml per "drunk" tap
      plan.waterConsumed = (plan.waterConsumed || 0) + waterIncrement;
      log.checklist.water = true;
      toastMessage = `💧 Hydration Synced! +${waterIncrement}L`;
      break;

    case 'meal-ate':
      const mealType = payload?.mealType; // breakfast, lunch, dinner
      if (mealType) {
        // Mark in DailyLog checklist
        if (log.checklist[mealType] !== undefined) {
          log.checklist[mealType] = true;
        }

        // Mark in DailyPlan meals
        const meal = plan.meals.find(m => 
          m.mealType === mealType || 
          m.name.toLowerCase().includes(mealType.toLowerCase())
        );
        if (meal) {
          meal.completed = true;
          // Add macros to log metrics
          log.metrics.calories = (log.metrics.calories || 0) + (meal.calories || 0);
          log.metrics.protein = (log.metrics.protein || 0) + (meal.protein || 0);
        }
        toastMessage = `🍱 ${mealType.charAt(0).toUpperCase() + mealType.slice(1)} logged successfully!`;
      }
      break;

    default:
      return next(new AppError('Unknown action', 400));
  }

  await plan.save();
  await log.save();

  // 3. Notify socket rooms for real-time UI refresh
  const io = req.app.get('io');
  if (io) {
    const userRoom = `user:${userId.toString()}`;
    
    // Update the circles/tank
    io.to(userRoom).emit('plan:update', { plan });
    
    // Show a toast if message exists
    if (toastMessage) {
      io.to(userRoom).emit('notification:personal', {
        title: 'Action Synced',
        message: toastMessage,
        type: 'success'
      });
    }
  }

  res.json({ status: 'success', data: { plan, log } });
});
