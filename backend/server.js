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


// ===============================
// Authentication
// ===============================

app.use("/auth", require("./routes/authRoutes"));


// ===============================
// Admin routes
// ===============================

app.use("/admin", require("./routes/adminRoutes"));


// ===============================
// Volunteer routes
// ===============================

app.use("/volunteers", require("./routes/volunteerRoutes"));


// ===============================
// Reference data
// ===============================

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


// Sponsor Recommendation System
app.use(
  "/events",
  require("./routes/sponsorRoutes").eventSponsorsRouter
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
// Sponsor Routes
// ===============================

// Sponsor catalogue
app.use(
  "/sponsors",
  require("./routes/sponsorRoutes").sponsorsRouter
);

// Event ↔ sponsor links
app.use(
  "/event-sponsors",
  require("./routes/sponsorRoutes").eventSponsorLinksRouter
);


// ===============================
// Role Routes
// ===============================

app.use(
  "/roles",
  require("./routes/roleRoutes").rolesRouter
);


// ===============================
// Organizer Dashboard
// ===============================

// GET /organizer/dashboard — one read-only summary for the landing
// page. /organizer is a prefix nothing else uses.
app.use("/organizer", require("./routes/dashboardRoutes"));


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