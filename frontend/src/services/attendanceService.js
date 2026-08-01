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
