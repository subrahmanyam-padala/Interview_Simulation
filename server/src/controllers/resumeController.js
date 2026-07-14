import multer from 'multer';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';
import Resume from '../models/Resume.js';
import { parseResumeText } from '../services/openaiService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/appError.js';

const storage = multer.memoryStorage();
export const uploadMiddleware = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new AppError('Only PDF and DOCX files are allowed', 400), false);
    }
  }
}).single('resume');

export const uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file uploaded', 400);
  }

  let extractedText = '';

  if (req.file.mimetype === 'application/pdf') {
    const pdfData = await pdfParse(req.file.buffer);
    extractedText = pdfData.text;
  } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer: req.file.buffer });
    extractedText = result.value;
  }

  if (!extractedText || extractedText.trim() === '') {
    throw new AppError('Could not extract text from the file', 400);
  }

  const parsedData = await parseResumeText(extractedText);

  const resume = await Resume.create({
    user: req.user._id,
    fileName: req.file.originalname,
    extractedText,
    parsedData
  });

  res.status(201).json({
    resumeId: resume._id,
    fileName: resume.fileName,
    parsedData: resume.parsedData
  });
});

export const getMyResumes = asyncHandler(async (req, res) => {
  const resumes = await Resume.find({ user: req.user._id }).sort({ createdAt: -1 }).select('fileName parsedData createdAt');
  res.json({ resumes });
});
