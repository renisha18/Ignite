// Why this file exists: the public/volunteer read routes for events.
// The organizer's write routes (POST /events, PUT, DELETE,
// GET /events/mine) live in a separate eventRoutes.js owned by the
// other track — both mount under /events, so keeping them in different
// files is what stops the two tracks editing the same lines.
//
// The GET routes have no `authenticate` on purpose: docs/api-contract.md
// marks them public. Visibility is enforced in the model (published
// events from approved orgs only), not by auth.
//
// POST /:eventId/apply is the one exception — it's authenticated and
// volunteer-only. It lives here rather than in volunteerRoutes.js
// purely because the contract puts it under /events, and that's the
// prefix this router is mounted at. Still volunteer-track owned, so no
// cross-track conflict.
//
// Depends on: controllers/publicEventController.js,
// controllers/volunteerController.js, middleware/authenticate.js,
// middleware/authorize.js, middleware/asyncHandler.js
// Depended on by: server.js (mounted at app.use("/events", ...))
const express = require("express");
const publicEventController = require("../controllers/publicEventController");
const volunteerController = require("../controllers/volunteerController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

// ORDER MATTERS: Express matches top-down, so "/skills" has to be
// declared before "/:eventId" or a request for /events/skills gets
// routed into getEvent with eventId="skills".
router.get("/skills", asyncHandler(publicEventController.listSkills));

router.get("/", asyncHandler(publicEventController.listEvents));
router.get("/:eventId", asyncHandler(publicEventController.getEvent));

// Declared after GET "/:eventId" without risk: it's a POST, and a
// different path shape ("/:eventId/apply"), so the GET above can't
// match it either way.
router.post(
  "/:eventId/apply",
  authenticate,
  authorize("volunteer"),
  asyncHandler(volunteerController.applyToEvent)
);

module.exports = router;
