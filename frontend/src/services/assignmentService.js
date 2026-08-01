// Organizer-track assignment flow — the Smart Team Builder's data
// layer. Mirrors the "Smart Team Builder (drag & drop)" table in
// docs/api-contract.md.
//
// New file: assignments are organizer-only, so unlike eventService.js
// and applicationService.js there is no volunteer half to append to.
// The volunteer's read of their own team comes from their journey
// endpoint, not from here.
//
// STUBS: signatures and routes are final, bodies are not written yet.
// Same convention as the other service stubs.
//
// Depends on: services/api.js (base URL + Authorization header).
//
/* eslint-disable no-unused-vars -- Stub file; see eventService.js. */
import api from "./api";

// GET /events/:eventId/candidates
// returns: [{ roleId, title, capacity,
//             candidates: [{ volunteerId, name, skillMatch, pastEvents, reputationScore }] }]
//
// One call for the whole board, pre-grouped by role — the drag-and-drop
// UI should not be fetching per role. A volunteer with several matching
// skills appears under every role they match, which is the grouping
// PROJECT_SPEC.md's USP section describes.
export async function getCandidates(eventId) {
  // return (await api.get(`/events/${eventId}/candidates`)).data.roles;
  throw new Error("Not implemented: assignmentService.getCandidates");
}

// POST /assignments
// body: { applicationId, roleId }
// returns: { assignment }
//
// Called on drop, so the DB updates immediately (PROJECT_SPEC.md). The
// server re-validates everything the UI thinks it knows — application is
// selected/confirmed, role belongs to the event, capacity remains, no
// existing active assignment for that volunteer+event. Treat a 409 as
// "someone else took the last seat" and refetch rather than assuming the
// local board is right.
export async function createAssignment(body) {
  // return (await api.post("/assignments", body)).data.assignment;
  throw new Error("Not implemented: assignmentService.createAssignment");
}

// DELETE /assignments/:assignmentId
// returns: nothing (204)
//
// Soft delete server-side — sets status='cancelled' and keeps the row
// for history. The seat frees up, but the volunteer's record of having
// been assigned does not disappear.
export async function deleteAssignment(assignmentId) {
  // await api.delete(`/assignments/${assignmentId}`);
  throw new Error("Not implemented: assignmentService.deleteAssignment");
}
