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

// Organizer's event form (create and edit share one set of rules, the
// same way the backend's buildEventFields serves both paths).
//
// These mirror backend/controllers/eventController.js exactly —
// deliberately not stricter. A client rule the server doesn't share
// would block something the API accepts; a looser one would let the
// user hit a 400 they could have been warned about. Note the deadline
// rule is "not after start", so a deadline exactly at the start time is
// allowed, matching the server.
//
// Values come from <input type="datetime-local">, i.e. local-time
// strings like "2026-09-12T08:00". new Date() parses those as local
// time, which is what makes these comparisons correct.
const MAX_EVENT_TITLE = 255;
const MAX_EVENT_LOCATION = 255;

function parseDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function validateEventForm({
  title,
  location,
  eventStart,
  eventEnd,
  applicationDeadline,
}) {
  const errors = {};

  if (!title || !title.trim()) {
    errors.title = "Title is required";
  } else if (title.trim().length > MAX_EVENT_TITLE) {
    errors.title = `Must be ${MAX_EVENT_TITLE} characters or fewer`;
  }

  if (location && location.length > MAX_EVENT_LOCATION) {
    errors.location = `Must be ${MAX_EVENT_LOCATION} characters or fewer`;
  }

  const start = parseDateTime(eventStart);
  if (!eventStart) {
    errors.eventStart = "Start date and time is required";
  } else if (!start) {
    errors.eventStart = "Enter a valid date and time";
  }

  if (eventEnd) {
    const end = parseDateTime(eventEnd);
    if (!end) errors.eventEnd = "Enter a valid date and time";
    else if (start && end <= start) {
      errors.eventEnd = "Must be after the start time";
    }
  }

  if (applicationDeadline) {
    const deadline = parseDateTime(applicationDeadline);
    if (!deadline) errors.applicationDeadline = "Enter a valid date and time";
    else if (start && deadline > start) {
      errors.applicationDeadline = "Must be on or before the start time";
    }
  }

  return errors;
}

// A single event_role row: the category of work and how many volunteers
// it needs. Mirrors backend/controllers/roleController.js — note the
// 150-character title limit, which is event_roles.title's VARCHAR(150),
// narrower than an event's own 255.
const MAX_ROLE_TITLE = 150;

export function validateRoleForm({ title, capacity }) {
  const errors = {};

  if (!title || !title.trim()) {
    errors.title = "Role title is required";
  } else if (title.trim().length > MAX_ROLE_TITLE) {
    errors.title = `Must be ${MAX_ROLE_TITLE} characters or fewer`;
  }

  // Number inputs hand back strings, and "" / "3.5" / "0" all have to
  // fail here rather than at the API. Number("") is 0, so the blank
  // check has to come first.
  if (capacity === "" || capacity === null || capacity === undefined) {
    errors.capacity = "Number of volunteers is required";
  } else {
    const parsed = Number(capacity);
    if (!Number.isInteger(parsed) || parsed < 1) {
      errors.capacity = "Must be a whole number, 1 or more";
    }
  }

  return errors;
}
