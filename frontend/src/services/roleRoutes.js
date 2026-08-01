// Why this exists: Login and Register both need to redirect to a
// different dashboard depending on the returned user's role — one
// map instead of duplicating the same if/else in both places.
const ROLE_ROUTES = {
  volunteer: "/volunteer/dashboard",
  organizer: "/organizer/dashboard",
  admin: "/admin/dashboard",
};

export function dashboardPathForRole(role) {
  return ROLE_ROUTES[role] || "/login";
}
