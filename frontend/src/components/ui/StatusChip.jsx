// Why this exists: application status shows up on Browse Events, My
// Applications, My Team and History. One component means the five
// statuses read identically everywhere and can't drift into "Applied"
// on one screen and "Pending" on another.
//
// The five keys are exactly the applications.status ENUM from
// backend/schema.sql — don't invent a sixth here without a schema
// change (and the schema is locked).
//
// Colors come only from the project palette: there is no dedicated
// error red, so `rejected` uses the oxblood primary; `confirmed` uses
// sage; everything provisional sits on muted.
const STATUSES = {
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

export default function StatusChip({ status }) {
  // Unknown status renders visibly rather than silently vanishing —
  // if the backend ever sends something unexpected, we want to see it.
  const config = STATUSES[status] ?? {
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

export { STATUSES };
