// Why this file exists: wiring for the event_roles endpoints, wrapped in
// asyncHandler so thrown AppErrors reach errorHandler.js. No logic here.
//
// Why TWO routers out of one file: docs/api-contract.md puts creation
// under the event that owns it (POST /events/:eventId/roles) but edits
// and deletes at the top level (PUT|DELETE /roles/:roleId), because by
// then the role id alone identifies it. Those are different mount
// points, so server.js mounts each router where it belongs rather than
// this file inventing a URL the contract doesn't specify.
//
// Depends on: controllers/roleController.js, middleware/authenticate.js,
// middleware/authorize.js, middleware/asyncHandler.js
// Depended on by: server.js
const express = require("express");
const roleController = require("../controllers/roleController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const asyncHandler = require("../middleware/asyncHandler");

// Mounted at /events — owns POST /events/:eventId/roles only. The rest
// of /events belongs to eventRoutes.js and publicEventRoutes.js.
const eventRolesRouter = express.Router();

eventRolesRouter.post(
  "/:eventId/roles",
  authenticate,
  authorize("organizer", "admin"),
  asyncHandler(roleController.createRole)
);

// Mounted at /roles.
const rolesRouter = express.Router();

rolesRouter.put(
  "/:roleId",
  authenticate,
  authorize("organizer", "admin"),
  asyncHandler(roleController.updateRole)
);

rolesRouter.delete(
  "/:roleId",
  authenticate,
  authorize("organizer", "admin"),
  asyncHandler(roleController.deleteRole)
);

module.exports = { eventRolesRouter, rolesRouter };
