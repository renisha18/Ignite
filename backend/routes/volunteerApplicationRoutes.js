// Why this file exists: the contract puts the volunteer's withdraw at
// PATCH /applications/:applicationId/withdraw — an /applications prefix,
// which neither /volunteers nor /events can serve. So it gets its own
// small router.
//
// Why not called applicationRoutes.js: docs/api-contract.md reserves
// that filename for the ORGANIZER track (GET /events/:id/applications,
// PATCH /applications/:id to accept/reject). Two routers can mount at
// /applications side by side; two tracks editing one file is what we're
// avoiding. Their file, when it lands, mounts alongside this one.
//
// No route-order hazard between them: this owns the literal
// "/:applicationId/withdraw" and theirs owns "/:applicationId", which
// are different paths, and the organizer's is authorize("organizer").
//
// Depends on: controllers/volunteerController.js, middleware/authenticate.js,
// middleware/authorize.js, middleware/asyncHandler.js
// Depended on by: server.js (mounted at app.use("/applications", ...))
const express = require("express");
const volunteerController = require("../controllers/volunteerController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

// Ownership isn't expressible in the route (the id is someone's, not
// necessarily the caller's), so the controller compares
// application.volunteer_id against req.user.userId and 404s on mismatch.
router.patch(
  "/:applicationId/withdraw",
  authenticate,
  authorize("volunteer"),
  asyncHandler(volunteerController.withdrawMyApplication)
);

module.exports = router;
