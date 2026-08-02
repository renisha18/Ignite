// Why this file exists: certificates are the one feature both tracks
// touch — the organizer issues them, the volunteer downloads them — so
// they get their own controller rather than being split across
// eventController and volunteerController.
//
// Reads eventModel.findById for the ownership check but does not modify
// it; all writes here go through certificateModel.
//
// Depends on: models/certificateModel.js, models/eventModel.js,
// utils/certificatePdf.js, utils/AppError.js
// Depended on by: routes/certificateRoutes.js, routes/volunteerRoutes.js
const certificateModel = require("../models/certificateModel");
const eventModel = require("../models/eventModel");
const { renderCertificatePdf } = require("../utils/certificatePdf");
const AppError = require("../utils/AppError");

function requirePositiveInt(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new AppError(400, `${fieldName} must be a positive integer`);
  }
  return parsed;
}

// Same rule as eventController.loadOwnedEvent: admins manage any org's
// events, organizers only their own. Kept consistent deliberately —
// two different answers to "is this your event" would be a bug waiting
// to happen.
function assertOwnsOrg(user, orgId) {
  if (user.role === "admin") return;
  if (Number(orgId) !== Number(user.orgId)) {
    throw new AppError(403, "You can only issue certificates for your own organization's events");
  }
}

// Hours come from the event's scheduled window, not from attendance
// timestamps: per docs/api-contract.md the QR flow records a single
// scan and leaves check_out_time NULL, so there's no measured duration
// to use. Rounded to 2dp to match certificates.hours_credited
// DECIMAL(6,2).
function computeHoursCredited({ eventStart, eventEnd }) {
  if (!eventStart || !eventEnd) {
    throw new AppError(
      400,
      "This event has no end time, so volunteer hours can't be calculated. Set an end time on the event first."
    );
  }

  const ms = new Date(eventEnd).getTime() - new Date(eventStart).getTime();
  if (!Number.isFinite(ms) || ms <= 0) {
    throw new AppError(400, "This event's end time is not after its start time, so hours can't be calculated");
  }

  return Math.round((ms / 3600000) * 100) / 100;
}

// GET /certificates/eligible?eventId=N   (organizer, own event)
//
// Backs the organizer's Certificates screen: every assigned volunteer
// on the event, with whether their attendance is verified and whether
// they already have a certificate.
//
// returns: { event: { eventId, title }, rows: [...] }
async function listEventCertificateRows(req, res) {
  const eventId = requirePositiveInt(req.query.eventId, "eventId");

  const event = await eventModel.findById(eventId);
  if (!event) throw new AppError(404, "Event not found");
  assertOwnsOrg(req.user, event.org_id);

  const rows = await certificateModel.findEventAssignmentsForCertificates(eventId);

  res.json({
    event: {
      eventId: event.event_id,
      title: event.title,
      eventStart: event.event_start,
      eventEnd: event.event_end,
      // Surfaced so the UI can explain up front why every Generate
      // button is disabled, rather than letting the organizer click and
      // collect the same 400 once per volunteer.
      hasEndTime: Boolean(event.event_end),
    },
    rows,
  });
}

// POST /certificates   (organizer, own event)
// body: { assignmentId }
// returns: { certificate }
async function generateCertificate(req, res) {
  const assignmentId = requirePositiveInt(req.body?.assignmentId, "assignmentId");

  const assignment = await certificateModel.findAssignmentForIssue(assignmentId);
  if (!assignment) throw new AppError(404, "Assignment not found");

  assertOwnsOrg(req.user, assignment.orgId);

  if (assignment.assignmentStatus !== "assigned") {
    throw new AppError(400, "This volunteer's assignment was cancelled, so no certificate is owed");
  }

  // The rule the whole feature hangs on: no attendance, no certificate.
  if (assignment.verificationStatus !== "verified") {
    throw new AppError(
      400,
      assignment.verificationStatus == null
        ? "This volunteer hasn't marked attendance for the event yet"
        : `This volunteer's attendance is still '${assignment.verificationStatus}' — it must be verified first`
    );
  }

  // certificates.assignment_id is UNIQUE, so this is also enforced by
  // the DB. Checking here turns it into a clear 409 instead of a 500.
  if (assignment.existingCertificateId) {
    throw new AppError(409, "A certificate has already been issued for this volunteer");
  }

  const hoursCredited = computeHoursCredited(assignment);

  let certificateId;
  try {
    certificateId = await certificateModel.createCertificate({
      assignmentId,
      volunteerId: assignment.volunteerId,
      eventId: assignment.eventId,
      hoursCredited,
    });
  } catch (err) {
    // Two organizers clicking Generate at the same moment. The unique
    // constraint is the real guard; this maps it to the same 409.
    if (err.code === "ER_DUP_ENTRY") {
      throw new AppError(409, "A certificate has already been issued for this volunteer");
    }
    throw err;
  }

  res.status(201).json({ certificate: await certificateModel.findCertificateById(certificateId) });
}

// GET /volunteers/me/certificates   (volunteer)
// returns: { certificates: [...] }
async function getMyCertificates(req, res) {
  const certificates = await certificateModel.findCertificatesByVolunteerId(req.user.userId);
  res.json({ certificates });
}

// GET /certificates/:certificateId/download   (volunteer, own only)
//
// The PDF is rendered fresh on every request and never written to disk:
// no storage to manage, no stale file if an event gets renamed, and
// nothing to clean up when a certificate is revoked.
async function downloadCertificate(req, res) {
  const certificateId = requirePositiveInt(req.params.certificateId, "certificateId");

  const certificate = await certificateModel.findCertificateById(certificateId);

  // 404 rather than 403 on someone else's certificate — certificate ids
  // shouldn't be probeable.
  if (!certificate || Number(certificate.volunteerId) !== Number(req.user.userId)) {
    throw new AppError(404, "Certificate not found");
  }

  const pdf = await renderCertificatePdf({
    volunteerName: certificate.volunteerName,
    orgName: certificate.orgName,
    eventTitle: certificate.eventTitle,
    issuedAt: certificate.issuedAt,
    hoursCredited: certificate.hoursCredited,
    certificateCode: certificate.certificateCode,
  });

  // Filename uses the code, not the event title — event titles contain
  // spaces, slashes and punctuation that make a mess of a Content-
  // Disposition header and of the user's downloads folder.
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="ignite-certificate-${certificate.certificateCode}.pdf"`);
  res.setHeader("Content-Length", pdf.length);
  res.send(pdf);
}

module.exports = {
  listEventCertificateRows,
  generateCertificate,
  getMyCertificates,
  downloadCertificate,
};
