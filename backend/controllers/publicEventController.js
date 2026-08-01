// Why this file exists: the volunteer/public read side of events.
// Kept separate from the organizer's event controller (not yet built)
// so the two tracks never edit the same file — see docs/api-contract.md,
// File ownership.
//
// Thin by design: no SQL here, no business rules beyond validating
// input and turning "not visible" into a 404. Visibility (published +
// approved org) is enforced in the model, so it can't be forgotten by
// a future caller.
//
// Depends on: models/eventModel.js, utils/AppError.js
// Depended on by: routes/publicEventRoutes.js
const eventModel = require("../models/eventModel");
const AppError = require("../utils/AppError");

// Parses an optional positive-integer query param. Returns undefined
// when absent or blank (an empty select in the UI sends ""), throws a
// 400 on anything that isn't a positive integer — so a typo'd URL gets
// a clear error instead of silently returning the unfiltered list.
function optionalPositiveInt(value, fieldName) {
  if (value === undefined || value === "") return undefined;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new AppError(400, `${fieldName} must be a positive integer`);
  }
  return parsed;
}

// Trims a string param and collapses blank/whitespace-only input to
// undefined, so `?search=` and `?search=%20` behave as "no filter"
// rather than matching everything with a LIKE '%%'.
function optionalString(value) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

// GET /events
// query: status (default 'published'), search, skillId, location
// returns: { events: [...] }
async function listEvents(req, res) {
  const status = req.query.status ?? "published";

  if (!eventModel.EVENT_STATUSES.includes(status)) {
    throw new AppError(
      400,
      `status must be one of: ${eventModel.EVENT_STATUSES.join(", ")}`
    );
  }

  const events = await eventModel.listPublishedEvents({
    status,
    search: optionalString(req.query.search),
    location: optionalString(req.query.location),
    skillId: optionalPositiveInt(req.query.skillId, "skillId"),
  });

  res.json({ events });
}

// GET /events/skills
// returns: { skills: [{ skillId, name }] }
async function listSkills(req, res) {
  const skills = await eventModel.listFilterSkills();
  res.json({ skills });
}

// GET /events/:eventId
// returns: { event, roles: [...] }  — shape per docs/api-contract.md
async function getEvent(req, res) {
  const eventId = optionalPositiveInt(req.params.eventId, "eventId");
  if (eventId === undefined) {
    throw new AppError(400, "eventId must be a positive integer");
  }

  const found = await eventModel.findEventWithRolesById(eventId);
  if (!found) {
    // 404 rather than 403 for an unpublished event or unapproved org —
    // don't leak that a hidden event exists at this id.
    throw new AppError(404, "Event not found");
  }

  const { roles, ...event } = found;
  res.json({ event, roles });
}

module.exports = { listEvents, listSkills, getEvent };
