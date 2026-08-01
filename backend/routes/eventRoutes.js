// Why this file exists: maps the organizer track's Events URLs to
// controller functions and wraps each in asyncHandler so thrown
// AppErrors reach errorHandler.js instead of crashing the request. No
// logic lives here — just wiring, so it's obvious at a glance what the
// Events module exposes and who's allowed in. Same structure as
// routes/authRoutes.js.
//
// Scope note (docs/api-contract.md, "File ownership"): this file owns
// the organizer's writes plus GET /events/mine. The volunteer track's
// public reads (GET /events, GET /events/:eventId) live in their own
// publicEventRoutes.js — don't add them here.
//
// Depends on: controllers/eventController.js, middleware/authenticate.js,
// middleware/authorize.js, middleware/asyncHandler.js
// Depended on by: server.js (mounted at app.use("/events", eventRoutes))
const express = require("express");
const eventController = require("../controllers/eventController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

// Every route below is authenticate -> authorize -> handler, in that
// order: authorize reads req.user, which authenticate is what sets.
// The organization an event belongs to is taken from the token, never
// from the request body, so an organizer can't create or edit events
// for someone else's org by sending a different org_id.
router.post(
  "/",
  authenticate,
  authorize("organizer", "admin"),
  asyncHandler(eventController.createEvent)
);

// Declared before "/:eventId" on purpose: Express matches in
// definition order, so a literal path has to come first or a future
// GET /:eventId in this file would swallow "/mine" as an id.
router.get(
  "/mine",
  authenticate,
  authorize("organizer", "admin"),
  asyncHandler(eventController.listMyEvents)
);

router.put(
  "/:eventId",
  authenticate,
  authorize("organizer", "admin"),
  asyncHandler(eventController.updateEvent)
);

router.delete(
  "/:eventId",
  authenticate,
  authorize("organizer", "admin"),
  asyncHandler(eventController.deleteEvent)
);

module.exports = router;
