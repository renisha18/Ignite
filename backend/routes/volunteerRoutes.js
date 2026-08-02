// Why this file exists: the volunteer track's own routes, mounted at
// /volunteers. Owns the profile endpoints now; apply/withdraw, my
// applications, journey and certificates land here later
// (docs/api-contract.md, File ownership).
//
// Every route is authenticate -> authorize -> handler, in that order:
// authorize reads req.user, which authenticate is what sets. The
// volunteer is always taken from the token, never from the URL — hence
// /me rather than /:volunteerId, so one volunteer can't read or edit
// another's profile.
//
// Depends on: controllers/volunteerController.js, middleware/authenticate.js,
// middleware/authorize.js, middleware/asyncHandler.js
// Depended on by: server.js (mounted at app.use("/volunteers", ...))
const express = require("express");
const volunteerController = require("../controllers/volunteerController");
const certificateController = require("../controllers/certificateController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.get(
  "/me/profile",
  authenticate,
  authorize("volunteer"),
  asyncHandler(volunteerController.getMyProfile)
);

router.put(
  "/me/profile",
  authenticate,
  authorize("volunteer"),
  asyncHandler(volunteerController.updateMyProfile)
);

router.get(
  "/me/applications",
  authenticate,
  authorize("volunteer"),
  asyncHandler(volunteerController.getMyApplications)
);

// Certificate LIST only. It lives here rather than in certificateRoutes
// because the contract puts it under /volunteers, but the handler is
// certificateController's — issuing and downloading stay in
// routes/certificateRoutes.js.
router.get(
  "/me/certificates",
  authenticate,
  authorize("volunteer"),
  asyncHandler(certificateController.getMyCertificates)
);

// "My Journey" — the volunteer's whole history in one live join.
router.get(
  "/me/journey",
  authenticate,
  authorize("volunteer"),
  asyncHandler(volunteerController.getMyJourney)
);

module.exports = router;
