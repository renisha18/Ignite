// One event role on the right-hand side: a drop target showing its
// capacity and who's currently in it.
//
// Why the droppable ref sits on a wrapping <div> rather than on Card:
// Card doesn't forward refs, and wrapping reuses it as-is instead of
// forking it.
//
// Depends on: @dnd-kit/core, components/ui/Card.jsx
import { useDroppable } from "@dnd-kit/core";
import Card from "../ui/Card";
import AssignedVolunteerCard from "./AssignedVolunteerCard";

export default function RoleDropZone({ role, onUnassign, disabled }) {
  const isFull = role.assignedCount >= role.capacity;

  const { setNodeRef, isOver } = useDroppable({
    id: `role-${role.roleId}`,
    data: { roleId: role.roleId },
    // A full role still accepts the pointer so it can be highlighted as
    // rejecting; the page's drop handler is what refuses the assignment.
  });

  return (
    <div ref={setNodeRef}>
      <Card
        className={`transition-all duration-200 ${
          isOver
            ? isFull
              ? // Dragging over a full role: show it's a dead end before
                // the organizer lets go, rather than only telling them
                // afterwards.
                "border-primary/50 bg-primary/5"
              : "border-gold/70 bg-gold/5"
            : ""
        }`}
      >
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-muted/25 pb-3">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate font-display text-sm font-semibold tracking-tight text-ink">
              {role.title}
            </h3>
            {isFull && (
              <span className="shrink-0 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-primary transition-all duration-200">
                Full
              </span>
            )}
          </div>
          <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted">
            {role.assignedCount} / {role.capacity}
          </span>
        </header>

        {role.requiredSkills.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1">
            {role.requiredSkills.map((skill) => (
              <li
                key={skill.skillId}
                className="rounded-full border border-muted/40 px-2 py-0.5 text-[10px] text-muted"
              >
                {skill.name}
              </li>
            ))}
          </ul>
        )}

        {role.assignments.length === 0 ? (
          <p className="mt-3 text-xs text-muted">
            Drag a volunteer here to assign them.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {role.assignments.map((assignment) => (
              <AssignedVolunteerCard
                key={assignment.assignmentId}
                assignment={assignment}
                onUnassign={onUnassign}
                disabled={disabled}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
