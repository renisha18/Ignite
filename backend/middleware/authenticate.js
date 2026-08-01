// Why this exists: every protected route needs the same check
// (valid token present, not expired) before it can trust req.user.
// One middleware, mounted per-route, instead of repeating token
// parsing in every controller.
//
// Depends on: utils/token.js
// Depended on by: any protected route (see routes/authRoutes.js for
// an example mounting it on GET /me).
const { verifyToken } = require("../utils/token");
const AppError = require("../utils/AppError");

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new AppError(401, "Missing or malformed Authorization header"));
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = verifyToken(token); // { userId, role, orgId? }
    req.user = payload;
    next();
  } catch (err) {
    next(new AppError(401, "Invalid or expired token"));
  }
}

module.exports = authenticate;
