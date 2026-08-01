// Why this exists: lets a controller throw `new AppError(409, "Email
// already registered")` and have errorHandler.js turn that straight
// into the right HTTP status + message. Without it, every "expected"
// failure (duplicate email, bad password, missing field) either gets
// a generic 500 or needs its own res.status().json() at the call
// site — this keeps that logic in one place.
class AppError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // distinguishes "expected" errors from bugs
  }
}

module.exports = AppError;
