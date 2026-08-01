// SHARED application service — both tracks. The volunteer-track calls
// come first, the organizer-track review calls are appended in their own
// section at the bottom. One file per resource: don't create a second
// organizerApplicationService.js.
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

// ---------------------------------------------------------------------
// Organizer track — application review
//
// Mirrors the "Applications (organizer's side)" table in
// docs/api-contract.md. Both are stubs: the backend isn't built yet.
// ---------------------------------------------------------------------

// GET /events/:eventId/applications
// returns: [{ applicationId, volunteer: {...}, status, motivation, appliedAt }]
// 403 if the event belongs to another organization.
export async function getApplicationsForEvent(eventId) {
  // return (await api.get(`/events/${eventId}/applications`)).data.applications;
  throw new Error("Not implemented: applicationService.getApplicationsForEvent");
}

// PATCH /applications/:applicationId
// body: { status: "selected" | "rejected" }
// returns: { application }
//
// Only those two values are accepted — 'confirmed' and 'withdrawn' are
// not the organizer's to set. Being 'selected' is not the same as being
// assigned: assignment to a role happens separately, in Team Builder.
export async function updateApplicationStatus(applicationId, status) {
  // return (await api.patch(`/applications/${applicationId}`, { status })).data.application;
  throw new Error("Not implemented: applicationService.updateApplicationStatus");
}
