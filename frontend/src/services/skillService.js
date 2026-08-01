// Reference data — the full skills list, used by the volunteer's
// profile picker and (later) the organizer's event-role form.
//
// Not the same as eventService.getFilterSkills(), which hits
// GET /events/skills and returns only skills attached to a role on a
// published event. Use that one for the browse filter; use this one
// anywhere someone is *choosing* skills rather than filtering by them.
//
// Depends on: services/api.js
import api from "./api";

// GET /skills
// Public — no auth required.
// returns: [{ skillId, name }]
export async function getSkills() {
  const { data } = await api.get("/skills");
  return data.skills;
}
