// Volunteer-track certificate reads — docs/api-contract.md.
// Generation (POST /certificates) is the organizer's side; not here.
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
