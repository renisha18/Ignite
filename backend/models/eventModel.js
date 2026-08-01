// Why this file exists: every Events operation — organizer CRUD and
// the volunteer's public reads — touches the `events` table. Keeping
// the raw SQL here means controllers never write SQL directly; they
// call these functions, which is what "reusable SQL" from the coding
// standards means in practice.
//
// SHARED FILE (see docs/api-contract.md, "File ownership"). This is the
// merge of both tracks' work:
//   - Organizer track: create, findById, listByOrg, update, remove,
//     toEventResponse, UPDATABLE_COLUMNS
//   - Volunteer track: EVENT_STATUSES, rolesSummaryFor,
//     listPublishedEvents, findEventWithRolesById, listFilterSkills
// Append new functions freely; don't change an existing signature or
// query without a heads-up, since the other track is calling it too.
//
// Depends on: config/db.js
// Depended on by: controllers/eventController.js (organizer track),
// controllers/publicEventController.js (volunteer track)
const pool = require("../config/db");

// ---------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------

// The events.status ENUM from backend/schema.sql (locked). Exported so
// the controller can validate the ?status= param against the real
// column definition instead of keeping a second copy of the list.
const EVENT_STATUSES = ["published", "closed", "completed", "cancelled"];

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

// ---------------------------------------------------------------------
// Organizer track — event CRUD
// ---------------------------------------------------------------------

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

// ---------------------------------------------------------------------
// Volunteer track — public reads
//
// These select explicit camelCase aliases rather than going through
// toEventResponse(), because they return joined shapes (org name,
// nested roles) that a single-row mapper doesn't cover.
// ---------------------------------------------------------------------

// Roles + how many seats are taken, for a batch of events.
//
// Why this is its own query rather than a join on the main event
// query: joining event_roles to events multiplies the event rows (one
// per role), which breaks both the row count and any aggregate. Two
// queries and a stitch in JS is correct, and it's still O(1) queries
// for the whole page rather than N+1.
//
// filledCount counts only status='assigned' — 'cancelled' assignments
// stay in the table for history (schema.sql, table 9) and must not
// occupy a seat.
//
// Not exported: an internal helper for the two functions below.
async function rolesSummaryFor(eventIds) {
  const byEvent = new Map();
  if (eventIds.length === 0) return byEvent;

  // mysql2 expands an array into an IN list for `query` (not `execute`).
  const [rows] = await pool.query(
    `SELECT r.role_id   AS roleId,
            r.event_id  AS eventId,
            r.title,
            r.capacity,
            COUNT(a.assignment_id) AS filledCount
       FROM event_roles r
       LEFT JOIN assignments a
         ON a.role_id = r.role_id AND a.status = 'assigned'
      WHERE r.event_id IN (?)
      GROUP BY r.role_id, r.event_id, r.title, r.capacity
      ORDER BY r.role_id`,
    [eventIds]
  );

  for (const row of rows) {
    if (!byEvent.has(row.eventId)) byEvent.set(row.eventId, []);
    byEvent.get(row.eventId).push({
      roleId: row.roleId,
      title: row.title,
      capacity: row.capacity,
      // COUNT() comes back as a string from some mysql2/driver combos.
      filledCount: Number(row.filledCount),
    });
  }
  return byEvent;
}

// GET /events — the volunteer's browse list.
//
// Two filters are non-negotiable and always applied: the event must be
// `published` (or whatever status the caller asked for, validated
// upstream) AND the owning organization must be `approved`. A pending
// org's events must never surface publicly — registration does not
// auto-approve an org (organizationModel.create), so this is the gate
// that enforces it on the read side.
//
// filters: { status, search, skillId, location }
// returns: [{ eventId, title, location, eventStart, eventEnd, orgId,
//             orgName, roles: [{ roleId, title, capacity, filledCount }] }]
async function listPublishedEvents(filters = {}) {
  const { status = "published", search, skillId, location } = filters;

  const where = ["e.status = ?", "o.status = 'approved'"];
  const params = [status];

  if (search) {
    where.push("(e.title LIKE ? OR e.description LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  if (location) {
    where.push("e.location LIKE ?");
    params.push(`%${location}%`);
  }

  if (skillId) {
    // EXISTS rather than a join: a join through role_skills would
    // return one event row per matching role, duplicating events that
    // need the same skill in two different roles.
    where.push(`EXISTS (
      SELECT 1
        FROM event_roles r
        JOIN role_skills rs ON rs.role_id = r.role_id
       WHERE r.event_id = e.event_id AND rs.skill_id = ?
    )`);
    params.push(skillId);
  }

  const [events] = await pool.query(
    `SELECT e.event_id             AS eventId,
            e.title,
            e.location,
            e.event_start          AS eventStart,
            e.event_end            AS eventEnd,
            e.application_deadline AS applicationDeadline,
            o.org_id               AS orgId,
            o.name                 AS orgName
       FROM events e
       JOIN organizations o ON o.org_id = e.org_id
      WHERE ${where.join(" AND ")}
      ORDER BY e.event_start ASC`,
    params
  );

  if (events.length === 0) return [];

  const rolesByEvent = await rolesSummaryFor(events.map((e) => e.eventId));
  return events.map((event) => ({
    ...event,
    roles: rolesByEvent.get(event.eventId) ?? [],
  }));
}

// GET /events/:eventId — full detail, including the skills each role
// requires.
//
// Distinct from the organizer's findById() above, which returns the raw
// unfiltered row for ownership checks. This one applies the public
// visibility rule: a non-published event, or one belonging to an
// unapproved org, is a 404 here rather than a 403 — the caller
// shouldn't be able to tell the difference between "doesn't exist" and
// "exists but isn't yours to see".
//
// returns: { ...event, roles: [{ ..., skills: [{ skillId, name }] }] }
//          or null if not visible
async function findEventWithRolesById(eventId) {
  const [[event]] = await pool.query(
    `SELECT e.event_id             AS eventId,
            e.title,
            e.description,
            e.location,
            e.event_start          AS eventStart,
            e.event_end            AS eventEnd,
            e.application_deadline AS applicationDeadline,
            e.status,
            o.org_id               AS orgId,
            o.name                 AS orgName,
            o.description          AS orgDescription
       FROM events e
       JOIN organizations o ON o.org_id = e.org_id
      WHERE e.event_id = ?
        AND e.status = 'published'
        AND o.status = 'approved'`,
    [eventId]
  );

  if (!event) return null;

  const roles = (await rolesSummaryFor([event.eventId])).get(event.eventId) ?? [];

  // Skills fetched separately rather than joined onto the roles query
  // above: role_skills is one-to-many, so joining it alongside the
  // assignments LEFT JOIN would produce a cartesian product and inflate
  // filledCount by the number of skills on the role.
  const [skillRows] = await pool.query(
    `SELECT rs.role_id  AS roleId,
            s.skill_id  AS skillId,
            s.name
       FROM role_skills rs
       JOIN skills s      ON s.skill_id = rs.skill_id
       JOIN event_roles r ON r.role_id  = rs.role_id
      WHERE r.event_id = ?
      ORDER BY s.name`,
    [event.eventId]
  );

  const skillsByRole = new Map();
  for (const row of skillRows) {
    if (!skillsByRole.has(row.roleId)) skillsByRole.set(row.roleId, []);
    skillsByRole.get(row.roleId).push({ skillId: row.skillId, name: row.name });
  }

  return {
    ...event,
    roles: roles.map((role) => ({
      ...role,
      skills: skillsByRole.get(role.roleId) ?? [],
    })),
  };
}

// GET /events/skills — options for the browse page's skill filter.
//
// Deliberately not "every row in `skills`": it returns only skills
// actually attached to a role on a visible event, so the dropdown can
// never offer a filter that returns zero results.
async function listFilterSkills() {
  const [rows] = await pool.query(
    `SELECT DISTINCT s.skill_id AS skillId, s.name
       FROM skills s
       JOIN role_skills rs  ON rs.skill_id = s.skill_id
       JOIN event_roles r   ON r.role_id   = rs.role_id
       JOIN events e        ON e.event_id  = r.event_id
       JOIN organizations o ON o.org_id    = e.org_id
      WHERE e.status = 'published' AND o.status = 'approved'
      ORDER BY s.name`
  );
  return rows;
}

// ---------------------------------------------------------------------
// One exports block for both tracks. rolesSummaryFor is intentionally
// absent — it's an internal helper, not part of the model's API.
// ---------------------------------------------------------------------
module.exports = {
  // shared
  EVENT_STATUSES,

  // organizer track
  create,
  findById,
  listByOrg,
  update,
  remove,
  toEventResponse,

  // volunteer track
  listPublishedEvents,
  findEventWithRolesById,
  listFilterSkills,
};
