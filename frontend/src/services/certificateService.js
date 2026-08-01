// SHARED certificate service — both tracks. Volunteer reads first,
// organizer generation appended at the bottom. One file per resource.
//
// STUBS: signatures and routes are final, bodies are not written yet.
// See the note in eventService.js.
//
/* eslint-disable no-unused-vars -- Stub file; see eventService.js. */
import api from "./api";

// GET /volunteers/me/certificates
// returns: { certificates: [...] }
export async function getMyCertificates() {
  // return (await api.get("/volunteers/me/certificates")).data.certificates;
  throw new Error("Not implemented: certificateService.getMyCertificates");
}

// GET /certificates/:certificateId/download
// returns: PDF or { certificate } — the contract flags this as TBD by
// whoever builds it. If it lands as a PDF, this call needs
// { responseType: "blob" }; if JSON, it doesn't. Settle that in review
// before implementing, and update the contract to match.
export async function downloadCertificate(certificateId) {
  // return (await api.get(`/certificates/${certificateId}/download`)).data;
  throw new Error("Not implemented: certificateService.downloadCertificate");
}

// ---------------------------------------------------------------------
// Organizer track — certificate generation
// ---------------------------------------------------------------------

// POST /certificates
// body: { assignmentId }
// returns: { certificate }
//
// Only allowed once that assignment's attendance is 'verified' — expect
// a rejection otherwise, and don't offer the action for volunteers who
// never scanned in. hours_credited is computed server-side from the
// event's own start/end, so no hours figure is ever sent from here.
// certificates.assignment_id is UNIQUE, so generating twice is a
// conflict, not a second certificate.
export async function generateCertificate(assignmentId) {
  // return (await api.post("/certificates", { assignmentId })).data.certificate;
  throw new Error("Not implemented: certificateService.generateCertificate");
}
