// Why this file exists: all SQL touching `applications` lives here so
// controllers stay thin and both tracks reuse the same queries.
//
// SHARED FILE (see docs/api-contract.md, File ownership). The organizer
// track will append its own functions here — GET /events/:id/applications
// and PATCH /applications/:id (accept/reject). Nothing of theirs existed
// when this was created, so the three functions below are the initial
// set, not a modification of anyone's. Append freely; don't change an
// existing signature or query without telling the other track.
//
// Depends on: config/db.js
// Depended on by: controllers/volunteerController.js (volunteer track)
const pool = require("../config/db");

// Statuses a volunteer is allowed to withdraw from.
//
// 'confirmed' is excluded deliberately: at that point the organizer has
// locked them into a team and (per the Smart Team Builder flow) may
// already have assigned them a role. Backing out is a conversation with
// the organizer, not a button. 'rejected' and 'withdrawn' are terminal.
const WITHDRAWABLE_STATUSES = ["applied", "selected"];

// One row per volunteer per event, enforced by
// UNIQUE (volunteer_id, event_id) in the locked schema.
//
// Returns the existing application if there is one, else null. The
// controller uses this to return a clean 409 instead of letting the
// unique constraint throw ER_DUP_ENTRY, which errorHandler.js would
// turn into an opaque 500.
async function findByVolunteerAndEvent(volunteerId, eventId) {
  const [[row]] = await pool.query(
    `SELECT application_id AS applicationId,
            volunteer_id   AS volunteerId,
            event_id       AS eventId,
            status
       FROM applications
      WHERE volunteer_id = ? AND event_id = ?`,
    [volunteerId, eventId]
  );
  return row || null;
}

// POST /events/:eventId/apply
//
// status and applied_at are left to the schema defaults ('applied',
// CURRENT_TIMESTAMP) rather than being set here — one source of truth.
async function createApplication({ volunteerId, eventId, preferredRoleId, motivation }) {
  const [result] = await pool.query(
    `INSERT INTO applications
       (volunteer_id, event_id, preferred_role_id, motivation)
     VALUES (?, ?, ?, ?)`,
    [volunteerId, eventId, preferredRoleId ?? null, motivation ?? null]
  );
  return result.insertId;
}

// Single application by id, with the joined context the withdraw
// handler needs for its ownership check.
async function findById(applicationId) {
  const [[row]] = await pool.query(
    `SELECT a.application_id   AS applicationId,
            a.volunteer_id     AS volunteerId,
            a.event_id         AS eventId,
            a.preferred_role_id AS preferredRoleId,
            a.motivation,
            a.status,
            a.applied_at       AS appliedAt,
            a.decided_at       AS decidedAt,
            e.title            AS eventTitle,
            e.event_start      AS eventStart
       FROM applications a
       JOIN events e ON e.event_id = a.event_id
      WHERE a.application_id = ?`,
    [applicationId]
  );
  return row || null;
}

// GET /volunteers/me/applications
//
// LEFT JOIN on event_roles because preferred_role_id is nullable — a
// volunteer can apply without naming a role, and an INNER JOIN would
// silently drop those applications from the list.
//
// Ordered newest-first: the thing you just applied to is the thing
// you're most likely looking for.
async function findApplicationsByVolunteerId(volunteerId) {
  const [rows] = await pool.query(
    `SELECT a.application_id    AS applicationId,
            a.event_id          AS eventId,
            a.preferred_role_id AS preferredRoleId,
            a.motivation,
            a.status,
            a.applied_at        AS appliedAt,
            a.decided_at        AS decidedAt,
            e.title             AS eventTitle,
            e.location          AS eventLocation,
            e.event_start       AS eventStart,
            e.event_end         AS eventEnd,
            o.name              AS orgName,
            r.title             AS roleTitle
       FROM applications a
       JOIN events e        ON e.event_id = a.event_id
       JOIN organizations o ON o.org_id   = e.org_id
       LEFT JOIN event_roles r ON r.role_id = a.preferred_role_id
      WHERE a.volunteer_id = ?
      ORDER BY a.applied_at DESC`,
    [volunteerId]
  );
  return rows;
}

// PATCH /applications/:applicationId/withdraw
//
// The status guard is in the WHERE clause, not just the controller, so
// a concurrent organizer decision can't be clobbered: if they flip the
// row to 'selected' -> 'confirmed' between our read and this write, the
// UPDATE matches zero rows and the caller gets told, rather than the
// withdrawal silently overwriting a confirmation.
//
// Returns affectedRows; 0 means the guard rejected it.
async function withdrawApplication(applicationId, volunteerId) {
  const [result] = await pool.query(
    `UPDATE applications
        SET status = 'withdrawn', decided_at = CURRENT_TIMESTAMP
      WHERE application_id = ?
        AND volunteer_id   = ?
        AND status IN (?)`,
    [applicationId, volunteerId, WITHDRAWABLE_STATUSES]
  );
  return result.affectedRows;
}

module.exports = {
  WITHDRAWABLE_STATUSES,
  findByVolunteerAndEvent,
  createApplication,
  findById,
  findApplicationsByVolunteerId,
  withdrawApplication,
};
