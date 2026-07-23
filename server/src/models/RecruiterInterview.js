import mongoose from 'mongoose';

const recruiterInterviewSchema = new mongoose.Schema(
  {
    recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    candidateEmail: { type: String, required: true },
    candidateName: { type: String, required: true },
    jobRole: { type: String, required: true },
    scheduledAt: { type: Date, required: true },
    roomId: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['scheduled', 'live', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    code: { type: String, default: '// Recruiter Live Coding Environment\n' },
    scores: {
      communication: { type: Number, default: 0 },
      technicalKnowledge: { type: Number, default: 0 },
      problemSolving: { type: Number, default: 0 },
      coding: { type: Number, default: 0 },
    },
    feedback: { type: String, default: '' },
    resumeText: { type: String, default: 'Candidate Resume: Experienced software engineer proficient in React, Node.js, and Distributed Systems.' },
    recordingStatus: { type: String, enum: ['none', 'recording', 'saved'], default: 'none' },
  },
  { timestamps: true }
);

export default mongoose.model('RecruiterInterview', recruiterInterviewSchema);
