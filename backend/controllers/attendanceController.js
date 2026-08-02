// Why this file exists: QR attendance, both halves. The organizer
// generates and watches; the volunteer scans. One controller because
// one person owns the whole flow, and splitting it would put the token
// signing and the token verification in different files.
//
// The security model is specified in docs/api-contract.md, "How the QR
// works" — implemented exactly, not reinterpreted:
//   * the volunteer is identified by their JWT, never by the request
//   * the event is identified by the QR token, never by the request
//   * therefore the client NEVER supplies an assignmentId
//
// Depends on: models/attendanceModel.js, models/eventModel.js,
// utils/attendanceToken.js, utils/AppError.js
// Depended on by: routes/attendanceRoutes.js
const attendanceModel = require("../models/attendanceModel");
const eventModel = require("../models/eventModel");
const {
  signAttendanceToken,
  verifyAttendanceToken,
  PURPOSE,
} = require("../utils/attendanceToken");
const AppError = require("../utils/AppError");

function requirePositiveInt(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new AppError(400, `${fieldName} must be a positive integer`);
  }
  return parsed;
}

// Same rule as eventController.loadOwnedEvent and
// certificateController: admins manage any org's events, organizers only
// their own. Kept identical on purpose — two different answers to "is
// this your event" is a bug waiting to happen.
async function loadOwnedEvent(eventId, user) {
  const event = await eventModel.findById(eventId);
  if (!event) throw new AppError(404, "Event not found");
  if (user.role === "admin") return event;
  if (Number(event.org_id) !== Number(user.orgId)) {
    throw new AppError(403, "You can only manage attendance for your own organization's events");
  }
  return event;
}

// GET /events/:eventId/attendance-qr   (organizer, own event)
// returns: { qrToken, expiresIn }
//
// Nothing is written to the database. The token is the only artifact,
// and it stops working on its own when it expires — which is what makes
// a photograph of the projector useless later in the day.
async function getAttendanceQr(req, res) {
  const eventId = requirePositiveInt(req.params.eventId, "eventId");
  const event = await loadOwnedEvent(eventId, req.user);

  const { qrToken, expiresIn } = signAttendanceToken(event.event_id);
  res.json({ qrToken, expiresIn });
}

// GET /events/:eventId/attendance   (organizer, own event)
// returns: { attendance: [...], checkedInCount, assignedCount }
async function getEventAttendance(req, res) {
  const eventId = requirePositiveInt(req.params.eventId, "eventId");
  await loadOwnedEvent(eventId, req.user);

  const [attendance, assignedCount] = await Promise.all([
    attendanceModel.findAttendanceByEventId(eventId),
    attendanceModel.countAssignedForEvent(eventId),
  ]);

  res.json({ attendance, checkedInCount: attendance.length, assignedCount });
}

// POST /attendance/scan   (volunteer)
// body: { qrToken }
// returns: { attendance }
async function scanQr(req, res) {
  const qrToken = req.body?.qrToken;
  if (typeof qrToken !== "string" || qrToken.trim() === "") {
    throw new AppError(400, "No QR code was provided");
  }

  // Distinct failures, deliberately not collapsed into one generic
  // message: "expired" means rescan the organizer's screen, "invalid"
  // means you scanned something else entirely. Telling a volunteer the
  // difference is what stops them standing there rescanning a poster.
  let payload;
  try {
    payload = verifyAttendanceToken(qrToken.trim());
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new AppError(400, "This QR code has expired — ask your organizer to refresh it and scan again");
    }
    throw new AppError(400, "That QR code isn't a valid Ignite attendance code");
  }

  // A token signed with the attendance secret but for some other future
  // purpose must not work here.
  if (payload.purpose !== PURPOSE) {
    throw new AppError(400, "That code isn't an attendance QR code");
  }

  const eventId = Number(payload.eventId);
  if (!Number.isInteger(eventId) || eventId < 1) {
    throw new AppError(400, "That QR code isn't a valid Ignite attendance code");
  }

  // The only place an assignment is resolved: caller's own id from the
  // JWT, event id from the signed token. Nothing from the request body.
  const assignment = await attendanceModel.findActiveAssignment(req.user.userId, eventId);
  if (!assignment) {
    throw new AppError(
      403,
      "You're not assigned to this event, so you can't check in. If you applied and were selected, your organizer still needs to assign you a role."
    );
  }

  const existing = await attendanceModel.findByAssignmentId(assignment.assignmentId);
  if (existing) {
    throw new AppError(409, "You've already checked in to this event");
  }

  try {
    await attendanceModel.createAttendanceRecord(assignment.assignmentId);
  } catch (err) {
    // Two scans landing together. attendance.assignment_id is UNIQUE, so
    // the constraint is the real guard; this maps it to the same 409
    // rather than a 500.
    if (err.code === "ER_DUP_ENTRY") {
      throw new AppError(409, "You've already checked in to this event");
    }
    throw err;
  }

  const attendance = await attendanceModel.findByAssignmentId(assignment.assignmentId);

  // Event and role names come back so the volunteer's success screen can
  // say WHAT they checked in to — confirming they scanned the right
  // event's code, not just that something worked.
  res.status(201).json({
    attendance: {
      ...attendance,
      eventId,
      eventTitle: assignment.eventTitle,
      roleTitle: assignment.roleTitle,
    },
  });
}

module.exports = { getAttendanceQr, getEventAttendance, scanQr };
