import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import env from './config/env.js';
import { setupSocketIO } from './config/socketio.js';
import { startStreakJob } from './jobs/streakJob.js';
import errorHandler from './middlewares/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import logRoutes from './routes/logRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';
import challengeRoutes from './routes/challengeRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import trainerRoutes from './routes/trainerRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

const app = express();
const httpServer = createServer(app);

connectDB();

const io = setupSocketIO(httpServer, env.CORS_ORIGIN);
app.set('io', io);

startStreakJob();

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => res.json({ status: 'ok', message: 'GrindTogether API' }));
app.use('/api/auth', authRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/trainer', trainerRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use(errorHandler);

const PORT = env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;
