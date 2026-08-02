// SHARED certificate service — both tracks. Volunteer reads first,
// organizer generation below. One file per resource.
//
// Depends on: services/api.js (base URL + Authorization header)
import api from "./api";

// GET /volunteers/me/certificates
// returns: [{ certificateId, certificateCode, eventId, eventTitle,
//             eventLocation, eventStart, orgName, hoursCredited, issuedAt }]
export async function getMyCertificates() {
  const { data } = await api.get("/volunteers/me/certificates");
  return data.certificates;
}

// GET /certificates/:certificateId/download
//
// Settled (the contract flagged this as TBD): the endpoint returns a
// real application/pdf body, not JSON, so this needs responseType
// "blob". The PDF is rendered server-side on every request and never
// stored, so there's no static URL to link to — and a plain <a href>
// wouldn't carry the Authorization header anyway. Hence: fetch the blob,
// hand it to the browser through an object URL, revoke it immediately.
export async function downloadCertificate(certificateId) {
  const response = await api.get(`/certificates/${certificateId}/download`, {
    responseType: "blob",
  });

  // Prefer the server's filename — it's built from the certificate code,
  // which is safe for a filesystem, unlike an event title.
  const disposition = response.headers?.["content-disposition"] ?? "";
  const match = /filename="?([^"]+)"?/.exec(disposition);
  const filename = match?.[1] ?? `ignite-certificate-${certificateId}.pdf`;

  const url = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return filename;
}

// ---------------------------------------------------------------------
// Organizer track — certificate generation
// ---------------------------------------------------------------------

// GET /certificates/eligible?eventId=N
// returns: { event: { eventId, title, eventStart, eventEnd, hasEndTime },
//            rows: [{ assignmentId, volunteerId, volunteerName,
//                     volunteerEmail, roleTitle, verificationStatus,
//                     checkInTime, certificateId, certificateCode,
//                     hoursCredited, issuedAt, eligible }] }
//
// Every ASSIGNED volunteer on the event, not just the eligible ones —
// the organizer needs to see who's still waiting on attendance rather
// than a silently shortened list. `eligible` is computed server-side so
// the UI and the API can't disagree about the rule.
export async function getEventCertificateRows(eventId) {
  const { data } = await api.get("/certificates/eligible", { params: { eventId } });
  return data;
}

// POST /certificates
// body: { assignmentId }
// returns: { certificate }
//
// Only allowed once that assignment's attendance is 'verified' — a 400
// otherwise. hours_credited is computed server-side from the event's own
// start/end, so no hours figure is ever sent from here.
// certificates.assignment_id is UNIQUE, so generating twice is a 409,
// not a second certificate.
export async function generateCertificate(assignmentId) {
  const { data } = await api.post("/certificates", { assignmentId });
  return data.certificate;
}
