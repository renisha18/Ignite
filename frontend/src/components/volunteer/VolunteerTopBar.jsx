// Why this exists: the fixed chrome above the volunteer content —
// wordmark, search, notifications, avatar. Kept separate from the
// sidebar so either can change without touching the other.
//
// Search and the bell are presentational for now. Wiring them up is a
// later feature; they're here so the shell reads as a real product and
// the layout doesn't shift when they start working.
import { useAuth } from "../../context/AuthContext";

function initialsOf(fullName) {
  if (!fullName) return "?";
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function VolunteerTopBar() {
  const { user } = useAuth();

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

      {/* Gold rule separating wordmark from the tools — thickened to
          match the border weight used everywhere else. */}
      <span aria-hidden="true" className="hidden h-5 w-0.5 bg-gold sm:block" />

      <div className="min-w-0 flex-1">
        <label className="sr-only" htmlFor="volunteer-search">
          Search events
        </label>
        <input
          id="volunteer-search"
          type="search"
          placeholder="Search events…"
          disabled
          className="w-full max-w-sm rounded-lg border-2 border-ink bg-cream px-3 py-1.5 text-sm text-ink placeholder:text-muted focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      <button
        type="button"
        disabled
        aria-label="Notifications"
        className="rounded-lg border-2 border-ink bg-gold p-1.5 text-ink transition-all duration-100 hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg
          className="h-[18px] w-[18px]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8.5a6 6 0 0 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 14.5 18 8.5Z" />
          <path d="M13.7 19.5a2 2 0 0 1-3.4 0" />
        </svg>
      </button>

      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-ink bg-primary font-mono text-xs font-bold text-cream shadow-brutal-sm"
        title={user?.fullName ?? "Account"}
      >
        {initialsOf(user?.fullName)}
      </div>
    </header>
  );
}
