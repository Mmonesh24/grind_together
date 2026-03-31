import ChatMessage from '../models/ChatMessage.js';
import catchAsync from '../utils/catchAsync.js';

export const getHistory = catchAsync(async (req, res) => {
  const { roomId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;

  const messages = await ChatMessage.find({ roomId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.json({ status: 'success', data: messages.reverse() });
});
