// Why this file exists: all SQL touching `events` lives here so
// controllers stay thin and the same queries can be reused by both
// tracks.
//
// SHARED FILE (see docs/api-contract.md, File ownership). Append new
// functions freely; do NOT change an existing function's signature or
// query without telling the other track first — they may be calling it.
// Nothing else consumed this file at the time it was created, so the
// functions below are the initial set, not a modification of anyone's.
//
// Depends on: config/db.js
// Depended on by: controllers/publicEventController.js (volunteer track)
const pool = require("../config/db");

// The events.status ENUM from backend/schema.sql (locked). Exported so
// the controller can validate the ?status= param against the real
// column definition instead of keeping a second copy of the list.
const EVENT_STATUSES = ["published", "closed", "completed", "cancelled"];

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
// Same visibility rule as the list: a non-published event, or one
// belonging to an unapproved org, is a 404 here rather than a 403 —
// the caller shouldn't be able to tell the difference between "doesn't
// exist" and "exists but isn't yours to see".
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

module.exports = {
  EVENT_STATUSES,
  listPublishedEvents,
  findEventWithRolesById,
  listFilterSkills,
};
