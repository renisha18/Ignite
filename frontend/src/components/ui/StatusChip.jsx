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
// Colors come only from the project palette: there is no dedicated
// error red, so genuinely negative states use the oxblood primary,
// positive states use sage success, and anything provisional sits on
// muted.

// applications.status
const APPLICATION_STATUSES = {
  applied: {
    label: "Applied",
    // Neutral, not a success and not a failure — the volunteer is waiting.
    className: "border-muted/50 bg-muted/10 text-ink/70",
    notch: "bg-muted",
  },
  selected: {
    label: "Selected",
    // Gold: the organizer has picked them but they aren't locked in yet.
    className: "border-gold/60 bg-gold/15 text-gold-dark",
    notch: "bg-gold",
  },
  confirmed: {
    label: "Confirmed",
    className: "border-success/50 bg-success/15 text-success",
    notch: "bg-success",
  },
  rejected: {
    label: "Rejected",
    className: "border-primary/40 bg-primary/10 text-primary",
    notch: "bg-primary",
  },
  withdrawn: {
    label: "Withdrawn",
    // Deliberately the flattest of the five — the volunteer opted out,
    // it shouldn't compete for attention in a list.
    className: "border-muted/40 bg-transparent text-muted",
    notch: "bg-muted/60",
  },
};

// organizations.status
const ORGANIZATION_STATUSES = {
  pending: {
    label: "Pending approval",
    // Same neutral treatment as `applied`: an org awaiting an admin is
    // waiting, not failing.
    className: "border-muted/50 bg-muted/10 text-ink/70",
    notch: "bg-muted",
  },
  approved: {
    label: "Approved",
    className: "border-success/50 bg-success/15 text-success",
    notch: "bg-success",
  },
  rejected: {
    label: "Rejected",
    className: "border-primary/40 bg-primary/10 text-primary",
    notch: "bg-primary",
  },
};

// events.status
const EVENT_STATUSES = {
  published: {
    label: "Published",
    // The only state in which volunteers can see and apply to the event.
    className: "border-success/50 bg-success/15 text-success",
    notch: "bg-success",
  },
  closed: {
    label: "Closed",
    // Applications shut, but the event is still going ahead — neutral,
    // not negative.
    className: "border-muted/50 bg-muted/10 text-ink/70",
    notch: "bg-muted",
  },
  completed: {
    label: "Completed",
    // Gold: the event ran and certificates can follow. An achievement,
    // not just an end state.
    className: "border-gold/60 bg-gold/15 text-gold-dark",
    notch: "bg-gold",
  },
  cancelled: {
    label: "Cancelled",
    className: "border-primary/40 bg-primary/10 text-primary",
    notch: "bg-primary",
  },
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
    className: "border-muted/40 bg-transparent text-muted",
    notch: "bg-muted/60",
  };

  return (
    <span
      className={`relative inline-flex items-center overflow-hidden rounded-full border py-1 pl-4 pr-3 text-xs font-medium tracking-wide ${config.className}`}
    >
      {/* Gold-seal notch: a small rotated square clipped by the chip's
          own overflow-hidden, so it reads as a bite out of the left
          edge rather than a floating dot. */}
      <span
        aria-hidden="true"
        className={`absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 ${config.notch}`}
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
