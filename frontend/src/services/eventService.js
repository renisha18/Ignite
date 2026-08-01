// SHARED event service — both tracks. The volunteer-track reads come
// first, the organizer-track writes are appended in their own section
// at the bottom. One file per resource: don't create a second
// organizerEventService.js for the same /events endpoints.
//
// Routes are unprefixed (/events, not /api/events), matching the
// contract and the existing /auth mount in backend/server.js.
//
// Depends on: services/api.js (base URL + Authorization header). These
// routes are public, but api.js attaches the token when one exists,
// which is harmless and keeps every service consistent.
import api from "./api";

// GET /events?status=published&search=&skillId=&location=
// Only published events from approved orgs come back — enforced
// server-side in eventModel.js, not here.
//
// Blank values are stripped rather than sent as empty strings so the
// backend sees "no filter" instead of having to special-case "".
// returns: [{ eventId, title, location, eventStart, eventEnd, orgId,
//             orgName, roles: [{ roleId, title, capacity, filledCount }] }]
export async function getEvents(filters = {}) {
  const params = {};
  for (const key of ["status", "search", "location", "skillId"]) {
    const value = filters[key];
    if (value !== undefined && value !== null && value !== "") {
      params[key] = value;
    }
  }

  const { data } = await api.get("/events", { params });
  return data.events;
}

// GET /events/:eventId
// returns: { event, roles: [{ ..., skills: [{ skillId, name }] }] }
// 404s if the event isn't published or its org isn't approved.
export async function getEventById(eventId) {
  const { data } = await api.get(`/events/${eventId}`);
  return data;
}

// GET /events/skills
// Options for the browse page's skill filter. Only returns skills
// attached to a role on a currently-visible event, so the dropdown
// can't offer a filter that matches nothing.
// returns: [{ skillId, name }]
export async function getFilterSkills() {
  const { data } = await api.get("/events/skills");
  return data.skills;
}

// ---------------------------------------------------------------------
// Organizer track — event writes + event roles
//
// Mirrors the "Events" and "Event roles" tables in docs/api-contract.md.
//
// The four event CRUD calls are live against backend/routes/eventRoutes.js
// and are used by pages/organizer/MyEvents.jsx.
//
// The three role calls below are written out but NOT USABLE YET: there
// is no roleRoutes.js on the backend, so every one of them would 404.
// They're here because the routes and bodies are locked in the contract
// and the backend will be built against them. Nothing imports them yet,
// and no UI calls them — that lands in the Event Roles session.
// ---------------------------------------------------------------------

// POST /events
// body: { title, description?, location?, eventStart, eventEnd?, applicationDeadline? }
// returns: { eventId, orgId, title, ..., status, createdAt }
//
// The organization is taken from the caller's JWT server-side, so don't
// send an orgId — an organizer physically can't create for another org.
// Datetimes go up as the raw <input type="datetime-local"> value
// ("2026-09-12T08:00"); the backend normalises them to MySQL DATETIME.
// Expect 403 if the org isn't approved yet, 400 on validation failure.
export async function createEvent(body) {
  const { data } = await api.post("/events", body);
  return data.event;
}

// PUT /events/:eventId
// body: any subset of the create fields — omitted fields are left alone.
// returns: the full updated event
// 403 if the event belongs to another organization, 404 if it's gone.
export async function updateEvent(eventId, body) {
  const { data } = await api.put(`/events/${eventId}`, body);
  return data.event;
}

// DELETE /events/:eventId
// returns: nothing (204)
//
// Hard delete: applications and assignments cascade away with the event.
// Confirm at the call site before calling this. A 409 means certificates
// have already been issued for the event, so it can no longer be deleted.
export async function deleteEvent(eventId) {
  await api.delete(`/events/${eventId}`);
}

// GET /events/mine
// returns: [{ eventId, title, location, eventStart, ..., status }]
// Scoped to the caller's own organization, newest event date first.
export async function getMyEvents() {
  const { data } = await api.get("/events/mine");
  return data.events;
}

// POST /events/:eventId/roles
// body: { title, capacity, skillIds?: [] }
// returns: { role }
//
// capacity must be a positive integer. skillIds are what the Smart Team
// Builder later matches volunteers against; note there is currently no
// endpoint that lists all skills to choose from (GET /events/skills is
// the volunteer filter list, scoped to skills already on visible events),
// so the picker needs one before skill tags can be set from the UI.
export async function createEventRole(eventId, body) {
  const { data } = await api.post(`/events/${eventId}/roles`, body);
  return data.role;
}

// PUT /roles/:roleId
// body: { title?, capacity?, skillIds? }
// returns: { role }
// Note the route is top-level /roles, not nested under /events.
//
// Lowering capacity below the number of volunteers already assigned is
// a server-side decision, not something to guess at here.
export async function updateEventRole(roleId, body) {
  const { data } = await api.put(`/roles/${roleId}`, body);
  return data.role;
}

// DELETE /roles/:roleId
// returns: nothing (204)
// Deleting a role that already has assignments needs a decision at
// implementation time — expect the backend to refuse rather than
// silently orphaning assignments.
export async function deleteEventRole(roleId) {
  await api.delete(`/roles/${roleId}`);
}
