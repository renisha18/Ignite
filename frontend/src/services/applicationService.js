// Volunteer-track application flow. Mirrors the "Applications
// (volunteer's side)" table in docs/api-contract.md.
//
// The organizer's side (GET /events/:id/applications, PATCH status)
// is a different track — don't add it here.
//
// Depends on: services/api.js (attaches the Authorization header)
import api from "./api";

// POST /events/:eventId/apply
// body: { preferredRoleId?, motivation? }
// returns: { application }
//
// 409 if an application already exists for this volunteer+event in ANY
// status — applications has UNIQUE (volunteer_id, event_id), so a
// withdrawn application still blocks re-applying. Surface the server's
// message rather than swallowing it; it names the current status.
// 400 if the application deadline has passed.
export async function applyToEvent(eventId, body) {
  const { data } = await api.post(`/events/${eventId}/apply`, body);
  return data.application;
}

// GET /volunteers/me/applications
// returns: [{ applicationId, eventId, eventTitle, eventLocation,
//             eventStart, eventEnd, orgName, roleTitle, motivation,
//             status, appliedAt, decidedAt }]
// roleTitle is null when the volunteer applied without naming a role.
export async function getMyApplications() {
  const { data } = await api.get("/volunteers/me/applications");
  return data.applications;
}

// PATCH /applications/:applicationId/withdraw
// returns: { application } — status becomes 'withdrawn'
//
// Only permitted while status is 'applied' or 'selected'; anything else
// is a 400 naming the current status. Irreversible — the unique
// constraint means the volunteer can't apply to that event again.
export async function withdrawApplication(applicationId) {
  const { data } = await api.patch(`/applications/${applicationId}/withdraw`);
  return data.application;
}
