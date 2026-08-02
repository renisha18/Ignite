// Why this file exists: all SQL touching `attendance` lives here.
//
// SHARED FILE (docs/api-contract.md, File ownership) — the organizer
// reads the list, the volunteer writes their own row. Append new
// functions freely; don't change an existing signature or query without
// telling the other track. Nothing existed here when this was created,
// so the functions below are the initial set.
//
// Note what is NOT here: no check-out, no location. Per the contract's
// "How the QR works", attendance is a single scan, check_out_time stays
// NULL, and hours come from the event's own start/end at certificate
// time. Don't add a check-out function.
//
// Depends on: config/db.js
// Depended on by: controllers/attendanceController.js
const pool = require("../config/db");

// The scan lookup. The volunteer comes from their JWT and the event from
// the QR — this is what turns that pair into an assignment, and it is
// deliberately the ONLY way an assignment_id enters the flow. The client
// never supplies one.
//
// status='assigned' is the gate the contract calls for: being 'selected'
// on an application is not enough, the organizer must have actually
// assigned them a role via the Team Builder. A 'cancelled' assignment
// doesn't count either.
async function findActiveAssignment(volunteerId, eventId) {
  const [[row]] = await pool.query(
    `SELECT a.assignment_id AS assignmentId,
            a.role_id       AS roleId,
            r.title         AS roleTitle,
            e.title         AS eventTitle,
            e.event_start   AS eventStart
       FROM assignments a
       JOIN events e      ON e.event_id = a.event_id
       JOIN event_roles r ON r.role_id  = a.role_id
      WHERE a.volunteer_id = ?
        AND a.event_id     = ?
        AND a.status       = 'assigned'`,
    [volunteerId, eventId]
  );
  return row || null;
}

// Has this assignment already scanned? attendance.assignment_id is
// UNIQUE, so at most one row can ever exist.
async function findByAssignmentId(assignmentId) {
  const [[row]] = await pool.query(
    `SELECT attendance_id       AS attendanceId,
            assignment_id       AS assignmentId,
            check_in_time       AS checkInTime,
            verification_status AS verificationStatus
       FROM attendance
      WHERE assignment_id = ?`,
    [assignmentId]
  );
  return row || null;
}

// The scan itself. verification_status goes straight to 'verified'
// rather than 'pending': the volunteer proved presence by scanning a
// short-lived code that only existed on the organizer's screen, so
// there's nothing left to verify afterwards. check_out_time is left
// NULL by design.
async function createAttendanceRecord(assignmentId) {
  const [result] = await pool.query(
    `INSERT INTO attendance (assignment_id, check_in_time, verification_status)
     VALUES (?, NOW(), 'verified')`,
    [assignmentId]
  );
  return result.insertId;
}

// GET /events/:eventId/attendance — who has scanned in, for the
// organizer's live list.
//
// INNER JOIN on attendance, not LEFT: this answers "who has checked in",
// so a volunteer who hasn't scanned should be absent rather than present
// with nulls. Newest scan first — during an event the organizer is
// watching arrivals, not reading an alphabetical roll.
async function findAttendanceByEventId(eventId) {
  const [rows] = await pool.query(
    `SELECT a.volunteer_id        AS volunteerId,
            u.full_name           AS name,
            r.title               AS roleTitle,
            att.check_in_time     AS checkInTime,
            att.verification_status AS verificationStatus
       FROM attendance att
       JOIN assignments a  ON a.assignment_id = att.assignment_id
       JOIN users u        ON u.user_id       = a.volunteer_id
       JOIN event_roles r  ON r.role_id       = a.role_id
      WHERE a.event_id = ?
      ORDER BY att.check_in_time DESC`,
    [eventId]
  );
  return rows;
}

// How many volunteers are expected, so the organizer's list can read
// "6 of 14 checked in" rather than a bare count with no denominator.
async function countAssignedForEvent(eventId) {
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS total
       FROM assignments
      WHERE event_id = ? AND status = 'assigned'`,
    [eventId]
  );
  return Number(row.total);
}

module.exports = {
  findActiveAssignment,
  findByAssignmentId,
  createAttendanceRecord,
  findAttendanceByEventId,
  countAssignedForEvent,
};
