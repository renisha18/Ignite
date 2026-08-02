// Why this file exists: the Smart Team Builder's server side — building
// the board in one response, and placing/removing volunteers.
//
// Like roles and applications, an assignment is owned transitively
// through its event's organization, so every handler resolves the event
// and runs eventController's loadOwnedEvent against it.
//
// Depends on: models/assignmentModel.js, controllers/eventController.js
// (loadOwnedEvent), config/db.js (transactions), utils/AppError.js
// Depended on by: routes/assignmentRoutes.js
const assignmentModel = require("../models/assignmentModel");
const { loadOwnedEvent } = require("./eventController");
const pool = require("../config/db");
const AppError = require("../utils/AppError");

// Volunteers with no skills still need somewhere to live on the board.
// Without this group they'd be selected but invisible, and therefore
// impossible to drag anywhere — silently unassignable.
const UNSKILLED_GROUP_NAME = "No skills listed";

function parseId(raw, fieldName) {
  const id = Number.parseInt(raw, 10);
  if (!Number.isInteger(id) || id < 1) {
    throw new AppError(400, `Invalid ${fieldName}`);
  }
  return id;
}

// DECIMAL comes back from mysql2 as a string; the client shouldn't have
// to guess whether reputation is a number.
function toNumberOrNull(value) {
  return value === null || value === undefined ? null : Number(value);
}

// A role can require several skills. "Mismatch" means the volunteer is
// missing at least one of them — the stricter reading, and the one that
// lets the warning name what's actually absent. A role with no required
// skills can never mismatch, so an unconfigured role never nags.
//
// One helper used by both the board and the POST response, so the two
// can't disagree about whether a given pairing is a mismatch.
function computeSkillGap(requiredSkills, volunteerSkillIds) {
  const missing = requiredSkills
    .filter((skill) => !volunteerSkillIds.has(skill.skillId))
    .map((skill) => skill.name);

  return { skillMismatch: missing.length > 0, missingSkills: missing };
}

function groupBy(rows, key) {
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row[key])) map.set(row[key], []);
    map.get(row[key]).push(row);
  }
  return map;
}

// -------------------------------------------------------------
// GET /events/:eventId/candidates
//
// One response, everything the board needs. Reshaped from the
// contract's original role-grouped `candidates` list because the board
// renders two independent views of the same data — volunteers grouped
// by their own skills on the left, roles on the right — and a
// role-grouped payload can only serve one of them.
// -------------------------------------------------------------
async function getBoard(req, res) {
  const eventId = parseId(req.params.eventId, "event id");
  const event = await loadOwnedEvent(eventId, req.user);

  // Independent queries — no reason to await them in sequence.
  const [roleRows, roleSkillRows, volunteerRows, assignmentRows] = await Promise.all([
    assignmentModel.findRolesForEvent(eventId),
    assignmentModel.findRoleSkillsForEvent(eventId),
    assignmentModel.findSelectedVolunteersForEvent(eventId),
    assignmentModel.findActiveAssignmentsForEvent(eventId),
  ]);

  // Depends on the volunteer list, so it can't join the batch above.
  const skillRows = await assignmentModel.findSkillsForVolunteers(
    volunteerRows.map((row) => row.volunteerId)
  );

  const skillsByVolunteer = groupBy(skillRows, "volunteerId");
  const skillsByRole = groupBy(roleSkillRows, "roleId");
  const assignmentByVolunteer = new Map(
    assignmentRows.map((row) => [row.volunteerId, row])
  );

  const roleById = new Map(roleRows.map((row) => [row.roleId, row]));

  // --- volunteers (already sorted reputation DESC by the query) ---
  const volunteers = volunteerRows.map((row) => {
    const skills = (skillsByVolunteer.get(row.volunteerId) ?? []).map((s) => ({
      skillId: s.skillId,
      name: s.name,
    }));
    const active = assignmentByVolunteer.get(row.volunteerId) ?? null;

    return {
      volunteerId: row.volunteerId,
      applicationId: row.applicationId,
      applicationStatus: row.applicationStatus,
      fullName: row.fullName,
      reputationScore: toNumberOrNull(row.reputationScore),
      skills,
      preferredRole: row.preferredRoleId
        ? { roleId: row.preferredRoleId, title: row.preferredRoleTitle }
        : null,
      assignment: active
        ? {
            assignmentId: active.assignmentId,
            roleId: active.roleId,
            roleTitle: roleById.get(active.roleId)?.title ?? null,
          }
        : null,
    };
  });

  const volunteerById = new Map(volunteers.map((v) => [v.volunteerId, v]));

  // --- roles, each carrying its assigned volunteers ---
  const roles = roleRows.map((row) => {
    const requiredSkills = (skillsByRole.get(row.roleId) ?? []).map((s) => ({
      skillId: s.skillId,
      name: s.name,
    }));

    const assignments = assignmentRows
      .filter((assignment) => assignment.roleId === row.roleId)
      .map((assignment) => {
        const volunteer = volunteerById.get(assignment.volunteerId);
        const ownSkillIds = new Set((volunteer?.skills ?? []).map((s) => s.skillId));

        return {
          assignmentId: assignment.assignmentId,
          volunteerId: assignment.volunteerId,
          fullName: volunteer?.fullName ?? null,
          reputationScore: volunteer?.reputationScore ?? null,
          ...computeSkillGap(requiredSkills, ownSkillIds),
        };
      });

    return {
      roleId: row.roleId,
      title: row.title,
      capacity: row.capacity,
      assignedCount: assignments.length,
      requiredSkills,
      assignments,
    };
  });

  // --- skill groups: the left-hand columns ---
  //
  // Reference lists. A volunteer appears under EVERY skill they hold and
  // stays there after being assigned — only their `assignment` field
  // changes, which is what drives the Assigned badge. Ids rather than
  // copies, so a volunteer in three groups is stored once.
  const groupsBySkill = new Map();
  const unskilled = [];

  for (const volunteer of volunteers) {
    if (volunteer.skills.length === 0) {
      unskilled.push(volunteer.volunteerId);
      continue;
    }
    for (const skill of volunteer.skills) {
      if (!groupsBySkill.has(skill.skillId)) {
        groupsBySkill.set(skill.skillId, {
          skillId: skill.skillId,
          name: skill.name,
          volunteerIds: [],
        });
      }
      // Pushed in `volunteers` order, so every group inherits the
      // reputation-DESC sort without re-sorting per group.
      groupsBySkill.get(skill.skillId).volunteerIds.push(volunteer.volunteerId);
    }
  }

  const skillGroups = [...groupsBySkill.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // Always last: it's a fallback bucket, not a skill.
  if (unskilled.length > 0) {
    skillGroups.push({
      skillId: null,
      name: UNSKILLED_GROUP_NAME,
      volunteerIds: unskilled,
    });
  }

  res.json({
    event: { eventId: event.event_id, title: event.title },
    roles,
    volunteers,
    skillGroups,
  });
}

// -------------------------------------------------------------
// POST /assignments   { applicationId, roleId }
//
// Handles both first placement and moving between roles — the client
// doesn't need a separate move call. Which one happens is decided by
// whether an assignments row already exists, not by the caller.
// -------------------------------------------------------------
async function createAssignment(req, res) {
  const applicationId = parseId(req.body?.applicationId, "applicationId");
  const roleId = parseId(req.body?.roleId, "roleId");

  const application = await assignmentModel.findApplicationForAssignment(applicationId);
  if (!application) throw new AppError(404, "Application not found");

  await loadOwnedEvent(application.eventId, req.user);

  // Only volunteers the organizer has already decided on can be placed.
  if (!["selected", "confirmed"].includes(application.status)) {
    throw new AppError(
      409,
      `This volunteer's application is '${application.status}' — select them on the Applications page first`
    );
  }

  let assignmentId;
  let previousRoleId = null;
  let roleTitle;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Locks the role row for the rest of the transaction. Everything
    // below — the capacity read and the write — happens while
    // concurrent assignments to this same role wait their turn, which is
    // what makes the capacity check truthful rather than advisory.
    const role = await assignmentModel.lockRoleForUpdate(roleId, conn);
    if (!role) throw new AppError(404, "Role not found");

    // A role from another event would let an organizer place someone
    // into an event they never applied to.
    if (Number(role.eventId) !== Number(application.eventId)) {
      throw new AppError(400, "That role belongs to a different event");
    }
    roleTitle = role.title;

    const existing = await assignmentModel.findAssignmentForVolunteerAndEvent(
      application.volunteerId,
      application.eventId,
      conn
    );

    // Already sitting in the target role: a repeated drop is a no-op,
    // not an error. Handled as a normal branch rather than an early
    // return so the transaction still commits and releases exactly once.
    const alreadyInRole =
      existing && existing.status === "assigned" && Number(existing.roleId) === roleId;

    if (alreadyInRole) {
      assignmentId = existing.assignmentId;
      previousRoleId = roleId;
    } else {
      const taken = await assignmentModel.countAssignedForRole(
        roleId,
        application.volunteerId,
        conn
      );
      if (taken >= role.capacity) {
        throw new AppError(409, `${role.title} role is already full.`);
      }

      if (existing) {
        // UPDATE, never cancel-then-insert: UNIQUE (volunteer_id,
        // event_id) means the row can't be duplicated, and a single
        // statement leaves no instant where the volunteer is unassigned.
        // Also revives a previously cancelled row.
        previousRoleId = existing.status === "assigned" ? Number(existing.roleId) : null;
        await assignmentModel.moveAssignment(
          existing.assignmentId,
          { applicationId, roleId, assignedBy: req.user.userId },
          conn
        );
        assignmentId = existing.assignmentId;
      } else {
        assignmentId = await assignmentModel.insertAssignment(
          {
            applicationId,
            volunteerId: application.volunteerId,
            eventId: application.eventId,
            roleId,
            assignedBy: req.user.userId,
          },
          conn
        );
      }
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const assignment = await buildAssignmentResponse({
    assignmentId,
    applicationId,
    volunteerId: application.volunteerId,
    eventId: application.eventId,
    roleId,
    roleTitle,
    previousRoleId,
  });

  res.status(201).json({ assignment });
}

// Everything the client needs to update its board in place, so it never
// has to refetch: the card's display fields, the skill-mismatch verdict
// computed here rather than on the client, and previousRoleId so the
// card can be removed from the role it came from.
async function buildAssignmentResponse({
  assignmentId,
  applicationId,
  volunteerId,
  eventId,
  roleId,
  roleTitle,
  previousRoleId,
}) {
  const [volunteer, requiredSkills, ownSkills] = await Promise.all([
    assignmentModel.findVolunteerSummary(volunteerId),
    assignmentModel.findSkillsForRole(roleId),
    assignmentModel.findSkillsForVolunteers([volunteerId]),
  ]);

  const ownSkillIds = new Set(ownSkills.map((skill) => skill.skillId));

  return {
    assignmentId,
    applicationId,
    volunteerId,
    eventId,
    roleId,
    roleTitle,
    fullName: volunteer?.fullName ?? null,
    reputationScore: toNumberOrNull(volunteer?.reputationScore),
    status: "assigned",
    // null when this was a first placement (or a revived cancelled row);
    // the id of the role they came from when it was a move.
    previousRoleId,
    ...computeSkillGap(requiredSkills, ownSkillIds),
  };
}

// -------------------------------------------------------------
// DELETE /assignments/:assignmentId
// -------------------------------------------------------------
async function deleteAssignment(req, res) {
  const assignmentId = parseId(req.params.assignmentId, "assignment id");

  const assignment = await assignmentModel.findAssignmentById(assignmentId);
  if (!assignment) throw new AppError(404, "Assignment not found");

  await loadOwnedEvent(assignment.eventId, req.user);

  // Soft delete — the row survives as history, and is the same row that
  // gets revived if this volunteer is assigned again later.
  await assignmentModel.cancelAssignment(assignmentId);

  res.status(204).end();
}

module.exports = { getBoard, createAssignment, deleteAssignment };
