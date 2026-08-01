// Why this file exists: the organizer's side of applications — seeing
// who applied to an event and deciding on them. Kept separate from
// volunteerController.js (which owns apply and withdraw) so the two
// tracks never edit the same controller.
//
// Like roles, an application has no owner of its own: it's owned
// transitively, through its event's organization. Both handlers here
// resolve the event and run eventController's loadOwnedEvent against it,
// so applications, roles and events can't disagree about who's allowed
// to touch what.
//
// Depends on: models/applicationModel.js, controllers/eventController.js
// (loadOwnedEvent), utils/AppError.js
// Depended on by: routes/applicationRoutes.js
const applicationModel = require("../models/applicationModel");
const { loadOwnedEvent } = require("./eventController");
const AppError = require("../utils/AppError");

function parseId(raw, fieldName) {
  const id = Number.parseInt(raw, 10);
  if (!Number.isInteger(id) || id < 1) {
    throw new AppError(400, `Invalid ${fieldName}`);
  }
  return id;
}

// -------------------------------------------------------------
// GET /events/:eventId/applications
// -------------------------------------------------------------
async function listApplicationsForEvent(req, res) {
  const eventId = parseId(req.params.eventId, "event id");

  // Before any data is read: 404 if the event doesn't exist, 403 if it
  // belongs to another organization.
  await loadOwnedEvent(eventId, req.user);

  const applications = await applicationModel.findApplicationsForEvent(eventId);
  res.json({ applications });
}

// -------------------------------------------------------------
// PATCH /applications/:applicationId
// -------------------------------------------------------------
async function updateApplicationStatus(req, res) {
  const applicationId = parseId(req.params.applicationId, "application id");
  const { status } = req.body ?? {};

  // Validated before the lookup — a bad status is a client error that
  // doesn't need a database round trip to detect. The message names the
  // allowed values rather than just saying "invalid".
  if (!applicationModel.ORGANIZER_SETTABLE_STATUSES.includes(status)) {
    throw new AppError(
      400,
      `status must be one of: ${applicationModel.ORGANIZER_SETTABLE_STATUSES.join(", ")}`
    );
  }

  const existing = await applicationModel.findEnrichedApplicationById(applicationId);
  if (!existing) throw new AppError(404, "Application not found");

  await loadOwnedEvent(existing.eventId, req.user);

  await applicationModel.setApplicationStatus(applicationId, status);

  // Re-read rather than patching the object in memory: decided_at is set
  // by the database, and returning the same enriched shape the list
  // endpoint uses lets the client swap the record wholesale instead of
  // merging fields and hoping the two shapes agree.
  const application = await applicationModel.findEnrichedApplicationById(applicationId);
  res.json({ application });
}

module.exports = { listApplicationsForEvent, updateApplicationStatus };
