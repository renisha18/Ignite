// Why this file exists: the certificate endpoints that sit under
// /certificates. Both tracks appear here because they share the prefix —
// organizer issues, volunteer downloads — with authorize() keeping them
// apart.
//
// The volunteer's list route is GET /volunteers/me/certificates, which
// belongs to a different prefix, so it lives in volunteerRoutes.js and
// points at the same controller.
//
// Depends on: controllers/certificateController.js, middleware/authenticate.js,
// middleware/authorize.js, middleware/asyncHandler.js
// Depended on by: server.js (mounted at app.use("/certificates", ...))
const express = require("express");
const certificateController = require("../controllers/certificateController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

// ORDER MATTERS: "/eligible" is literal and must be declared before any
// "/:certificateId" pattern, or it gets parsed as a certificate id.
router.get(
  "/eligible",
  authenticate,
  authorize("organizer", "admin"),
  asyncHandler(certificateController.listEventCertificateRows)
);

router.post(
  "/",
  authenticate,
  authorize("organizer", "admin"),
  asyncHandler(certificateController.generateCertificate)
);

// Volunteer-only, and the controller additionally checks the
// certificate belongs to the caller — being a volunteer isn't enough.
router.get(
  "/:certificateId/download",
  authenticate,
  authorize("volunteer"),
  asyncHandler(certificateController.downloadCertificate)
);

module.exports = router;
