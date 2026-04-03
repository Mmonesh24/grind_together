export const setupFeedHandler = (io, socket) => {
  // Activity broadcasts are triggered server-side from controllers
  // This handler is for any client-initiated feed events (future use)
};

// Called from logController when a log is created
export const broadcastActivity = (io, user, log) => {
  const branch = user.profile?.gymBranch;
  if (!branch) return;

  const summary = [];
  if (log.checklist?.workout) summary.push('completed a workout');
  if (log.checklist?.water) summary.push('hydrated');
  if (log.checklist?.protein) summary.push('hit protein goal');
  if (log.metrics?.caloriesBurned > 0) summary.push(`burned ${log.metrics.caloriesBurned} cal`);

  io.to(`branch:${branch}`).emit('activity:new', {
    userId: user._id,
    name: user.profile?.name || 'Anonymous',
    avatar: user.profile?.avatar || '',
    summary: summary.join(', ') || 'logged activity',
    time: new Date().toISOString(),
  });

  // Emit a real-time signal to all in the branch to refresh their leaderboard rankings
  io.to(`branch:${branch}`).emit('leaderboard:update');
};
