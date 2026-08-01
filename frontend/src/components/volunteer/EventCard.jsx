// Why this exists: one event tile, used by the Browse Events grid and
// reusable by any future list (dashboard "upcoming", search results).
// Purely presentational — it takes an event and renders it. No
// fetching, no navigation logic of its own beyond the link.
//
// Depends on: components/ui/Card.jsx
import { Link } from "react-router-dom";
import Card from "../ui/Card";

// Dates arrive as ISO strings (mysql2 returns DATETIME as a Date, which
// JSON serializes to ISO). Formatted here rather than in the page so
// every card reads the same.
const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

function formatEventWindow(eventStart, eventEnd) {
  if (!eventStart) return null;

  const start = new Date(eventStart);
  if (Number.isNaN(start.getTime())) return null;

  const startText = DATE_FORMAT.format(start);
  if (!eventEnd) return startText;

  const end = new Date(eventEnd);
  if (Number.isNaN(end.getTime())) return startText;

  // Same calendar day -> show just the end time, not the whole date again.
  const sameDay = start.toDateString() === end.toDateString();
  const endText = sameDay
    ? end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : DATE_FORMAT.format(end);

  return `${startText} – ${endText}`;
}

// Capacity chip. Shares the gold-seal notch established by StatusChip
// but deliberately not its status colour mapping — a role isn't a
// status. Neutral while seats remain, gold once the role is full.
function RoleChip({ title, capacity, filledCount }) {
  const isFull = capacity > 0 && filledCount >= capacity;

  return (
    <span
      className={`relative inline-flex items-center overflow-hidden rounded-full border py-0.5 pl-3.5 pr-2.5 text-xs ${
        isFull
          ? "border-gold/60 bg-gold/15 text-gold-dark"
          : "border-muted/40 bg-muted/10 text-ink/70"
      }`}
      title={isFull ? `${title} — full` : `${title} — ${capacity - filledCount} place(s) left`}
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

export default function EventCard({ event }) {
  const when = formatEventWindow(event.eventStart, event.eventEnd);

  return (
    <Card
      as="article"
      className="flex h-full flex-col transition hover:border-gold/60 hover:shadow-md"
    >
      <Link
        to={`/volunteer/events/${event.eventId}`}
        className="flex h-full flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
          {event.orgName}
        </p>

        <h3 className="mt-1.5 font-display text-lg leading-snug font-semibold text-ink">
          {event.title}
        </h3>

        <dl className="mt-3 space-y-1 text-sm text-ink/70">
          {when && (
            <div className="flex gap-2">
              <dt className="sr-only">When</dt>
              <dd>{when}</dd>
            </div>
          )}
          {event.location && (
            <div className="flex gap-2">
              <dt className="sr-only">Where</dt>
              <dd className="text-muted">{event.location}</dd>
            </div>
          )}
        </dl>

        {/* mt-auto pins the roles to the bottom so cards in a row line
            up regardless of title length. */}
        <div className="mt-auto pt-4">
          {event.roles?.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {event.roles.map((role) => (
                <RoleChip key={role.roleId} {...role} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted">No roles posted yet</p>
          )}
        </div>
      </Link>
    </Card>
  );
}
