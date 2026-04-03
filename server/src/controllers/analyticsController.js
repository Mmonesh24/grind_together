import DailyLog from '../models/DailyLog.js';
import User from '../models/User.js';
import DailyPlan from '../models/DailyPlan.js';
import catchAsync from '../utils/catchAsync.js';

// Weight trend over time
export const weightTrend = catchAsync(async (req, res) => {
  const range = parseInt(req.query.range) || 90;
  const since = new Date();
  since.setDate(since.getDate() - range);
  since.setHours(0, 0, 0, 0);

  const logs = await DailyLog.find({
    userId: req.user._id,
    date: { $gte: since },
    'metrics.weightKg': { $gt: 0 },
  })
    .sort({ date: 1 })
    .select('date metrics.weightKg');

  res.json({
    status: 'success',
    data: logs.map((l) => ({
      date: l.date,
      weight: l.metrics.weightKg,
    })),
  });
});

// Calorie trend
export const calorieTrend = catchAsync(async (req, res) => {
  const range = parseInt(req.query.range) || 30;
  const since = new Date();
  since.setDate(since.getDate() - range);
  since.setHours(0, 0, 0, 0);

  // Resolve user's calorie goal: manual override > DailyPlan target > 2000 default
  const user = await User.findById(req.user._id).select('profile.startingStats');
  const manualGoal = user?.profile?.startingStats?.calorieGoal || 0;

  // Fetch most recent DailyPlan's calories_target as fallback
  let planGoal = 0;
  if (!manualGoal) {
    const latestPlan = await DailyPlan.findOne({ user_id: req.user._id }).sort({ date: -1 }).select('calories_target');
    planGoal = latestPlan?.calories_target || 0;
  }

  const resolvedGoal = manualGoal || planGoal || 2000;

  const logs = await DailyLog.find({
    userId: req.user._id,
    date: { $gte: since },
  })
    .sort({ date: 1 })
    .select('date metrics.caloriesBurned');

  res.json({
    status: 'success',
    data: logs.map((l) => ({
      date: l.date,
      burned: l.metrics.caloriesBurned || 0,
      goal: resolvedGoal,
    })),
  });
});

// Workout frequency by muscle split
export const workoutBreakdown = catchAsync(async (req, res) => {
  const range = parseInt(req.query.range) || 30;
  const since = new Date();
  since.setDate(since.getDate() - range);
  since.setHours(0, 0, 0, 0);

  const logs = await DailyLog.find({
    userId: req.user._id,
    date: { $gte: since },
    'metrics.muscleSplit': { $ne: '' },
  }).select('metrics.muscleSplit');

  const counts = {};
  logs.forEach((l) => {
    const split = l.metrics.muscleSplit;
    counts[split] = (counts[split] || 0) + 1;
  });

  res.json({
    status: 'success',
    data: Object.entries(counts).map(([name, value]) => ({ name, value })),
  });
});

// Cardio progress
export const cardioTrend = catchAsync(async (req, res) => {
  const range = parseInt(req.query.range) || 30;
  const since = new Date();
  since.setDate(since.getDate() - range);
  since.setHours(0, 0, 0, 0);

  const logs = await DailyLog.find({
    userId: req.user._id,
    date: { $gte: since },
    $or: [{ 'metrics.cardioDistanceKm': { $gt: 0 } }, { 'metrics.cardioTimeMin': { $gt: 0 } }],
  })
    .sort({ date: 1 })
    .select('date metrics.cardioDistanceKm metrics.cardioTimeMin');

  res.json({
    status: 'success',
    data: logs.map((l) => ({
      date: l.date,
      distance: l.metrics.cardioDistanceKm,
      time: l.metrics.cardioTimeMin,
    })),
  });
});

// Heatmap — all active days in the last year
export const heatmap = catchAsync(async (req, res) => {
  const since = new Date();
  since.setFullYear(since.getFullYear() - 1);
  since.setHours(0, 0, 0, 0);

  const logs = await DailyLog.find({
    userId: req.user._id,
    date: { $gte: since },
  }).select('date');

  const dates = logs.map((l) => l.date.toISOString().split('T')[0]);

  res.json({ status: 'success', data: dates });
});

// Weekly summary report
export const weeklyReport = catchAsync(async (req, res) => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);

  const logs = await DailyLog.find({
    userId: req.user._id,
    date: { $gte: weekAgo },
  });

  const plans = await DailyPlan.find({
    user_id: req.user._id,
    date: { $gte: weekAgo },
  });

  const user = await User.findById(req.user._id);

  const totalCalories = logs.reduce((a, l) => a + (l.metrics?.caloriesBurned || 0), 0);
  const totalSleepHours = logs.reduce((a, l) => a + (l.metrics?.sleepHours || 0), 0);
  const avgSleepHours = logs.length > 0 ? (totalSleepHours / logs.length).toFixed(1) : 0;
  
  const totalWater = plans.reduce((a, p) => a + (p.waterConsumed || 0), 0);
  const workoutDays = logs.filter((l) => l.checklist?.workout).length;
  const fullChecklistDays = logs.filter(
    (l) => l.checklist?.water && l.checklist?.protein && l.checklist?.workout
  ).length;

  res.json({
    status: 'success',
    data: {
      daysLogged: logs.length,
      workoutDays,
      fullChecklistDays,
      totalCalories,
      avgSleepHours,
      totalWater: totalWater.toFixed(1),
      currentStreak: user?.gamification?.currentStreak || 0,
      totalPoints: user?.gamification?.totalPoints || 0,
    },
  });
});

// CSV export
export const exportCsv = catchAsync(async (req, res) => {
  const range = parseInt(req.query.range) || 90;
  const since = new Date();
  since.setDate(since.getDate() - range);
  since.setHours(0, 0, 0, 0);

  const logs = await DailyLog.find({ userId: req.user._id, date: { $gte: since } }).sort({ date: 1 });

  const header = 'Date,Water,Protein,Workout,Calories Burned,Calorie Goal,Muscle Split,Weight(kg),Cardio Distance(km),Cardio Time(min),Notes\n';
  const rows = logs.map((l) =>
    [
      l.date.toISOString().split('T')[0],
      l.checklist?.water ? 'Yes' : 'No',
      l.checklist?.protein ? 'Yes' : 'No',
      l.checklist?.workout ? 'Yes' : 'No',
      l.metrics?.caloriesBurned || 0,
      l.metrics?.calorieGoal || 0,
      l.metrics?.muscleSplit || '',
      l.metrics?.weightKg || '',
      l.metrics?.cardioDistanceKm || '',
      l.metrics?.cardioTimeMin || '',
      `"${(l.notes || '').replace(/"/g, '""')}"`,
    ].join(',')
  );

  const csv = header + rows.join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=grindtogether_export_${new Date().toISOString().split('T')[0]}.csv`);
  res.send(csv);
});

// Hydration Analytics Trend
export const hydrationTrend = catchAsync(async (req, res) => {
  const range = parseInt(req.query.range) || 30;
  const since = new Date();
  since.setDate(since.getDate() - range);
  since.setHours(0, 0, 0, 0);

  const plans = await DailyPlan.find({
    user_id: req.user._id,
    date: { $gte: since },
  })
    .sort({ date: 1 })
    .select('date waterConsumed waterTarget');

  res.json({
    status: 'success',
    data: plans.map((p) => ({
      date: p.date,
      consumed: p.waterConsumed,
      target: p.waterTarget,
    })),
  });
});

// Sleep Analytics Trend
export const sleepTrend = catchAsync(async (req, res) => {
  const range = parseInt(req.query.range) || 30;
  const since = new Date();
  since.setDate(since.getDate() - range);
  since.setHours(0, 0, 0, 0);

  const logs = await DailyLog.find({
    userId: req.user._id,
    date: { $gte: since },
  })
    .sort({ date: 1 })
    .select('date metrics.sleepHours');

  res.json({
    status: 'success',
    data: logs.map((l) => ({
      date: l.date,
      hours: l.metrics.sleepHours || 0,
    })),
  });
});
