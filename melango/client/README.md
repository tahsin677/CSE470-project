# Melango frontend

React + Vite frontend for the Melango LMS. It uses the API documented in `../API_CONTRACT.md`.

## Run locally

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`. The API is expected at `http://localhost:5000/api`; change `VITE_API_URL` in `.env` only if the backend uses a different URL.

## Seed logins

- `admin@melango.com` / `Admin123!`
- `teacher@melango.com` / `Teacher123!`
- `student@melango.com` / `Student123!`

The frontend includes the marketing pages, course catalog/detail, authentication, and role-aware student, teacher, and admin workspaces. Empty/loading/error-safe panels are shown when data is unavailable.
