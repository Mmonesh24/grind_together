import { Server } from 'socket.io';
import { verifyAccessToken } from '../utils/tokenUtils.js';
import User from '../models/User.js';
import { setupFeedHandler } from '../sockets/feedHandler.js';
import { setupChatHandler } from '../sockets/chatHandler.js';

export const setupSocketIO = (httpServer, corsOrigin) => {
  const io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });

  // Auth middleware — verify JWT on socket connection
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token'));

      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId).select('-passwordHash -refreshToken');
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`⚡ Socket connected: ${socket.user.profile?.name || socket.user.email}`);

    // Auto-join user's gym branch room
    const branch = socket.user.profile?.gymBranch;
    if (branch) {
      const room = `branch:${branch.toLowerCase()}`;
      socket.join(room);
      console.log(`  → Joined room: ${room}`);
    }

    // Join personal room for direct notifications
    socket.join(`user:${socket.user._id}`);

    // Handle branch join
    socket.on('join:branch', ({ branch }) => {
      if (branch) {
        const room = `branch:${branch.toLowerCase()}`;
        socket.join(room);
        console.log(`  → Explicitly joined room: ${room}`);
      }
    });

    // Setup handlers
    setupFeedHandler(io, socket);
    setupChatHandler(io, socket);

    socket.on('disconnect', () => {
      console.log(`💤 Socket disconnected: ${socket.user.profile?.name || socket.user.email}`);
    });
  });

  return io;
};
