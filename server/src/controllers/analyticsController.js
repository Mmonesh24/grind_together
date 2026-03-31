import DailyLog from '../models/DailyLog.js';
import User from '../models/User.js';
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

  const logs = await DailyLog.find({
    userId: req.user._id,
    date: { $gte: since },
  })
    .sort({ date: 1 })
    .select('date metrics.caloriesBurned metrics.calorieGoal');

  res.json({
    status: 'success',
    data: logs.map((l) => ({
      date: l.date,
      burned: l.metrics.caloriesBurned,
      goal: l.metrics.calorieGoal,
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

  const user = await User.findById(req.user._id);

  const totalCalories = logs.reduce((a, l) => a + (l.metrics?.caloriesBurned || 0), 0);
  const totalDistance = logs.reduce((a, l) => a + (l.metrics?.cardioDistanceKm || 0), 0);
  const totalCardioTime = logs.reduce((a, l) => a + (l.metrics?.cardioTimeMin || 0), 0);
  const workoutDays = logs.filter((l) => l.checklist?.workout).length;
  const fullChecklistDays = logs.filter(
    (l) => l.checklist?.water && l.checklist?.protein && l.checklist?.workout
  ).length;

  const splits = {};
  logs.forEach((l) => {
    if (l.metrics?.muscleSplit) splits[l.metrics.muscleSplit] = (splits[l.metrics.muscleSplit] || 0) + 1;
  });

  res.json({
    status: 'success',
    data: {
      daysLogged: logs.length,
      workoutDays,
      fullChecklistDays,
      totalCalories,
      totalDistance: Math.round(totalDistance * 10) / 10,
      totalCardioTime,
      splits,
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
