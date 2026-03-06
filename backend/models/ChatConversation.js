import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const chatConversationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'New chat',
      trim: true,
    },
    messages: {
      type: [chatMessageSchema],
      default: [],
    },
    context: {
      lastActiveContext: { type: String, default: null },
      lastIntent: { type: String, default: null },
      lastEntities: { type: mongoose.Schema.Types.Mixed, default: {} },
      lastTargetCorpus: { type: Number, default: null },
      lastAnalysis: { type: mongoose.Schema.Types.Mixed, default: null },
    },
  },
  {
    timestamps: true,
  }
);

chatConversationSchema.index({ userId: 1, updatedAt: -1 });

const ChatConversation = mongoose.model('ChatConversation', chatConversationSchema);

export default ChatConversation;
