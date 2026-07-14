# API Routes Structure

Base URL: `/api`

## Auth Routes (`/api/auth`)

### `POST /register`

Request:

```json
{
  "name": "Student Name",
  "email": "student@example.com",
  "password": "secret123",
  "adminInviteCode": "optional"
}
```

Response:

```json
{
  "token": "jwt-token",
  "user": {
    "id": "...",
    "name": "Student Name",
    "email": "student@example.com",
    "role": "user"
  }
}
```

### `POST /login`

Request:

```json
{
  "email": "student@example.com",
  "password": "secret123"
}
```

Response: same structure as register.

### `GET /me`

Headers:

- `Authorization: Bearer <token>`

Response:

```json
{
  "user": {
    "id": "...",
    "name": "...",
    "email": "...",
    "role": "user"
  }
}
```

## Interview Routes (`/api/interviews`)

Requires JWT.

### `POST /setup`

Creates interview and dynamic questions.

```json
{
  "jobRole": "Software Engineer",
  "topic": "System Design",
  "difficulty": "medium",
  "questionCount": 5
}
```

### `GET /history/me`

Returns user interview list.

### `GET /:id`

Returns interview session payload.

### `POST /:id/answer`

Submit answer + voice + face metrics.

```json
{
  "questionId": "q-1",
  "transcript": "My answer text...",
  "durationSec": 85,
  "facialMetrics": {
    "eyeContactScore": 74,
    "confidenceScore": 70,
    "expressionStability": 67,
    "averageSmileIntensity": 24
  },
  "voiceMetrics": {
    "wpm": 131,
    "fillerWordCount": 3,
    "pauseCount": 7,
    "clarityScore": 78,
    "fluencyScore": 73,
    "volumeStability": 72
  }
}
```

### `POST /:id/complete`

Finalizes report and stores overall results.

### `GET /:id/report`

Returns completed report payload.

## Admin Routes (`/api/admin`)

Requires JWT + admin role.

### `GET /overview`

Returns:

- User/interview counts
- Completion rate
- Role distribution
- Average scores
- 7-day activity trend

## Error Handling Contract

Example:

```json
{
  "message": "Validation error",
  "issues": []
}
```

or

```json
{
  "message": "Invalid credentials"
}
```

HTTP codes used:

- `200` success
- `201` created
- `400` bad request
- `401` unauthorized
- `403` forbidden
- `404` not found
- `409` conflict
- `500` server error
