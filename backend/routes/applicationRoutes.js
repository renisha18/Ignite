// Why this file exists: wiring for the organizer's application-review
// endpoints. No logic — just routes, guards and asyncHandler.
//
// This is the filename docs/api-contract.md reserves for the organizer
// track, and the one volunteerApplicationRoutes.js's header points at.
// The volunteer's PATCH /applications/:applicationId/withdraw and this
// file's PATCH /applications/:applicationId mount side by side at
// /applications: different paths, so neither shadows the other, and
// neither track has to edit the other's file.
//
// Why TWO routers, same as roleRoutes.js: the contract puts the list
// under the event that owns it (GET /events/:eventId/applications) but
// the decision at the top level (PATCH /applications/:applicationId),
// because by then the application id alone identifies it.
//
// Depends on: controllers/applicationController.js,
// middleware/authenticate.js, middleware/authorize.js,
// middleware/asyncHandler.js
// Depended on by: server.js
const express = require("express");
const applicationController = require("../controllers/applicationController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const asyncHandler = require("../middleware/asyncHandler");

// Mounted at /events — owns GET /events/:eventId/applications only.
const eventApplicationsRouter = express.Router();

eventApplicationsRouter.get(
  "/:eventId/applications",
  authenticate,
  authorize("organizer", "admin"),
  asyncHandler(applicationController.listApplicationsForEvent)
);

// Mounted at /applications.
const applicationsRouter = express.Router();

applicationsRouter.patch(
  "/:applicationId",
  authenticate,
  authorize("organizer", "admin"),
  asyncHandler(applicationController.updateApplicationStatus)
);

module.exports = { eventApplicationsRouter, applicationsRouter };
