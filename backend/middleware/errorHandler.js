// Why this exists: one place that decides how any error becomes an
// HTTP response. AppError instances (expected failures — bad input,
// duplicate email, wrong password) return their own status + message.
// Anything else (a real bug, a DB connection drop) logs full detail
// server-side but returns a generic 500 to the client — so internal
// error details never leak into an API response.
//
// Must be registered LAST in server.js, after all routes, per
// Express's convention for 4-arg error middleware.
function errorHandler(err, req, res, next) {
  if (err.isOperational) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  console.error(err); // unexpected — log full detail for debugging
  res.status(500).json({ error: "Something went wrong" });
}

module.exports = errorHandler;
