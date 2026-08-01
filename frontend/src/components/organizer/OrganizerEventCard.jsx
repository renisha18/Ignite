// Why this exists: one event row on the organizer's My Events list.
//
// Why it isn't components/volunteer/EventCard.jsx reused: that card
// shows a browsable event to someone deciding whether to apply — org
// name, role capacity, an apply affordance — and only ever renders
// published events. This one shows an event its owner is managing, in
// any of the four statuses, with edit and delete. Same surface
// component (ui/Card), different content and different actions.
//
// Depends on: components/ui/Card.jsx, components/ui/Button.jsx,
// components/ui/StatusChip.jsx
import Card from "../ui/Card";
import Button from "../ui/Button";
import StatusChip from "../ui/StatusChip";

// The API returns UTC ISO strings (mysql2 hands back a Date, which
// JSON-encodes as UTC). toLocaleString renders them back in the
// viewer's own timezone, so an 08:00 event created in IST reads as
// 08:00 again rather than 02:30.
function formatDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MetaRow({ label, children }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="w-24 shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
        {label}
      </span>
      <span className="min-w-0 text-ink/80">{children}</span>
    </div>
  );
}

export default function OrganizerEventCard({ event, onEdit, onDelete }) {
  const starts = formatDateTime(event.eventStart);
  const ends = formatDateTime(event.eventEnd);
  const deadline = formatDateTime(event.applicationDeadline);

  return (
    <Card as="li" className="list-none">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold tracking-tight text-ink">
            {event.title}
          </h3>
          {event.description && (
            <p className="mt-1 max-w-prose text-sm text-muted">
              {event.description}
            </p>
          )}
        </div>
        <StatusChip status={event.status} type="event" />
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        <MetaRow label="Starts">{starts ?? "—"}</MetaRow>
        {ends && <MetaRow label="Ends">{ends}</MetaRow>}
        {event.location && <MetaRow label="Where">{event.location}</MetaRow>}
        {deadline && <MetaRow label="Apply by">{deadline}</MetaRow>}
      </div>

      <div className="mt-5 flex items-center justify-end gap-2 border-t border-muted/25 pt-4">
        <Button variant="secondary" onClick={() => onEdit(event)}>
          Edit
        </Button>
        <Button variant="ghost" onClick={() => onDelete(event)}>
          Delete
        </Button>
      </div>
    </Card>
  );
}
