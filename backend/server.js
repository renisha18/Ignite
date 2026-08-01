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
app.use("/events", require("./routes/publicEventRoutes"));
// Further route mounts go here as each module is built, e.g.:
// app.use("/events", require("./routes/eventRoutes"));

// Why errorHandler is registered LAST: Express only routes a request
// into a 4-arg (err, req, res, next) middleware when something calls
// next(err) — every route above wraps its handler in asyncHandler, so
// a thrown AppError ends up here instead of crashing the process.
const errorHandler = require("./middleware/errorHandler");
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Ignite API running on http://localhost:${PORT}`));
