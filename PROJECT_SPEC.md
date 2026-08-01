# PROJECT_SPEC.md

# Ignite

**Tagline**

> The event is temporary. The volunteer relationship isn't.

Ignite is a volunteer lifecycle platform built specifically for Rotaract clubs.

The goal is to simplify volunteer management while encouraging long-term volunteer engagement through a single platform.

This project is being developed for a **24-hour hackathon**, so every engineering decision should prioritize:

* Working features
* Clean architecture
* Maintainability
* Demo readiness

---

# Tech Stack

## Frontend

* React
* Vite
* Tailwind CSS

## Backend

* Node.js
* Express.js

## Database

* MySQL

## Authentication

* JWT

## Development

* VS Code
* Git
* GitHub
* Claude Code

---

# Architecture

MVC

Backend

* config
* controllers
* middleware
* models
* routes
* utils

Frontend

* components
* pages
* services
* context
* layouts

---

# User Roles

* Volunteer
* Organizer
* Admin

(Admin remains minimal for MVP.)

---

# Volunteer Features

* Register/Login
* Browse Events
* Search & Filter Events
* View Event Details
* Apply for Events
* View Application Status
* View Assigned Team
* GPS Attendance
* View Certificates
* Download Certificates
* Volunteer Profile
* Volunteer History

---

# Organizer Features

* Login
* Organizer Dashboard
* Create Event
* Update Event
* Delete Event
* Review Applications
* Accept / Reject Volunteers
* Smart Team Builder
* Assign Volunteers
* Attendance Management
* Certificate Generation
* Basic Analytics

---

# USP

## Smart Team Builder

Volunteers may have multiple skills.

Organizers should see volunteers grouped under every skill they possess.

Example:

Photography

* John
* Kevin

Communication

* John
* David

Organizers drag volunteers into teams.

Assignments should immediately update the database.

This is the primary demo feature.

---

# Attendance

Attendance uses **QR Code verification**.

### Workflow

Organizer opens the event from the **Organizer Dashboard**.

↓

Organizer clicks **"Generate Attendance QR Code"**.

↓

A unique QR Code for that event is displayed on the organizer's screen (laptop, projector, TV, or mobile device) during the event.

↓

Volunteers open the Ignite application and navigate to **My Events** or **Attendance**.

↓

Volunteers tap **"Scan QR Code"** and scan the QR displayed by the organizer.

↓

The system verifies that the volunteer is accepted and assigned to the event.

↓

Attendance is recorded successfully.

Each volunteer can mark attendance only once per event.

Only eligible volunteers can successfully mark attendance.

**Future Enhancement:** GPS verification and time-limited QR codes can be added in a later version.

---

# Certificates

Attendance completed

↓

Organizer generates certificate

Certificate contains:

* Volunteer Name
* Event Name
* Organization
* Date
* Certificate ID

Volunteer downloads PDF.

---

# Volunteer Journey

Register

↓

Browse Events

↓

Apply

↓

Pending

↓

Accepted

↓

Assigned Team

↓

Attend Event

↓

Certificate Generated

↓

Volunteer Portfolio Updated

---

# Database

The database schema is locked.

Never redesign tables.

Never rename columns.

Never modify relationships.

Use:

backend/schema.sql

as the source of truth.

---

# Coding Standards

* MVC
* REST APIs
* Async/Await
* Reusable Components
* Reusable SQL
* Validation
* Proper Error Handling
* Consistent Naming
* No Duplicate Logic

---

# UI Guidelines

* Modern
* Minimal
* Responsive
* Professional
* Demo Friendly

Prefer:

* Cards
* Tables
* Badges
* Status Chips
* Progress Indicators

Avoid unnecessary animations.

---

# Git Workflow

Never work directly on main.

Use feature branches:

* feature/organizer
* feature/volunteer
* feature/team-builder
* feature/attendance

Commit after every completed feature.

Use small, meaningful commits.

Merge into main frequently.

---

# Current Progress

## Completed

* Authentication
* JWT
* Role Authorization
* Protected Routes

## In Progress

* Organizer Module
* Volunteer Module

## Upcoming

* Smart Team Builder
* Attendance
* Certificates
* Analytics
* Final UI Polish

---

# Development Process

For every feature:

1. Explain the approach.
2. List affected files.
3. Mention dependencies.
4. Mention database changes.
5. Wait for approval.
6. Implement.
7. Review.
8. Mention edge cases.
9. Suggest improvements.
10. Recommend manual testing.

---

# Hackathon Principle

Always prefer a complete, polished MVP over an unfinished feature-rich application.

Keep implementations simple, maintainable, and demo-ready.
