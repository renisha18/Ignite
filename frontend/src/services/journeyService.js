// The "My Journey" timeline — docs/api-contract.md, volunteer track.
//
// One live join server-side: assignments -> events -> event_roles, left
// joined to attendance and certificates. Nothing is cached or
// denormalised, so an entry reflects a certificate the moment the
// organizer issues it.
//
// Depends on: services/api.js (attaches the Authorization header)
import api from "./api";

// GET /volunteers/me/journey
// returns: [{ assignmentId, assignedAt, rating,
//             eventId, eventTitle, eventDescription, eventLocation,
//             eventStart, eventEnd, eventStatus,
//             orgId, orgName, roleId, roleTitle,
//             checkInTime, verificationStatus,
//             certificateId, certificateCode, hoursCredited,
//             certificateIssuedAt,
//             attended, certified }]
//
// Newest event first. `attended` and `certified` are computed
// server-side so the UI and the API can't disagree about what counts.
// `hoursCredited` is null until a certificate exists — that's distinct
// from zero, so don't default it.
//
// Cancelled assignments are excluded: the journey is what you did.
export async function getMyJourney() {
  const { data } = await api.get("/volunteers/me/journey");
  return data.journey;
}
