// The volunteer's own profile. Both routes are /me — the backend takes
// the volunteer from the JWT, never from the URL, so there's no id to
// pass here.
//
// Depends on: services/api.js (attaches the Authorization header)
import api from "./api";

// GET /volunteers/me/profile
// returns: { volunteerId, fullName, email, bio, location, totalHours,
//            reputationScore, skills: [{ skillId, name }] }
export async function getProfile() {
  const { data } = await api.get("/volunteers/me/profile");
  return data.profile;
}

// PUT /volunteers/me/profile
// body: { bio?, location?, skillIds?: [] }
//
// Partial update. An omitted key is left untouched; `skillIds: []`
// explicitly clears every skill. Sending an empty object is a 400 —
// the caller should know whether it has anything to save.
//
// returns: the re-read profile, same shape as getProfile()
export async function updateProfile(body) {
  const { data } = await api.put("/volunteers/me/profile", body);
  return data.profile;
}
