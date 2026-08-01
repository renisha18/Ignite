// Why this file exists: GET /skills is reference data needed by both
// tracks — the volunteer's profile picker and the organizer's role
// form (POST /events/:eventId/roles takes skillIds). It doesn't belong
// under /volunteers or /events, so it gets its own mount.
//
// No auth: a list of skill names is neither sensitive nor
// user-specific, and the organizer's role form needs it too. Same
// reasoning as the public event reads.
//
// Distinct from GET /events/skills, which returns only the skills
// attached to a role on a currently-published event (a browse filter
// that can't offer a dead end). This returns every skill.
//
// Depends on: controllers/volunteerController.js, middleware/asyncHandler.js
// Depended on by: server.js (mounted at app.use("/skills", ...))
const express = require("express");
const volunteerController = require("../controllers/volunteerController");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.get("/", asyncHandler(volunteerController.listSkills));

module.exports = router;
