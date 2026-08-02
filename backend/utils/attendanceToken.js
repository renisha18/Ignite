// Why this is separate from utils/token.js: attendance QR tokens are
// displayed on a projector for a room full of people to photograph.
// Signing them with the same secret as login tokens would make every
// photographed QR a structurally valid JWT — one that passes
// `authenticate` and sets req.user = { eventId, purpose }. authorize()
// rejects it today (no role claim), but any future route with
// `authenticate` and no `authorize` would be exposed. Deriving a
// distinct secret means a QR simply fails signature verification
// anywhere outside this module.
//
// No new env var: derived from JWT_SECRET so deployment doesn't gain a
// second thing to configure and forget.
//
// Depends on: process.env.JWT_SECRET (loaded via dotenv in server.js)
// Depended on by: controllers/attendanceController.js
const jwt = require("jsonwebtoken");

const PURPOSE = "attendance";

// Read lazily rather than at module load: config/db.js and server.js
// both call dotenv.config(), but require order shouldn't decide whether
// this file sees the secret.
function secret() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not set — attendance QR tokens cannot be signed");
  }
  return `${process.env.JWT_SECRET}::${PURPOSE}`;
}

// Five minutes. Short enough that a screenshot taken at the start of an
// event is useless by the end of it; long enough that the organizer's
// screen isn't refetching constantly. The displaying client refreshes
// before this elapses — see AttendanceQrDisplay.
const EXPIRES_IN_SECONDS = 300;

// The token IS the state. Nothing is persisted when a QR is generated —
// the locked schema has no column for it — so a QR is valid purely
// because it verifies, and stops being valid purely because it expires.
function signAttendanceToken(eventId) {
  return {
    qrToken: jwt.sign({ eventId: Number(eventId), purpose: PURPOSE }, secret(), {
      expiresIn: EXPIRES_IN_SECONDS,
    }),
    expiresIn: EXPIRES_IN_SECONDS,
  };
}

// Throws jwt's own errors — TokenExpiredError vs JsonWebTokenError — so
// the controller can tell "expired" from "invalid" and say which.
// Callers must still check `purpose`; a token signed by this module
// always carries it, but verifying it explicitly means a future token
// type signed with the same derived secret can't be replayed here.
function verifyAttendanceToken(token) {
  return jwt.verify(token, secret());
}

module.exports = { signAttendanceToken, verifyAttendanceToken, PURPOSE, EXPIRES_IN_SECONDS };
