// Why this file exists: maps URLs to controller functions and wraps
// each in asyncHandler so thrown AppErrors reach errorHandler.js
// instead of crashing the request. No logic lives here — just
// wiring, so it's obvious at a glance what auth exposes.
//
// Depends on: controllers/authController.js, middleware/authenticate.js,
// middleware/asyncHandler.js
// Depended on by: server.js (mounted at app.use("/auth", authRoutes))
const express = require("express");
const authController = require("../controllers/authController");
const authenticate = require("../middleware/authenticate");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.post("/register/volunteer", asyncHandler(authController.registerVolunteer));
router.post("/register/organizer", asyncHandler(authController.registerOrganizer));
router.post("/login", asyncHandler(authController.login));
router.get("/me", authenticate, asyncHandler(authController.me));

// No admin registration route — admins are seeded directly in the DB
// (see backend/seed-admin.js), never self-registered through the API.

module.exports = router;
