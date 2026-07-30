import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';

const genAI = env.GEMINI_API_KEY ? new GoogleGenerativeAI(env.GEMINI_API_KEY) : null;
const modelToUse = env.GEMINI_MODEL || 'gemini-3.5-flash';

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

const normalizeQuestionText = (value = '') => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const isRepeatedQuestion = (questionText, askedQuestions = [], latestQuestionText = '') => {
  const normalizedQuestion = normalizeQuestionText(questionText);
  if (!normalizedQuestion) {
    return true;
  }

  const previousQuestions = [...(askedQuestions || []), latestQuestionText]
    .map((item) => normalizeQuestionText(item))
    .filter(Boolean);

  return previousQuestions.includes(normalizedQuestion);
};
const askGeminiForJSON = async (systemInstruction, userContent, fallback) => {
  if (!genAI) {
    return fallback;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: modelToUse,
      systemInstruction,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.4,
      }
    });

    const result = await model.generateContent(userContent);
    const content = result.response.text();
    if (!content) {
      return fallback;
    }

    const parsed = parseJSON(content);
    return parsed || fallback;
  } catch (error) {
    console.error('Gemini request failed:', error.message);
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

  const systemInstruction = 'You are an AI Resume Analyzer. Extract details from the resume text provided. Return strict JSON with the following keys: "skills" (array of strings), "projects" (array of objects with "name", "description", "technologies" array), "experience" (array of objects with "company", "role", "duration", "description"), and "education" (array of objects with "institution", "degree", "year"). If any information is missing, return an empty array for that key.';
  const userContent = text;

  const result = await askGeminiForJSON(systemInstruction, userContent, fallback);
  
  if (result.skills.length === 0 && result.experience.length === 0) {
    // Regex fallback if Gemini fails due to quota or invalid key
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
  const starterCode = {
    java: "class Solution {\n    public int solve(int[] nums) {\n        // Write your code here\n        return 0;\n    }\n}",
    python: "def solve(nums):\n    # Write your code here\n    pass",
    javascript: "function solve(nums) {\n    // Write your code here\n    return 0;\n}",
    cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int solve(vector<int>& nums) {\n        // Write your code here\n        return 0;\n    }\n};",
  };

  const templates = [
    {
      title: 'Two Sum',
      description: 'Given an array of integers and a target, return the indices of the two numbers that add up to the target. Solve it in better than O(n^2) time.',
      tags: ['arrays', 'hash-map', 'easy'],
      examples: [{ input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'nums[0] + nums[1] = 9.' }],
      constraints: ['2 <= nums.length <= 10^5', '-10^9 <= nums[i] <= 10^9', '-10^9 <= target <= 10^9'],
      testCases: [
        { input: 'nums = [2,7,11,15], target = 9', expectedOutput: '[0,1]' },
        { input: 'nums = [3,2,4], target = 6', expectedOutput: '[1,2]' },
        { input: 'nums = [3,3], target = 6', expectedOutput: '[0,1]' },
      ],
    },
    {
      title: 'Longest Substring Without Repeating Characters',
      description: 'Return the length of the longest substring without repeating characters. Use a sliding window to keep the solution efficient.',
      tags: ['strings', 'sliding-window', 'medium'],
      examples: [{ input: 's = "abcabcbb"', output: '3', explanation: 'The answer is "abc".' }],
      constraints: ['0 <= s.length <= 5 * 10^4', 's consists of English letters, digits, symbols, and spaces.'],
      testCases: [
        { input: 's = "abcabcbb"', expectedOutput: '3' },
        { input: 's = "bbbbb"', expectedOutput: '1' },
        { input: 's = "pwwkew"', expectedOutput: '3' },
      ],
    },
    {
      title: 'Valid Parentheses',
      description: 'Given a string containing only brackets, determine whether the input is valid. A stack-based solution should work well here.',
      tags: ['stack', 'strings', 'easy'],
      examples: [{ input: 's = "()[]{}"', output: 'true', explanation: 'Every opening bracket has a matching closing bracket.' }],
      constraints: ['1 <= s.length <= 10^4', 's consists of parentheses only: ()[]{}.'],
      testCases: [
        { input: 's = "()[]{}"', expectedOutput: 'true' },
        { input: 's = "(]"', expectedOutput: 'false' },
        { input: 's = "([)]"', expectedOutput: 'false' },
      ],
    },
    {
      title: 'Merge Intervals',
      description: 'Merge all overlapping intervals and return the condensed list. Sort first, then combine overlaps as you scan.',
      tags: ['intervals', 'sorting', 'medium'],
      examples: [{ input: 'intervals = [[1,3],[2,6],[8,10],[15,18]]', output: '[[1,6],[8,10],[15,18]]', explanation: 'Intervals [1,3] and [2,6] overlap.' }],
      constraints: ['1 <= intervals.length <= 10^4', 'intervals[i].length == 2', '0 <= start <= end <= 10^4'],
      testCases: [
        { input: 'intervals = [[1,3],[2,6],[8,10],[15,18]]', expectedOutput: '[[1,6],[8,10],[15,18]]' },
        { input: 'intervals = [[1,4],[4,5]]', expectedOutput: '[[1,5]]' },
        { input: 'intervals = [[1,4],[0,2],[3,5]]', expectedOutput: '[[0,5]]' },
      ],
    },
    {
      title: 'Binary Tree Level Order Traversal',
      description: 'Return the values of a binary tree level by level from left to right. A queue-based breadth-first search is the standard approach.',
      tags: ['trees', 'bfs', 'medium'],
      examples: [{ input: 'root = [3,9,20,null,null,15,7]', output: '[[3],[9,20],[15,7]]', explanation: 'Traverse the tree one level at a time.' }],
      constraints: ['The number of nodes is in the range [0, 2000].', '-1000 <= Node.val <= 1000'],
      testCases: [
        { input: 'root = [3,9,20,null,null,15,7]', expectedOutput: '[[3],[9,20],[15,7]]' },
        { input: 'root = [1]', expectedOutput: '[[1]]' },
        { input: 'root = []', expectedOutput: '[]' },
      ],
    },
    {
      title: 'Number of Islands',
      description: 'Count how many disconnected islands exist in a grid of 1s and 0s. This is a classic DFS or BFS grid traversal problem.',
      tags: ['graphs', 'dfs', 'bfs', 'medium'],
      examples: [{ input: 'grid = [["1","1","0"],["0","1","0"],["0","0","1"]]', output: '2', explanation: 'There are two separate islands.' }],
      constraints: ['m == grid.length', 'n == grid[i].length', '1 <= m, n <= 300'],
      testCases: [
        { input: 'grid = [["1","1","0"],["0","1","0"],["0","0","1"]]', expectedOutput: '2' },
        { input: 'grid = [["1","1"],["1","1"]]', expectedOutput: '1' },
        { input: 'grid = [["0","0"],["0","0"]]', expectedOutput: '0' },
      ],
    },
    {
      title: 'Coin Change',
      description: 'Given coin denominations and a target amount, return the minimum number of coins needed to make up the amount. This is a strong dynamic programming question.',
      tags: ['dp', 'medium'],
      examples: [{ input: 'coins = [1,2,5], amount = 11', output: '3', explanation: '11 = 5 + 5 + 1.' }],
      constraints: ['1 <= coins.length <= 12', '1 <= coins[i] <= 2^31 - 1', '0 <= amount <= 10^4'],
      testCases: [
        { input: 'coins = [1,2,5], amount = 11', expectedOutput: '3' },
        { input: 'coins = [2], amount = 3', expectedOutput: '-1' },
        { input: 'coins = [1], amount = 0', expectedOutput: '0' },
      ],
    },
    {
      title: 'Top K Frequent Elements',
      description: 'Return the k most frequent elements in the array. Use hashing plus a heap or bucket sort for an efficient solution.',
      tags: ['hash-map', 'heap', 'medium'],
      examples: [{ input: 'nums = [1,1,1,2,2,3], k = 2', output: '[1,2]', explanation: '1 appears 3 times and 2 appears 2 times.' }],
      constraints: ['1 <= nums.length <= 10^5', 'k is in the range [1, the number of unique elements]'],
      testCases: [
        { input: 'nums = [1,1,1,2,2,3], k = 2', expectedOutput: '[1,2]' },
        { input: 'nums = [1], k = 1', expectedOutput: '[1]' },
        { input: 'nums = [4,1,-1,2,-1,2,3], k = 2', expectedOutput: '[-1,2]' },
      ],
    },
    {
      title: 'House Robber',
      description: 'Given an array of house values, find the maximum amount you can rob without alerting the police. This is a classic dynamic programming problem.',
      tags: ['dp', 'arrays', 'easy'],
      examples: [{ input: 'nums = [1,2,3,1]', output: '4', explanation: 'Rob houses 1 and 3.' }],
      constraints: ['1 <= nums.length <= 100', '0 <= nums[i] <= 400'],
      testCases: [
        { input: 'nums = [1,2,3,1]', expectedOutput: '4' },
        { input: 'nums = [2,7,9,3,1]', expectedOutput: '12' },
        { input: 'nums = [2,1,1,2]', expectedOutput: '4' },
      ],
    },
    {
      title: 'Course Schedule',
      description: 'Determine if you can finish all courses given prerequisite pairs. Model the problem as a cycle detection or topological sort challenge.',
      tags: ['graphs', 'topological-sort', 'medium'],
      examples: [{ input: 'numCourses = 2, prerequisites = [[1,0]]', output: 'true', explanation: 'Take course 0 first, then course 1.' }],
      constraints: ['1 <= numCourses <= 2000', '0 <= prerequisites.length <= 5000'],
      testCases: [
        { input: 'numCourses = 2, prerequisites = [[1,0]]', expectedOutput: 'true' },
        { input: 'numCourses = 2, prerequisites = [[1,0],[0,1]]', expectedOutput: 'false' },
        { input: 'numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]', expectedOutput: 'true' },
      ],
    },
  ];

  const difficultyOrder = {
    easy: [0, 2, 7, 3, 4, 5, 1, 6, 8, 9],
    medium: [1, 3, 4, 5, 6, 9, 8, 0, 2, 7],
    hard: [6, 9, 8, 4, 5, 3, 1, 7, 0, 2],
  };

  const orderedTemplates = (difficultyOrder[difficulty] || difficultyOrder.medium)
    .map((templateIndex) => templates[templateIndex])
    .filter(Boolean);

  const selectedTemplates = orderedTemplates.slice(0, Math.max(1, questionCount));

  return selectedTemplates.map((template, index) => ({
    questionId: `c-${index + 1}`,
    title: template.title,
    text: template.title,
    description: template.description,
    difficulty,
    tags: Array.from(new Set(['coding', ...template.tags])),
    examples: template.examples,
    constraints: template.constraints,
    starterCode,
    testCases: template.testCases,
    meta: {
      jobRole,
      topic,
    },
  }));
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

  const systemInstruction = 'You are an expert technical interviewer evaluating a coding solution. Analyze the code based on the problem description. Return strict JSON with keys: "correctnessScore" (0-100), "complexityScore" (0-100), "qualityScore" (0-100), "suggestions" (array of strings), and "feedback" (overall assessment string).';
  const userContent = `Problem Title: ${question.text}\nProblem Description: ${question.description}\nConstraints: ${question.constraints}\n\nCandidate Code (${language}):\n\`\`\`${language}\n${code}\n\`\`\`\n\nEvaluate the correctness, time/space complexity, and code quality (readability, modularity). Output strict JSON.`;

  const result = await askGeminiForJSON(systemInstruction, userContent, fallback);
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

  let systemInstruction = resumeData 
    ? 'You create realistic interview questions and ask one clear question at a time. Use the provided candidate resume data to ask personalized and relevant questions about their skills, projects, or experience. Return strict JSON with key questions as an array of question objects only.'
    : 'You create realistic interview questions and ask one clear question at a time. Return strict JSON with key questions as an array of question objects only.';

  if (interviewType === 'coding') {
    systemInstruction = 'You are a strict technical interviewer. Generate LeetCode-style algorithm or data structure coding challenges. Provide the problem description, constraints, and 2-3 example test cases. Do NOT ask theoretical questions, ONLY ask them to write code for a specific problem. Return strict JSON with key questions as an array of question objects only.';
  } else if (targetCompany) {
    systemInstruction += ` Base your questions and interview style heavily on ${targetCompany}'s actual interview practices (e.g. Amazon Leadership Principles, Google's open-ended problem solving, etc).`;
  }

  let userContent = `Generate ${questionCount} interview questions for:\nInterview Type: ${interviewType || 'technical'}\nRole: ${jobRole}\nTopic: ${topic}\nDifficulty: ${difficulty}\n`;
  if (targetCompany) {
    userContent += `Target Company: ${targetCompany}\n`;
  }
  if (resumeData) {
    userContent += `Resume Data: ${JSON.stringify(resumeData)}\n`;
  }
  userContent += `Output schema:\n{"questions":[{"questionId":"q-1","text":"...","tags":["..."],"difficulty":"${difficulty}"}]}`;

  const result = await askGeminiForJSON(systemInstruction, userContent, fallback);

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
  const isCoding = setup.interviewType === 'coding';

  if (performanceBand === 'good') {
    return {
      text: isCoding
        ? `Great job on that solution. Now, can you optimize it further to improve the space complexity, or solve a slightly harder variant where the input size is much larger?`
        : `Good answer. Now go deeper: for a ${setup.jobRole} role, explain an advanced approach for ${setup.topic}, including one major trade-off and how you would measure success.`,
      difficulty: adaptiveDifficulty,
      encouragement: 'Good answer. Let us go one level deeper.',
    };
  }

  if (performanceBand === 'poor' || latestResponse?.skipped) {
    return {
      text: isCoding
        ? `Let's break this down. Can you start by writing a brute-force approach first? Don't worry about optimization right now.`
        : `Thanks. Let us simplify this. For ${setup.topic}, explain the core concept in plain steps and share one basic example from your projects or studies.`,
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

  const systemInstruction = 'You are a professional human interviewer. Ask exactly one interview question at a time, no answers, no long explanations. Keep tone polite and clear.';
  const userContent = `Generate the next question based on interview context and performance.\n\nRules:\n1) If previous answer quality is good, ask a deeper/advanced question.\n2) If quality is average, ask a follow-up question.\n3) If quality is poor or skipped, ask a simpler guiding question.\n4) Avoid repeating previous questions.\n5) Keep question concise.\n\nContext:\nInterview Type: ${setup.interviewType}\nRole: ${setup.jobRole}\nTopic: ${setup.topic}\nBase Difficulty: ${setup.difficulty}\nTarget Difficulty For Next Question: ${adaptiveDifficulty}\nPerformance Band: ${performanceBand}\nAsked Questions: ${JSON.stringify(askedQuestions || [])}\nPrevious Question: ${latestResponse?.questionText || ''}\nPrevious Transcript: ${latestResponse?.transcript || ''}\n\nReturn strict JSON schema:\n{"text":"...","difficulty":"easy|medium|hard","encouragement":"optional short line"}`;

  const result = await askGeminiForJSON(systemInstruction, userContent, fallback);
  const generatedText = String(result.text || '').trim();
  const nextQuestionText = isRepeatedQuestion(generatedText, askedQuestions, latestResponse?.questionText)
    ? fallback.text
    : generatedText || fallback.text;

  return {
    questionId: nextQuestionId,
    text: nextQuestionText,
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

  const systemInstruction = 'You are an interview evaluator. Return strict JSON with keys contentScore, communicationScore, strengths, weaknesses, feedback, qualityBand, encouragement.';
  const userContent = `Interview setup:\nInterview Type: ${setup.interviewType}\nRole: ${setup.jobRole}\nTopic: ${setup.topic}\nDifficulty: ${setup.difficulty}\n\nQuestion: ${question.text}\n\nCandidate transcript: ${transcript}\n\nVoice metrics: ${JSON.stringify(
    voiceMetrics
  )}\nFacial metrics: ${JSON.stringify(
    facialMetrics
  )}\n\nOutput schema:\n{"contentScore":0-100,"communicationScore":0-100,"strengths":["..."],"weaknesses":["..."],"feedback":"...","qualityBand":"good|average|poor","encouragement":"short line"}`;

  const result = await askGeminiForJSON(systemInstruction, userContent, fallback);

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

  const systemInstruction = 'Return strict JSON with finalFeedback and recommendations fields only.';
  const userContent = `Generate a final interview summary for this setup:\n${JSON.stringify(setup)}\nScores:\n${JSON.stringify(
    overallScores
  )}\nStrengths: ${strengths.join(', ')}\nWeaknesses: ${weaknesses.join(', ')}\n\nSchema:\n{\"finalFeedback\":\"...\",\"recommendations\":[\"...\"]}`;

  const result = await askGeminiForJSON(systemInstruction, userContent, fallback);

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

  const systemInstruction = `You are an expert tech career coach generating a personalized AI career recommendation based on an interview performance report. Return ONLY strict JSON matching the schema provided. Be specific, actionable, and encouraging. ${violationCount > 0 ? `Note: ${violationCount} proctoring violation(s) were detected; factor integrity awareness into communication skills assessment.` : ''}`;
  const userContent = `Generate a personalized career recommendation for this candidate.

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
}`;

  const result = await askGeminiForJSON(systemInstruction, userContent, fallback);

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


