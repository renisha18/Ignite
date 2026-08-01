// Why this exists: without it, every controller needs its own
// try/catch that calls next(err) manually, or an unhandled rejection
// in an async route handler crashes the request silently. Wrapping a
// handler in asyncHandler(fn) catches any rejected promise and hands
// it to Express's error pipeline (middleware/errorHandler.js) —
// one place to write error handling instead of once per route.
//
// Depended on by: every controller.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
