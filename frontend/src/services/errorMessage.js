// Why this exists: every backend error (from errorHandler.js) comes
// back as { error: "message" } in the response body, whether it's a
// 400 validation failure, a 409 conflict, or a 401. Both Login and
// Register need to unwrap that the same way — one function instead
// of repeating `err.response?.data?.error || "fallback"` in each page.
export function getErrorMessage(err, fallback = "Something went wrong. Please try again.") {
  return err?.response?.data?.error || fallback;
}
