// A volunteer inside a role's drop zone.
//
// The skill-mismatch warning here is deliberately permanent, not a
// toast: dropping someone into a role they aren't skilled for is
// allowed, and the record of that decision has to stay visible on the
// card for as long as the assignment exists.
//
// Depends on: components/ui/Card.jsx
import { useEffect, useState } from "react";
import Card from "../ui/Card";

export default function AssignedVolunteerCard({ assignment, onUnassign, disabled }) {
  // Enter transition: mount at reduced opacity, then flip on the next
  // frame so the browser has a "before" state to animate from. This is
  // what makes a card look like it moved into the role rather than
  // popping into existence. requestAnimationFrame rather than a timeout
  // so it's tied to the paint, not the clock.
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <li
      className={`list-none transition-all duration-200 ease-out ${
        entered ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
      }`}
    >
      <Card className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">
              {assignment.fullName}
            </p>
            <span className="font-mono text-[11px] tabular-nums text-muted">
              {assignment.reputationScore === null
                ? "—"
                : Number(assignment.reputationScore).toFixed(0)}
            </span>
          </div>

          {/* Not the shared Button: this is a 20px icon affordance, and
              Button's padding and font weight would dominate the card.
              No confirmation — unassigning is cheap to undo by dragging
              them back. */}
          <button
            type="button"
            onClick={() => onUnassign(assignment)}
            disabled={disabled}
            aria-label={`Unassign ${assignment.fullName}`}
            title={`Unassign ${assignment.fullName}`}
            className="shrink-0 rounded-full px-1.5 text-sm leading-none text-muted transition hover:bg-ink/5 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {assignment.skillMismatch && (
          <p className="mt-2 flex items-start gap-1.5 rounded border border-gold/60 bg-gold/10 px-2 py-1 text-[11px] text-gold-dark">
            <span aria-hidden="true">⚠</span>
            <span>
              {assignment.missingSkills?.length > 0
                ? `Missing ${assignment.missingSkills.join(", ")}`
                : "Skills don't match this role"}
            </span>
          </p>
        )}
      </Card>
    </li>
  );
}
