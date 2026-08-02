// Organizer-track sponsor layer: the shared catalogue, the links
// between a sponsor and one event, and the recommendation read.
//
// New file — sponsors are organizer-only, so unlike eventService.js and
// applicationService.js there's no volunteer half to append to.
//
// Two entity types travel through here and it's worth keeping them
// straight:
//   SPONSOR — the catalogue entry (name, website, industry, contact).
//             Shared by every event that sponsor has ever backed.
//   LINK    — one sponsorship of one event (type, amount, remarks),
//             identified by eventSponsorId.
// Editing a link never touches the catalogue, and unlinking never
// deletes a sponsor.
//
// Depends on: services/api.js (base URL + Authorization header).
import api from "./api";

// GET /sponsors?search=
// returns: [{ sponsorId, sponsorName, website, industry, contactPerson,
//             email, phone, createdAt }]
//
// `search` matches name OR industry. Omit it for the full catalogue.
export async function getSponsors(search) {
  const params = {};
  if (search !== undefined && search !== null && search !== "") {
    params.search = search;
  }
  const { data } = await api.get("/sponsors", { params });
  return data.sponsors;
}

// POST /sponsors
// body: { sponsorName, website?, industry?, contactPerson?, email?, phone? }
// returns: { sponsorId, ... }
//
// Creates a catalogue entry WITHOUT attaching it to anything. Adding a
// brand-new sponsor to an event should use addEventSponsor() instead,
// which does both in one transaction.
export async function createSponsor(body) {
  const { data } = await api.post("/sponsors", body);
  return data.sponsor;
}

// GET /events/:eventId/sponsors
// returns: [{ eventSponsorId, sponsorId, sponsorName, website, industry,
//             contactPerson, email, phone,
//             sponsorshipType, sponsorshipAmount, remarks }]
export async function getEventSponsors(eventId) {
  const { data } = await api.get(`/events/${eventId}/sponsors`);
  return data.sponsors;
}

// POST /events/:eventId/sponsors
//
// Two accepted shapes, because from the organizer's side this is one
// action:
//   { sponsorId, sponsorshipType, sponsorshipAmount?, remarks? }
//   { sponsor: { sponsorName, ... }, sponsorshipType, ... }
//
// The second creates the catalogue entry and links it in a single
// transaction, so a failed link can't leave an orphaned duplicate
// sponsor behind.
//
// returns: { sponsor, sponsors } — the new link plus the event's full
// refreshed list, so the caller can replace its state in one step
// instead of issuing a follow-up GET.
//
// 409 if that sponsor is already linked to this event.
export async function addEventSponsor(eventId, body) {
  const { data } = await api.post(`/events/${eventId}/sponsors`, body);
  return data;
}

// PUT /event-sponsors/:eventSponsorId
// body: any subset of { sponsorshipType, sponsorshipAmount, remarks }
// returns: { sponsor, sponsors }
//
// CONTRIBUTION only. The global sponsor record is intentionally not
// editable from an event — other events depend on it.
export async function updateEventSponsor(eventSponsorId, body) {
  const { data } = await api.put(`/event-sponsors/${eventSponsorId}`, body);
  return data;
}

// DELETE /event-sponsors/:eventSponsorId
// returns: nothing (204)
//
// Unlinks from this event only. The sponsor stays in the catalogue and
// keeps its history on every other event.
export async function removeEventSponsor(eventSponsorId) {
  await api.delete(`/event-sponsors/${eventSponsorId}`);
}

// GET /events/:eventId/sponsor-recommendations
// returns: {
//   eventType,                     // null if the event has no type set
//   previousSponsors: [{ eventId, title, date, location,
//                        sponsors: [{ sponsorId, sponsorName }] }],
//   recommendations: [{ sponsorId, name, score, reasons: [],
//                       contactPerson, email, phone, website, industry,
//                       history: [{ eventId, title, date }] }]
// }
//
// One call returns both sections of the tab: they're derived from the
// same scan of past events sharing this event's type, so splitting them
// would run that scan twice.
//
// Everything is empty when the event has no eventType — there's nothing
// to compare against. `eventType: null` is how the UI knows to prompt
// for one rather than report "no matches".
//
// Scores are 0–100 and every point is traceable to a counted fact in
// `reasons` — same event type, same location, shared role titles,
// shared role skills. No AI, no external calls.
export async function getSponsorRecommendations(eventId) {
  const { data } = await api.get(`/events/${eventId}/sponsor-recommendations`);
  return data;
}
