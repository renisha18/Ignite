// Why this exists: Login and Register both validate email format,
// and Register additionally validates password length and required
// fields — the same rules the backend enforces (see
// controllers/authController.js's assertValidCredentials). Client-side
// validation here is purely for instant feedback before a round trip;
// the backend remains the actual source of truth and re-validates
// everything regardless.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLogin({ email, password }) {
  const errors = {};
  if (!email) errors.email = "Email is required";
  else if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email";
  if (!password) errors.password = "Password is required";
  return errors;
}

export function validateRegister({ email, password, fullName, role, orgName }) {
  const errors = {};
  if (!fullName) errors.fullName = "Full name is required";
  if (!email) errors.email = "Email is required";
  else if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email";
  if (!password) errors.password = "Password is required";
  else if (password.length < 8) errors.password = "Must be at least 8 characters";
  if (role === "organizer" && !orgName) {
    errors.orgName = "Organization name is required";
  }
  return errors;
}
