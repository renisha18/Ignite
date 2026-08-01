# CLAUDE.md

# Ignite

Volunteer lifecycle platform for Rotaract clubs.

**Tagline:**
*The event is temporary. The volunteer relationship isn't.*

---

## Read these first

Before implementing any feature:

1. `PROJECT_SPEC.md`
2. `README.md`
3. `docs/api-contract.md` (only the section relevant to your track)

---

# Current Project Status

## Completed

* JWT Authentication
* Register (Volunteer & Organizer)
* Login
* Protected Routes
* Role-based Authorization
* `/auth/me`
* Locked MySQL Schema

## Remaining

* Event Management
* Applications
* Smart Team Builder
* Attendance
* Certificates
* Analytics

---

# Team Ownership

## Organizer Track

Owns:

* Event CRUD
* Organizer Dashboard
* Application Review
* Smart Team Builder
* Organizer Attendance
* Certificate Generation

## Volunteer Track

Owns:

* Volunteer Dashboard
* Browse Events
* Event Details
* Apply / Withdraw
* My Applications
* Assigned Team
* Volunteer Attendance
* Certificate Download

Do not modify another track's files unless explicitly requested.

---

# Never Modify

Unless explicitly instructed:

* backend/schema.sql
* backend/routes/authRoutes.js
* backend/controllers/authController.js
* frontend/src/context/AuthContext.jsx
* Authentication APIs
* Database schema

---

# Architecture

* MVC
* Express + MySQL (mysql2/promise)
* React + Vite + Tailwind
* JWT Authentication
* REST APIs

Backend Flow:

Routes → Controllers → Models → MySQL

Frontend Flow:

Pages → Components → Services → API

---

# Development Rules

Before generating code:

* Explain the implementation.
* List files to create/modify.
* Mention dependencies.
* Mention database changes (if any).
* Wait for approval before coding.

While coding:

* Keep controllers thin.
* Reuse existing patterns.
* Use async/await.
* Add validation.
* Add proper error handling.
* Avoid duplicate logic.
* Never modify unrelated files.

After implementation:

* Review the solution.
* Mention edge cases.
* Mention possible bugs.
* Suggest improvements.
* Tell me what to test manually.

---

# Shared Model Rule

Shared files:

* eventModel.js
* applicationModel.js
* attendanceModel.js
* certificateModel.js

You may append new functions.

Do not modify existing function signatures or queries without confirmation because another feature may depend on them.

---

# Frontend Rules

* Never call axios directly inside components.
* Use services/.
* Reuse components whenever possible.
* Use Tailwind only.
* Keep UI minimal and demo-friendly.

---

# Backend Rules

* Use asyncHandler.
* Throw AppError for expected errors.
* Protect routes using authenticate + authorize.
* Follow existing Auth module patterns.

---

# Definition of Done

A feature is complete only if:

* Backend API implemented
* Frontend integrated
* Validation added
* Error handling added
* Manual testing completed
* No unrelated files modified

---

# Working Style

* One feature per session.
* One feature per Git commit.
* Keep commits small.
* Prefer hackathon simplicity over unnecessary complexity.
* Ask before introducing new dependencies.
