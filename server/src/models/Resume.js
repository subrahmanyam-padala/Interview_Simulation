import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    extractedText: {
      type: String,
      required: true,
    },
    parsedData: {
      skills: [String],
      projects: [
        {
          name: String,
          description: String,
          technologies: [String],
        },
      ],
      experience: [
        {
          company: String,
          role: String,
          duration: String,
          description: String,
        },
      ],
      education: [
        {
          institution: String,
          degree: String,
          year: String,
        },
      ],
    },
  },
  { timestamps: true }
);

export default mongoose.models.Resume || mongoose.model('Resume', resumeSchema);
