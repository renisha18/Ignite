// Why this file exists: the only place that orchestrates Events
// operations end-to-end — validating input, enforcing which
// organization may touch which event, calling the model, shaping the
// response. Models stay dumb (pure SQL); this is where the business
// rules from docs/api-contract.md actually live.
//
// Depends on: models/eventModel.js, utils/AppError.js
// Depended on by: routes/eventRoutes.js
const eventModel = require("../models/eventModel");
const AppError = require("../utils/AppError");
const organizationModel = require("../models/organizationModel");
// Matches the schema's column widths (VARCHAR(255) for title and
// location). description is TEXT — the 5000 cap is a sanity limit, not
// a schema limit, to keep a runaway paste out of the DB.
const MAX_TITLE = 255;
const MAX_LOCATION = 255;
const MAX_DESCRIPTION = 5000;

// -------------------------------------------------------------
// Validation / normalisation helpers
//
// Why plain functions instead of a validation library: same reasoning
// as authController.js's assertValidCredentials — the rules here are a
// handful of length, presence and ordering checks, and the spec says
// ask before adding dependencies. If validation grows past this,
// that's the point to introduce one.
// -------------------------------------------------------------

function parseEventId(raw) {
  const eventId = Number.parseInt(raw, 10);
  if (!Number.isInteger(eventId) || eventId < 1) {
    throw new AppError(400, "Invalid event id");
  }
  return eventId;
}

function readText(value, fieldName, max) {
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new AppError(400, `${fieldName} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw new AppError(400, `${fieldName} must be ${max} characters or fewer`);
  }
  return trimmed;
}

// Why normalise instead of passing the client's string straight to
// MySQL: the frontend's <input type="datetime-local"> produces
// "2026-08-14T18:30" — no seconds, with a T. MySQL DATETIME wants
// "2026-08-14 18:30:00". Formatting from local date components (not
// toISOString) keeps the wall-clock time the organizer actually typed,
// instead of shifting it by the server's UTC offset.
function toMysqlDateTime(value, fieldName) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, `${fieldName} is not a valid date`);
  }
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

// Why this takes `existing`: on a PUT that sends only { eventEnd }, the
// new end date has to be checked against the event's STORED start date,
// not against nothing. Resolving each value as "the incoming one if
// present, otherwise the stored one" is what makes partial updates
// safe — otherwise an organizer could move an event's end before its
// start in two separate valid-looking requests.
function assertChronology(fields, existing) {
  const resolve = (field, column) => {
    if (fields[field] !== undefined) {
      return fields[field] === null ? null : new Date(fields[field]);
    }
    if (existing && existing[column]) return new Date(existing[column]);
    return null;
  };

  const start = resolve("eventStart", "event_start");
  const end = resolve("eventEnd", "event_end");
  const deadline = resolve("applicationDeadline", "application_deadline");

  if (start && end && end <= start) {
    throw new AppError(400, "eventEnd must be after eventStart");
  }
  if (start && deadline && deadline > start) {
    throw new AppError(400, "applicationDeadline cannot be after eventStart");
  }
}

// Builds the exact field set the model expects, validating as it goes.
// One function for both create and update (`partial: true`) so the two
// paths can't drift into disagreeing about what a valid event is.
function buildEventFields(body = {}, { partial = false, existing = null } = {}) {
  const fields = {};

  if (body.title !== undefined) {
    const title = readText(body.title, "title", MAX_TITLE);
    if (!title) throw new AppError(400, "title cannot be empty");
    fields.title = title;
  } else if (!partial) {
    throw new AppError(400, "title is required");
  }

  if (body.eventStart !== undefined) {
    fields.eventStart = toMysqlDateTime(body.eventStart, "eventStart");
  } else if (!partial) {
    throw new AppError(400, "eventStart is required");
  }

  // Optional columns. An empty string is stored as NULL rather than ""
  // so "no location given" has one representation, not two.
  if (body.description !== undefined) {
    fields.description =
      readText(body.description, "description", MAX_DESCRIPTION) || null;
  }
  if (body.location !== undefined) {
    fields.location = readText(body.location, "location", MAX_LOCATION) || null;
  }
  if (body.eventType !== undefined) {
    // "" is how the form's placeholder option comes back — that's "no
    // type", stored as NULL, not a validation failure. The column is
    // nullable precisely so events can exist without one.
    if (body.eventType === null || body.eventType === "") {
      fields.eventType = null;
    } else if (!eventModel.EVENT_TYPES.includes(body.eventType)) {
      throw new AppError(
        400,
        `eventType must be one of: ${eventModel.EVENT_TYPES.join(", ")}`
      );
    } else {
      fields.eventType = body.eventType;
    }
  }
  if (body.eventEnd !== undefined) {
    fields.eventEnd =
      body.eventEnd === null || body.eventEnd === ""
        ? null
        : toMysqlDateTime(body.eventEnd, "eventEnd");
  }
  if (body.applicationDeadline !== undefined) {
    fields.applicationDeadline =
      body.applicationDeadline === null || body.applicationDeadline === ""
        ? null
        : toMysqlDateTime(body.applicationDeadline, "applicationDeadline");
  }

  if (partial && Object.keys(fields).length === 0) {
    throw new AppError(400, "No updatable fields provided");
  }

  assertChronology(fields, existing);
  return fields;
}

// -------------------------------------------------------------
// Ownership
//
// The single implementation of "can this user manage this event".
// Both PUT and DELETE go through it, so the rule can't drift between
// them — and when event roles are added next, they reuse it too.
// -------------------------------------------------------------
async function loadOwnedEvent(eventId, user) {
  const event = await eventModel.findById(eventId);
  if (!event) throw new AppError(404, "Event not found");

  // Admin support is intentionally minimal for the MVP: admins may
  // manage any event, so the org check simply doesn't apply to them.
  if (user.role === "admin") return event;

  if (Number(event.org_id) !== Number(user.orgId)) {
    throw new AppError(403, "You can only manage events for your own organization");
  }
  return event;
}

// An organizer creates for their own org — the org comes from their
// token, never from the request body, so it can't be spoofed. An admin
// has no org of their own, so they must name one explicitly.
function resolveOrgIdForCreate(req) {
  if (req.user.role === "admin") {
    const orgId = Number.parseInt(req.body?.orgId, 10);
    if (!Number.isInteger(orgId) || orgId < 1) {
      throw new AppError(400, "orgId is required when an admin creates an event");
    }
    return orgId;
  }

  if (!req.user.orgId) {
    throw new AppError(403, "Your account isn't linked to an organization");
  }
  return req.user.orgId;
}

// -------------------------------------------------------------
// POST /events
// -------------------------------------------------------------
async function createEvent(req, res) {
  const orgId = resolveOrgIdForCreate(req);
  const fields = buildEventFields(req.body);
  const org = await organizationModel.findById(req.user.orgId);

  let eventId;

  if (!org || org.status !== "approved") {
    throw new AppError(
        403,
        "Your organization must be approved before creating events."
    );
}
  try {
    eventId = await eventModel.create({
      orgId,
      createdBy: req.user.userId,
      ...fields,
    });
  } catch (err) {
    // Only reachable via the admin path above — an organizer's orgId
    // comes from a token the server signed, so it always exists.
    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      throw new AppError(400, "That organization does not exist");
    }
    throw err;
  }

  // Re-read rather than echoing the input back: the row carries
  // server-side defaults the client never sent (status 'published',
  // created_at), and the contract promises a full `{ event }`.
  const event = await eventModel.findById(eventId);
  res.status(201).json({ event: eventModel.toEventResponse(event) });
}

// -------------------------------------------------------------
// GET /events/mine
// -------------------------------------------------------------
async function listMyEvents(req, res) {
  // Route-level authorize() lets admins in alongside organizers, but
  // "mine" is organizer-scoped by definition and an admin token has no
  // orgId. Saying so beats silently returning an empty list.
  if (!req.user.orgId) {
    throw new AppError(
      400,
      "/events/mine is organizer-scoped — this account has no organization"
    );
  }

  const rows = await eventModel.listByOrg(req.user.orgId);
  const events = rows.map((row) => eventModel.toEventResponse(row));

  // Attach the same roles shape the volunteer endpoints return, via the
  // same query. Without this an organizer couldn't see the capacity they
  // set while volunteers could — the two sides showing different data
  // for one event. One extra query for the whole page, not per event.
  const rolesByEvent = await eventModel.rolesSummaryFor(
    events.map((event) => event.eventId)
  );

  res.json({
    events: events.map((event) => ({
      ...event,
      roles: rolesByEvent.get(event.eventId) ?? [],
    })),
  });
}

// -------------------------------------------------------------
// PUT /events/:eventId
// -------------------------------------------------------------
async function updateEvent(req, res) {
  const eventId = parseEventId(req.params.eventId);
  const existing = await loadOwnedEvent(eventId, req.user);

  const fields = buildEventFields(req.body, { partial: true, existing });
  await eventModel.update(eventId, fields);

  const event = await eventModel.findById(eventId);
  res.json({ event: eventModel.toEventResponse(event) });
}

// -------------------------------------------------------------
// DELETE /events/:eventId
// -------------------------------------------------------------
async function deleteEvent(req, res) {
  const eventId = parseEventId(req.params.eventId);
  await loadOwnedEvent(eventId, req.user);

  try {
    await eventModel.remove(eventId);
  } catch (err) {
    // certificates.event_id has no ON DELETE CASCADE, so MySQL refuses
    // to delete an event that already has certificates issued against
    // it. That's a legitimate outcome, not a bug — report it as a 409
    // instead of letting an FK error become a generic 500.
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      throw new AppError(
        409,
        "This event has certificates issued against it and can no longer be deleted"
      );
    }
    throw err;
  }

  res.status(204).end();
}

module.exports = {
  createEvent,
  listMyEvents,
  updateEvent,
  deleteEvent,
  // Exported for controllers/roleController.js. A role is owned
  // transitively — through the event it belongs to — so the roles
  // endpoints need this exact check. Exporting it beats a second copy
  // that could drift from this one.
  loadOwnedEvent,
};
