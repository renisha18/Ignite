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

// Deliberately the same "title filled/capacity" readout the volunteer's
// event detail page shows, so the organizer sees exactly what they're
// publishing. `roles` comes from GET /events/mine, which reuses the same
// query the volunteer endpoints do.
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

export default function OrganizerEventCard({
  event,
  onEdit,
  onDelete,
  onManageRoles,
}) {
  const starts = formatDateTime(event.eventStart);
  const ends = formatDateTime(event.eventEnd);
  const deadline = formatDateTime(event.applicationDeadline);
  const roles = event.roles ?? [];

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

      <div className="mt-4 border-t border-muted/25 pt-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          Roles
        </p>
        {roles.length === 0 ? (
          // Not a neutral "none yet": with no roles the event is live but
          // has nothing for a volunteer to apply to, which is worth
          // saying plainly on the card rather than leaving to be noticed.
          <p className="mt-1.5 text-sm text-muted">
            None yet — volunteers can see this event but have nothing to apply
            for.
          </p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {roles.map((role) => (
              <li key={role.roleId}>
                <RoleChip {...role} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-5 flex items-center justify-end gap-2 border-t border-muted/25 pt-4">
        <Button variant="secondary" onClick={() => onManageRoles(event)}>
          {roles.length === 0 ? "Add roles" : "Manage roles"}
        </Button>
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
