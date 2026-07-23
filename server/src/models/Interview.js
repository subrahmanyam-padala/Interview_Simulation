import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    text: { type: String, required: true }, // title
    description: { type: String }, // detailed problem statement
    difficulty: { type: String, required: true },
    tags: [{ type: String }],
    
    // Coding Interview specific fields
    examples: [{
      input: { type: String },
      output: { type: String },
      explanation: { type: String }
    }],
    constraints: [{ type: String }],
    starterCode: {
      java: { type: String },
      python: { type: String },
      javascript: { type: String }
    },
    testCases: [{
      input: { type: String },
      expectedOutput: { type: String }
    }]
  },
  { _id: false }
);

const responseSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    questionText: { type: String, required: true },
    transcript: { type: String, default: '' },
    code: { type: String }, // For coding answers
    language: { type: String }, // For coding answers
    skipped: { type: Boolean, default: false },
    skipReason: { type: String, default: '' },
    durationSec: { type: Number, default: 0 },
    facialMetrics: {
      eyeContactScore: { type: Number, default: 0 },
      confidenceScore: { type: Number, default: 0 },
      expressionStability: { type: Number, default: 0 },
      averageSmileIntensity: { type: Number, default: 0 },
    },
    voiceMetrics: {
      wpm: { type: Number, default: 0 },
      fillerWordCount: { type: Number, default: 0 },
      pauseCount: { type: Number, default: 0 },
      clarityScore: { type: Number, default: 0 },
      fluencyScore: { type: Number, default: 0 },
      volumeStability: { type: Number, default: 70 },
    },
    aiEvaluation: {
      contentScore: { type: Number, default: 0 },
      communicationScore: { type: Number, default: 0 },
      strengths: [{ type: String }],
      weaknesses: [{ type: String }],
      feedback: { type: String, default: '' },
    },
    codeEvaluation: {
      correctnessScore: { type: Number, default: 0 },
      complexityScore: { type: Number, default: 0 },
      qualityScore: { type: Number, default: 0 },
      suggestions: [{ type: String }],
      feedback: { type: String, default: '' },
    },
    responseScores: {
      content: { type: Number, default: 0 },
      communication: { type: Number, default: 0 },
      confidence: { type: Number, default: 0 },
      clarity: { type: Number, default: 0 },
      fluency: { type: Number, default: 0 },
      codeCorrectness: { type: Number, default: 0 },
    },
  },
  { _id: false, timestamps: true }
);

const interviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    setup: {
      interviewType: { type: String, enum: ['technical', 'hr', 'mixed', 'coding'], required: true, default: 'technical' },
      jobRole: { type: String, required: true },
      topic: { type: String, required: true },
      targetCompany: { type: String }, // For company-specific interviews
      difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
      interviewerGender: { type: String, enum: ['male', 'female'], default: 'female' },
      questionCount: { type: Number, min: 5, max: 7, default: 5 },
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed'],
      default: 'in_progress',
      index: true,
    },
    proctoringViolations: [
      {
        type: { type: String }, // multiple_faces, no_face, tab_switch, copy_paste
        message: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    questions: [questionSchema],
    responses: [responseSchema],
    overallScores: {
      content: { type: Number, default: 0 },
      communication: { type: Number, default: 0 },
      confidence: { type: Number, default: 0 },
      clarity: { type: Number, default: 0 },
      fluency: { type: Number, default: 0 },
    },
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    finalFeedback: { type: String, default: '' },
    recommendations: [{ type: String }],
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
  },
  { timestamps: true }
);

const Interview = mongoose.model('Interview', interviewSchema);

export default Interview;
