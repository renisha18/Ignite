// Why this file exists: the one place that knows the exact backend
// auth contract (URLs, request bodies, response shapes). AuthContext
// and the Login/Register pages never call `api.post` directly for
// auth — they call these functions, so if a backend route ever
// changes, there's exactly one place to update.
//
// Every function here mirrors an endpoint from routes/authRoutes.js
// on the backend — see that file (and controllers/authController.js)
// for the source of truth this was built against. Nothing here
// invents fields the backend doesn't expect.
import api from "./api";

// POST /auth/register/volunteer
// body: { email, password, fullName }
// returns: { token, user: { userId, email, fullName, role } }
export async function registerVolunteer({ email, password, fullName }) {
  const { data } = await api.post("/auth/register/volunteer", {
    email,
    password,
    fullName,
  });
  return data;
}

// POST /auth/register/organizer
// body: { email, password, fullName, orgName, orgDescription?, orgLocation? }
// returns: { token, user, organization: { orgId, name, status } }
// Note: organization.status comes back "pending" — the backend
// doesn't auto-approve orgs, so the UI should say so, not imply the
// organizer can publish events immediately.
export async function registerOrganizer({
  email,
  password,
  fullName,
  orgName,
  orgDescription,
  orgLocation,
}) {
  const { data } = await api.post("/auth/register/organizer", {
    email,
    password,
    fullName,
    orgName,
    orgDescription,
    orgLocation,
  });
  return data;
}

// POST /auth/login
// body: { email, password }
// returns: { token, user, organization? }  (organization only present for organizers)
export async function login({ email, password }) {
  const { data } = await api.post("/auth/login", { email, password });
  return data;
}

// GET /auth/me  (requires Authorization header — attached automatically by api.js)
// returns: { user, organization? }
export async function fetchMe() {
  const { data } = await api.get("/auth/me");
  return data;
}
