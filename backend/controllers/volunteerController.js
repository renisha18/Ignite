// Why this file exists: the volunteer track's own controller — profile
// read/edit now, and later apply/withdraw, my-applications and journey.
// Separate from the organizer's controllers so the two tracks never
// edit the same file (docs/api-contract.md, File ownership).
//
// Thin by design: validation and shaping here, all SQL in the models.
//
// Depends on: models/volunteerProfileModel.js, models/skillModel.js,
// utils/AppError.js
// Depended on by: routes/volunteerRoutes.js, routes/skillRoutes.js
const volunteerProfileModel = require("../models/volunteerProfileModel");
const skillModel = require("../models/skillModel");
const applicationModel = require("../models/applicationModel");
const assignmentModel = require("../models/assignmentModel");
const eventModel = require("../models/eventModel");
const AppError = require("../utils/AppError");

// volunteer_profiles.location is VARCHAR(255). Validating here means an
// over-long value is a clear 400 rather than a silent MySQL truncation
// (or a 1406 error, depending on strict mode) that loses the user's input.
const MAX_LOCATION = 255;

// Optional free-text field. Absent -> undefined (don't touch the
// column). Present -> must be a string; trimmed, and blank collapses to
// null so "clear my bio" actually clears it rather than storing "".
function optionalText(value, fieldName, maxLength) {
  if (value === undefined) return undefined;

  if (value === null) return null;

  if (typeof value !== "string") {
    throw new AppError(400, `${fieldName} must be a string`);
  }

  const trimmed = value.trim();
  if (maxLength && trimmed.length > maxLength) {
    throw new AppError(
      400,
      `${fieldName} must be ${maxLength} characters or fewer`
    );
  }

  return trimmed === "" ? null : trimmed;
}

// Absent -> undefined ("leave my skills alone"). Present -> must be an
// array of positive integers. An empty array is valid and means "remove
// all my skills"; that distinction is the whole point of a partial
// update, so it's preserved rather than collapsed to undefined.
function parseSkillIds(value) {
  if (value === undefined) return undefined;

  if (!Array.isArray(value)) {
    throw new AppError(400, "skillIds must be an array");
  }

  const parsed = value.map((raw) => {
    const id = Number(raw);
    if (!Number.isInteger(id) || id < 1) {
      throw new AppError(400, "skillIds must contain positive integers");
    }
    return id;
  });

  // volunteer_skills PK is (volunteer_id, skill_id), so a duplicate in
  // the payload would blow up the bulk INSERT. De-dupe instead of
  // rejecting — a UI sending the same skill twice is a client bug, not
  // something the volunteer should have to fix.
  return [...new Set(parsed)];
}

// GET /skills — reference data, no auth (see routes/skillRoutes.js).
// returns: { skills: [{ skillId, name }] }
async function listSkills(req, res) {
  const skills = await skillModel.listAll();
  res.json({ skills });
}

// POST /skills — add a skill that isn't in the list yet.
// body: { name }
// returns: { skill: { skillId, name }, created }
//
// Idempotent by name: asking for a skill that already exists returns it
// with created:false rather than 409. The caller's intent is "I want to
// be able to select this", and it already can — an error would just
// make the UI handle a non-problem.
//
// Authenticated but not role-restricted: the volunteer's profile picker
// needs it, and so will the organizer's event-role form.
async function createSkill(req, res) {
  const name = optionalText(req.body?.name, "name", 100); // skills.name is VARCHAR(100)

  if (name === undefined || name === null) {
    throw new AppError(400, "A skill name is required");
  }

  // Collapse internal whitespace so "First  Aid" and "First Aid" don't
  // become two rows — the DB's case-insensitive collation handles case,
  // but not spacing.
  const normalised = name.replace(/\s+/g, " ");

  const existing = await skillModel.findByNameInsensitive(normalised);
  if (existing) {
    return res.json({ skill: existing, created: false });
  }

  const skill = await skillModel.createSkill(normalised);
  return res
    .status(skill.created ? 201 : 200)
    .json({ skill: { skillId: skill.skillId, name: skill.name }, created: skill.created });
}

// GET /volunteers/me/profile
// returns: { profile }
async function getMyProfile(req, res) {
  const profile = await volunteerProfileModel.findProfile(req.user.userId);

  if (!profile) {
    // Registration creates the volunteer_profiles row in the same
    // transaction as the user, so this only fires if the row was
    // deleted or the account was made directly in SQL without one.
    throw new AppError(404, "Volunteer profile not found");
  }

  res.json({ profile });
}

// PUT /volunteers/me/profile
// body: { bio?, location?, skillIds?: [] }
// returns: { profile } — re-read after the write
async function updateMyProfile(req, res) {
  const volunteerId = req.user.userId;

  const bio = optionalText(req.body?.bio, "bio");
  const location = optionalText(req.body?.location, "location", MAX_LOCATION);
  const skillIds = parseSkillIds(req.body?.skillIds);

  if (bio === undefined && location === undefined && skillIds === undefined) {
    throw new AppError(400, "Nothing to update — send bio, location or skillIds");
  }

  // Check the ids exist before the transaction opens. volunteer_skills
  // FKs to skills, so an unknown id would otherwise surface as an
  // opaque 500 from the FK constraint instead of a usable message.
  if (skillIds !== undefined && skillIds.length > 0) {
    const existing = await skillModel.findExistingIds(skillIds);
    const unknown = skillIds.filter((id) => !existing.includes(id));
    if (unknown.length > 0) {
      throw new AppError(400, `Unknown skillIds: ${unknown.join(", ")}`);
    }
  }

  // Guard before writing: saveProfile would otherwise report success
  // having updated zero rows for a user with no profile.
  const existingProfile = await volunteerProfileModel.findProfile(volunteerId);
  if (!existingProfile) {
    throw new AppError(404, "Volunteer profile not found");
  }

  const profile = await volunteerProfileModel.saveProfile(volunteerId, {
    bio,
    location,
    skillIds,
  });

  res.json({ profile });
}

// ---------------------------------------------------------------------
// Applications — apply / list mine / withdraw
// ---------------------------------------------------------------------

// applications.motivation is TEXT (65535 bytes), but an unbounded
// textarea is an invitation to paste a novel. Capped at something a
// human would actually write, and rejected clearly rather than truncated.
const MAX_MOTIVATION = 2000;

function requirePositiveInt(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new AppError(400, `${fieldName} must be a positive integer`);
  }
  return parsed;
}

// POST /events/:eventId/apply
// body: { preferredRoleId?, motivation? }
// returns: { application }
async function applyToEvent(req, res) {
  const volunteerId = req.user.userId;
  const eventId = requirePositiveInt(req.params.eventId, "eventId");

  // Reuses the volunteer-visible lookup, which already enforces
  // status='published' AND organization approved. That means a
  // volunteer can't apply to an event they couldn't have seen by
  // guessing its id — the visibility rule and the apply rule can't
  // drift apart, because they're the same query.
  const event = await eventModel.findEventWithRolesById(eventId);
  if (!event) {
    throw new AppError(404, "Event not found");
  }

  // application_deadline is nullable — NULL means no deadline, not
  // "expired". Compared server-side; never trust a client clock.
  if (event.applicationDeadline && new Date(event.applicationDeadline) < new Date()) {
    throw new AppError(400, "The application deadline for this event has passed");
  }

  let preferredRoleId;
  if (req.body?.preferredRoleId !== undefined && req.body.preferredRoleId !== null && req.body.preferredRoleId !== "") {
    preferredRoleId = requirePositiveInt(req.body.preferredRoleId, "preferredRoleId");

    // preferred_role_id FKs event_roles, which would happily accept a
    // role from a DIFFERENT event. Checking membership here is what
    // stops someone applying to Event A for a role on Event B.
    const belongsToEvent = event.roles.some((role) => role.roleId === preferredRoleId);
    if (!belongsToEvent) {
      throw new AppError(400, "preferredRoleId is not a role on this event");
    }
  }

  const motivation = optionalText(req.body?.motivation, "motivation", MAX_MOTIVATION);

  // UNIQUE (volunteer_id, event_id) allows exactly one row per pair, in
  // ANY status — so a withdrawn application still blocks re-applying.
  // Checked up front to give a message naming the current status.
  const existing = await applicationModel.findByVolunteerAndEvent(volunteerId, eventId);
  if (existing) {
    throw new AppError(
      409,
      existing.status === "withdrawn"
        ? "You withdrew from this event — applications can't be reopened"
        : `You've already applied to this event (status: ${existing.status})`
    );
  }

  let applicationId;
  try {
    applicationId = await applicationModel.createApplication({
      volunteerId,
      eventId,
      preferredRoleId,
      motivation,
    });
  } catch (err) {
    // Two clicks landing at once beat the check above. The constraint
    // is the real guard; this turns its raw error into the same 409.
    if (err.code === "ER_DUP_ENTRY") {
      throw new AppError(409, "You've already applied to this event");
    }
    // No volunteer_profiles row — only possible for an account created
    // directly in SQL, since registration makes one in the same
    // transaction as the user.
    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      throw new AppError(404, "Volunteer profile not found");
    }
    throw err;
  }

  const application = await applicationModel.findById(applicationId);
  res.status(201).json({ application });
}

// GET /volunteers/me/applications
// returns: { applications: [...] }
async function getMyApplications(req, res) {
  const applications = await applicationModel.findApplicationsByVolunteerId(
    req.user.userId
  );
  res.json({ applications });
}

// PATCH /applications/:applicationId/withdraw
// returns: { application }
async function withdrawMyApplication(req, res) {
  const volunteerId = req.user.userId;
  const applicationId = requirePositiveInt(req.params.applicationId, "applicationId");

  const application = await applicationModel.findById(applicationId);

  // 404 rather than 403 when it belongs to someone else: a volunteer
  // shouldn't be able to probe which application ids exist.
  if (!application || application.volunteerId !== volunteerId) {
    throw new AppError(404, "Application not found");
  }

  const affected = await applicationModel.withdrawApplication(applicationId, volunteerId);

  if (affected === 0) {
    // The UPDATE's status guard rejected it. Re-read rather than trust
    // the status we fetched a moment ago — an organizer may have just
    // changed it, and the fresh value is what the message should name.
    const current = await applicationModel.findById(applicationId);
    throw new AppError(
      400,
      current?.status === "withdrawn"
        ? "You've already withdrawn from this event"
        : `An application that's already ${current?.status} can't be withdrawn`
    );
  }

  res.json({ application: await applicationModel.findById(applicationId) });
}

// ---------------------------------------------------------------------
// My Journey
// ---------------------------------------------------------------------

// GET /volunteers/me/journey
// returns: { journey: [...] }
//
// Thin by design — the whole timeline is one live join, so there's
// nothing to assemble here. Newest event first, per the contract.
async function getMyJourney(req, res) {
  const journey = await assignmentModel.findJourneyForVolunteer(req.user.userId);
  res.json({ journey });
}

module.exports = {
  listSkills,
  createSkill,
  getMyProfile,
  updateMyProfile,
  applyToEvent,
  getMyApplications,
  withdrawMyApplication,
  getMyJourney,
};
