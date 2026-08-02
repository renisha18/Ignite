// Organizer dashboard read. One function, one endpoint.
//
// New file rather than an addition to eventService or applicationService:
// the dashboard spans events, applications, assignments, certificates
// and sponsors at once, so it doesn't belong to any single resource.
//
// Depends on: services/api.js (base URL + Authorization header).
import api from "./api";

// GET /organizer/dashboard
//
// Everything the landing page renders, in one request — six parallel
// calls from one screen would mean six loading states and six chances
// to show half a picture.
//
// returns: {
//   overview: { totalEvents, publishedEvents, activeApplications,
//               assignedVolunteers, certificatesIssued },
//   recentEvents:   [{ eventId, title, status, location, eventStart,
//                      applicationCount, assignmentCount }],
//   upcomingEvents: [{ eventId, title, status, location, eventStart,
//                      applicationCount }],
//   applicationSummary: { applied, selected, confirmed, rejected, total },
//   sponsorSummary: {
//     recentSponsors: [{ sponsorId, sponsorName, industry, eventId,
//                        eventTitle, linkedAt }],
//     topSponsors:    [{ sponsorId, sponsorName, industry, eventCount }]
//   }
// }
//
// Everything is scoped to the caller's own organization, server-side.
// `applicationSummary` always carries all four keys, zero-filled — the
// caller never has to decide whether a missing key means none or means
// unknown. 400 if the account has no organization (i.e. an admin).
export async function getOrganizerDashboard() {
  const { data } = await api.get("/organizer/dashboard");
  return data;
}
