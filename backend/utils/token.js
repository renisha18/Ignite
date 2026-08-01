// Why this file exists: both authController (signs tokens on login/
// register) and authenticate middleware (verifies them on every
// protected request) need to agree on exactly what a token contains
// and how it's signed. Putting that in one place means the token
// "shape" — { userId, role, orgId } — is defined once, not
// re-typed in two files where it could quietly drift apart.
//
// Depends on: process.env.JWT_SECRET, JWT_EXPIRES_IN (loaded via
// dotenv in server.js before anything requires this file).
// Depended on by: controllers/authController.js, middleware/authenticate.js
const jwt = require("jsonwebtoken");

function signToken(payload) {
  // payload: { userId, role, orgId? } — orgId only present for organizers,
  // so downstream code should never assume it exists.
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { signToken, verifyToken };
