# Ignite

**The event is temporary. The volunteer relationship isn't.**

A volunteer lifecycle platform for Rotaract clubs — built for a 24-hour hackathon.

## Stack

- Backend: Node.js, Express, MySQL (mysql2), JWT auth
- Frontend: React + Vite, Tailwind CSS v4
- Dev tools: Claude Code, GitHub, VS Code

## Status

Auth module is done and tested: registration (volunteer + organizer),
login, `/me`, JWT verification, and role-based access control all work
end to end against the locked schema. Events, Smart Team Builder,
attendance, and certificates are not built yet.

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

### Database

```bash
mysql -u root -p < backend/schema.sql   # creates the `ignite` database + all tables
```

### Backend

```bash
cd backend
npm install
cp .env.example .env    # fill in your MySQL credentials + a real JWT_SECRET
npm run dev              # http://localhost:4000 — check GET /health

# create an admin (no public register route for admin — see routes/authRoutes.js)
node seed-admin.js "Admin Name" admin@ignite.dev somePassword123
```

### Frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

## Auth API

| Method | Route | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/auth/register/volunteer` | — | `email, password, fullName` | Creates `users` + `volunteer_profiles` |
| POST | `/auth/register/organizer` | — | `email, password, fullName, orgName, orgDescription?, orgLocation?` | Transaction across `users` + `organizations` (status starts `pending`) + `organizer_profiles` |
| POST | `/auth/login` | — | `email, password` | Returns `{ token, user, organization? }` |
| GET | `/auth/me` | Bearer token | — | Returns the current user (+ org info if organizer) |

No `/auth/register/admin` route on purpose — admins are created via
`node seed-admin.js` (direct DB access), never self-registered.

Protect any future route with:
```js
router.post("/events", authenticate, authorize("organizer", "admin"), asyncHandler(createEvent));
```
`authenticate` verifies the JWT and sets `req.user = { userId, role, orgId? }`.
`authorize(...roles)` 403s anyone whose role isn't in the list.

## Project structure

```
backend/
  config/        # DB connection pool
  middleware/    # authenticate, authorize, asyncHandler, errorHandler
  controllers/   # authController.js (register/login/me) — more per module later
  routes/        # authRoutes.js — more per module later
  models/        # userModel, volunteerModel, organizationModel, organizerModel
  utils/         # token.js (JWT sign/verify), AppError.js
  schema.sql     # locked DB schema
  seed-admin.js  # one-off script to create an admin account
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
