// Volunteer-track application flow. Mirrors the "Applications
// (volunteer's side)" table in docs/api-contract.md.
//
// The organizer's side (GET /events/:id/applications, PATCH status)
// is a different track — don't add it here.
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
