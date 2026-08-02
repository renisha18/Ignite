// Why this exists: the fixed chrome above the organizer content.
//
// Why it isn't components/volunteer/VolunteerTopBar reused directly:
// the two bars carry different content, not different styling. This one
// surfaces the organization and its approval status — a concept the
// volunteer app has none of — and it matters here because a `pending`
// org can't publish events, so the organizer needs to see that on every
// screen rather than discovering it when event creation fails. The
// chrome classes are copied from VolunteerTopBar verbatim so the two
// bars sit at the same height and read as one product.
//
// Search and the bell are deliberately absent rather than disabled: the
// volunteer bar's search is scoped to browsing events, which isn't a
// thing an organizer does from the top bar.
import { useAuth } from "../../context/AuthContext";
import StatusChip from "../ui/StatusChip";

function initialsOf(fullName) {
  if (!fullName) return "?";
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function OrganizerTopBar() {
  const { user, organization } = useAuth();

  return (
    <header className="sticky top-0 z-10 flex items-center gap-4 border-b-2 border-ink bg-background px-6 py-3">
      <div className="flex items-baseline gap-2">
        <span className="font-display text-xl font-extrabold uppercase tracking-tight text-primary">
          Ignite
        </span>
        <span className="hidden font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted lg:inline">
          Rotaract
        </span>
      </div>

      {/* Gold rule separating wordmark from the org identity — thickened
          to match the border weight used everywhere else. */}
      <span aria-hidden="true" className="hidden h-5 w-0.5 bg-gold sm:block" />

      <div className="flex min-w-0 flex-1 items-center gap-3">
        {organization && (
          <>
            <span className="truncate text-sm font-bold text-ink">
              {organization.name}
            </span>
            {/* organizations.status — 'pending' until an admin approves.
                `type` matters: 'rejected' exists in both the application
                and organization families with different labels. */}
            <StatusChip status={organization.status} type="organization" />
          </>
        )}
      </div>

      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-ink bg-primary font-mono text-xs font-bold text-cream shadow-brutal-sm"
        title={user?.fullName ?? "Account"}
      >
        {initialsOf(user?.fullName)}
      </div>
    </header>
  );
}
