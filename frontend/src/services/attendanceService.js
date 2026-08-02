// QR attendance — docs/api-contract.md, "How the QR works".
//
// One scan per volunteer per event. There is deliberately no check-out
// and no location call: the volunteer is identified by their own JWT
// (attached automatically by api.js) and the event by the QR token, so
// the client never sends an assignmentId. Don't add one.
//
// Depends on: services/api.js
import api from "./api";

// POST /attendance/scan
// body: { qrToken }
// returns: { attendanceId, assignmentId, checkInTime, verificationStatus,
//            eventId, eventTitle, roleTitle }
//
// Failures are distinct on purpose — surface the server's message rather
// than a generic one, because the right next action differs:
//   400 expired -> the organizer's screen has refreshed, scan it again
//   400 invalid -> that wasn't an Ignite attendance code at all
//   403         -> being selected isn't enough; you need an assigned role
//   409         -> already checked in
export async function scanQr(qrToken) {
  const { data } = await api.post("/attendance/scan", { qrToken });
  return data.attendance;
}

// ---------------------------------------------------------------------
// Organizer track — display the QR, view who scanned
//
// NOTE: there is deliberately no setEventLocation() here. The contract's
// earlier POST /events/:eventId/location was removed when attendance
// moved to QR — "no GPS and no location check anywhere in this system" —
// and the locked schema has no lat/lng columns to store it in anyway.
// ---------------------------------------------------------------------

// GET /events/:eventId/attendance-qr
// returns: { qrToken, expiresIn }  (expiresIn in SECONDS)
//
// The token IS the state — nothing is persisted until a volunteer
// actually scans. It expires in ~5 minutes, so the screen displaying it
// must refetch before then; that's what stops a photograph of the QR
// working for the rest of the day. Render qrToken as a QR image.
export async function getAttendanceQr(eventId) {
  const { data } = await api.get(`/events/${eventId}/attendance-qr`);
  return data;
}

// GET /events/:eventId/attendance
// returns: { attendance: [{ volunteerId, name, roleTitle, checkInTime,
//                           verificationStatus }],
//            checkedInCount, assignedCount }
//
// checkOutTime is intentionally absent — there is no check-out in this
// system; hours come from the event's own start/end at certificate time.
export async function getEventAttendance(eventId) {
  const { data } = await api.get(`/events/${eventId}/attendance`);
  return data;
}
