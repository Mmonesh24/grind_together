import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, required: true },
    senderAvatar: { type: String, default: '' },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

chatMessageSchema.index({ roomId: 1, createdAt: -1 });

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
export default ChatMessage;
