import OpenAI from 'openai';
import { env } from '../config/env.js';

const openai = env.GEMINI_API_KEY 
  ? new OpenAI({ 
      apiKey: env.GEMINI_API_KEY, 
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/' 
    }) 
  : null;

const modelToUse = env.GEMINI_MODEL;

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));

const parseJSON = (content) => {
  try {
    return JSON.parse(content);
  } catch (_error) {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }
    try {
      return JSON.parse(match[0]);
    } catch (_innerError) {
      return null;
    }
  }
};

const askOpenAIForJSON = async (messages, fallback) => {
  if (!openai) {
    return fallback;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: modelToUse,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages,
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      return fallback;
    }

    const parsed = parseJSON(content);
    return parsed || fallback;
  } catch (error) {
    console.error('OpenAI request failed:', error.message);
    return fallback;
  }
};

export const parseResumeText = async (text) => {
  const fallback = {
    skills: [],
    projects: [],
    experience: [],
    education: []
  };

  const result = await askOpenAIForJSON(
    [
      {
        role: 'system',
        content: 'You are an AI Resume Analyzer. Extract details from the resume text provided. Return strict JSON with the following keys: "skills" (array of strings), "projects" (array of objects with "name", "description", "technologies" array), "experience" (array of objects with "company", "role", "duration", "description"), and "education" (array of objects with "institution", "degree", "year"). If any information is missing, return an empty array for that key.'
      },
      {
        role: 'user',
        content: text
      }
    ],
    fallback
  );
  
  if (result.skills.length === 0 && result.experience.length === 0) {
    // Regex fallback if OpenAI fails due to quota or invalid key
    const lowerText = text.toLowerCase();
    const commonSkills = ['react', 'node', 'javascript', 'python', 'java', 'c++', 'html', 'css', 'sql', 'mongodb', 'express', 'git', 'docker', 'aws'];
    const extractedSkills = commonSkills.filter(skill => lowerText.includes(skill));
    
    return {
      skills: extractedSkills.length > 0 ? extractedSkills : ['Software Development', 'Problem Solving'],
      projects: lowerText.includes('project') ? [{ name: 'Extracted Project', description: 'Basic project extracted via fallback parser.', technologies: extractedSkills }] : [],
      experience: lowerText.includes('experience') ? [{ company: 'Previous Company', role: 'Developer', duration: 'Unknown', description: 'Extracted via fallback parser.' }] : [],
      education: []
    };
  }
  
  return result;
};

export const generateCodingQuestions = async ({ jobRole, topic, difficulty, questionCount }) => {
  const fallback = {
    questions: Array.from({ length: questionCount }, (_item, index) => ({
      questionId: `c-${index + 1}`,
      title: `Solve a ${topic} problem`,
      description: `Implement a basic algorithm for ${topic}. Given an array of integers, solve the standard problem efficiently.`,
      difficulty,
      tags: ['coding', topic.toLowerCase()],
      examples: [
        {
          input: "arr = [1, 2, 3]",
          output: "6",
          explanation: "The sum of the array is 6."
        }
      ],
      constraints: [
        "1 <= arr.length <= 10^4",
        "-10^5 <= arr[i] <= 10^5"
      ],
      starterCode: {
        java: "class Solution {\n    public int solve(int[] arr) {\n        // Your code here\n        return 0;\n    }\n}",
        python: "def solve(arr):\n    # Your code here\n    pass",
        javascript: "function solve(arr) {\n    // Your code here\n    return 0;\n}"
      },
      testCases: [
        { input: "[1, 2, 3]", expectedOutput: "6" }
      ]
    })),
  };

  const outputSchema = `{
  "questions": [
    {
      "questionId": "c-1",
      "title": "String",
      "description": "String",
      "difficulty": "${difficulty}",
      "tags": ["String"],
      "examples": [{"input": "String", "output": "String", "explanation": "String"}],
      "constraints": ["String"],
      "starterCode": {"java": "String", "python": "String", "javascript": "String"},
      "testCases": [{"input": "String", "expectedOutput": "String"}]
    }
  ]
}`;

  const result = await askOpenAIForJSON(
    [
      {
        role: 'system',
        content: `You create coding interview questions. Return strict JSON matching exactly this schema: ${outputSchema}. Every field is required. Do not use 'N/A'. Provide realistic code and test cases.`,
      },
      {
        role: 'user',
        content: `Generate ${questionCount} coding interview questions for:\nRole: ${jobRole}\nTopic: ${topic}\nDifficulty: ${difficulty}\nMake sure to provide complete examples, constraints, starter code for java/python/javascript, and test cases.`,
      },
    ],
    fallback
  );

  // Map result to ensure `text` field is populated from `title` since our schema expects `text`
  if (Array.isArray(result.questions)) {
    return result.questions.map(q => ({
      ...q,
      text: q.title || q.text || 'Coding Problem',
    }));
  }

  return fallback.questions.map(q => ({ ...q, text: q.title }));
};

export const evaluateCodeAnswer = async ({ question, code, language }) => {
  const fallback = {
    correctnessScore: 50,
    complexityScore: 50,
    qualityScore: 50,
    suggestions: ['Ensure your code handles edge cases.', 'Consider optimizing time and space complexity.'],
    feedback: 'Your code provides a basic solution, but further evaluation is needed for completeness.',
  };

  if (!code || code.trim() === '') {
    return { ...fallback, correctnessScore: 0, feedback: 'No code provided.' };
  }

  const result = await askOpenAIForJSON(
    [
      {
        role: 'system',
        content:
          'You are an expert technical interviewer evaluating a coding solution. Analyze the code based on the problem description. Return strict JSON with keys: "correctnessScore" (0-100), "complexityScore" (0-100), "qualityScore" (0-100), "suggestions" (array of strings), and "feedback" (overall assessment string).',
      },
      {
        role: 'user',
        content: `Problem Title: ${question.text}\nProblem Description: ${question.description}\nConstraints: ${question.constraints}\n\nCandidate Code (${language}):\n\`\`\`${language}\n${code}\n\`\`\`\n\nEvaluate the correctness, time/space complexity, and code quality (readability, modularity). Output strict JSON.`,
      },
    ],
    fallback
  );

  return result;
};

export const generateDynamicQuestions = async ({ interviewType, jobRole, topic, difficulty, questionCount, resumeData, targetCompany }) => {
  const fallback = {
    questions: Array.from({ length: questionCount }, (_item, index) => ({
      questionId: `q-${index + 1}`,
      text: `For a ${jobRole} role, explain your approach to ${topic}. Include one practical example and measurable impact.`,
      tags: ['problem-solving', 'communication', topic.toLowerCase(), String(interviewType || 'technical').toLowerCase()],
      difficulty,
    })),
  };

  let systemContent = resumeData 
    ? 'You create realistic interview questions and ask one clear question at a time. Use the provided candidate resume data to ask personalized and relevant questions about their skills, projects, or experience. Return strict JSON with key questions as an array of question objects only.'
    : 'You create realistic interview questions and ask one clear question at a time. Return strict JSON with key questions as an array of question objects only.';

  if (targetCompany) {
    systemContent += ` Base your questions and interview style heavily on ${targetCompany}'s actual interview practices (e.g. Amazon Leadership Principles, Google's open-ended problem solving, etc).`;
  }

  let userContent = `Generate ${questionCount} interview questions for:\nInterview Type: ${interviewType || 'technical'}\nRole: ${jobRole}\nTopic: ${topic}\nDifficulty: ${difficulty}\n`;
  if (targetCompany) {
    userContent += `Target Company: ${targetCompany}\n`;
  }
  if (resumeData) {
    userContent += `Resume Data: ${JSON.stringify(resumeData)}\n`;
  }
  userContent += `Output schema:\n{"questions":[{"questionId":"q-1","text":"...","tags":["..."],"difficulty":"${difficulty}"}]}`;

  const result = await askOpenAIForJSON(
    [
      {
        role: 'system',
        content: systemContent,
      },
      {
        role: 'user',
        content: userContent,
      },
    ],
    fallback
  );

  if (!Array.isArray(result.questions) || !result.questions.length) {
    return fallback.questions;
  }

  return result.questions.slice(0, questionCount).map((question, index) => ({
    questionId: question.questionId || `q-${index + 1}`,
    text: String(question.text || fallback.questions[index].text),
    tags: Array.isArray(question.tags) ? question.tags : [],
    difficulty,
  }));
};

const getPerformanceBand = ({ contentScore = 0, communicationScore = 0 } = {}) => {
  const avg = (Number(contentScore) + Number(communicationScore)) / 2;
  if (avg >= 75) {
    return 'good';
  }
  if (avg >= 50) {
    return 'average';
  }
  return 'poor';
};

const getAdaptiveDifficulty = ({ baseDifficulty, performanceBand }) => {
  if (performanceBand === 'good') {
    if (baseDifficulty === 'easy') {
      return 'medium';
    }
    return 'hard';
  }

  if (performanceBand === 'poor') {
    if (baseDifficulty === 'hard') {
      return 'medium';
    }
    return 'easy';
  }

  return baseDifficulty;
};

const fallbackAdaptivePrompt = ({ setup, performanceBand, latestResponse, adaptiveDifficulty }) => {
  if (performanceBand === 'good') {
    return {
      text: `Good answer. Now go deeper: for a ${setup.jobRole} role, explain an advanced approach for ${setup.topic}, including one major trade-off and how you would measure success.`,
      difficulty: adaptiveDifficulty,
      encouragement: 'Good answer. Let us go one level deeper.',
    };
  }

  if (performanceBand === 'poor' || latestResponse?.skipped) {
    return {
      text: `Thanks. Let us simplify this. For ${setup.topic}, explain the core concept in plain steps and share one basic example from your projects or studies.`,
      difficulty: adaptiveDifficulty,
      encouragement: 'Take your time. Start with the basics and build up.',
    };
  }

  return {
    text: `Can you elaborate further on ${setup.topic} for a ${setup.jobRole} role, and add one concrete example with measurable impact?`,
    difficulty: adaptiveDifficulty,
    encouragement: 'Good attempt. Can you elaborate with clearer evidence?',
  };
};

export const generateAdaptiveQuestion = async ({ setup, askedQuestions, latestResponse, nextQuestionId }) => {
  const performanceBand = latestResponse?.skipped
    ? 'poor'
    : getPerformanceBand({
        contentScore: latestResponse?.aiEvaluation?.contentScore,
        communicationScore: latestResponse?.aiEvaluation?.communicationScore,
      });
  const adaptiveDifficulty = getAdaptiveDifficulty({
    baseDifficulty: setup.difficulty,
    performanceBand,
  });

  const fallback = fallbackAdaptivePrompt({
    setup,
    performanceBand,
    latestResponse,
    adaptiveDifficulty,
  });

  const result = await askOpenAIForJSON(
    [
      {
        role: 'system',
        content:
          'You are a professional human interviewer. Ask exactly one interview question at a time, no answers, no long explanations. Keep tone polite and clear.',
      },
      {
        role: 'user',
        content: `Generate the next question based on interview context and performance.\n\nRules:\n1) If previous answer quality is good, ask a deeper/advanced question.\n2) If quality is average, ask a follow-up question.\n3) If quality is poor or skipped, ask a simpler guiding question.\n4) Avoid repeating previous questions.\n5) Keep question concise.\n\nContext:\nInterview Type: ${setup.interviewType}\nRole: ${setup.jobRole}\nTopic: ${setup.topic}\nBase Difficulty: ${setup.difficulty}\nTarget Difficulty For Next Question: ${adaptiveDifficulty}\nPerformance Band: ${performanceBand}\nAsked Questions: ${JSON.stringify(askedQuestions || [])}\nPrevious Question: ${latestResponse?.questionText || ''}\nPrevious Transcript: ${latestResponse?.transcript || ''}\n\nReturn strict JSON schema:\n{"text":"...","difficulty":"easy|medium|hard","encouragement":"optional short line"}`,
      },
    ],
    fallback
  );

  return {
    questionId: nextQuestionId,
    text: String(result.text || fallback.text),
    tags: [String(setup.topic || '').toLowerCase(), String(setup.interviewType || 'technical').toLowerCase()],
    difficulty: ['easy', 'medium', 'hard'].includes(result.difficulty) ? result.difficulty : adaptiveDifficulty,
    encouragement: String(result.encouragement || fallback.encouragement),
  };
};

export const evaluateCandidateAnswer = async ({ question, transcript, setup, voiceMetrics, facialMetrics }) => {
  const fallbackContent = clamp(40 + Math.min(transcript.split(' ').length, 150) * 0.25);
  const fallbackCommunication = clamp((voiceMetrics.clarityScore + voiceMetrics.fluencyScore + facialMetrics.eyeContactScore) / 3);
  const fallbackBand = getPerformanceBand({
    contentScore: fallbackContent,
    communicationScore: fallbackCommunication,
  });
  const fallback = {
    contentScore: fallbackContent,
    communicationScore: fallbackCommunication,
    strengths: ['Clear attempt to answer the asked question', 'Maintained a logical flow'],
    weaknesses: ['Add more quantified impact', 'Support claims with one concrete project example'],
    feedback: 'Your response has a good structure. Improve with concise examples, measurable results, and tighter storytelling.',
    qualityBand: fallbackBand,
    encouragement:
      fallbackBand === 'good'
        ? 'Good answer.'
        : fallbackBand === 'average'
          ? 'Can you elaborate with one concrete example?'
          : 'Thanks for trying. Let us simplify in the next question.',
  };

  const result = await askOpenAIForJSON(
    [
      {
        role: 'system',
        content:
          'You are an interview evaluator. Return strict JSON with keys contentScore, communicationScore, strengths, weaknesses, feedback, qualityBand, encouragement.',
      },
      {
        role: 'user',
        content: `Interview setup:\nInterview Type: ${setup.interviewType}\nRole: ${setup.jobRole}\nTopic: ${setup.topic}\nDifficulty: ${setup.difficulty}\n\nQuestion: ${question.text}\n\nCandidate transcript: ${transcript}\n\nVoice metrics: ${JSON.stringify(
          voiceMetrics
        )}\nFacial metrics: ${JSON.stringify(
          facialMetrics
        )}\n\nOutput schema:\n{"contentScore":0-100,"communicationScore":0-100,"strengths":["..."],"weaknesses":["..."],"feedback":"...","qualityBand":"good|average|poor","encouragement":"short line"}`,
      },
    ],
    fallback
  );

  const normalizedBand =
    result.qualityBand === 'good' || result.qualityBand === 'average' || result.qualityBand === 'poor'
      ? result.qualityBand
      : getPerformanceBand({
          contentScore: result.contentScore ?? fallback.contentScore,
          communicationScore: result.communicationScore ?? fallback.communicationScore,
        });

  return {
    contentScore: clamp(result.contentScore ?? fallback.contentScore),
    communicationScore: clamp(result.communicationScore ?? fallback.communicationScore),
    strengths: Array.isArray(result.strengths) ? result.strengths.slice(0, 5) : fallback.strengths,
    weaknesses: Array.isArray(result.weaknesses) ? result.weaknesses.slice(0, 5) : fallback.weaknesses,
    feedback: String(result.feedback || fallback.feedback),
    qualityBand: normalizedBand,
    encouragement: String(result.encouragement || fallback.encouragement),
  };
};

export const generateFinalSummary = async ({ setup, overallScores, strengths, weaknesses }) => {
  const fallback = {
    finalFeedback:
      'You showed consistent effort across the interview. Focus on concise storytelling, evidence-driven answers, and stronger verbal confidence.',
    recommendations: [
      'Use STAR method for behavioral questions',
      'Add measurable outcomes in each answer',
      'Practice with timed 90-second responses',
    ],
  };

  const result = await askOpenAIForJSON(
    [
      {
        role: 'system',
        content: 'Return strict JSON with finalFeedback and recommendations fields only.',
      },
      {
        role: 'user',
        content: `Generate a final interview summary for this setup:\n${JSON.stringify(setup)}\nScores:\n${JSON.stringify(
          overallScores
        )}\nStrengths: ${strengths.join(', ')}\nWeaknesses: ${weaknesses.join(', ')}\n\nSchema:\n{\"finalFeedback\":\"...\",\"recommendations\":[\"...\"]}`,
      },
    ],
    fallback
  );

  return {
    finalFeedback: String(result.finalFeedback || fallback.finalFeedback),
    recommendations: Array.isArray(result.recommendations)
      ? result.recommendations.slice(0, 6)
      : fallback.recommendations,
  };
};

// ─── AI Career Recommendation ─────────────────────────────────────────────────
export const generateCareerRecommendation = async ({ setup, overallScores, strengths, weaknesses, responses, proctoringViolations }) => {
  const violationCount = Array.isArray(proctoringViolations) ? proctoringViolations.length : 0;

  const fallback = {
    careerPaths: [
      {
        title: 'Backend Developer',
        matchScore: 72,
        icon: '🖥️',
        description: 'Strong fit based on your problem-solving answers and technical depth.',
        requiredSkills: ['Node.js', 'Databases', 'REST APIs', 'Docker'],
      },
      {
        title: 'Data Analyst',
        matchScore: 60,
        icon: '📊',
        description: 'Your analytical reasoning shows potential in data-focused roles.',
        requiredSkills: ['Python', 'SQL', 'Power BI', 'Statistics'],
      },
      {
        title: 'AI/ML Engineer',
        matchScore: 55,
        icon: '🤖',
        description: 'AI and ML is a growing field that rewards curiosity and math skills.',
        requiredSkills: ['Python', 'TensorFlow', 'Math', 'Data Wrangling'],
      },
      {
        title: 'Cloud Engineer',
        matchScore: 50,
        icon: '☁️',
        description: 'Cloud skills are highly transferable and in demand.',
        requiredSkills: ['AWS/GCP/Azure', 'Kubernetes', 'CI/CD', 'Networking'],
      },
    ],
    weakSkills: ['System Design', 'Communication', 'Data Structures'],
    learningRoadmap: [
      { phase: 'Month 1–2', title: 'Foundation Strengthening', tasks: ['Review core CS fundamentals', 'Practice 30 LeetCode problems', 'Complete one beginner project'] },
      { phase: 'Month 3–4', title: 'Skill Building', tasks: ['Learn a new framework/tool', 'Build a portfolio project', 'Contribute to open source'] },
      { phase: 'Month 5–6', title: 'Interview Readiness', tasks: ['Mock interviews 3×/week', 'System design practice', 'Refine resume and LinkedIn'] },
    ],
    certifications: [
      { name: 'AWS Certified Developer', provider: 'Amazon Web Services', level: 'Associate', priority: 'High', url: 'https://aws.amazon.com/certification/' },
      { name: 'Google Associate Cloud Engineer', provider: 'Google Cloud', level: 'Associate', priority: 'High', url: 'https://cloud.google.com/certification' },
      { name: 'Meta Backend Developer Certificate', provider: 'Coursera / Meta', level: 'Beginner', priority: 'Medium', url: 'https://www.coursera.org/professional-certificates/meta-back-end-developer' },
      { name: 'TensorFlow Developer Certificate', provider: 'Google', level: 'Intermediate', priority: 'Low', url: 'https://www.tensorflow.org/certificate' },
    ],
    projects: [
      { title: 'REST API with Authentication', description: 'Build a full CRUD REST API with JWT auth and rate limiting.', skills: ['Node.js', 'MongoDB', 'JWT'], difficulty: 'Beginner' },
      { title: 'Real-time Dashboard', description: 'Visualize live data using WebSockets and a charting library.', skills: ['React', 'WebSockets', 'Chart.js'], difficulty: 'Intermediate' },
      { title: 'ML Salary Predictor', description: 'Train a regression model on a jobs dataset and deploy it.', skills: ['Python', 'Scikit-learn', 'Flask'], difficulty: 'Intermediate' },
      { title: 'Serverless ETL Pipeline', description: 'Build an AWS Lambda pipeline to transform and load S3 data.', skills: ['AWS Lambda', 'Python', 'S3'], difficulty: 'Advanced' },
    ],
    interviewPrepPlan: {
      weeklyGoal: '3 mock interviews per week',
      dailyPractice: '2 LeetCode problems + 30 min concept review',
      focusAreas: ['System Design', 'Behavioral (STAR method)', 'Data Structures & Algorithms'],
      resources: [
        { name: 'LeetCode', url: 'https://leetcode.com', type: 'Practice' },
        { name: 'System Design Primer', url: 'https://github.com/donnemartin/system-design-primer', type: 'Reading' },
        { name: 'Pramp', url: 'https://www.pramp.com', type: 'Mock Interview' },
        { name: 'Blind 75', url: 'https://www.teamblind.com/post/New-Year-Gift---Curated-List-of-Top-75-LeetCode-Questions-to-Save-Your-Time-OaM1orEU', type: 'Problem List' },
      ],
    },
    overallReadinessScore: 62,
    summary: 'You have a solid foundation but need to sharpen your system design and communication skills. Focus on backend or data roles where your analytical strengths can shine.',
  };

  const result = await askOpenAIForJSON(
    [
      {
        role: 'system',
        content: `You are an expert tech career coach generating a personalized AI career recommendation based on an interview performance report. Return ONLY strict JSON matching the schema provided. Be specific, actionable, and encouraging. ${violationCount > 0 ? `Note: ${violationCount} proctoring violation(s) were detected; factor integrity awareness into communication skills assessment.` : ''}`,
      },
      {
        role: 'user',
        content: `Generate a personalized career recommendation for this candidate.

Interview Setup: ${JSON.stringify(setup)}
Overall Scores: ${JSON.stringify(overallScores)}
Strengths: ${strengths.join(', ')}
Weaknesses: ${weaknesses.join(', ')}
Response Count: ${Array.isArray(responses) ? responses.length : 0}

Return strict JSON with this exact schema:
{
  "careerPaths": [
    { "title": "...", "matchScore": 0-100, "icon": "emoji", "description": "...", "requiredSkills": ["..."] }
  ],
  "weakSkills": ["skill1", "skill2"],
  "learningRoadmap": [
    { "phase": "Month 1-2", "title": "...", "tasks": ["task1", "task2"] }
  ],
  "certifications": [
    { "name": "...", "provider": "...", "level": "Beginner|Associate|Intermediate|Advanced", "priority": "High|Medium|Low", "url": "https://..." }
  ],
  "projects": [
    { "title": "...", "description": "...", "skills": ["..."], "difficulty": "Beginner|Intermediate|Advanced" }
  ],
  "interviewPrepPlan": {
    "weeklyGoal": "...",
    "dailyPractice": "...",
    "focusAreas": ["..."],
    "resources": [{ "name": "...", "url": "https://...", "type": "Practice|Reading|Mock Interview|Problem List" }]
  },
  "overallReadinessScore": 0-100,
  "summary": "2-3 sentence personalised summary"
}`,
      },
    ],
    fallback
  );

  // Ensure arrays exist and are safe
  return {
    careerPaths: Array.isArray(result.careerPaths) ? result.careerPaths.slice(0, 6) : fallback.careerPaths,
    weakSkills: Array.isArray(result.weakSkills) ? result.weakSkills.slice(0, 8) : fallback.weakSkills,
    learningRoadmap: Array.isArray(result.learningRoadmap) ? result.learningRoadmap.slice(0, 6) : fallback.learningRoadmap,
    certifications: Array.isArray(result.certifications) ? result.certifications.slice(0, 6) : fallback.certifications,
    projects: Array.isArray(result.projects) ? result.projects.slice(0, 5) : fallback.projects,
    interviewPrepPlan: result.interviewPrepPlan || fallback.interviewPrepPlan,
    overallReadinessScore: typeof result.overallReadinessScore === 'number' ? Math.max(0, Math.min(100, result.overallReadinessScore)) : fallback.overallReadinessScore,
    summary: String(result.summary || fallback.summary),
  };
};

