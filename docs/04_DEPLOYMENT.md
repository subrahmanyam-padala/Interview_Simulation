# Deployment Guide

## Recommended Production Setup

- Frontend: Vercel (React Vite static build)
- Backend: Render or Railway (Node.js service)
- Database: MongoDB Atlas

## 1) MongoDB Atlas Setup

1. Create Atlas cluster.
2. Create database user.
3. Allow network access (specific IP or temporary `0.0.0.0/0` during testing).
4. Copy connection string to backend env:

`MONGODB_URI=mongodb+srv://...`

## 2) Backend Deployment (Render / Railway)

### Build and Start Commands

- Build command: `npm install --prefix server`
- Start command: `npm run start --prefix server`

### Environment Variables

Set these in backend platform dashboard:

- `NODE_ENV=production`
- `PORT=5000` (or platform port)
- `MONGODB_URI=...`
- `JWT_SECRET=...`
- `JWT_EXPIRES_IN=7d`
- `OPENAI_API_KEY=...`
- `OPENAI_MODEL=gpt-4o-mini`
- `CLIENT_URL=https://your-frontend-domain`
- `ADMIN_INVITE_CODE=optional`

## 3) Frontend Deployment (Vercel / Netlify)

### Build Settings

- Framework: Vite
- Build command: `npm run build --prefix client`
- Publish directory: `client/dist`

### Environment Variable

- `VITE_API_BASE_URL=https://your-backend-domain/api`

## 4) CORS and URL Checklist

- Backend `CLIENT_URL` must include deployed frontend URL.
- Frontend `VITE_API_BASE_URL` must point to deployed backend API root.

## 5) Post-Deployment Validation

1. Register a new user.
2. Start an interview.
3. Submit one answer.
4. Complete interview and verify report generation.
5. Test admin account route `/admin`.

## 6) Production Hardening Suggestions

- Rotate JWT secret periodically.
- Restrict MongoDB network access to backend egress IP.
- Add request rate-limiting middleware.
- Enable centralized logging and uptime monitoring.
