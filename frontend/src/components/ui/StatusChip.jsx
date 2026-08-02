// Why this exists: status shows up all over both tracks — Browse
// Events, My Applications, My Team, History, My Events, the organizer
// top bar. One component means a status reads identically everywhere
// and can't drift into "Applied" on one screen and "Pending" on another.
//
// Why families rather than one flat map: the schema has three separate
// status ENUMs and they overlap. `rejected` is both an application
// status and an organization status; a single map can only give it one
// label and colour. Each family below is exactly one ENUM from
// backend/schema.sql (locked) — don't invent a value that isn't in the
// column definition.
//
// Usage:
//   <StatusChip status={application.status} />                    // default family
//   <StatusChip status={event.status} type="event" />
//   <StatusChip status={organization.status} type="organization" />
//
// Neo-Brutalist treatment: solid fills rather than washes, one ink
// border and one hard shadow for every chip. Only the fill carries
// meaning, which is what keeps eleven statuses from turning into eleven
// slightly different outline styles. Semantic hues are unchanged from
// the previous pass — success stays sage, error stays red, provisional
// states stay gold or neutral.

// applications.status
const APPLICATION_STATUSES = {
  applied: {
    label: "Applied",
    // Neutral, not a success and not a failure — the volunteer is waiting.
    className: "bg-cream text-ink",
  },
  selected: {
    label: "Selected",
    // Gold: the organizer has picked them but they aren't locked in yet.
    className: "bg-gold text-ink",
  },
  confirmed: { label: "Confirmed", className: "bg-success text-cream" },
  rejected: { label: "Rejected", className: "bg-error text-cream" },
  withdrawn: {
    label: "Withdrawn",
    // Deliberately the flattest of the five — the volunteer opted out,
    // it shouldn't compete for attention in a list.
    className: "bg-muted/25 text-ink/70",
  },
};

// organizations.status
const ORGANIZATION_STATUSES = {
  pending: {
    label: "Pending approval",
    // Same neutral treatment as `applied`: an org awaiting an admin is
    // waiting, not failing.
    className: "bg-cream text-ink",
  },
  approved: { label: "Approved", className: "bg-success text-cream" },
  rejected: { label: "Rejected", className: "bg-error text-cream" },
};

// events.status
const EVENT_STATUSES = {
  published: {
    label: "Published",
    // The only state in which volunteers can see and apply to the event.
    className: "bg-success text-cream",
  },
  closed: {
    label: "Closed",
    // Applications shut, but the event is still going ahead — neutral,
    // not negative.
    className: "bg-muted/25 text-ink/70",
  },
  completed: {
    label: "Completed",
    // Gold: the event ran and certificates can follow. An achievement,
    // not just an end state.
    className: "bg-gold text-ink",
  },
  cancelled: { label: "Cancelled", className: "bg-error text-cream" },
};

const FAMILIES = {
  application: APPLICATION_STATUSES,
  organization: ORGANIZATION_STATUSES,
  event: EVENT_STATUSES,
};

export default function StatusChip({ status, type = "application" }) {
  const family = FAMILIES[type] ?? APPLICATION_STATUSES;

  // Unknown status renders visibly rather than silently vanishing — if
  // the backend ever sends something unexpected, or a caller passes the
  // wrong `type`, we want to see it rather than get a blank chip.
  const config = family[status] ?? {
    label: status ?? "Unknown",
    className: "bg-muted/25 text-ink/70",
  };

  return (
    <span
      className={`relative inline-flex items-center overflow-hidden rounded-full border-2 border-ink py-0.5 pl-4 pr-3 text-xs font-bold uppercase tracking-wide shadow-brutal-sm ${config.className}`}
    >
      {/* Seal notch: a small rotated square clipped by the chip's own
          overflow-hidden, so it reads as a bite out of the left edge
          rather than a floating dot. Ink on every variant now — against
          solid fills a tinted notch disappeared. */}
      <span
        aria-hidden="true"
        className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 bg-ink"
      />
      {config.label}
    </span>
  );
}

export {
  APPLICATION_STATUSES,
  ORGANIZATION_STATUSES,
  EVENT_STATUSES,
  // Back-compat alias: the original export was the application family
  // under this name, before the other two ENUMs needed representing.
  APPLICATION_STATUSES as STATUSES,
};
