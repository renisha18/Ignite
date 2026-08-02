// Organizer-track assignment flow — the Smart Team Builder's data
// layer. Mirrors the "Smart Team Builder (drag & drop)" table in
// docs/api-contract.md.
//
// Organizer-only, so unlike eventService.js and applicationService.js
// there's no volunteer half to append to. The volunteer's view of their
// own team comes from their journey endpoint, not from here.
//
// Depends on: services/api.js (base URL + Authorization header).
import api from "./api";

// GET /events/:eventId/candidates
//
// The whole board in one call — the page never makes a second request to
// render. Returns:
//
// {
//   event: { eventId, title },
//   roles: [{ roleId, title, capacity, assignedCount,
//             requiredSkills: [{ skillId, name }],
//             assignments: [{ assignmentId, volunteerId, fullName,
//                             reputationScore, skillMismatch,
//                             missingSkills: [name] }] }],
//   volunteers: [{ volunteerId, applicationId, applicationStatus, fullName,
//                  reputationScore, skills: [{ skillId, name }],
//                  preferredRole: { roleId, title } | null,
//                  assignment: { assignmentId, roleId, roleTitle } | null }],
//   skillGroups: [{ skillId, name, volunteerIds: [] }]
// }
//
// Only 'selected' and 'confirmed' applicants appear. skillGroups holds
// ids into `volunteers`, so a volunteer with three skills is sent once
// and listed in three groups; the server has already sorted them by
// reputation DESC. A group with `skillId: null` is the "No skills
// listed" bucket and is always last.
export async function getCandidates(eventId) {
  const { data } = await api.get(`/events/${eventId}/candidates`);
  return data;
}

// POST /assignments
// body: { applicationId, roleId }
//
// Places a volunteer, or moves them if they already hold a role on this
// event — the server decides which, so there's no separate move call.
// The move is a single UPDATE inside a transaction, so the volunteer is
// never momentarily unassigned.
//
// Returns the assignment with everything needed to update the board in
// place, without refetching:
//   { assignmentId, applicationId, volunteerId, eventId, roleId, roleTitle,
//     fullName, reputationScore, status, skillMismatch, missingSkills,
//     previousRoleId }
//
// previousRoleId is the role they came from (null on a first placement),
// so the caller knows which role's list to remove the card from.
// skillMismatch is computed server-side — don't recalculate it.
//
// 409 if the role is at capacity (the message names the role) or the
// application isn't selected/confirmed. The server re-checks capacity
// under a row lock, so a client-side check is a courtesy, not a gate.
export async function createAssignment(body) {
  const { data } = await api.post("/assignments", body);
  return data.assignment;
}

// DELETE /assignments/:assignmentId
// returns: nothing (204)
//
// Soft delete server-side — status becomes 'cancelled' and the row stays
// for history. The seat frees up immediately.
export async function deleteAssignment(assignmentId) {
  await api.delete(`/assignments/${assignmentId}`);
}
