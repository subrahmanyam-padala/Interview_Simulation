# Testing Guide

## 1) Manual Test Plan

### A. Authentication

1. Register with valid details.
2. Login with same account.
3. Refresh page and verify session persistence.
4. Logout and verify protected routes redirect to login.

### B. Interview Setup

1. Create setup with valid role/topic/difficulty.
2. Verify interview session is created.
3. Verify first question appears.

### C. Live Interview

1. Allow camera and microphone permissions.
2. Start speech capture and verify transcript updates.
3. Submit answer with transcript > 10 chars.
4. Verify response evaluation appears.
5. Repeat until completion.

### D. Report

1. Verify overall scores are shown.
2. Verify bar and line charts render.
3. Verify strengths/weaknesses/recommendations shown.

### E. History

1. Verify completed sessions appear in history.
2. Verify in-progress session can be resumed.

### F. Admin

1. Register admin with invite code.
2. Access `/admin` route.
3. Verify platform analytics load.

## 2) API Testing with Postman

- Add `Authorization: Bearer <token>` for protected routes.
- Test success and failure cases:
  - Invalid token
  - Missing fields
  - Duplicate email
  - Completing interview without answers

## 3) Edge Cases

- OpenAI key missing -> fallback scoring should still work.
- Face model files missing -> app should continue with fallback face metrics.
- Speech API unavailable -> user can still type answer manually.

## 4) Common Runtime Issues

### Issue: `MONGODB_URI is required`

Fix: set `server/.env` correctly and restart backend.

### Issue: CORS blocked

Fix: set `CLIENT_URL` in backend env to frontend domain.

### Issue: `Invalid or expired token`

Fix: clear localStorage token and login again.

### Issue: face analysis not loading

Fix: ensure model files exist in `client/public/models`.

## 5) What To Show in Final Demo

1. User registration/login
2. Setup -> live interview -> report flow
3. AI feedback generation
4. Charts and history persistence
5. Admin analytics (optional but strong)
