// One volunteer's application, as the organizer reviews it.
//
// The card doesn't know which column it's in or what the buttons mean —
// the page passes `actions` describing what this application can become
// next, and the card just renders them. That keeps the "Pending has
// Select/Reject, Rejected has Back/Select" rules in one table on the
// page instead of an if-chain in here.
//
// Depends on: components/ui/Card.jsx, components/ui/Button.jsx,
// components/ui/StatusChip.jsx
import Card from "../ui/Card";
import Button from "../ui/Button";
import StatusChip from "../ui/StatusChip";

// applied_at is a UTC ISO string from the API; toLocaleDateString shows
// it in the viewer's timezone.
function formatAppliedDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// reputation_score is DECIMAL(5,2). One decimal place is enough to be
// informative without implying more precision than the number has.
function formatReputation(score) {
  if (score === null || score === undefined) return "—";
  return Number(score).toFixed(1);
}

function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm text-ink/80">{children}</dd>
    </div>
  );
}

export default function ApplicationCard({
  application,
  actions,
  onAction,
  pendingStatus = null,
  disabled = false,
}) {
  const {
    fullName,
    email,
    reputationScore,
    appliedAt,
    preferredRole,
    status,
  } = application;

  return (
    <Card as="li" className="list-none">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="min-w-0 font-display text-base font-semibold tracking-tight text-ink">
          {fullName}
        </h3>
        {/* 'selected' and 'confirmed' share the Selected column, so the
            chip is what tells them apart. */}
        <StatusChip status={status} type="application" />
      </div>

      <p className="mt-0.5 truncate text-sm text-muted" title={email}>
        {email}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <Field label="Preferred role">
          {preferredRole?.title ?? (
            <span className="text-muted">No preference</span>
          )}
        </Field>
        <Field label="Reputation">{formatReputation(reputationScore)}</Field>
        <Field label="Applied">{formatAppliedDate(appliedAt)}</Field>
      </dl>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-muted/25 pt-3">
        {actions.map((action) => (
          <Button
            key={action.status}
            variant={action.variant}
            // Only the button actually clicked spins; the others just
            // disable, so it's clear which decision is in flight.
            loading={pendingStatus === action.status}
            disabled={disabled && pendingStatus !== action.status}
            onClick={() => onAction(application, action.status)}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </Card>
  );
}
