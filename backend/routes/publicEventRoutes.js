// Why this file exists: the public/volunteer read routes for events.
// The organizer's write routes (POST /events, PUT, DELETE,
// GET /events/mine) live in a separate eventRoutes.js owned by the
// other track — both mount under /events, so keeping them in different
// files is what stops the two tracks editing the same lines.
//
// No `authenticate` here on purpose: docs/api-contract.md marks these
// public. Visibility is enforced in the model (published events from
// approved orgs only), not by auth.
//
// Depends on: controllers/publicEventController.js, middleware/asyncHandler.js
// Depended on by: server.js (mounted at app.use("/events", ...))
const express = require("express");
const publicEventController = require("../controllers/publicEventController");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

// ORDER MATTERS: Express matches top-down, so "/skills" has to be
// declared before "/:eventId" or a request for /events/skills gets
// routed into getEvent with eventId="skills".
router.get("/skills", asyncHandler(publicEventController.listSkills));

router.get("/", asyncHandler(publicEventController.listEvents));
router.get("/:eventId", asyncHandler(publicEventController.getEvent));

module.exports = router;
