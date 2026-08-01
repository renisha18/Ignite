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
| GET | `/events/:eventId/applications` | organizer (own) | — | `{ applications: [{ applicationId, volunteer: {...}, status, motivation, appliedAt }] }` |
| PATCH | `/applications/:applicationId` | organizer (own event) | `{ status: "selected" \| "rejected" }` | `{ application }` |

### Smart Team Builder (drag & drop)
| Method | Route | Auth | Body | Returns |
|---|---|---|---|---|
| GET | `/events/:eventId/candidates` | organizer (own) | — | `{ roles: [{ roleId, title, capacity, candidates: [{ volunteerId, name, skillMatch, pastEvents, reputationScore }] }] }` — one call, pre-grouped by role, built from the ranking query already sketched in `schema.sql` |
| POST | `/assignments` | organizer (own event) | `{ applicationId, roleId }` | `{ assignment }` — server re-validates: application is `selected`/`confirmed`, role belongs to same event, role has capacity left, no existing active assignment for that volunteer+event (see `schema.sql` comment under table 9) |
| DELETE | `/assignments/:assignmentId` | organizer (own) | — | `204` — sets `status='cancelled'`, doesn't hard-delete (keeps history) |

### Attendance (organizer sets up, views)
| Method | Route | Auth | Body | Returns |
|---|---|---|---|---|
| POST | `/events/:eventId/location` | organizer (own) | `{ latitude, longitude, allowedRadiusMeters }` | `{ event }` |
| GET | `/events/:eventId/attendance` | organizer (own) | — | `{ attendance: [{ volunteerId, name, roleTitle, checkInTime, checkOutTime, verificationStatus }] }` |

### Certificates
| Method | Route | Auth | Body | Returns |
|---|---|---|---|---|
| POST | `/certificates` | organizer (own event) | `{ assignmentId }` | `{ certificate }` — only allowed if `attendance.verification_status = 'verified'` for that assignment |

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

### Attendance (volunteer's side — GPS check-in/out)
| Method | Route | Auth | Body | Returns |
|---|---|---|---|---|
| POST | `/attendance/check-in` | volunteer | `{ assignmentId, latitude, longitude }` | `{ attendance }` — 403 if outside `allowedRadiusMeters` (Haversine, computed server-side, never trust client-computed distance) |
| POST | `/attendance/check-out` | volunteer | `{ assignmentId }` | `{ attendance }` — triggers the hours-credit query from `schema.sql` |

### Certificates
| Method | Route | Auth | Body | Returns |
|---|---|---|---|---|
| GET | `/volunteers/me/certificates` | volunteer | — | `{ certificates: [...] }` |
| GET | `/certificates/:certificateId/download` | volunteer (own) or public via `certificateCode` | — | PDF or `{ certificate }`, TBD by whoever builds this — flag it in review, not a silent decision |

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
    attendanceRoutes.js     <- SHARED — organizer POST /location + GET, volunteer POST check-in/out.
                                Split into attendanceOrganizerRoutes.js /
                                attendanceVolunteerRoutes.js if this becomes a conflict hotspot.
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
