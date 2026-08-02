// Why this file exists: the write side of event_roles — the categories
// an event needs volunteers for, and how many each one takes. Kept out
// of eventController.js because roles are their own resource with their
// own URLs (two of the three aren't even nested under /events).
//
// A role has no owner of its own: it's owned transitively, through its
// event's organization. Every handler here therefore resolves the role's
// event first and runs eventController's loadOwnedEvent against it, so
// roles and events can't disagree about who's allowed to touch what.
//
// Depends on: models/eventModel.js, controllers/eventController.js
// (loadOwnedEvent), utils/AppError.js
// Depended on by: routes/roleRoutes.js
const eventModel = require("../models/eventModel");
const { loadOwnedEvent } = require("./eventController");
const AppError = require("../utils/AppError");
const pool = require("../config/db");

// event_roles.title is VARCHAR(150) in the locked schema — narrower
// than events.title, so don't copy the 255 from eventController.
const MAX_ROLE_TITLE = 150;

function parseId(raw, fieldName) {
  const id = Number.parseInt(raw, 10);
  if (!Number.isInteger(id) || id < 1) {
    throw new AppError(400, `Invalid ${fieldName}`);
  }
  return id;
}

function readTitle(value) {
  if (typeof value !== "string") {
    throw new AppError(400, "title must be a string");
  }
  const trimmed = value.trim();
  if (!trimmed) throw new AppError(400, "title is required");
  if (trimmed.length > MAX_ROLE_TITLE) {
    throw new AppError(400, `title must be ${MAX_ROLE_TITLE} characters or fewer`);
  }
  return trimmed;
}

// The "number of participants required for this category". NOT NULL in
// the schema, and a role that takes zero volunteers is meaningless, so
// this is a strict positive integer — "3.5" and "0" are both rejected
// rather than silently truncated by MySQL.
function readCapacity(value) {
  if (value === undefined || value === null || value === "") {
    throw new AppError(400, "capacity is required");
  }
  const capacity = Number(value);
  if (!Number.isInteger(capacity) || capacity < 1) {
    throw new AppError(400, "capacity must be a positive integer");
  }
  return capacity;
}

// Deduped: role_skills has a composite primary key, so the same skill
// twice in one array would be a duplicate-key error rather than a
// no-op. Callers shouldn't have to know that.
function readSkillIds(value) {
  if (!Array.isArray(value)) {
    throw new AppError(400, "skillIds must be an array");
  }
  const ids = value.map((raw) => {
    const skillId = Number(raw);
    if (!Number.isInteger(skillId) || skillId < 1) {
      throw new AppError(400, "skillIds must be positive integers");
    }
    return skillId;
  });
  return [...new Set(ids)];
}

// A skillId that isn't in `skills` trips the FK. That's the caller's
// mistake, not a server fault, so report it as a 400.
function rethrowSkillFkAs400(err) {
  if (err.code === "ER_NO_REFERENCED_ROW_2" || err.code === "ER_NO_REFERENCED_ROW") {
    throw new AppError(400, "One or more skillIds don't exist");
  }
  throw err;
}

// -------------------------------------------------------------
// POST /events/:eventId/roles
// -------------------------------------------------------------
async function createRole(req, res) {
  const eventId = parseId(req.params.eventId, "event id");
  await loadOwnedEvent(eventId, req.user);

  const title = readTitle(req.body?.title);
  const capacity = readCapacity(req.body?.capacity);
  const skillIds =
    req.body?.skillIds === undefined ? [] : readSkillIds(req.body.skillIds);

  let roleId;
  if (skillIds.length === 0) {
    // Single insert — nothing to roll back.
    roleId = await eventModel.createRole({ eventId, title, capacity });
  } else {
    // Role + its skills must land together: a role that silently lost
    // its skill requirements would mis-rank every candidate the Smart
    // Team Builder later suggests for it.
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      roleId = await eventModel.createRole({ eventId, title, capacity }, conn);
      await eventModel.replaceRoleSkills(roleId, skillIds, conn);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      rethrowSkillFkAs400(err);
    } finally {
      conn.release();
    }
  }

  const role = await eventModel.findRoleById(roleId);
  res.status(201).json({ role: eventModel.toRoleResponse(role) });
}

// -------------------------------------------------------------
// PUT /roles/:roleId
// -------------------------------------------------------------
async function updateRole(req, res) {
  const roleId = parseId(req.params.roleId, "role id");

  const existing = await eventModel.findRoleById(roleId);
  if (!existing) throw new AppError(404, "Role not found");
  await loadOwnedEvent(existing.event_id, req.user);

  const fields = {};

  if (req.body?.title !== undefined) {
    fields.title = readTitle(req.body.title);
  }

  if (req.body?.capacity !== undefined) {
    const capacity = readCapacity(req.body.capacity);

    // Cutting capacity below the number of volunteers already holding a
    // seat would leave assignments the role can't accommodate. Refuse
    // rather than quietly over-filling it — the organizer needs to
    // unassign someone first, which is a deliberate act.
    const assigned = await eventModel.countAssignmentsForRole(roleId);
    if (capacity < assigned) {
      throw new AppError(
        409,
        `${assigned} volunteer${assigned === 1 ? " is" : "s are"} already assigned to this role — unassign someone before lowering capacity to ${capacity}`
      );
    }
    fields.capacity = capacity;
  }

  const skillIds =
    req.body?.skillIds === undefined ? undefined : readSkillIds(req.body.skillIds);

  if (Object.keys(fields).length === 0 && skillIds === undefined) {
    throw new AppError(400, "No updatable fields provided");
  }

  if (skillIds === undefined) {
    await eventModel.updateRole(roleId, fields);
  } else {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await eventModel.updateRole(roleId, fields, conn);
      await eventModel.replaceRoleSkills(roleId, skillIds, conn);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      rethrowSkillFkAs400(err);
    } finally {
      conn.release();
    }
  }

  const role = await eventModel.findRoleById(roleId);
  res.json({ role: eventModel.toRoleResponse(role) });
}

// -------------------------------------------------------------
// DELETE /roles/:roleId
// -------------------------------------------------------------
async function deleteRole(req, res) {
  const roleId = parseId(req.params.roleId, "role id");

  const existing = await eventModel.findRoleById(roleId);
  if (!existing) throw new AppError(404, "Role not found");
  await loadOwnedEvent(existing.event_id, req.user);

  try {
    await eventModel.removeRole(roleId);
  } catch (err) {
    // role_skills cascades away, but applications.preferred_role_id and
    // assignments.role_id are plain FKs — a role someone applied for or
    // was assigned to can't be deleted without destroying that history.
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      throw new AppError(
        409,
        "Volunteers have already applied for or been assigned to this role, so it can no longer be deleted"
      );
    }
    throw err;
  }

  res.status(204).end();
}

module.exports = { createRole, updateRole, deleteRole };
