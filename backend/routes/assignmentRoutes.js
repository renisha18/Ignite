// Why this file exists: wiring for the Smart Team Builder endpoints.
// No logic — routes, guards, asyncHandler.
//
// Two routers, same reason as roleRoutes.js and applicationRoutes.js:
// the contract puts the board read under the event it describes
// (GET /events/:eventId/candidates) and the writes at the top level
// (POST /assignments, DELETE /assignments/:assignmentId).
//
// Depends on: controllers/assignmentController.js,
// middleware/authenticate.js, middleware/authorize.js,
// middleware/asyncHandler.js
// Depended on by: server.js
const express = require("express");
const assignmentController = require("../controllers/assignmentController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const asyncHandler = require("../middleware/asyncHandler");

// Mounted at /events — owns GET /events/:eventId/candidates only.
const eventCandidatesRouter = express.Router();

eventCandidatesRouter.get(
  "/:eventId/candidates",
  authenticate,
  authorize("organizer", "admin"),
  asyncHandler(assignmentController.getBoard)
);

// Mounted at /assignments.
const assignmentsRouter = express.Router();

// POST covers both placing a volunteer and moving them between roles —
// see assignmentController for why that isn't two endpoints.
assignmentsRouter.post(
  "/",
  authenticate,
  authorize("organizer", "admin"),
  asyncHandler(assignmentController.createAssignment)
);

assignmentsRouter.delete(
  "/:assignmentId",
  authenticate,
  authorize("organizer", "admin"),
  asyncHandler(assignmentController.deleteAssignment)
);

module.exports = { eventCandidatesRouter, assignmentsRouter };
