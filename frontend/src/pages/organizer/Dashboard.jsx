// The organizer's landing page: an analytics overview, not a management
// screen. Everything here is read-only and summarises what the other
// pages already record — the only interactive elements are links into
// those pages.
//
// One request feeds the whole page (GET /organizer/dashboard), so there
// is a single loading state and the sections can't disagree with each
// other.
//
// Deliberately does NOT use components/DashboardHeader.jsx despite it
// being the "dashboard header": that renders a full maroon app bar with
// its own wordmark and logout, which inside OrganizerLayout would sit
// directly under OrganizerTopBar as a second, duplicate chrome bar.
// PageHeader is the in-layout heading every other organizer page uses.
//
// Depends on: services/dashboardService.js, services/errorMessage.js,
// components/ui/*, components/organizer/StatCard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import StatusChip from "../../components/ui/StatusChip";
import Alert from "../../components/Alert";
import StatCard from "../../components/organizer/StatCard";
import { getOrganizerDashboard } from "../../services/dashboardService";
import { getErrorMessage } from "../../services/errorMessage";

// Raw SVG path data, same convention as organizerNavItems.js — keeps
// this a plain module with no icon dependency.
const ICONS = {
  calendar: [
    "M8 2v3M16 2v3",
    "M3.5 8.5h17",
    "M4 6h16a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z",
  ],
  broadcast: ["M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z", "M5 17a9 9 0 0 1 14 0", "M12 14v7"],
  inbox: [
    "M15 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7l-4-4Z",
    "M14 3v4h5",
    "M9 13h6M9 17h4",
  ],
  people: [
    "M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20",
    "M10 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
    "M20 20v-1.5a3.5 3.5 0 0 0-2.6-3.4",
  ],
  award: [
    "M12 14.5a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z",
    "M8.5 13.5 7 21l5-2.5L17 21l-1.5-7.5",
  ],
};

// The four application statuses, with the same semantic colours
// StatusChip uses so a bar and a chip never disagree about what
// "selected" looks like.
const SUMMARY_BARS = [
  { key: "applied", label: "Applied", bar: "bg-muted" },
  { key: "selected", label: "Selected", bar: "bg-gold" },
  { key: "confirmed", label: "Confirmed", bar: "bg-success" },
  { key: "rejected", label: "Rejected", bar: "bg-error" },
];

const QUICK_ACTIONS = [
  // "Create Event" lands on My Events, where the create dialog lives.
  // Opening that dialog from here would mean teaching MyEvents to read
  // navigation state, which is a change to event management for a
  // convenience this page doesn't need.
  { label: "+ Create Event", to: "/organizer/events", variant: "primary" },
  { label: "Manage Applications", to: "/organizer/applications", variant: "secondary" },
  { label: "Attendance", to: "/organizer/attendance", variant: "secondary" },
  { label: "Certificates", to: "/organizer/certificates", variant: "secondary" },
];

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function SectionHeading({ children, action }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-ink pb-1.5">
      <h2 className="font-display text-sm font-extrabold uppercase tracking-tight text-ink">
        {children}
      </h2>
      {action}
    </div>
  );
}

function EmptyNote({ children }) {
  return <p className="text-sm text-muted">{children}</p>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    getOrganizerDashboard()
      .then((result) => {
        if (!ignore) setData(result);
      })
      .catch((err) => {
        if (!ignore) setError(getErrorMessage(err, "Couldn't load your dashboard."));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const summary = data?.applicationSummary;
  const sponsors = data?.sponsorSummary;
  const hasSponsorHistory =
    (sponsors?.recentSponsors.length ?? 0) > 0 ||
    (sponsors?.topSponsors.length ?? 0) > 0;

  return (
    <>
      <PageHeader
        title={user?.fullName ? `Welcome back, ${user.fullName}` : "Dashboard"}
        subtitle="Here's what's happening across your events."
      />

      {error && (
        <div className="mb-6">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading your dashboard…</p>
      ) : !data ? null : (
        <div className="flex flex-col gap-8">
          {/* 1 ------------------------------------------- Overview */}
          <section>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard
                label="Total Events"
                value={data.overview.totalEvents}
                icon={ICONS.calendar}
              />
              <StatCard
                label="Published"
                value={data.overview.publishedEvents}
                icon={ICONS.broadcast}
                tone="gold"
              />
              <StatCard
                label="Active Applications"
                value={data.overview.activeApplications}
                icon={ICONS.inbox}
              />
              <StatCard
                label="Assigned Volunteers"
                value={data.overview.assignedVolunteers}
                icon={ICONS.people}
                tone="gold"
              />
              <StatCard
                label="Certificates Issued"
                value={data.overview.certificatesIssued}
                icon={ICONS.award}
              />
            </div>
          </section>

          {/* 2 -------------------------------------- Recent events */}
          <section>
            <SectionHeading>Recent Events</SectionHeading>

            {data.recentEvents.length === 0 ? (
              <EmptyNote>
                No events yet. Create one from My Events to get started.
              </EmptyNote>
            ) : (
              <Card className="overflow-x-auto p-0">
                <table className="w-full min-w-[42rem] border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-ink text-left">
                      {["Event", "Status", "Date", "Applications", "Assignments", ""].map(
                        (heading) => (
                          <th
                            key={heading}
                            scope="col"
                            className="px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted"
                          >
                            {heading}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentEvents.map((event) => (
                      <tr
                        key={event.eventId}
                        className="border-b-2 border-ink/15 last:border-b-0"
                      >
                        <td className="px-4 py-3 font-semibold text-ink">
                          {event.title}
                        </td>
                        <td className="px-4 py-3">
                          <StatusChip status={event.status} type="event" />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-ink/80">
                          {formatDate(event.eventStart)}
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums text-ink/80">
                          {event.applicationCount}
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums text-ink/80">
                          {event.assignmentCount}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {/* Into the existing management flow — no new
                              page, no new route. */}
                          <Button
                            variant="secondary"
                            onClick={() => navigate("/organizer/events")}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </section>

          {/* 3 ------------------------------------ Upcoming events */}
          <section>
            <SectionHeading>Upcoming Events</SectionHeading>

            {data.upcomingEvents.length === 0 ? (
              <EmptyNote>Nothing scheduled ahead right now.</EmptyNote>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {data.upcomingEvents.map((event) => (
                  <Card as="li" key={event.eventId} className="list-none p-4">
                    <p className="font-display text-base font-extrabold uppercase tracking-tight text-ink">
                      {event.title}
                    </p>
                    <dl className="mt-2 flex flex-col gap-1 text-xs">
                      <div className="flex gap-2">
                        <dt className="w-24 shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                          Date
                        </dt>
                        <dd className="text-ink/80">{formatDate(event.eventStart)}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="w-24 shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                          Location
                        </dt>
                        <dd className="min-w-0 text-ink/80">
                          {event.location || "—"}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="w-24 shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                          Applications
                        </dt>
                        <dd className="font-mono tabular-nums text-ink/80">
                          {event.applicationCount}
                        </dd>
                      </div>
                    </dl>
                  </Card>
                ))}
              </ul>
            )}
          </section>

          {/* 4 --------------------------------- Application summary */}
          <section>
            <SectionHeading>Application Summary</SectionHeading>

            {summary.total === 0 ? (
              <EmptyNote>No applications received yet.</EmptyNote>
            ) : (
              <Card className="p-4">
                <ul className="flex flex-col gap-3">
                  {SUMMARY_BARS.map((bucket) => {
                    const count = summary[bucket.key];
                    // Share of all decided + pending applications, so
                    // the four bars add up to the whole funnel.
                    const pct = Math.round((count / summary.total) * 100);

                    return (
                      <li key={bucket.key}>
                        <div className="mb-1 flex items-baseline justify-between gap-2">
                          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink">
                            {bucket.label}
                          </span>
                          <span className="font-mono text-xs tabular-nums text-muted">
                            {count} · {pct}%
                          </span>
                        </div>
                        <div className="h-3 w-full overflow-hidden rounded-full border-2 border-ink bg-cream">
                          <div
                            className={`h-full ${bucket.bar}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  {summary.total} applications total
                </p>
              </Card>
            )}
          </section>

          {/* 5 ------------------------------------ Sponsor insights */}
          <section>
            <SectionHeading>Sponsor Insights</SectionHeading>

            {!hasSponsorHistory ? (
              <EmptyNote>No sponsor history available.</EmptyNote>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="p-4">
                  <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                    Recent Sponsors
                  </h3>
                  <ul className="mt-2 flex flex-col gap-2">
                    {sponsors.recentSponsors.map((sponsor) => (
                      <li
                        key={`${sponsor.sponsorId}-${sponsor.eventId}`}
                        className="flex flex-wrap items-baseline justify-between gap-2"
                      >
                        <span className="text-sm font-semibold text-ink">
                          {sponsor.sponsorName}
                        </span>
                        <span className="min-w-0 truncate text-xs text-muted">
                          {sponsor.eventTitle}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>

                <Card className="p-4">
                  <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                    Most Frequent Sponsors
                  </h3>
                  <ul className="mt-2 flex flex-col gap-2">
                    {sponsors.topSponsors.map((sponsor) => (
                      <li
                        key={sponsor.sponsorId}
                        className="flex items-baseline justify-between gap-2"
                      >
                        <span className="min-w-0 truncate text-sm font-semibold text-ink">
                          {sponsor.sponsorName}
                        </span>
                        <span className="shrink-0 rounded-full border-2 border-ink bg-gold px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums text-ink">
                          {sponsor.eventCount}{" "}
                          {sponsor.eventCount === 1 ? "event" : "events"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            )}
          </section>

          {/* 6 --------------------------------------- Quick actions */}
          <section>
            <SectionHeading>Quick Actions</SectionHeading>
            <div className="flex flex-wrap gap-3">
              {QUICK_ACTIONS.map((action) => (
                <Button
                  key={action.to + action.label}
                  variant={action.variant}
                  onClick={() => navigate(action.to)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
