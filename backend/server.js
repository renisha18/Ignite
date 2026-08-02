// Why this file exists: the single entrypoint that wires together
// config, middleware, and routes.

require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());


// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});


// Authentication
app.use("/auth", require("./routes/authRoutes"));


// Admin routes
app.use("/admin", require("./routes/adminRoutes"));


// Volunteer routes
app.use("/volunteers", require("./routes/volunteerRoutes"));


// Reference data
app.use("/skills", require("./routes/skillRoutes"));

// Volunteer application routes
app.use("/applications", require("./routes/volunteerApplicationRoutes"));
// Organizer application routes
app.use(
  "/applications",
  require("./routes/applicationRoutes").applicationsRouter
);

// Certificates
// Organizer issues (POST /certificates), volunteer downloads
// (GET /certificates/:id/download). The volunteer's own list lives at
// GET /volunteers/me/certificates, mounted above under /volunteers.
app.use("/certificates", require("./routes/certificateRoutes"));

// QR Attendance
app.use(require("./routes/attendanceRoutes"));

// Organizer event routes (must come before public routes)
// Both tracks serve /events, from separate route files so neither has
// to edit the other's. MOUNT ORDER MATTERS between them: Express tries
// mounted routers in order, and publicEventRoutes has a GET "/:eventId"
// that would swallow the organizer's literal GET "/mine" (returning
// 400 "eventId must be a positive integer") if it were reached first.
// So the organizer router, which only has literal + write routes, must
// be mounted BEFORE the public one.
//
// NOTE: routes/eventRoutes.js (organizer: POST /events, PUT/DELETE
// /events/:eventId, GET /events/mine) exists and is fully implemented
// but has never been mounted on either branch — those endpoints are
// currently unreachable. This wasn't part of the merge conflict, so
// it's left as-is; uncomment the line below to switch them on.
// Volunteer's PATCH /applications/:id/

// Organizer's PATCH /applications/:applicationId (accept/reject/undo).

// Both tracks serve /events, from separate route files.
// Organizer routes MUST come before public routes.
app.use("/events", require("./routes/eventRoutes"));
app.use("/events", require("./routes/roleRoutes").eventRolesRouter);
app.use(
  "/events",
  require("./routes/applicationRoutes").eventApplicationsRouter
);
app.use(
  "/events",
  require("./routes/assignmentRoutes").eventCandidatesRouter
);
// Sponsor Recommendation System: GET/POST /events/:id/sponsors and
// GET /events/:id/sponsor-recommendations.
app.use("/events", require("./routes/sponsorRoutes").eventSponsorsRouter);

// Public event routes
app.use("/events", require("./routes/publicEventRoutes"));

// Assignment routes
app.use(
  "/assignments",
  require("./routes/assignmentRoutes").assignmentsRouter
);

// Role routes
app.use("/roles", require("./routes/roleRoutes").rolesRouter);

// Sponsor catalogue (shared reference data) and single event↔sponsor
// links — the other two thirds of routes/sponsorRoutes.js.
app.use("/sponsors", require("./routes/sponsorRoutes").sponsorsRouter);
app.use(
  "/event-sponsors",
  require("./routes/sponsorRoutes").eventSponsorLinksRouter
);

// Reference data
app.use("/skills", require("./routes/skillRoutes"));


// ===============================
// Application Routes
// ===============================

// Volunteer application actions
app.use(
  "/applications",
  require("./routes/volunteerApplicationRoutes")
);

// Organizer application management
app.use(
  "/applications",
  require("./routes/applicationRoutes").applicationsRouter
);


// ===============================
// Certificate Routes
// ===============================

app.use(
  "/certificates",
  require("./routes/certificateRoutes")
);


// ===============================
// Attendance QR Routes
// ===============================

app.use(
  require("./routes/attendanceRoutes")
);


// ===============================
// Event Routes
// ===============================

// Organizer event routes
// Must come before public routes
app.use(
  "/events",
  require("./routes/eventRoutes")
);


// Event role management
app.use(
  "/events",
  require("./routes/roleRoutes").eventRolesRouter
);


// Event application management
app.use(
  "/events",
  require("./routes/applicationRoutes").eventApplicationsRouter
);


// Smart team builder candidate routes
app.use(
  "/events",
  require("./routes/assignmentRoutes").eventCandidatesRouter
);


// Public event routes
app.use(
  "/events",
  require("./routes/publicEventRoutes")
);


// ===============================
// Assignment Routes
// ===============================

app.use(
  "/assignments",
  require("./routes/assignmentRoutes").assignmentsRouter
);


// ===============================
// Role Routes
// ===============================

app.use(
  "/roles",
  require("./routes/roleRoutes").rolesRouter
);


// ===============================
// Error Handler
// MUST be last middleware
// ===============================


const errorHandler = require("./middleware/errorHandler");

app.use(errorHandler);


// ===============================
// Start Server
// ===============================

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`Ignite API running on http://localhost:${PORT}`)
);