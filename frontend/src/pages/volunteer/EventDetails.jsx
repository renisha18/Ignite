// Event Details — full event info, its roles, and the apply form.
//
// Fetches two things: the event itself, and the volunteer's own
// applications so it can tell whether they've already applied. There's
// no "has this volunteer applied" field on GET /events/:eventId — it's
// a public endpoint and adding an auth-dependent field would change its
// shape for anonymous callers. Matching client-side against
// getMyApplications() reuses an endpoint we already have and keeps the
// public route public.
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import StatusChip from "../../components/ui/StatusChip";
import Toast from "../../components/ui/Toast";
import Alert from "../../components/Alert";
import ApplyForm from "../../components/volunteer/ApplyForm";
import { getEventById } from "../../services/eventService";
import { getMyApplications } from "../../services/applicationService";
import { getErrorMessage } from "../../services/errorMessage";

const FULL_DATE = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const DEADLINE_DATE = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatWindow(start, end) {
  if (!start) return null;
  const from = new Date(start);
  if (Number.isNaN(from.getTime())) return null;

  const startText = FULL_DATE.format(from);
  if (!end) return startText;

  const to = new Date(end);
  if (Number.isNaN(to.getTime())) return startText;

  const sameDay = from.toDateString() === to.toDateString();
  const endText = sameDay
    ? to.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : FULL_DATE.format(to);

  return `${startText} – ${endText}`;
}

// Capacity chip, same gold-seal treatment as Browse Events.
function RoleChip({ title, capacity, filledCount }) {
  const isFull = capacity > 0 && filledCount >= capacity;

  return (
    <span
      className={`relative inline-flex items-center overflow-hidden rounded-full border py-0.5 pl-3.5 pr-2.5 text-xs ${
        isFull
          ? "border-gold/60 bg-gold/15 text-gold-dark"
          : "border-muted/40 bg-muted/10 text-ink/70"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute -left-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rotate-45 ${
          isFull ? "bg-gold" : "bg-muted"
        }`}
      />
      {title}
      <span className="ml-1.5 font-mono text-[11px] tabular-nums">
        {filledCount}/{capacity}
      </span>
    </span>
  );
}

export default function EventDetails() {
  const { eventId } = useParams();

  const [event, setEvent] = useState(null);
  const [roles, setRoles] = useState([]);
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);

    // Both in parallel — neither depends on the other, and the page
    // can't render usefully without both.
    Promise.all([getEventById(eventId), getMyApplications()])
      .then(([detail, applications]) => {
        if (ignore) return;
        setEvent(detail.event);
        setRoles(detail.roles ?? []);
        setApplication(
          applications.find((app) => String(app.eventId) === String(eventId)) ?? null
        );
      })
      .catch((err) => {
        if (!ignore) setError(getErrorMessage(err, "Couldn't load this event."));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [eventId]);

  const handleApplied = useCallback((created) => {
    setApplication(created);
    setToast({ variant: "success", message: "Application submitted." });
  }, []);

  if (loading) {
    return (
      <>
        <PageHeader title="Event Details" />
        <Card className="h-64 animate-pulse" aria-busy="true" aria-label="Loading event">
          <div className="h-2 w-24 rounded bg-muted/25" />
          <div className="mt-3 h-6 w-2/3 rounded bg-muted/25" />
          <div className="mt-4 h-3 w-1/2 rounded bg-muted/20" />
          <div className="mt-8 h-16 w-full rounded bg-muted/15" />
        </Card>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Event Details" />
        <Alert>{error}</Alert>
        <Link
          to="/volunteer/events"
          className="mt-4 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Back to Browse Events
        </Link>
      </>
    );
  }

  const when = formatWindow(event.eventStart, event.eventEnd);
  const deadlinePassed =
    event.applicationDeadline && new Date(event.applicationDeadline) < new Date();

  return (
    <>
      <PageHeader title={event.title} subtitle={event.orgName} />

      <div className="space-y-4">
        <Card>
          <dl className="grid gap-4 sm:grid-cols-2">
            {when && (
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  When
                </dt>
                <dd className="mt-1 text-sm text-ink">{when}</dd>
              </div>
            )}
            {event.location && (
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Where
                </dt>
                <dd className="mt-1 text-sm text-ink">{event.location}</dd>
              </div>
            )}
            {event.applicationDeadline && (
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Apply by
                </dt>
                <dd className={`mt-1 text-sm ${deadlinePassed ? "text-primary" : "text-ink"}`}>
                  {DEADLINE_DATE.format(new Date(event.applicationDeadline))}
                  {deadlinePassed && " — closed"}
                </dd>
              </div>
            )}
          </dl>

          {event.description && (
            <p className="mt-5 whitespace-pre-line border-t border-muted/25 pt-4 text-sm leading-relaxed text-ink/80">
              {event.description}
            </p>
          )}
        </Card>

        <Card>
          <h2 className="font-display text-base font-semibold text-ink">Roles</h2>
          {roles.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              The organizer hasn&apos;t posted roles for this event yet.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {roles.map((role) => (
                <li key={role.roleId} className="flex flex-wrap items-center gap-2">
                  <RoleChip {...role} />
                  {role.skills?.length > 0 && (
                    <span className="text-xs text-muted">
                      needs {role.skills.map((s) => s.name).join(", ")}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          {application ? (
            // Already applied — show where it stands instead of the form.
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-semibold text-ink">
                  Your application
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {application.roleTitle
                    ? `You asked for ${application.roleTitle}.`
                    : "You applied without a role preference."}{" "}
                  <Link
                    to="/volunteer/applications"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    See all your applications
                  </Link>
                </p>
              </div>
              <StatusChip status={application.status} />
            </div>
          ) : deadlinePassed ? (
            <>
              <h2 className="font-display text-base font-semibold text-ink">
                Applications have closed
              </h2>
              <p className="mt-1 text-sm text-muted">
                The deadline for this one passed.{" "}
                <Link
                  to="/volunteer/events"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Browse what&apos;s still open
                </Link>
                .
              </p>
            </>
          ) : (
            <>
              <h2 className="mb-4 font-display text-base font-semibold text-ink">
                Apply to volunteer
              </h2>
              <ApplyForm eventId={eventId} roles={roles} onApplied={handleApplied} />
            </>
          )}
        </Card>
      </div>

      <Toast
        message={toast?.message}
        variant={toast?.variant}
        onDismiss={() => setToast(null)}
      />
    </>
  );
}
