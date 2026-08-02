// One left-hand skill column: every selected volunteer who holds that
// skill, sorted by reputation (the server did the sorting).
//
// Purely presentational. The "No skills listed" group arrives from the
// server with skillId null and is rendered exactly like any other — it's
// a fallback bucket so skill-less volunteers are still draggable, not a
// special case in the UI.
import VolunteerDragCard from "./VolunteerDragCard";

export default function SkillGroupColumn({ group, volunteers, disabled }) {
  return (
    <section className="min-w-0">
      <header className="mb-2 flex items-baseline justify-between gap-2 border-b border-muted/30 pb-1.5">
        <h3 className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
          {group.name}
        </h3>
        <span className="font-mono text-[11px] tabular-nums text-muted">
          {volunteers.length}
        </span>
      </header>

      <ul className="flex flex-col gap-2">
        {volunteers.map((volunteer) => (
          <VolunteerDragCard
            // Unique per card, not per volunteer: the same person is
            // rendered in every skill column they qualify for, and
            // dnd-kit requires distinct draggable ids.
            key={`${group.skillId ?? "none"}-${volunteer.volunteerId}`}
            dragId={`${group.skillId ?? "none"}:${volunteer.volunteerId}`}
            volunteer={volunteer}
            disabled={disabled}
          />
        ))}
      </ul>
    </section>
  );
}
