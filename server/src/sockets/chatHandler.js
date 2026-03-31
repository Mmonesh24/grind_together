import ChatMessage from '../models/ChatMessage.js';

export const setupChatHandler = (io, socket) => {
  socket.on('chat:message', async ({ roomId, message }) => {
    if (!message?.trim()) return;

    const chatMsg = await ChatMessage.create({
      roomId,
      senderId: socket.user._id,
      senderName: socket.user.profile?.name || 'Anonymous',
      senderAvatar: socket.user.profile?.avatar || '',
      message: message.trim(),
    });

    io.to(`branch:${roomId}`).emit('chat:message', {
      _id: chatMsg._id,
      roomId,
      senderId: socket.user._id,
      senderName: chatMsg.senderName,
      senderAvatar: chatMsg.senderAvatar,
      message: chatMsg.message,
      createdAt: chatMsg.createdAt,
    });
  });

  socket.on('chat:join', ({ roomId }) => {
    socket.join(`branch:${roomId}`);
  });
};
