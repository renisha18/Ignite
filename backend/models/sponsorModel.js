// Why this file exists: all SQL for the Sponsor Recommendation System —
// the shared sponsor catalogue, the event↔sponsor links, and the reads
// that back "Previous Sponsors" and "Recommended Sponsors".
//
// Deliberately self-contained. Nothing else in the backend imports it
// and it imports nothing but the pool, so the whole feature can be
// removed by deleting three files and two mount lines.
//
// Organizer-track only.
//
// Depends on: config/db.js
// Depended on by: controllers/sponsorController.js
const pool = require("../config/db");

// ---------------------------------------------------------------------
// Sponsor catalogue
// ---------------------------------------------------------------------

// One row per real-world organisation. Reused across events — the point
// of a catalogue is that "Decathlon" is one record, not one per event.
async function listSponsors({ search } = {}) {
  const where = [];
  const params = [];

  if (search) {
    // Matches the name or the industry: an organizer looking for a
    // sports brand may remember the sector, not the company.
    where.push("(sponsor_name LIKE ? OR industry LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  const [rows] = await pool.query(
    `SELECT sponsor_id     AS sponsorId,
            sponsor_name   AS sponsorName,
            website,
            industry,
            contact_person AS contactPerson,
            email,
            phone,
            created_at     AS createdAt
       FROM sponsors
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY sponsor_name ASC`,
    params
  );
  return rows;
}

async function findSponsorById(sponsorId) {
  const [[row]] = await pool.query(
    `SELECT sponsor_id     AS sponsorId,
            sponsor_name   AS sponsorName,
            website,
            industry,
            contact_person AS contactPerson,
            email,
            phone,
            created_at     AS createdAt
       FROM sponsors
      WHERE sponsor_id = ?`,
    [sponsorId]
  );
  return row || null;
}

async function createSponsor(
  { sponsorName, website, industry, contactPerson, email, phone },
  conn = pool
) {
  const [result] = await conn.query(
    `INSERT INTO sponsors
       (sponsor_name, website, industry, contact_person, email, phone)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      sponsorName,
      website ?? null,
      industry ?? null,
      contactPerson ?? null,
      email ?? null,
      phone ?? null,
    ]
  );
  return result.insertId;
}

// ---------------------------------------------------------------------
// Event ↔ sponsor links
// ---------------------------------------------------------------------

// Only these two are updatable through the API: the Sponsors tab edits
// what a sponsor gave to THIS event, never the global catalogue entry.
// Same whitelist reasoning as eventModel.UPDATABLE_COLUMNS — never build
// a SET clause from caller-supplied keys.
const UPDATABLE_LINK_COLUMNS = {
  sponsorshipType: "sponsorship_type",
  sponsorshipAmount: "sponsorship_amount",
  remarks: "remarks",
};

async function findEventSponsors(eventId) {
  const [rows] = await pool.query(
    `SELECT es.event_sponsor_id   AS eventSponsorId,
            es.event_id           AS eventId,
            es.sponsorship_type   AS sponsorshipType,
            es.sponsorship_amount AS sponsorshipAmount,
            es.remarks,
            s.sponsor_id          AS sponsorId,
            s.sponsor_name        AS sponsorName,
            s.website,
            s.industry,
            s.contact_person      AS contactPerson,
            s.email,
            s.phone
       FROM event_sponsors es
       JOIN sponsors s ON s.sponsor_id = es.sponsor_id
      WHERE es.event_id = ?
      ORDER BY s.sponsor_name ASC`,
    [eventId]
  );
  // DECIMAL arrives as a string from mysql2; the client shouldn't have
  // to guess whether an amount is a number.
  return rows.map((row) => ({
    ...row,
    sponsorshipAmount:
      row.sponsorshipAmount === null ? null : Number(row.sponsorshipAmount),
  }));
}

// Carries event_id so the controller can run its ownership check — a
// link is owned transitively, through the event it belongs to.
async function findEventSponsorById(eventSponsorId) {
  const [[row]] = await pool.query(
    `SELECT event_sponsor_id   AS eventSponsorId,
            event_id           AS eventId,
            sponsor_id         AS sponsorId,
            sponsorship_type   AS sponsorshipType,
            sponsorship_amount AS sponsorshipAmount,
            remarks
       FROM event_sponsors
      WHERE event_sponsor_id = ?`,
    [eventSponsorId]
  );
  return row || null;
}

async function linkSponsorToEvent(
  { eventId, sponsorId, sponsorshipType, sponsorshipAmount, remarks },
  conn = pool
) {
  const [result] = await conn.query(
    `INSERT INTO event_sponsors
       (event_id, sponsor_id, sponsorship_type, sponsorship_amount, remarks)
     VALUES (?, ?, ?, ?, ?)`,
    [
      eventId,
      sponsorId,
      sponsorshipType,
      sponsorshipAmount ?? null,
      remarks ?? null,
    ]
  );
  return result.insertId;
}

async function updateEventSponsor(eventSponsorId, fields, conn = pool) {
  const setClauses = [];
  const values = [];

  for (const [field, column] of Object.entries(UPDATABLE_LINK_COLUMNS)) {
    if (fields[field] !== undefined) {
      setClauses.push(`${column} = ?`);
      values.push(fields[field]);
    }
  }

  if (setClauses.length === 0) return 0;

  values.push(eventSponsorId);
  const [result] = await conn.query(
    `UPDATE event_sponsors SET ${setClauses.join(", ")} WHERE event_sponsor_id = ?`,
    values
  );
  return result.affectedRows;
}

// Deletes the LINK only. The sponsors row is never touched — removing a
// sponsor from one event must not erase them from the catalogue or from
// any other event's history.
async function unlinkEventSponsor(eventSponsorId, conn = pool) {
  const [result] = await conn.query(
    `DELETE FROM event_sponsors WHERE event_sponsor_id = ?`,
    [eventSponsorId]
  );
  return result.affectedRows;
}

// ---------------------------------------------------------------------
// Recommendation inputs
//
// Five small queries the controller assembles in memory. Kept as
// separate reads rather than one heroic JOIN because the scoring needs
// role titles and role skills for the same set of events, and joining
// both onto the sponsorship rows would multiply them together.
// ---------------------------------------------------------------------

// The target event's own type and location — the two things everything
// else is compared against.
async function findEventTypeAndLocation(eventId) {
  const [[row]] = await pool.query(
    `SELECT event_id   AS eventId,
            title,
            event_type AS eventType,
            location
       FROM events
      WHERE event_id = ?`,
    [eventId]
  );
  return row || null;
}

// Every sponsorship on a PAST event sharing this type, excluding the
// event being planned. One row per (sponsor, event) pair; the controller
// aggregates by sponsor.
//
// Deliberately not filtered by organization: the whole value of this
// feature is that a new club learns from what other clubs did.
async function findSponsorshipsByEventType(eventType, excludeEventId) {
  const [rows] = await pool.query(
    `SELECT s.sponsor_id     AS sponsorId,
            s.sponsor_name   AS sponsorName,
            s.website,
            s.industry,
            s.contact_person AS contactPerson,
            s.email,
            s.phone,
            e.event_id       AS eventId,
            e.title          AS eventTitle,
            e.location       AS eventLocation,
            e.event_start    AS eventStart
       FROM event_sponsors es
       JOIN sponsors s ON s.sponsor_id = es.sponsor_id
       JOIN events e   ON e.event_id   = es.event_id
      WHERE e.event_type = ?
        AND e.event_id  <> ?
      ORDER BY e.event_start DESC, s.sponsor_name ASC`,
    [eventType, excludeEventId]
  );
  return rows;
}

// Role titles for a batch of events. Used for BOTH the target event and
// the candidate events, so the two sides are always compared on
// identically-shaped data.
async function findRoleTitlesForEvents(eventIds) {
  if (eventIds.length === 0) return [];

  // mysql2 expands an array into an IN list for `query` (not `execute`).
  const [rows] = await pool.query(
    `SELECT event_id AS eventId, title
       FROM event_roles
      WHERE event_id IN (?)`,
    [eventIds]
  );
  return rows;
}

// Role skills for a batch of events, same dual purpose as above.
async function findRoleSkillsForEvents(eventIds) {
  if (eventIds.length === 0) return [];

  const [rows] = await pool.query(
    `SELECT r.event_id AS eventId,
            s.skill_id AS skillId,
            s.name
       FROM event_roles r
       JOIN role_skills rs ON rs.role_id  = r.role_id
       JOIN skills s       ON s.skill_id  = rs.skill_id
      WHERE r.event_id IN (?)`,
    [eventIds]
  );
  return rows;
}

module.exports = {
  // catalogue
  listSponsors,
  findSponsorById,
  createSponsor,

  // links
  findEventSponsors,
  findEventSponsorById,
  linkSponsorToEvent,
  updateEventSponsor,
  unlinkEventSponsor,

  // recommendations
  findEventTypeAndLocation,
  findSponsorshipsByEventType,
  findRoleTitlesForEvents,
  findRoleSkillsForEvents,
};
