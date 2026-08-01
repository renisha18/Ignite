# Ignite

**The event is temporary. The volunteer relationship isn't.**

A volunteer lifecycle platform for Rotaract clubs — built for a 24-hour hackathon.

## Stack

- Backend: Node.js, Express, MySQL (mysql2), JWT auth
- Frontend: React + Vite, Tailwind CSS v4
- Dev tools: Claude Code, GitHub, VS Code

## Status

This is the base scaffold — server boots, health check responds, Tailwind
is wired to the Rotaract brand palette. No features (auth, events, Smart
Team Builder, attendance, certificates) are built yet.

## Brand colors

Defined once in `frontend/src/index.css` under `@theme`, available
everywhere as Tailwind utilities (`bg-maroon`, `text-gold`, etc.):

| Name | Hex |
|---|---|
| `maroon` | `#A6192E` |
| `maroon-dark` | `#7A1322` |
| `maroon-light` | `#C13A4E` |
| `gold` | `#C39E4E` |
| `gold-light` | `#DDC08A` |
| `gold-dark` | `#9E7E3B` |

## Getting started

### Backend

```bash
cd backend
npm install
cp .env.example .env    # fill in your MySQL credentials + a real JWT_SECRET
npm run dev              # http://localhost:4000 — check GET /health
```

### Frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

## Project structure

```
backend/
  config/       # DB connection pool
  middleware/    # auth, error handling, validation (empty — next step)
  controllers/   # route handlers (empty — next step)
  routes/        # route definitions (empty — next step)
  models/        # SQL queries per table (empty — next step)
  server.js

frontend/
  src/
    pages/       # route-level screens (empty — next step)
    components/  # shared UI pieces (empty — next step)
    context/     # React context, e.g. AuthContext (empty — next step)
    api/          # fetch wrappers per resource (empty — next step)
```

## Git workflow

- Never commit directly to `main`.
- One feature branch per module: `feature/volunteer`, `feature/organizer`,
  `feature/auth`, etc.
- Small commits, meaningful messages, after each completed piece of a
  feature — not one giant commit per module.

## Coding standards

- MVC architecture, REST APIs, async/await throughout.
- Reuse components and SQL query patterns — no duplicated logic.
- Proper error handling and input validation on every endpoint.
- Keep the Admin module minimal — this is an MVP.
