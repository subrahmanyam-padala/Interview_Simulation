# Database Schema Design (MongoDB)

## Collections

- `users`
- `interviews`

## 1) User Schema (`server/src/models/User.js`)

```js
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: 'user' | 'admin',
  createdAt: Date,
  updatedAt: Date
}
```

### Notes

- Password is hashed in `pre('save')` hook.
- `email` is unique and lowercased.

## 2) Interview Schema (`server/src/models/Interview.js`)

### Main Document

```js
{
  user: ObjectId(User),
  setup: {
    jobRole: String,
    topic: String,
    difficulty: 'easy' | 'medium' | 'hard',
    questionCount: Number
  },
  status: 'in_progress' | 'completed',
  questions: [QuestionSchema],
  responses: [ResponseSchema],
  overallScores: {
    content: Number,
    communication: Number,
    confidence: Number,
    clarity: Number,
    fluency: Number
  },
  strengths: [String],
  weaknesses: [String],
  finalFeedback: String,
  recommendations: [String],
  startedAt: Date,
  endedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Question Schema

```js
{
  questionId: String,
  text: String,
  tags: [String],
  difficulty: String
}
```

### Response Schema

```js
{
  questionId: String,
  questionText: String,
  transcript: String,
  durationSec: Number,
  facialMetrics: {
    eyeContactScore: Number,
    confidenceScore: Number,
    expressionStability: Number,
    averageSmileIntensity: Number
  },
  voiceMetrics: {
    wpm: Number,
    fillerWordCount: Number,
    pauseCount: Number,
    clarityScore: Number,
    fluencyScore: Number,
    volumeStability: Number
  },
  aiEvaluation: {
    contentScore: Number,
    communicationScore: Number,
    strengths: [String],
    weaknesses: [String],
    feedback: String
  },
  responseScores: {
    content: Number,
    communication: Number,
    confidence: Number,
    clarity: Number,
    fluency: Number
  }
}
```

## Indexing Strategy

- `interviews.user`
- `interviews.status`
- `users.email (unique)`

This supports:

- Fast user history retrieval
- Admin status filtering
- Fast login lookup

## Why This Schema Works

- Nested response design keeps all interview data in one document.
- Easy report generation without joining multiple collections.
- Flexible enough to store extra metrics in future versions.
