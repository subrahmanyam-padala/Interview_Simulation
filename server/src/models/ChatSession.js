import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 8000,
    },
  },
  { _id: false, timestamps: true }
);

const chatSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'New Chat',
      maxlength: 120,
    },
    // Interview context (optional – enriches the AI's coaching)
    interviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview',
      default: null,
    },
    messages: [messageSchema],
    // Topic tags auto-detected from the first user message
    tags: [{ type: String }],
  },
  { timestamps: true }
);

// Keep only the last 60 messages per session to stay within token limits
chatSessionSchema.pre('save', function pruneMessages(next) {
  if (this.messages.length > 60) {
    this.messages = this.messages.slice(-60);
  }
  next();
});

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);

export default ChatSession;
