// Why this file exists: assembles the organizer dashboard's single
// response. Read-only — it summarises what other features have already
// recorded and owns no business rules of its own.
//
// One endpoint rather than six: the dashboard renders as a whole, and
// six parallel requests from one screen would be six round trips, six
// loading states, and six chances to render half a picture.
//
// Depends on: models/dashboardModel.js, utils/AppError.js
// Depended on by: routes/dashboardRoutes.js
const dashboardModel = require("../models/dashboardModel");
const AppError = require("../utils/AppError");

// The four buckets Section 4 renders. 'withdrawn' is deliberately
// absent: the volunteer pulled out, so it isn't part of the organizer's
// decision funnel.
const SUMMARY_STATUSES = ["applied", "selected", "confirmed", "rejected"];

// -------------------------------------------------------------
// GET /organizer/dashboard
// -------------------------------------------------------------
async function getDashboard(req, res) {
  // Same guard as GET /events/mine: the dashboard is organization-scoped
  // by definition, and an admin token carries no orgId. Saying so beats
  // rendering a page of zeroes that looks like real data.
  if (!req.user.orgId) {
    throw new AppError(
      400,
      "The organizer dashboard is organization-scoped — this account has no organization"
    );
  }

  const orgId = req.user.orgId;

  // Independent reads, so they go out together rather than in sequence.
  const [
    eventCounts,
    activeApplications,
    assignedVolunteers,
    certificatesIssued,
    recentEvents,
    upcomingEvents,
    statusCounts,
    recentSponsors,
    topSponsors,
  ] = await Promise.all([
    dashboardModel.findEventCounts(orgId),
    dashboardModel.countActiveApplications(orgId),
    dashboardModel.countAssignedVolunteers(orgId),
    dashboardModel.countCertificatesIssued(orgId),
    dashboardModel.findRecentEvents(orgId),
    dashboardModel.findUpcomingEvents(orgId),
    dashboardModel.findApplicationStatusCounts(orgId),
    dashboardModel.findRecentSponsors(orgId),
    dashboardModel.findTopSponsors(orgId),
  ]);

  // Flattened to a fixed shape with explicit zeroes: GROUP BY only
  // returns statuses that actually occur, and the UI shouldn't have to
  // decide whether a missing key means zero or means "unknown".
  const applicationSummary = Object.fromEntries(
    SUMMARY_STATUSES.map((status) => [
      status,
      statusCounts.find((row) => row.status === status)?.count ?? 0,
    ])
  );
  applicationSummary.total = SUMMARY_STATUSES.reduce(
    (sum, status) => sum + applicationSummary[status],
    0
  );

  res.json({
    overview: {
      totalEvents: eventCounts.totalEvents,
      publishedEvents: eventCounts.publishedEvents,
      activeApplications,
      assignedVolunteers,
      certificatesIssued,
    },
    recentEvents,
    upcomingEvents,
    applicationSummary,
    sponsorSummary: {
      recentSponsors,
      topSponsors,
    },
  });
}

module.exports = { getDashboard };
