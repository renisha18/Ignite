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

// Reference data, no auth. Deliberately separate from GET /events/skills,
// which returns only skills in demand on a published event.
app.use("/skills", require("./routes/skillRoutes"));

// Volunteer's PATCH /applications/:id/withdraw. The organizer track's
// applicationRoutes.js (GET /events/:id/applications, PATCH /:id) mounts
// alongside this one when it lands — different paths, no conflict.
app.use("/applications", require("./routes/volunteerApplicationRoutes"));

<<<<<<< HEAD
// Organizer issues (POST /certificates), volunteer downloads
// (GET /certificates/:id/download). The volunteer's own list lives at
// GET /volunteers/me/certificates, mounted above under /volunteers.
app.use("/certificates", require("./routes/certificateRoutes"));

// QR attendance. Mounted without a prefix because it spans two — the
// organizer's routes live under /events/:eventId/... and the volunteer's
// under /attendance/... — so the router declares full paths itself.
app.use(require("./routes/attendanceRoutes"));
=======
// Organizer's PATCH /applications/:applicationId (accept/reject/undo).
// Sits alongside the volunteer router above — the volunteer owns the
// literal "/:applicationId/withdraw", this owns "/:applicationId", which
// are different paths, so mount order between the two doesn't matter.
app.use("/applications", require("./routes/applicationRoutes").applicationsRouter);
>>>>>>> 004706be2fe52adb68bca5070db56e44a892020f

// Both tracks serve /events, from separate route files so neither has
// to edit the other's. MOUNT ORDER MATTERS between them: Express tries
// mounted routers in order, and publicEventRoutes has a GET "/:eventId"
// that would swallow the organizer's literal GET "/mine" (returning
// 400 "eventId must be a positive integer") if it were reached first.
// So the organizer router, which only has literal + write routes, must
// be mounted BEFORE the public one.
//
// roleRoutes contributes POST /events/:eventId/roles here; its PUT and
// DELETE live at /roles (mounted below) because the contract identifies
// a role by id alone once it exists.
app.use("/events", require("./routes/eventRoutes"));
app.use("/events", require("./routes/roleRoutes").eventRolesRouter);
app.use("/events", require("./routes/applicationRoutes").eventApplicationsRouter);
app.use("/events", require("./routes/assignmentRoutes").eventCandidatesRouter);
app.use("/events", require("./routes/publicEventRoutes"));

// Smart Team Builder writes: POST /assignments (place or move) and
// DELETE /assignments/:assignmentId (soft-cancel).
app.use("/assignments", require("./routes/assignmentRoutes").assignmentsRouter);

// PUT|DELETE /roles/:roleId — the other half of roleRoutes.js.
app.use("/roles", require("./routes/roleRoutes").rolesRouter);
// Organizer issues (POST /certificates), volunteer downloads
// (GET /certificates/:id/download). The volunteer's own list lives at
// GET /volunteers/me/certificates, mounted above under /volunteers.
//app.use("/certificates", require("./routes/certificateRoutes"));

// QR attendance. Mounted without a prefix because it spans two — the
// organizer's routes live under /events/:eventId/... and the volunteer's
// under /attendance/... — so the router declares full paths itself.
//app.use(require("./routes/attendanceRoutes"));

// Why errorHandler is registered LAST: Express only routes a request
// into a 4-arg (err, req, res, next) middleware when something calls
// next(err) — every route above wraps its handler in asyncHandler, so
// a thrown AppError ends up here instead of crashing the process.
const errorHandler = require("./middleware/errorHandler");
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Ignite API running on http://localhost:${PORT}`));