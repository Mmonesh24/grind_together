import { sendPushToUser } from '../services/notificationService.js';
import PushSubscription from '../models/PushSubscription.js';
import DailyLog from '../models/DailyLog.js';
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Update DailyLog
  let log = await DailyLog.findOne({ userId, date: today });
  if (!log) {
    log = await DailyLog.create({ userId, date: today });
  }

  // Also update DailyPlan for consistency if it exists
  const plan = await DailyPlan.findOne({ user_id: userId, date: today });

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
        await user.save();
      }
      break;
    case 'water-drunk':
      log.checklist.water = true;
      if (plan) {
         plan.waterConsumed += 0.25; // Assume 250ml per "drunk" action
         await plan.save();
      }
      break;
    case 'meal-ate':
      const mealType = payload?.mealType; // breakfast, lunch, etc.
      if (mealType && log.checklist[mealType] !== undefined) {
        log.checklist[mealType] = true;
      }
      if (plan && mealType) {
        // Try to find the meal in the plan and mark as completed
        const meal = plan.meals.find(m => m.mealType === mealType || m.name.toLowerCase().includes(mealType));
        if (meal) {
          meal.completed = true;
          await plan.save();
        }
      }
      break;
    default:
      return next(new AppError('Unknown action', 400));
  }

  await log.save();

  // Notify socket rooms so UI updates immediately if open
  const io = req.app.get('io');
  if (io) {
    io.to(`user:${userId}`).emit('plan:update', { plan: log });
  }

  res.json({ status: 'success', data: log });
});
