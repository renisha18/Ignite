// A volunteer as they appear in a left-hand skill column: the draggable
// source card.
//
// The same volunteer is rendered once per skill they hold, so the
// draggable id has to be unique per *card*, not per volunteer — hence
// the `dragId` prop, which the column builds from its own key. The
// volunteerId travels in `data` instead, which is what the drop handler
// reads.
//
// These columns are reference lists: a volunteer stays put after being
// assigned, and every copy of their card picks up the Assigned badge.
// Nothing is ever removed from the left side.
//
// Why the drag ref sits on a wrapping <li> rather than on Card: Card is
// a plain function component that spreads props onto its element and
// doesn't forward a ref. Wrapping keeps Card reused exactly as-is
// instead of forking it to add ref support.
//
// Depends on: @dnd-kit/core, components/ui/Card.jsx
import { useDraggable } from "@dnd-kit/core";
import Card from "../ui/Card";

export default function VolunteerDragCard({ dragId, volunteer, disabled = false }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    data: { volunteerId: volunteer.volunteerId },
    disabled,
  });

  const isAssigned = Boolean(volunteer.assignment);

  return (
    <li ref={setNodeRef} {...listeners} {...attributes} className="list-none">
      <Card
        // The original stays put while dragging and just dims — the
        // DragOverlay renders the card that follows the cursor. Fading
        // rather than hiding keeps the column from reflowing mid-drag.
        className={`cursor-grab touch-none p-3 transition-all duration-200 active:cursor-grabbing ${
          isDragging ? "opacity-40" : "opacity-100"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-semibold text-ink">
            {volunteer.fullName}
          </p>
          <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted">
            {volunteer.reputationScore === null
              ? "—"
              : Number(volunteer.reputationScore).toFixed(0)}
          </span>
        </div>

        {volunteer.preferredRole && (
          <p className="mt-1 truncate text-xs text-muted">
            Prefers {volunteer.preferredRole.title}
          </p>
        )}

        {volunteer.skills.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1">
            {volunteer.skills.map((skill) => (
              <li
                key={skill.skillId}
                className="rounded-full border border-muted/40 px-2 py-0.5 text-[10px] text-muted"
              >
                {skill.name}
              </li>
            ))}
          </ul>
        )}

        {isAssigned && (
          <p className="mt-2 inline-flex items-center gap-1 rounded-full border border-success/50 bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success transition-all duration-200">
            Assigned · {volunteer.assignment.roleTitle}
          </p>
        )}
      </Card>
    </li>
  );
}
