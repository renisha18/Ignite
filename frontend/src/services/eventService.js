// Volunteer-track event reads. Mirrors the "Browse events" table in
// docs/api-contract.md — the volunteer side only. Event create/update/
// delete belongs to the organizer track; don't add it here.
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
