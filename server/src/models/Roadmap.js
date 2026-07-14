import mongoose from 'mongoose';

const daySchema = new mongoose.Schema(
  {
    day: { type: Number, required: true },
    title: { type: String, required: true },
    focus: { type: String, required: true },
    resources: {
      youtube: [{ title: String, url: String }],
      documentation: [{ title: String, url: String }],
    },
    project: { type: String, default: '' },
    practiceQuestions: [{ type: String }],
    completed: { type: Boolean, default: false },
  },
  { _id: false }
);

const roadmapSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sourceInterview: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview',
    },
    weakTopics: [{ type: String }],
    targetRole: { type: String, required: true },
    title: { type: String, required: true },
    summary: { type: String, default: '' },
    days: [daySchema],
    totalDays: { type: Number, default: 30 },
    completedDays: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['active', 'completed', 'archived'],
      default: 'active',
    },
  },
  { timestamps: true }
);

const Roadmap = mongoose.model('Roadmap', roadmapSchema);
export default Roadmap;
