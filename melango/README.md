# Melango

All-in-one learning web application (CSE470) built with the MERN stack.

## Structure

```
melango/
  client/     # React + Vite + Bootstrap (frontend)
  server/     # Express + MongoDB MVC API (backend)
  API_CONTRACT.md
```

## Prerequisites

- Node.js 18+
- MongoDB running locally (or Atlas URI in `server/.env`)

## Quick start

### Backend
```bash
cd server
cp .env.example .env
npm install
npm run seed
npm run dev
```
API: `http://localhost:5000/api`

### Frontend
```bash
cd client
cp .env.example .env
npm install
npm run dev
```
App: `http://localhost:5173`

## Seed accounts

| Role    | Email                 | Password    |
|---------|-----------------------|-------------|
| Admin   | admin@melango.com     | Admin123!   |
| Teacher | teacher@melango.com   | Teacher123! |
| Student | student@melango.com   | Student123! |

## Roles

- **Students** — enroll, learn, quizzes, assignments, progress, certificates
- **Teachers** — courses, materials, assignments, quizzes, attendance, feedback
- **Admins** — users, courses, announcements, reports
