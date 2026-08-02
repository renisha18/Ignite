// The volunteer's overview page — everything at a glance, with the
// actionable thing (what's coming up) given the most room.
//
// No backend call of its own. Three existing endpoints in parallel, and
// every figure derived here:
//
//   hours        Σ journey[].hoursCredited
//   certificates certificates.length
//   active apps  applications where status is applied | selected
//   upcoming     journey entries whose event hasn't happened yet
//
// Two of those need explaining:
//
//   * Upcoming assignments have no endpoint. assignmentService is
//     entirely organizer-side (getCandidates / createAssignment /
//     deleteAssignment) — there is no GET /volunteers/me/assignments.
//     getMyJourney() already returns every active assignment with its
//     event date, so "upcoming" is that list filtered forward in time.
//     No new route needed.
//
//   * Hours do NOT come from profile.totalHours. That column is read at
//     volunteerProfileModel.js:32 and written nowhere in the backend, so
//     it reads 0.00 for everyone — including a volunteer holding 264
//     hours of certificates. Summing the journey's hoursCredited is both
//     correct and consistent with History.jsx, which does the same.
//     That's also why getProfile() isn't called at all: the only other
//     thing it offered was the name, and useAuth() already has it.
//
// Depends on: services/{application,certificate,journey}Service,
// components/volunteer/{StatCard,JourneyEntry}, components/ui/*
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Alert from "../../components/Alert";
import StatCard from "../../components/volunteer/StatCard";
import JourneyEntry from "../../components/volunteer/JourneyEntry";
import { getMyApplications } from "../../services/applicationService";
import { getMyCertificates } from "../../services/certificateService";
import { getMyJourney } from "../../services/journeyService";

// applications.status values that still need the volunteer's attention.
// 'confirmed' is excluded — that one's settled, it shows up as an
// upcoming assignment instead.
const ACTIVE_APPLICATION_STATUSES = ["applied", "selected"];

const PREVIEW_COUNT = 3;

function isUpcoming(entry) {
  if (!entry.eventStart) return false;
  const start = new Date(entry.eventStart);
  return !Number.isNaN(start.getTime()) && start > new Date();
}

// Section wrapper. Local to this page rather than a shared component —
// it's a heading and a slot, and inventing a DashboardSection component
// for that would be more indirection than it saves.
function Section({ title, action, children }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-black text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function LoadingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your dashboard">
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="h-28 animate-pulse shadow-brutal-lg">
            <div className="h-7 w-14 rounded bg-muted/25" />
            <div className="mt-3 h-2 w-20 rounded bg-muted/20" />
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="h-40 animate-pulse" />
        </div>
        <Card className="h-40 animate-pulse" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  // ui/Button renders a hardcoded <button> and has no `as` prop, so it
  // can't become a <Link>. Wrapping it in one would nest a <button>
  // inside an <a>, which is invalid HTML and reads badly to screen
  // readers. Navigating on click keeps the button semantics and leaves
  // the shared component untouched — the tradeoff is no middle-click or
  // open-in-new-tab on these two, noted in the summary.
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [journey, setJourney] = useState([]);
  const [loading, setLoading] = useState(true);
  const [partialError, setPartialError] = useState("");

  useEffect(() => {
    let ignore = false;

    // allSettled rather than all: with Promise.all, one failing endpoint
    // rejects the lot and blanks a page whose other two sections loaded
    // fine. A dashboard should degrade, not disappear. Still parallel.
    Promise.allSettled([getMyApplications(), getMyCertificates(), getMyJourney()])
      .then(([apps, certs, jrny]) => {
        if (ignore) return;

        setApplications(apps.status === "fulfilled" ? apps.value : []);
        setCertificates(certs.status === "fulfilled" ? certs.value : []);
        setJourney(jrny.status === "fulfilled" ? jrny.value : []);

        const failed = [
          apps.status === "rejected" && "applications",
          certs.status === "rejected" && "certificates",
          jrny.status === "rejected" && "activity",
        ].filter(Boolean);

        // Names what's missing rather than a blanket "something went
        // wrong" — the rest of the page is still true.
        setPartialError(
          failed.length
            ? `Couldn't load your ${failed.join(" and ")}. The rest of this page is up to date.`
            : ""
        );
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const totalHours = journey.reduce((sum, e) => sum + (e.hoursCredited ?? 0), 0);
  const activeApplications = applications.filter((a) =>
    ACTIVE_APPLICATION_STATUSES.includes(a.status)
  ).length;

  // Soonest first here — the opposite of the journey's newest-first,
  // because "what's next" means the nearest date, not the latest.
  const upcoming = journey
    .filter(isUpcoming)
    .sort((a, b) => new Date(a.eventStart) - new Date(b.eventStart));

  const recent = journey.filter((e) => !isUpcoming(e)).slice(0, PREVIEW_COUNT);

  const firstName = user?.fullName?.trim().split(/\s+/)[0];
  const isEmpty =
    applications.length === 0 && certificates.length === 0 && journey.length === 0;

  return (
    <>
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Dashboard"}
        subtitle="Your events, applications and hours at a glance."
        // Quick actions sit with the greeting rather than at the foot of
        // the page — they're the two things someone arrives here to do.
        actions={
          <>
            <Button onClick={() => navigate("/volunteer/events")}>
              Browse Events
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate("/volunteer/applications")}
            >
              My Applications
            </Button>
          </>
        }
      />

      {loading && <LoadingSkeleton />}

      {!loading && partialError && (
        <div className="mb-6">
          <Alert variant="error">{partialError}</Alert>
        </div>
      )}

      {!loading && isEmpty && (
        // One prompt, not four empty sections stacked up. A brand-new
        // volunteer has nothing anywhere, and saying so five times reads
        // as breakage rather than a starting point.
        <Card className="border-dashed py-12 text-center shadow-brutal-lg">
          <p className="font-display text-xl font-black text-ink">
            Nothing here yet — that&apos;s the fun part
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Find an event that needs your help. Once you&apos;re assigned a role,
            this page fills up with what&apos;s coming, the hours you&apos;ve put
            in, and the certificates you&apos;ve earned.
          </p>
          <div className="mt-5 flex justify-center">
            <Button onClick={() => navigate("/volunteer/events")}>
              Browse Events
            </Button>
          </div>
        </Card>
      )}

      {!loading && !isEmpty && (
        <>
          {/* At-a-glance strip. 2-up on mobile, 4-up from lg so the whole
              row reads in one scan without scrolling. */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              value={Number.isInteger(totalHours) ? totalHours : totalHours.toFixed(1)}
              label="Hours volunteered"
            />
            <StatCard value={certificates.length} label="Certificates earned" />
            <StatCard
              value={activeApplications}
              label="Active applications"
              hint={activeApplications > 0 ? "Awaiting a decision" : undefined}
            />
            {/* The only accented tile: upcoming is the actionable
                number, so it gets the gold fill the rest don't. */}
            <StatCard
              value={upcoming.length}
              label="Upcoming events"
              accent={upcoming.length > 0}
            />
          </div>

          {/* Upcoming gets two thirds — it's the most actionable thing
              on the page. Recent Activity is the narrower companion.
              Single column below lg. */}
          <div className="grid items-start gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Section
                title="Upcoming"
                action={
                  upcoming.length > PREVIEW_COUNT ? (
                    <Link
                      to="/volunteer/history"
                      className="text-sm font-bold text-primary underline-offset-4 hover:underline"
                    >
                      See all {upcoming.length}
                    </Link>
                  ) : null
                }
              >
                {upcoming.length === 0 ? (
                  <Card className="border-dashed py-8 text-center">
                    <p className="text-sm text-muted">
                      No events coming up.{" "}
                      <Link
                        to="/volunteer/events"
                        className="font-bold text-primary underline-offset-4 hover:underline"
                      >
                        Find one
                      </Link>
                      .
                    </p>
                  </Card>
                ) : (
                  <ul className="list-none">
                    {upcoming.slice(0, PREVIEW_COUNT).map((entry, i, shown) => (
                      <JourneyEntry
                        key={entry.assignmentId}
                        entry={entry}
                        isLast={i === shown.length - 1}
                      />
                    ))}
                  </ul>
                )}
              </Section>
            </div>

            <Section
              title="Recent activity"
              action={
                journey.length > 0 ? (
                  <Link
                    to="/volunteer/history"
                    className="text-sm font-bold text-primary underline-offset-4 hover:underline"
                  >
                    Full history
                  </Link>
                ) : null
              }
            >
              {recent.length === 0 ? (
                <Card className="border-dashed py-8 text-center">
                  <p className="text-sm text-muted">
                    Nothing completed yet. Your first event will show up here.
                  </p>
                </Card>
              ) : (
                <ul className="list-none">
                  {recent.map((entry, i) => (
                    <JourneyEntry
                      key={entry.assignmentId}
                      entry={entry}
                      isLast={i === recent.length - 1}
                    />
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </>
      )}
    </>
  );
}
