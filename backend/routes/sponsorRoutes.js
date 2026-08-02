// Why this file exists: wiring for the Sponsor Recommendation System.
// No logic — routes, guards, asyncHandler.
//
// Three routers, because the feature spans three URL prefixes and each
// mounts where it belongs. Same split roleRoutes.js, applicationRoutes.js
// and assignmentRoutes.js already use:
//
//   /sponsors        the shared catalogue, not tied to any one event
//   /events/:id/...  reads and writes scoped to one event
//   /event-sponsors  a single link, identified by its own id
//
// Catalogue routes are authorize("organizer","admin") with no ownership
// check: sponsors are shared reference data, like /skills. Event-scoped
// routes run loadOwnedEvent inside the controller.
//
// Depends on: controllers/sponsorController.js, middleware/authenticate.js,
// middleware/authorize.js, middleware/asyncHandler.js
// Depended on by: server.js
const express = require("express");
const sponsorController = require("../controllers/sponsorController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const asyncHandler = require("../middleware/asyncHandler");

const organizerOnly = [authenticate, authorize("organizer", "admin")];

// Mounted at /sponsors — the shared catalogue.
const sponsorsRouter = express.Router();

sponsorsRouter.get(
  "/",
  ...organizerOnly,
  asyncHandler(sponsorController.listSponsors)
);

sponsorsRouter.post(
  "/",
  ...organizerOnly,
  asyncHandler(sponsorController.createSponsor)
);

// Mounted at /events — owns only these three paths. The rest of /events
// belongs to eventRoutes, roleRoutes, applicationRoutes,
// assignmentRoutes and publicEventRoutes.
const eventSponsorsRouter = express.Router();

eventSponsorsRouter.get(
  "/:eventId/sponsors",
  ...organizerOnly,
  asyncHandler(sponsorController.listEventSponsors)
);

eventSponsorsRouter.post(
  "/:eventId/sponsors",
  ...organizerOnly,
  asyncHandler(sponsorController.addEventSponsor)
);

// Returns previous sponsors AND scored recommendations together — one
// scan of past same-type events serves both sections of the tab.
eventSponsorsRouter.get(
  "/:eventId/sponsor-recommendations",
  ...organizerOnly,
  asyncHandler(sponsorController.getRecommendations)
);

// Mounted at /event-sponsors — one link, by id.
const eventSponsorLinksRouter = express.Router();

eventSponsorLinksRouter.put(
  "/:eventSponsorId",
  ...organizerOnly,
  asyncHandler(sponsorController.updateEventSponsor)
);

eventSponsorLinksRouter.delete(
  "/:eventSponsorId",
  ...organizerOnly,
  asyncHandler(sponsorController.removeEventSponsor)
);

module.exports = { sponsorsRouter, eventSponsorsRouter, eventSponsorLinksRouter };
