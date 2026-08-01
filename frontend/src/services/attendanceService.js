// QR attendance, volunteer side — docs/api-contract.md, "How the QR
// works".
//
// One endpoint, one scan. There is deliberately no check-out and no
// location call: the volunteer is identified by their own JWT (attached
// automatically by api.js) and the event by the QR token, so the client
// never sends an assignmentId. Don't add one.
//
// Expected failures worth handling at the call site:
//   401/expired token -> QR on the organizer's screen went stale, rescan
//   403               -> volunteer has no active assignment for that event
//   409               -> already scanned (attendance.assignment_id is UNIQUE)
//
// STUB: signature and route are final, body is not written yet.
// See the note in eventService.js.
//
/* eslint-disable no-unused-vars -- Stub file; see eventService.js. */
import api from "./api";

// POST /attendance/scan
// body: { qrToken }
// returns: { attendance }
export async function scanQr(qrToken) {
  // return (await api.post("/attendance/scan", { qrToken })).data.attendance;
  throw new Error("Not implemented: attendanceService.scanQr");
}

// ---------------------------------------------------------------------
// Organizer track — display the QR, view who scanned
//
// Mirrors the "Attendance (organizer displays the QR, views who
// scanned)" table in docs/api-contract.md. Both stubs.
//
// NOTE: there is deliberately no setEventLocation() here. The contract's
// earlier POST /events/:eventId/location was removed when attendance
// moved to QR — "no GPS and no location check anywhere in this system" —
// and the locked schema has no lat/lng columns to store it in anyway.
// ---------------------------------------------------------------------

// GET /events/:eventId/attendance-qr
// returns: { qrToken, expiresIn }
//
// The token IS the state — nothing is persisted until a volunteer
// actually scans. It expires in ~5 minutes, so the screen displaying it
// must refetch on expiry; that's what stops a screenshot of the QR from
// working for the rest of the day. Render qrToken as a QR image.
export async function getAttendanceQr(eventId) {
  // return (await api.get(`/events/${eventId}/attendance-qr`)).data;
  throw new Error("Not implemented: attendanceService.getAttendanceQr");
}

// GET /events/:eventId/attendance
// returns: [{ volunteerId, name, roleTitle, checkInTime, verificationStatus }]
//
// checkOutTime is intentionally absent — there is no check-out in this
// system; hours come from the event's own start/end at certificate time.
export async function getEventAttendance(eventId) {
  // return (await api.get(`/events/${eventId}/attendance`)).data.attendance;
  throw new Error("Not implemented: attendanceService.getEventAttendance");
}
