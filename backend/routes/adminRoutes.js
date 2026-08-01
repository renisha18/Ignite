// Why this file exists: maps admin URLs to controller functions,
// same wiring pattern as authRoutes.js. Every route here requires
// role='admin' — nothing here is reachable by an organizer or
// volunteer token, even a valid one.
const express = require("express");
const adminController = require("../controllers/adminController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.get(
  "/organizations/pending",
  authenticate,
  authorize("admin"),
  asyncHandler(adminController.listPendingOrganizations)
);

router.patch(
  "/organizations/:orgId",
  authenticate,
  authorize("admin"),
  asyncHandler(adminController.updateOrganizationStatus)
);

module.exports = router;