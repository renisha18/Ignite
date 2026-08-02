// Why this file exists: all SQL for the Smart Team Builder — reading the
// board (selected volunteers, their skills, the event's roles, who's
// assigned where) and writing assignments.
//
// Organizer-track only. The volunteer's view of their own team comes
// from their journey endpoint, not from here.
//
// THE CONSTRAINT THAT SHAPES THIS FILE: `assignments` has
// UNIQUE (volunteer_id, event_id) with no status qualifier, and
// unassigning is a soft delete (status='cancelled', history kept). So a
// cancelled row still occupies the unique slot, and a volunteer can only
// ever have ONE assignments row per event — for the lifetime of the
// event. Every write below is therefore "insert if absent, otherwise
// UPDATE the existing row". Cancel-then-insert, the obvious way to write
// a move, throws ER_DUP_ENTRY the first time anyone reassigns.
//
// That turns out to be the right thing anyway: a move is a single UPDATE
// statement, so there is no instant at which the volunteer is unassigned.
//
// Depends on: config/db.js
// Depended on by: controllers/assignmentController.js
const pool = require("../config/db");

// ---------------------------------------------------------------------
// Board reads
// ---------------------------------------------------------------------

async function findRolesForEvent(eventId) {
  const [rows] = await pool.query(
    `SELECT role_id AS roleId, title, capacity
       FROM event_roles
      WHERE event_id = ?
      ORDER BY role_id`,
    [eventId]
  );
  return rows;
}

// Every role_skills row for the event, in one query rather than one per
// role. The controller buckets them by roleId.
async function findRoleSkillsForEvent(eventId) {
  const [rows] = await pool.query(
    `SELECT rs.role_id AS roleId, s.skill_id AS skillId, s.name
       FROM role_skills rs
       JOIN skills s      ON s.skill_id = rs.skill_id
       JOIN event_roles r ON r.role_id  = rs.role_id
      WHERE r.event_id = ?
      ORDER BY s.name`,
    [eventId]
  );
  return rows;
}

// The volunteers the Team Builder is allowed to place: those the
// organizer has already decided on. 'applied' hasn't been decided yet,
// 'rejected' and 'withdrawn' are out — filtered in SQL so an ineligible
// volunteer never reaches the board at all.
//
// Sorted reputation DESC here rather than on the client, so the ordering
// rule lives in one place and every skill group inherits it. MySQL sorts
// NULLs last in DESC, which is what we want for a volunteer with no
// profile row.
//
// Column-explicit: this joins `users`, which holds password_hash.
async function findSelectedVolunteersForEvent(eventId) {
  const [rows] = await pool.query(
    `SELECT a.application_id     AS applicationId,
            a.volunteer_id       AS volunteerId,
            a.status             AS applicationStatus,
            u.full_name          AS fullName,
            vp.reputation_score  AS reputationScore,
            pr.role_id           AS preferredRoleId,
            pr.title             AS preferredRoleTitle
       FROM applications a
       JOIN users u                    ON u.user_id       = a.volunteer_id
       LEFT JOIN volunteer_profiles vp ON vp.volunteer_id = a.volunteer_id
       LEFT JOIN event_roles pr        ON pr.role_id      = a.preferred_role_id
      WHERE a.event_id = ?
        AND a.status IN ('selected', 'confirmed')
      ORDER BY vp.reputation_score DESC, u.full_name ASC`,
    [eventId]
  );
  return rows;
}

// mysql2 expands an array into an IN list for `query` (not `execute`).
async function findSkillsForVolunteers(volunteerIds) {
  if (volunteerIds.length === 0) return [];

  const [rows] = await pool.query(
    `SELECT vs.volunteer_id AS volunteerId, s.skill_id AS skillId, s.name
       FROM volunteer_skills vs
       JOIN skills s ON s.skill_id = vs.skill_id
      WHERE vs.volunteer_id IN (?)
      ORDER BY s.name`,
    [volunteerIds]
  );
  return rows;
}

// Only status='assigned'. Cancelled rows are history and must not
// occupy a seat or show on the board.
async function findActiveAssignmentsForEvent(eventId) {
  const [rows] = await pool.query(
    `SELECT assignment_id AS assignmentId,
            volunteer_id  AS volunteerId,
            role_id       AS roleId
       FROM assignments
      WHERE event_id = ? AND status = 'assigned'`,
    [eventId]
  );
  return rows;
}

// ---------------------------------------------------------------------
// Write path
// ---------------------------------------------------------------------

// The application being assigned. Returns the volunteer and event it
// belongs to so the controller can check both against the target role,
// rather than trusting the client to send a consistent pair.
async function findApplicationForAssignment(applicationId, conn = pool) {
  const [[row]] = await conn.query(
    `SELECT application_id AS applicationId,
            volunteer_id   AS volunteerId,
            event_id       AS eventId,
            status
       FROM applications
      WHERE application_id = ?`,
    [applicationId]
  );
  return row || null;
}

// SELECT ... FOR UPDATE, not a plain read. A transaction alone doesn't
// stop two concurrent assignments from both seeing capacity-1 free and
// both writing; locking the role row makes them queue, so the count
// below is read under exclusive access and capacity can't be exceeded.
//
// Must be called inside a transaction — FOR UPDATE outside one releases
// the lock immediately and buys nothing.
async function lockRoleForUpdate(roleId, conn) {
  const [[row]] = await conn.query(
    `SELECT role_id  AS roleId,
            event_id AS eventId,
            title,
            capacity
       FROM event_roles
      WHERE role_id = ?
        FOR UPDATE`,
    [roleId]
  );
  return row || null;
}

// Seats taken in this role, excluding the volunteer being placed.
// Excluding them matters for a move INTO a role they already occupy —
// without it they'd be counted against their own capacity check.
async function countAssignedForRole(roleId, excludeVolunteerId, conn) {
  const [[row]] = await conn.query(
    `SELECT COUNT(*) AS assignedCount
       FROM assignments
      WHERE role_id = ?
        AND status = 'assigned'
        AND volunteer_id <> ?`,
    [roleId, excludeVolunteerId]
  );
  return Number(row.assignedCount);
}

// The volunteer's existing row for this event, in ANY status — a
// cancelled one still blocks an insert, and is what gets revived when
// they're assigned again.
async function findAssignmentForVolunteerAndEvent(volunteerId, eventId, conn = pool) {
  const [[row]] = await conn.query(
    `SELECT assignment_id AS assignmentId,
            role_id       AS roleId,
            status
       FROM assignments
      WHERE volunteer_id = ? AND event_id = ?`,
    [volunteerId, eventId]
  );
  return row || null;
}

async function insertAssignment(
  { applicationId, volunteerId, eventId, roleId, assignedBy },
  conn = pool
) {
  const [result] = await conn.query(
    `INSERT INTO assignments
       (application_id, volunteer_id, event_id, role_id, assigned_by)
     VALUES (?, ?, ?, ?, ?)`,
    [applicationId, volunteerId, eventId, roleId, assignedBy]
  );
  return result.insertId;
}

// Moves an existing row to a new role, and revives it if it was
// cancelled. One statement, so a move is atomic by construction.
// assigned_at is refreshed because this is a new placement decision.
async function moveAssignment(
  assignmentId,
  { applicationId, roleId, assignedBy },
  conn = pool
) {
  const [result] = await conn.query(
    `UPDATE assignments
        SET role_id        = ?,
            application_id = ?,
            assigned_by    = ?,
            status         = 'assigned',
            assigned_at    = CURRENT_TIMESTAMP
      WHERE assignment_id  = ?`,
    [roleId, applicationId, assignedBy, assignmentId]
  );
  return result.affectedRows;
}

async function findAssignmentById(assignmentId) {
  const [[row]] = await pool.query(
    `SELECT assignment_id  AS assignmentId,
            application_id AS applicationId,
            volunteer_id   AS volunteerId,
            event_id       AS eventId,
            role_id        AS roleId,
            status
       FROM assignments
      WHERE assignment_id = ?`,
    [assignmentId]
  );
  return row || null;
}

// Soft delete, per the contract: the row stays so the volunteer's
// history survives, and because the UNIQUE constraint means this same
// row is what gets revived if they're assigned again later.
async function cancelAssignment(assignmentId, conn = pool) {
  const [result] = await conn.query(
    `UPDATE assignments SET status = 'cancelled' WHERE assignment_id = ?`,
    [assignmentId]
  );
  return result.affectedRows;
}

// Name and reputation for one volunteer, for the POST response. Named
// columns only — see findSelectedVolunteersForEvent.
async function findVolunteerSummary(volunteerId) {
  const [[row]] = await pool.query(
    `SELECT u.user_id           AS volunteerId,
            u.full_name         AS fullName,
            vp.reputation_score AS reputationScore
       FROM users u
       LEFT JOIN volunteer_profiles vp ON vp.volunteer_id = u.user_id
      WHERE u.user_id = ?`,
    [volunteerId]
  );
  return row || null;
}

async function findSkillsForRole(roleId) {
  const [rows] = await pool.query(
    `SELECT s.skill_id AS skillId, s.name
       FROM role_skills rs
       JOIN skills s ON s.skill_id = rs.skill_id
      WHERE rs.role_id = ?
      ORDER BY s.name`,
    [roleId]
  );
  return rows;
}

module.exports = {
  // board reads
  findRolesForEvent,
  findRoleSkillsForEvent,
  findSelectedVolunteersForEvent,
  findSkillsForVolunteers,
  findActiveAssignmentsForEvent,

  // write path
  findApplicationForAssignment,
  lockRoleForUpdate,
  countAssignedForRole,
  findAssignmentForVolunteerAndEvent,
  insertAssignment,
  moveAssignment,
  findAssignmentById,
  cancelAssignment,

  // single-record reads for the POST response
  findVolunteerSummary,
  findSkillsForRole,
};
