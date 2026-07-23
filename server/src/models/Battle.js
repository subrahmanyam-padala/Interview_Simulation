import mongoose from 'mongoose';

const battleSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true },
    players: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: { type: String, required: true },
        code: { type: String, default: '' },
        language: { type: String, default: 'javascript' },
        status: { type: String, enum: ['Joined', 'Coding', 'Submitted', 'Passed'], default: 'Joined' },
        executionTime: { type: Number, default: null },
        submissionTime: { type: Date, default: null },
        passedTestCases: { type: Number, default: 0 },
        score: { type: Number, default: 0 },
      },
    ],
    problem: {
      title: { type: String, required: true },
      description: { type: String, required: true },
      testCases: [
        {
          input: { type: String, required: true },
          expectedOutput: { type: String, required: true },
        },
      ],
      starterCode: {
        javascript: { type: String },
        python: { type: String },
        java: { type: String },
        cpp: { type: String },
        c: { type: String },
      },
    },
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['waiting', 'ongoing', 'completed'], default: 'waiting' },
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Battle', battleSchema);
