// Why this file exists: every Events operation (create, read, update,
// delete, list-by-org) touches the `events` table. Keeping the raw SQL
// here means controllers never write SQL directly — they call these
// functions, which is what "reusable SQL" from the coding standards
// means in practice. Same shape as models/userModel.js.
//
// SHARED FILE (see docs/api-contract.md, "File ownership"): the
// volunteer track calls findById() for GET /events/:eventId and will
// append its own listPublished(). Append new functions freely; don't
// change an existing signature or query without a heads-up, since the
// other track is calling it too.
//
// Depends on: config/db.js
// Depended on by: controllers/eventController.js (organizer track),
// and the volunteer track's public event controller later.
const pool = require("../config/db");

// Why a whitelist map instead of building SET from Object.keys(fields):
// update() takes a caller-supplied object, and interpolating its keys
// into the SQL string would be an injection hole no amount of
// parameterised VALUES would close. Iterating THIS map instead means
// only these six columns are ever addressable, and the API's camelCase
// field names get translated to the schema's snake_case in one place.
// `status` is deliberately absent — docs/api-contract.md doesn't expose
// it on PUT, so it isn't updatable through this function yet.
const UPDATABLE_COLUMNS = {
  title: "title",
  description: "description",
  location: "location",
  eventStart: "event_start",
  eventEnd: "event_end",
  applicationDeadline: "application_deadline",
};

// `conn` is an optional transaction connection (same convention as
// userModel.createUser) — when omitted, runs on the shared pool.
async function create(
  {
    orgId,
    createdBy,
    title,
    description,
    location,
    eventStart,
    eventEnd,
    applicationDeadline,
  },
  conn = pool
) {
  const [result] = await conn.query(
    `INSERT INTO events
       (org_id, created_by, title, description, location,
        event_start, event_end, application_deadline)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      orgId,
      createdBy,
      title,
      description ?? null,
      location ?? null,
      eventStart,
      eventEnd ?? null,
      applicationDeadline ?? null,
    ]
  );
  return result.insertId;
}

// Returns the raw row (snake_case) or null. Deliberately unfiltered by
// org — ownership is a controller decision, not a query one, because
// admins bypass it and the volunteer track reads events it doesn't own.
async function findById(eventId) {
  const [rows] = await pool.query("SELECT * FROM events WHERE event_id = ?", [
    eventId,
  ]);
  return rows[0] || null;
}

// Backs GET /events/mine. Newest-first by event date rather than
// created_at — an organizer's dashboard cares about what's coming up,
// not what they typed in most recently.
async function listByOrg(orgId) {
  const [rows] = await pool.query(
    "SELECT * FROM events WHERE org_id = ? ORDER BY event_start DESC",
    [orgId]
  );
  return rows;
}

// Partial update: only the keys present in `fields` are written, so a
// PUT that sends just { location } leaves every other column alone.
// Returns affectedRows; 0 means nothing was written (either no
// recognised fields, or the values were already identical).
async function update(eventId, fields, conn = pool) {
  const setClauses = [];
  const values = [];

  for (const [field, column] of Object.entries(UPDATABLE_COLUMNS)) {
    if (fields[field] !== undefined) {
      setClauses.push(`${column} = ?`);
      values.push(fields[field]);
    }
  }

  if (setClauses.length === 0) return 0;

  values.push(eventId);
  const [result] = await conn.query(
    `UPDATE events SET ${setClauses.join(", ")} WHERE event_id = ?`,
    values
  );
  return result.affectedRows;
}

// Hard delete, per the contract's 204. Note the schema's cascade
// behaviour: event_roles, applications and assignments are ON DELETE
// CASCADE and disappear with the event, while certificates is NOT —
// so this throws ER_ROW_IS_REFERENCED_2 once certificates exist for the
// event. The controller turns that into a 409 rather than a 500.
async function remove(eventId, conn = pool) {
  const [result] = await conn.query("DELETE FROM events WHERE event_id = ?", [
    eventId,
  ]);
  return result.affectedRows;
}

// Why formatting lives in the model rather than each controller: both
// tracks return events over the API, and the contract says `{ event }`
// without pinning the field names. Exporting one mapper means the
// organizer and volunteer sides can't drift into two different shapes
// for the same row. camelCase to match the auth module's existing
// responses (userId, fullName).
function toEventResponse(row) {
  if (!row) return null;
  return {
    eventId: row.event_id,
    orgId: row.org_id,
    createdBy: row.created_by,
    title: row.title,
    description: row.description,
    location: row.location,
    eventStart: row.event_start,
    eventEnd: row.event_end,
    applicationDeadline: row.application_deadline,
    status: row.status,
    createdAt: row.created_at,
  };
}

module.exports = {
  create,
  findById,
  listByOrg,
  update,
  remove,
  toEventResponse,
};
