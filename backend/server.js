// Why this file exists: the single entrypoint that wires together
// config, middleware, and routes. Nothing else in the backend starts
// the server — everything else exports things for THIS file to use.
//
// Depends on: config/db.js (indirectly, via route files once they
// exist), whatever gets mounted under app.use(...) below.
// Depended on by: nothing — this is the top of the dependency tree.
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Health check — confirms the server (and later, the DB pool) is
// alive. Useful during setup and again during the hackathon when
// something's not responding and you need to rule out "is the server
// even running" in five seconds.
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", require("./routes/authRoutes"));
app.use("/admin", require("./routes/adminRoutes"));
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
app.use("/certificates", require("./routes/certificateRoutes"));

// QR Attendance
app.use(require("./routes/attendanceRoutes"));

// Organizer event routes (must come before public routes)
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

// Public event routes
app.use("/events", require("./routes/publicEventRoutes"));

// Assignment routes
app.use(
  "/assignments",
  require("./routes/assignmentRoutes").assignmentsRouter
);

// Role routes
app.use("/roles", require("./routes/roleRoutes").rolesRouter);

// Error handler
const errorHandler = require("./middleware/errorHandler");
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`Ignite API running on http://localhost:${PORT}`)
);