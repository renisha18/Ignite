// Why this exists: the persistent left rail for the whole volunteer
// area. It renders from volunteerNavItems.js so adding a screen is a
// one-line change in the config, not an edit here.
//
// Charcoal-on-cream, not black-on-white. The active item is marked
// with a thin gold left border and a weight/colour shift — not a
// filled background block, which would fight the cream surface and
// read heavier than the page content it's labelling.
import { NavLink } from "react-router-dom";
import volunteerNavItems from "./volunteerNavItems";

function NavIcon({ paths }) {
  return (
    <svg
      className="h-[18px] w-[18px] shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

export default function VolunteerSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-muted/30 bg-background md:block">
      <nav className="sticky top-0 flex h-screen flex-col gap-0.5 overflow-y-auto px-3 py-6">
        <p className="mb-3 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          Volunteer
        </p>

        {volunteerNavItems.map((item) => (
          <NavLink
            key={item.key}
            to={item.path}
            // NavLink's render-prop form gives us isActive without
            // manually comparing useLocation().pathname.
            className={({ isActive }) =>
              [
                "flex items-center gap-3 border-l-2 py-2 pl-3 pr-2 text-sm transition",
                isActive
                  ? "border-gold font-semibold text-primary"
                  : "border-transparent text-ink/70 hover:border-muted/40 hover:text-ink",
              ].join(" ")
            }
          >
            <NavIcon paths={item.icon} />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
