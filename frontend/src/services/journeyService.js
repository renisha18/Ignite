// The "My Journey" timeline — docs/api-contract.md, volunteer track.
// Feeds both the History page and My Team (assigned role + teammates),
// since there's no separate team endpoint in the contract.
//
// STUB: signature and route are final, body is not written yet.
// See the note in eventService.js.
//
/* eslint-disable no-unused-vars -- Stub file; see eventService.js. */
import api from "./api";

// GET /volunteers/me/journey
// returns: { journey: [...] }
export async function getMyJourney() {
  // return (await api.get("/volunteers/me/journey")).data.journey;
  throw new Error("Not implemented: journeyService.getMyJourney");
}
