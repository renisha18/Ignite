// Why this file exists: the organizer dashboard's read-only aggregates.
// Every query here is scoped to one organization and returns counts or
// short lists — nothing here writes, and nothing here is used by any
// other feature.
//
// Why its own model rather than additions to eventModel/applicationModel
// /assignmentModel/certificateModel: a dashboard query spans all four
// tables at once. Splitting these across four shared models would mean
// four files touched for one screen, and each fragment would be a
// dashboard-shaped query sitting in a file that otherwise serves a
// different feature. Keeping them together also means the dashboard can
// be deleted by removing three files and one mount.
//
// Every query filters on events.org_id, so an organizer can only ever
// see totals for their own organization.
//
// Depends on: config/db.js
// Depended on by: controllers/dashboardController.js
const pool = require("../config/db");

const RECENT_EVENTS_LIMIT = 5;
const UPCOMING_EVENTS_LIMIT = 5;
const SPONSOR_LIST_LIMIT = 5;

// ---------------------------------------------------------------------
// Section 1 — overview counters
//
// Four separate queries rather than one joined mega-query: joining
// applications, assignments and certificates onto events would multiply
// rows against each other and inflate every count. Four cheap indexed
// COUNTs are both correct and easier to read.
// ---------------------------------------------------------------------

// COALESCE because SUM() over zero rows is NULL, not 0 — a brand-new
// organization would otherwise report `null` published events.
async function findEventCounts(orgId) {
  const [[row]] = await pool.query(
    `SELECT COUNT(*)                                      AS totalEvents,
            COALESCE(SUM(status = 'published'), 0)        AS publishedEvents
       FROM events
      WHERE org_id = ?`,
    [orgId]
  );
  return {
    totalEvents: Number(row.totalEvents),
    publishedEvents: Number(row.publishedEvents),
  };
}

// "Active" means still awaiting a decision. Selected/confirmed have been
// dealt with; rejected and withdrawn are closed. This is the number that
// represents outstanding work for the organizer.
async function countActiveApplications(orgId) {
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS activeApplications
       FROM applications a
       JOIN events e ON e.event_id = a.event_id
      WHERE e.org_id = ?
        AND a.status = 'applied'`,
    [orgId]
  );
  return Number(row.activeApplications);
}

// Only status='assigned'. Cancelled assignments stay in the table as
// history and must not be counted as staffed positions.
async function countAssignedVolunteers(orgId) {
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS assignedVolunteers
       FROM assignments s
       JOIN events e ON e.event_id = s.event_id
      WHERE e.org_id = ?
        AND s.status = 'assigned'`,
    [orgId]
  );
  return Number(row.assignedVolunteers);
}

async function countCertificatesIssued(orgId) {
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS certificatesIssued
       FROM certificates c
       JOIN events e ON e.event_id = c.event_id
      WHERE e.org_id = ?`,
    [orgId]
  );
  return Number(row.certificatesIssued);
}

// ---------------------------------------------------------------------
// Sections 2 & 3 — event lists
//
// Correlated subqueries for the per-event counts rather than GROUP BY
// joins: joining both applications and assignments would produce a
// cartesian product between them, so an event with 3 applications and 2
// assignments would report 6 of each.
// ---------------------------------------------------------------------

// Newest-first by event date, matching eventModel.listByOrg's ordering
// so "recent" means the same thing on the dashboard as on My Events.
async function findRecentEvents(orgId) {
  const [rows] = await pool.query(
    `SELECT e.event_id   AS eventId,
            e.title,
            e.status,
            e.location,
            e.event_start AS eventStart,
            (SELECT COUNT(*)
               FROM applications a
              WHERE a.event_id = e.event_id
                AND a.status <> 'withdrawn')          AS applicationCount,
            (SELECT COUNT(*)
               FROM assignments s
              WHERE s.event_id = e.event_id
                AND s.status = 'assigned')            AS assignmentCount
       FROM events e
      WHERE e.org_id = ?
      ORDER BY e.event_start DESC
      LIMIT ?`,
    [orgId, RECENT_EVENTS_LIMIT]
  );
  return rows.map((row) => ({
    ...row,
    applicationCount: Number(row.applicationCount),
    assignmentCount: Number(row.assignmentCount),
  }));
}

// Soonest-first, and only events that haven't started. Cancelled events
// are excluded — they aren't "upcoming" in any useful sense.
async function findUpcomingEvents(orgId) {
  const [rows] = await pool.query(
    `SELECT e.event_id    AS eventId,
            e.title,
            e.status,
            e.location,
            e.event_start AS eventStart,
            (SELECT COUNT(*)
               FROM applications a
              WHERE a.event_id = e.event_id
                AND a.status <> 'withdrawn')          AS applicationCount
       FROM events e
      WHERE e.org_id = ?
        AND e.event_start >= NOW()
        AND e.status <> 'cancelled'
      ORDER BY e.event_start ASC
      LIMIT ?`,
    [orgId, UPCOMING_EVENTS_LIMIT]
  );
  return rows.map((row) => ({
    ...row,
    applicationCount: Number(row.applicationCount),
  }));
}

// ---------------------------------------------------------------------
// Section 4 — application summary
//
// Returns raw {status, count} rows; the controller flattens them into
// the four buckets the UI shows. Grouping in SQL means one query
// regardless of how many statuses exist.
// ---------------------------------------------------------------------
async function findApplicationStatusCounts(orgId) {
  const [rows] = await pool.query(
    `SELECT a.status, COUNT(*) AS count
       FROM applications a
       JOIN events e ON e.event_id = a.event_id
      WHERE e.org_id = ?
      GROUP BY a.status`,
    [orgId]
  );
  return rows.map((row) => ({ status: row.status, count: Number(row.count) }));
}

// ---------------------------------------------------------------------
// Section 5 — sponsor insights
//
// Read-only overview. Deliberately does NOT touch the recommendation
// scoring in sponsorController — this widget reports what has already
// happened, it doesn't suggest anything.
// ---------------------------------------------------------------------

// Most recently attached sponsorships across this org's events.
async function findRecentSponsors(orgId) {
  const [rows] = await pool.query(
    `SELECT s.sponsor_id   AS sponsorId,
            s.sponsor_name AS sponsorName,
            s.industry,
            e.event_id     AS eventId,
            e.title        AS eventTitle,
            es.created_at  AS linkedAt
       FROM event_sponsors es
       JOIN sponsors s ON s.sponsor_id = es.sponsor_id
       JOIN events e   ON e.event_id   = es.event_id
      WHERE e.org_id = ?
      ORDER BY es.created_at DESC, es.event_sponsor_id DESC
      LIMIT ?`,
    [orgId, SPONSOR_LIST_LIMIT]
  );
  return rows;
}

// Sponsors this organization has worked with most often. COUNT over the
// join rows is the number of that org's events they've backed —
// UNIQUE (event_id, sponsor_id) guarantees one row per event, so there's
// no double counting.
async function findTopSponsors(orgId) {
  const [rows] = await pool.query(
    `SELECT s.sponsor_id   AS sponsorId,
            s.sponsor_name AS sponsorName,
            s.industry,
            COUNT(*)       AS eventCount
       FROM event_sponsors es
       JOIN sponsors s ON s.sponsor_id = es.sponsor_id
       JOIN events e   ON e.event_id   = es.event_id
      WHERE e.org_id = ?
      GROUP BY s.sponsor_id, s.sponsor_name, s.industry
      ORDER BY eventCount DESC, s.sponsor_name ASC
      LIMIT ?`,
    [orgId, SPONSOR_LIST_LIMIT]
  );
  return rows.map((row) => ({ ...row, eventCount: Number(row.eventCount) }));
}

module.exports = {
  findEventCounts,
  countActiveApplications,
  countAssignedVolunteers,
  countCertificatesIssued,
  findRecentEvents,
  findUpcomingEvents,
  findApplicationStatusCounts,
  findRecentSponsors,
  findTopSponsors,
};
