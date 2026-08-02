// Why this file exists: QR attendance, both tracks. One file because
// one person owns the whole flow — the organizer routes and the
// volunteer route are two ends of the same token.
//
// Why it declares FULL paths and mounts at the root: the contract puts
// the organizer's routes under /events/:eventId/... and the volunteer's
// under /attendance/..., two different prefixes. Rather than mount this
// router twice (which would also expose each half under the other's
// prefix), it owns complete paths and server.js needs exactly one line.
//
// No shadowing by the /events routers mounted alongside: their
// "/:eventId" patterns match a single path segment, so /events/5/
// attendance-qr — two segments past the prefix — can't reach them,
// whatever the mount order.
//
// Depends on: controllers/attendanceController.js, middleware/authenticate.js,
// middleware/authorize.js, middleware/asyncHandler.js
// Depended on by: server.js (mounted with app.use(...), no prefix)
const express = require("express");
const attendanceController = require("../controllers/attendanceController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

// --- Organizer: display the code, watch the scans arrive ---
router.get(
  "/events/:eventId/attendance-qr",
  authenticate,
  authorize("organizer", "admin"),
  asyncHandler(attendanceController.getAttendanceQr)
);

router.get(
  "/events/:eventId/attendance",
  authenticate,
  authorize("organizer", "admin"),
  asyncHandler(attendanceController.getEventAttendance)
);

// --- Volunteer: scan it ---
// No :eventId in the path on purpose. The event comes from inside the
// signed token, so it can't be swapped for another event's id.
router.post(
  "/attendance/scan",
  authenticate,
  authorize("volunteer"),
  asyncHandler(attendanceController.scanQr)
);

module.exports = router;
