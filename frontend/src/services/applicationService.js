// SHARED application service — both tracks. The volunteer-track calls
// come first, the organizer-track review calls are appended in their own
// section at the bottom. One file per resource: don't create a second
// organizerApplicationService.js.
//
// STUBS: signatures and routes are final, bodies are not written yet.
// See the note in eventService.js.
//
/* eslint-disable no-unused-vars -- Stub file; see eventService.js. */
import api from "./api";

// POST /events/:eventId/apply
// body: { preferredRoleId?, motivation? }
// returns: { application }
// Note: applications has UNIQUE (volunteer_id, event_id), so a second
// apply to the same event is a conflict, not a new row — surface that
// to the user rather than swallowing it.
export async function applyToEvent(eventId, body) {
  // return (await api.post(`/events/${eventId}/apply`, body)).data.application;
  throw new Error("Not implemented: applicationService.applyToEvent");
}

// GET /volunteers/me/applications
// returns: { applications: [...] }
export async function getMyApplications() {
  // return (await api.get("/volunteers/me/applications")).data.applications;
  throw new Error("Not implemented: applicationService.getMyApplications");
}

// PATCH /applications/:applicationId/withdraw
// returns: { application } — status becomes 'withdrawn'
export async function withdrawApplication(applicationId) {
  // return (await api.patch(`/applications/${applicationId}/withdraw`)).data.application;
  throw new Error("Not implemented: applicationService.withdrawApplication");
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
