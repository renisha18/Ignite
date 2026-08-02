// Why this file exists: GET /skills is reference data needed by both
// tracks — the volunteer's profile picker and the organizer's role
// form (POST /events/:eventId/roles takes skillIds). It doesn't belong
// under /volunteers or /events, so it gets its own mount.
//
// GET has no auth: a list of skill names is neither sensitive nor
// user-specific, and the organizer's role form needs it too. Same
// reasoning as the public event reads.
//
// Distinct from GET /events/skills, which returns only the skills
// attached to a role on a currently-published event (a browse filter
// that can't offer a dead end). This returns every skill.
//
// Depends on: controllers/volunteerController.js, middleware/authenticate.js,
// middleware/asyncHandler.js
// Depended on by: server.js (mounted at app.use("/skills", ...))
const express = require("express");
const volunteerController = require("../controllers/volunteerController");
const authenticate = require("../middleware/authenticate");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.get("/", asyncHandler(volunteerController.listSkills));

// POST is authenticated but NOT role-restricted: a volunteer adds a
// skill from their profile, and the organizer's event-role form will
// need the same thing. Writing to shared reference data shouldn't be
// anonymous, but it isn't one track's privilege either.
router.post("/", authenticate, asyncHandler(volunteerController.createSkill));

module.exports = router;
