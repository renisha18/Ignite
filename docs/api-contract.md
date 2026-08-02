# Ignite — API Contract (Events, Applications, Team Builder, Attendance, Certificates)

Locked before implementation, same spirit as `backend/schema.sql`. Both
tracks build against this file, not against each other's code. If a
shape needs to change, edit this file first, in a PR the other person
reviews — don't change a response shape unilaterally once the other
side is coding against it.

Auth on every route below (except where marked public) works exactly
like the existing auth module: `Authorization: Bearer <token>`,
`authenticate` + `authorize(...)` middleware, same `AppError` /
`asyncHandler` pattern already in the backend.

---

## Owner: Organizer track

### Events
| Method | Route | Auth | Body | Returns |
|---|---|---|---|---|
| POST | `/events` | organizer, admin | `{ title, description?, location?, eventStart, eventEnd?, applicationDeadline? }` | `{ event }` |
| PUT | `/events/:eventId` | organizer (own org's event), admin | same fields, all optional | `{ event }` |
| DELETE | `/events/:eventId` | organizer (own), admin | — | `204` |
| GET | `/events/mine` | organizer | — | `{ events: [...] }` — events for the caller's org |

### Event roles (capacity per role, e.g. Photography: 5)
| Method | Route | Auth | Body | Returns |
|---|---|---|---|---|
| POST | `/events/:eventId/roles` | organizer (own) | `{ title, capacity, skillIds?: [] }` | `{ role }` |
| PUT | `/roles/:roleId` | organizer (own) | `{ title?, capacity?, skillIds? }` | `{ role }` |
| DELETE | `/roles/:roleId` | organizer (own) | — | `204` |

### Applications (organizer's side of the flow)
| Method | Route | Auth | Body | Returns |
|---|---|---|---|---|
| GET | `/events/:eventId/applications` | organizer (own) | — | `{ applications: [...] }` — see shape below |
| PATCH | `/applications/:applicationId` | organizer (own event) | `{ status: "applied" \| "selected" \| "confirmed" \| "rejected" }` | `{ application }` — same shape as the list |

Application shape (flat, not nested under `volunteer`):

```jsonc
{ "applicationId", "eventId", "status", "motivation", "appliedAt", "decidedAt",
  "volunteerId", "fullName", "email", "reputationScore",
  "preferredRole": { "roleId", "title" }   // null if none
}
```

`withdrawn` applications are excluded from the list — the volunteer
pulled out, so there's no decision left to make. PATCH accepts all four
organizer-managed statuses and moves between them freely in either
direction, so a decision can be undone by setting `applied`;
`decided_at` is set on a decision and cleared when moving back to
`applied`. `withdrawn` is not settable here — that's the volunteer's own
action.

### Smart Team Builder (drag & drop)
| Method | Route | Auth | Body | Returns |
|---|---|---|---|---|
| GET | `/events/:eventId/candidates` | organizer (own) | — | the whole board in one call — see shape below |
| POST | `/assignments` | organizer (own event) | `{ applicationId, roleId }` | `{ assignment }` — places **or moves**; see below |
| DELETE | `/assignments/:assignmentId` | organizer (own) | — | `204` — sets `status='cancelled'`, doesn't hard-delete (keeps history) |

**Board response** (`GET /events/:eventId/candidates`). Reshaped from the
original role-grouped `candidates` list: the board renders two
independent views of the same data — volunteers grouped by their own
skills on the left, roles on the right — and a role-grouped payload can
only serve one of them. One call renders the entire screen.

```jsonc
{
  "event": { "eventId", "title" },
  "roles": [{
    "roleId", "title", "capacity", "assignedCount",
    "requiredSkills": [{ "skillId", "name" }],
    "assignments": [{ "assignmentId", "volunteerId", "fullName",
                      "reputationScore", "skillMismatch", "missingSkills": ["…"] }]
  }],
  "volunteers": [{
    "volunteerId", "applicationId", "applicationStatus", "fullName",
    "reputationScore",
    "skills": [{ "skillId", "name" }],
    "preferredRole": { "roleId", "title" },        // null if none
    "assignment": { "assignmentId", "roleId", "roleTitle" }   // null if unassigned
  }],
  "skillGroups": [{ "skillId", "name", "volunteerIds": [1, 2] }]
}
```

* Only `selected` and `confirmed` applicants appear. Pending, rejected
  and withdrawn are filtered out in SQL.
* `volunteers` is sorted `reputation_score DESC`, so every group inherits
  that order.
* `skillGroups` holds **ids into `volunteers`**, not copies — a volunteer
  with three skills is sent once and listed in three groups. Grouping is
  by the volunteer's own `volunteer_skills`, not by role requirements.
* A group with `"skillId": null` is the **"No skills listed"** bucket and
  is always last, so a skill-less volunteer is still visible and
  draggable rather than silently unassignable.
* `skillMismatch` is `true` when the role requires at least one skill the
  volunteer doesn't have; `missingSkills` names them. A role with no
  required skills never mismatches. Computed server-side — clients must
  not recalculate it.

**POST `/assignments` places or moves.** `assignments` has
`UNIQUE (volunteer_id, event_id)` and unassign is a soft delete, so a
cancelled row still occupies the unique slot: a volunteer can only ever
have **one** `assignments` row per event. The server therefore INSERTs
only when no row exists and otherwise **UPDATEs** it — which also revives
a cancelled row. Cancel-then-insert would fail with `ER_DUP_ENTRY`. The
move is a single UPDATE, so the volunteer is never momentarily
unassigned.

Validated inside one transaction: the application exists, is
`selected`/`confirmed`, and belongs to the same event as the role; the
role has a free seat. Capacity is read after a `SELECT … FOR UPDATE` on
the `event_roles` row, so concurrent assignments serialize and can't
exceed capacity. A full role is a `409` whose message names it.

Response — everything needed to update the board in place, so the client
never refetches:

```jsonc
{ "assignment": {
  "assignmentId", "applicationId", "volunteerId", "eventId",
  "roleId", "roleTitle", "fullName", "reputationScore", "status",
  "skillMismatch", "missingSkills": ["…"],
  "previousRoleId": 3          // null on a first placement
}}
```

`previousRoleId` is the role they came from, so the caller knows which
role's list to remove the card from.

### Attendance (organizer displays the QR, views who scanned)
| Method | Route | Auth | Body | Returns |
|---|---|---|---|---|
| GET | `/events/:eventId/attendance-qr` | organizer (own) | — | `{ qrToken, expiresIn }` — see "How the QR works" below |
| GET | `/events/:eventId/attendance` | organizer (own) | — | `{ attendance: [{ volunteerId, name, roleTitle, checkInTime, verificationStatus }] }` |

### Certificates
| Method | Route | Auth | Body | Returns |
|---|---|---|---|---|
| POST | `/certificates` | organizer (own event) | `{ assignmentId }` | `{ certificate }` — only allowed if `attendance.verification_status = 'verified'` for that assignment. `hours_credited` is computed server-side from the event's own `event_start` → `event_end`. |

---

## Owner: Volunteer track

### Browse events (public/volunteer read of the same `events` table above)
| Method | Route | Auth | Body | Returns |
|---|---|---|---|---|
| GET | `/events` | volunteer (or public) | query: `?status=published` | `{ events: [...] }` — only `status='published'` events from `approved` orgs |
| GET | `/events/:eventId` | volunteer (or public) | — | `{ event, roles: [...] }` |

### Applications (volunteer's side)
| Method | Route | Auth | Body | Returns |
|---|---|---|---|---|
| POST | `/events/:eventId/apply` | volunteer | `{ preferredRoleId?, motivation? }` | `{ application }` |
| GET | `/volunteers/me/applications` | volunteer | — | `{ applications: [...] }` |
| PATCH | `/applications/:applicationId/withdraw` | volunteer (own) | — | `{ application }` — sets `status='withdrawn'` |

### My assignment / journey
| Method | Route | Auth | Body | Returns |
|---|---|---|---|---|
| GET | `/volunteers/me/journey` | volunteer | — | `{ journey: [...] }` — the "My Journey" timeline query already sketched in `schema.sql` |

### Profile
| Method | Route | Auth | Body | Returns |
|---|---|---|---|---|
| GET | `/volunteers/me/profile` | volunteer | — | `{ profile: { volunteerId, fullName, email, bio, location, totalHours, reputationScore, skills: [{ skillId, name }] } }` |
| PUT | `/volunteers/me/profile` | volunteer | `{ bio?, location?, skillIds?: [] }` | `{ profile }` — re-read after the write |

`fullName` and `email` are read-only here: they live on `users`, and
changing them is an auth concern. There is no endpoint for it.

PUT is a **partial** update, and the three keys behave differently:

* Key absent → that field is untouched.
* `bio: ""` or `location: ""` → stored as `NULL` (i.e. "clear it").
* `skillIds` absent → skills untouched.
* `skillIds: []` → **removes every skill.** Distinct from absent; don't
  send `[]` as a default.

`skillIds` replaces the volunteer's `volunteer_skills` rows wholesale
(delete-then-insert) inside a transaction. Duplicates in the array are
de-duped server-side; unknown ids are a `400` listing them, not a
silent no-op. `location` is `VARCHAR(255)` — longer is a `400`.

### Attendance (volunteer's side — scan the organizer's QR)
| Method | Route | Auth | Body | Returns |
|---|---|---|---|---|
| POST | `/attendance/scan` | volunteer | `{ qrToken }` | `{ attendance }` — see "How the QR works" below |

### Certificates
| Method | Route | Auth | Body | Returns |
|---|---|---|---|---|
| GET | `/volunteers/me/certificates` | volunteer | — | `{ certificates: [...] }` |
| GET | `/certificates/:certificateId/download` | volunteer (own) or public via `certificateCode` | — | PDF or `{ certificate }`, TBD by whoever builds this — flag it in review, not a silent decision |

---

## Shared reference data

| Method | Route | Auth | Body | Returns |
|---|---|---|---|---|
| GET | `/skills` | public | — | `{ skills: [{ skillId, name }] }` — every row in `skills` |

Built by the volunteer track for the profile skill picker, but intended
for the organizer track too: `POST /events/:eventId/roles` takes
`skillIds`, and its form needs the same list. Call it rather than
writing a second one. Frontend: `services/skillService.js`, and the
picker itself is `components/ui/SkillMultiSelect.jsx` (in `ui/`, not
`volunteer/`, precisely so the role form can reuse it).

**Not** the same as `GET /events/skills`, which returns only skills
attached to a role on a currently-published event — that one exists so
the browse filter can't offer a dead end. The schema has no `category`
column on `skills`, so neither route returns one.

---

## How the QR works (shared — both tracks read this)

Attendance is QR-based, per `PROJECT_SPEC.md`. There is **no GPS and no
location check** anywhere in this system.

The locked schema has no column to store a QR code, and we are not
changing the schema. So the token *is* the state — a short-lived signed
JWT, nothing persisted until someone actually scans:

1. Organizer opens the event and calls `GET /events/:eventId/attendance-qr`.
   The server signs a token with the existing `JWT_SECRET` via
   `utils/token.js` — payload `{ eventId, purpose: "attendance" }`,
   short expiry (~5 min). Returns `{ qrToken, expiresIn }`.
2. The organizer's screen renders `qrToken` as a QR image and re-fetches
   to refresh it when it expires. A stale screenshot of the QR therefore
   stops working on its own.
3. Volunteer scans it in the app and calls `POST /attendance/scan` with
   `{ qrToken }` and their own Bearer token.
4. Server verifies the token's signature, expiry and `purpose`, then
   looks up the caller's own `assignments` row for that `eventId`. It
   never accepts an `assignmentId` from the client — the volunteer is
   identified by their JWT, the event by the QR. That's what stops one
   volunteer marking attendance for another.
5. On success it writes `check_in_time` and sets
   `verification_status = 'verified'`.

Rules that fall out of this:

* **One scan per volunteer per event.** `attendance.assignment_id` is
  UNIQUE, so a second scan is a `409`, not a duplicate row.
* **Only eligible volunteers.** No active `assignments` row for that
  event → `403`. Being `selected` on an application is not enough; the
  volunteer must have been assigned to a role by the Team Builder.
* **`check_out_time` is unused** and stays `NULL`. Hours come from the
  event's own `event_start` → `event_end`, computed when the certificate
  is generated. Don't build a check-out endpoint.

---

## File ownership (minimizes touching the same file)

```
backend/
  routes/
    eventRoutes.js          <- organizer track (POST/PUT/DELETE + /events/mine)
    publicEventRoutes.js    <- volunteer track (GET /events, GET /events/:id)
    applicationRoutes.js    <- organizer track (GET applications, PATCH status)
    volunteerRoutes.js      <- volunteer track (apply, withdraw, my applications/journey/certs)
    assignmentRoutes.js     <- organizer track (candidates, assign, unassign)
    attendanceRoutes.js     <- SHARED — organizer GET /attendance-qr + GET /attendance,
                                volunteer POST /attendance/scan. Split into
                                attendanceOrganizerRoutes.js / attendanceVolunteerRoutes.js
                                if this becomes a conflict hotspot.
    certificateRoutes.js    <- organizer generates, volunteer reads — same split option as above

  models/
    eventModel.js           <- SHARED read functions (findById, listPublished) + organizer-only writes.
                                Rule: append new functions freely; don't edit an existing function's
                                signature or query without a heads-up to the other person, since the
                                other track is calling it too.
    applicationModel.js      <- SHARED (volunteer creates, organizer updates status) — same append-only rule
    assignmentModel.js       <- organizer track primarily
    attendanceModel.js       <- SHARED
    certificateModel.js      <- SHARED

  server.js                  <- both add ONE line each (app.use(...)) — low conflict risk,
                                 each line is independent
```

The only files both people are likely to edit are the four `models/*Model.js`
marked SHARED. Git handles two people *adding* different functions to
the same file fine — it only conflicts if you both edit the *same*
lines. So: add, don't refactor, without a quick message first.
