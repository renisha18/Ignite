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

// ---------------------------------------------------------------------
// Organizer track — application review
//
// Appended per the shared-file rule; nothing above is modified.
// ---------------------------------------------------------------------

// What an organizer may set an application to. 'withdrawn' is absent
// deliberately — that's the volunteer's own action (withdrawApplication
// above), not a decision anyone else makes on their behalf.
const ORGANIZER_SETTABLE_STATUSES = [
  "applied",
  "selected",
  "confirmed",
  "rejected",
];

// One column list, shared by the list and single-row reads below, so the
// two can't drift into returning different shapes for the same record.
//
// Why every column is named explicitly instead of `u.*`: this joins the
// `users` table, which holds password_hash. A wildcard here would put a
// bcrypt hash in an API response the first time someone stopped reading
// carefully. The only user columns that exist in this string are the
// three the organizer actually needs.
const ORGANIZER_APPLICATION_COLUMNS = `
  a.application_id    AS applicationId,
  a.event_id          AS eventId,
  a.status,
  a.motivation,
  a.applied_at        AS appliedAt,
  a.decided_at        AS decidedAt,
  u.user_id           AS volunteerId,
  u.full_name         AS fullName,
  u.email,
  vp.reputation_score AS reputationScore,
  r.role_id           AS preferredRoleId,
  r.title             AS preferredRoleTitle
`;

const ORGANIZER_APPLICATION_JOINS = `
  FROM applications a
  JOIN users u                ON u.user_id      = a.volunteer_id
  LEFT JOIN volunteer_profiles vp ON vp.volunteer_id = a.volunteer_id
  LEFT JOIN event_roles r     ON r.role_id      = a.preferred_role_id
`;

// Flattens the two preferred-role columns into the nullable nested
// object the API returns, and normalises reputation_score: mysql2 hands
// back DECIMAL as a string, which would render as "0.00" and sort like
// text on the client.
//
// volunteer_profiles is LEFT JOINed rather than INNER: a volunteer
// missing their profile row is a data problem, but it shouldn't make
// their application vanish from the organizer's review queue.
function toOrganizerApplicationResponse(row) {
  if (!row) return null;

  const { preferredRoleId, preferredRoleTitle, ...application } = row;

  return {
    ...application,
    reputationScore:
      row.reputationScore === null || row.reputationScore === undefined
        ? null
        : Number(row.reputationScore),
    preferredRole: preferredRoleId
      ? { roleId: preferredRoleId, title: preferredRoleTitle }
      : null,
  };
}

// GET /events/:eventId/applications
//
// Withdrawn applications are filtered out in SQL, not on the client: the
// volunteer pulled out, so the organizer has no decision left to make
// and the record shouldn't travel over the wire at all.
//
// Oldest first — a review queue should be answered in the order people
// applied, not newest-first like the volunteer's own list.
async function findApplicationsForEvent(eventId) {
  const [rows] = await pool.query(
    `SELECT ${ORGANIZER_APPLICATION_COLUMNS}
     ${ORGANIZER_APPLICATION_JOINS}
      WHERE a.event_id = ?
        AND a.status <> 'withdrawn'
      ORDER BY a.applied_at ASC`,
    [eventId]
  );
  return rows.map(toOrganizerApplicationResponse);
}

// Same shape as the list, for one application. Carries eventId, which is
// what the controller runs its ownership check against — an application
// is owned transitively, through its event's organization.
//
// Unlike findById() above, this one is unfiltered by status: PATCH may
// legitimately land on any row, and hiding withdrawn ones here would
// turn a real record into a confusing 404.
async function findEnrichedApplicationById(applicationId) {
  const [[row]] = await pool.query(
    `SELECT ${ORGANIZER_APPLICATION_COLUMNS}
     ${ORGANIZER_APPLICATION_JOINS}
      WHERE a.application_id = ?`,
    [applicationId]
  );
  return toOrganizerApplicationResponse(row);
}

// PATCH /applications/:applicationId
//
// No status guard in the WHERE clause, unlike withdrawApplication above:
// an organizer may move an application between their four statuses in
// any direction, including undoing a decision.
//
// decided_at tracks when a decision was made, so moving back to
// 'applied' clears it — there is no longer a decision to have a date.
async function setApplicationStatus(applicationId, status, conn = pool) {
  const [result] = await conn.query(
    `UPDATE applications
        SET status = ?,
            decided_at = CASE WHEN ? = 'applied' THEN NULL ELSE CURRENT_TIMESTAMP END
      WHERE application_id = ?`,
    [status, status, applicationId]
  );
  return result.affectedRows;
}

module.exports = {
  // volunteer track
  WITHDRAWABLE_STATUSES,
  findByVolunteerAndEvent,
  createApplication,
  findById,
  findApplicationsByVolunteerId,
  withdrawApplication,

  // organizer track
  ORGANIZER_SETTABLE_STATUSES,
  findApplicationsForEvent,
  findEnrichedApplicationById,
  setApplicationStatus,
};
