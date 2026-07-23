import mongoose from 'mongoose';

const peerInterviewSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true },
    participants: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['interviewer', 'interviewee'], default: 'interviewee' },
        rating: { type: Number, default: 0 },
        feedback: { type: String, default: '' },
      },
    ],
    sharedCode: { type: String, default: '// Shared Peer Interview Code Editor\n' },
    chatMessages: [
      {
        senderName: String,
        text: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
    reports: {
      interviewerReport: { type: String, default: '' },
      intervieweeReport: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

export default mongoose.model('PeerInterview', peerInterviewSchema);
