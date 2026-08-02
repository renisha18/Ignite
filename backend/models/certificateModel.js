// Why this file exists: all SQL touching `certificates` lives here.
// Both tracks read it — the organizer issues, the volunteer downloads —
// so it's a SHARED file: append new functions freely, don't change an
// existing signature or query without telling the other track.
//
// Depends on: config/db.js
// Depended on by: controllers/certificateController.js
const crypto = require("crypto");
const pool = require("../config/db");

// Unambiguous alphabet — no O/0, I/1/L. Certificate codes get read off
// a printed page and typed back in to verify, so characters that look
// alike are a support problem.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomCodeSuffix(length = 8) {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

// certificate_code is VARCHAR(64) UNIQUE. Prefixed with the event id so
// a support request ("here's my code") immediately identifies the event.
function buildCertificateCode(eventId) {
  return `IGN-${eventId}-${randomCodeSuffix()}`;
}

// Everything the organizer's Certificates screen needs for one event:
// who was assigned, whether their attendance is verified, and whether a
// certificate already exists.
//
// LEFT JOINs on both attendance and certificates on purpose — a
// volunteer with no attendance row yet must still appear in the list
// (greyed out as not-yet-eligible), and one without a certificate is
// exactly the row the organizer wants to act on. An INNER JOIN would
// hide the very people the screen is about.
//
// Only status='assigned' — a cancelled assignment isn't owed anything.
async function findEventAssignmentsForCertificates(eventId) {
  const [rows] = await pool.query(
    `SELECT a.assignment_id        AS assignmentId,
            a.volunteer_id         AS volunteerId,
            u.full_name            AS volunteerName,
            u.email                AS volunteerEmail,
            r.title                AS roleTitle,
            att.verification_status AS verificationStatus,
            att.check_in_time      AS checkInTime,
            c.certificate_id       AS certificateId,
            c.certificate_code     AS certificateCode,
            c.hours_credited       AS hoursCredited,
            c.issued_at            AS issuedAt
       FROM assignments a
       JOIN events e        ON e.event_id = a.event_id
       JOIN users u         ON u.user_id  = a.volunteer_id
       JOIN event_roles r   ON r.role_id  = a.role_id
       LEFT JOIN attendance att   ON att.assignment_id = a.assignment_id
       LEFT JOIN certificates c   ON c.assignment_id   = a.assignment_id
      WHERE a.event_id = ? AND a.status = 'assigned'
      ORDER BY u.full_name`,
    [eventId]
  );

  return rows.map((row) => ({
    ...row,
    hoursCredited: row.hoursCredited === null ? null : Number(row.hoursCredited),
    // Pre-computed so the UI doesn't re-derive the rule and drift from
    // the server's. The server still re-checks on POST.
    eligible: row.verificationStatus === "verified" && row.certificateId === null,
  }));
}

// One assignment plus everything needed to authorise and price a
// certificate: the owning org (for the organizer's ownership check),
// the event window (for hours), attendance state, and any existing
// certificate.
async function findAssignmentForIssue(assignmentId) {
  const [[row]] = await pool.query(
    `SELECT a.assignment_id         AS assignmentId,
            a.volunteer_id          AS volunteerId,
            a.event_id              AS eventId,
            a.status                AS assignmentStatus,
            e.org_id                AS orgId,
            e.title                 AS eventTitle,
            e.event_start           AS eventStart,
            e.event_end             AS eventEnd,
            att.verification_status AS verificationStatus,
            c.certificate_id        AS existingCertificateId
       FROM assignments a
       JOIN events e      ON e.event_id = a.event_id
       LEFT JOIN attendance att ON att.assignment_id = a.assignment_id
       LEFT JOIN certificates c ON c.assignment_id   = a.assignment_id
      WHERE a.assignment_id = ?`,
    [assignmentId]
  );
  return row || null;
}

// Inserts the DB record only — no PDF is generated or stored here.
// PDFs are rendered on demand at download time, so a certificate always
// reflects current data rather than a file frozen at issue time.
//
// Retries on a code collision. certificate_code is UNIQUE and the
// suffix is 31^8 (~850 billion), so this effectively never loops — but
// "effectively never" is not "never", and the alternative is a 500.
async function createCertificate({ assignmentId, volunteerId, eventId, hoursCredited }) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const certificateCode = buildCertificateCode(eventId);
    try {
      const [result] = await pool.query(
        `INSERT INTO certificates
           (certificate_code, assignment_id, volunteer_id, event_id, hours_credited)
         VALUES (?, ?, ?, ?, ?)`,
        [certificateCode, assignmentId, volunteerId, eventId, hoursCredited]
      );
      return result.insertId;
    } catch (err) {
      // Only retry a code clash. A duplicate assignment_id (also UNIQUE)
      // means a certificate already exists — that's a 409 for the
      // caller to handle, not something to retry into existence.
      const isCodeClash =
        err.code === "ER_DUP_ENTRY" && String(err.sqlMessage).includes("certificate_code");
      if (!isCodeClash) throw err;
    }
  }
  throw new Error("Could not generate a unique certificate code after 5 attempts");
}

// Full detail for one certificate, including everything
// renderCertificatePdf() needs. Used by the download route.
async function findCertificateById(certificateId) {
  const [[row]] = await pool.query(
    `SELECT c.certificate_id    AS certificateId,
            c.certificate_code  AS certificateCode,
            c.assignment_id     AS assignmentId,
            c.volunteer_id      AS volunteerId,
            c.event_id          AS eventId,
            c.hours_credited    AS hoursCredited,
            c.issued_at         AS issuedAt,
            u.full_name         AS volunteerName,
            e.title             AS eventTitle,
            e.event_start       AS eventStart,
            e.event_end         AS eventEnd,
            e.location          AS eventLocation,
            o.name              AS orgName
       FROM certificates c
       JOIN users u         ON u.user_id  = c.volunteer_id
       JOIN events e        ON e.event_id = c.event_id
       JOIN organizations o ON o.org_id   = e.org_id
      WHERE c.certificate_id = ?`,
    [certificateId]
  );

  if (!row) return null;
  return { ...row, hoursCredited: Number(row.hoursCredited) };
}

// GET /volunteers/me/certificates — newest first.
async function findCertificatesByVolunteerId(volunteerId) {
  const [rows] = await pool.query(
    `SELECT c.certificate_id   AS certificateId,
            c.certificate_code AS certificateCode,
            c.event_id         AS eventId,
            c.hours_credited   AS hoursCredited,
            c.issued_at        AS issuedAt,
            e.title            AS eventTitle,
            e.location         AS eventLocation,
            e.event_start      AS eventStart,
            o.name             AS orgName
       FROM certificates c
       JOIN events e        ON e.event_id = c.event_id
       JOIN organizations o ON o.org_id   = e.org_id
      WHERE c.volunteer_id = ?
      ORDER BY c.issued_at DESC`,
    [volunteerId]
  );

  return rows.map((row) => ({ ...row, hoursCredited: Number(row.hoursCredited) }));
}

module.exports = {
  buildCertificateCode,
  findEventAssignmentsForCertificates,
  findAssignmentForIssue,
  createCertificate,
  findCertificateById,
  findCertificatesByVolunteerId,
};
