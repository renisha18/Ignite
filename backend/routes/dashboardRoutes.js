// Why this file exists: one route, wired the same way as every other —
// authenticate, authorize, asyncHandler. No logic here.
//
// Mounted at /organizer, a prefix nothing else uses. The dashboard is
// the only organization-wide read in the app; every other organizer
// endpoint hangs off the resource it acts on (/events, /applications,
// /assignments), so it doesn't belong under any of them.
//
// Depends on: controllers/dashboardController.js,
// middleware/authenticate.js, middleware/authorize.js,
// middleware/asyncHandler.js
// Depended on by: server.js
const express = require("express");
const dashboardController = require("../controllers/dashboardController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.get(
  "/dashboard",
  authenticate,
  authorize("organizer", "admin"),
  asyncHandler(dashboardController.getDashboard)
);

module.exports = router;
