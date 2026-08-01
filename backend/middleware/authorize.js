// Why this is a separate middleware from authenticate.js rather than
// one combined check: authenticate answers "who is this?" and
// authorize answers "are they allowed here?" — different questions.
// Splitting them means a route can require login without restricting
// role (rare), and every role-restricted route reuses the exact same
// logic instead of hand-rolling an if/else per controller.
//
// Must be mounted AFTER authenticate on any route that uses it, since
// it reads req.user which authenticate sets.
//
// Usage: router.post("/events", authenticate, authorize("organizer", "admin"), createEvent)
const AppError = require("../utils/AppError");

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new AppError(403, "You don't have permission to do that"));
    }
    next();
  };
}

module.exports = authorize;
