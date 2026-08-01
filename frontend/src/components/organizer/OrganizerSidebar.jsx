// Why this exists: the persistent left rail for the whole organizer
// area. It renders from organizerNavItems.js so adding a screen is a
// one-line change in the config, not an edit here.
//
// Structure, spacing and the active-state convention are taken from
// components/volunteer/VolunteerSidebar.jsx on purpose — thin gold
// left border plus a weight/colour shift, never a filled background
// block. Two sidebars in one product must not invent two different
// ways to say "you are here". Only the rail label and the item list
// differ from the volunteer one.
import { NavLink } from "react-router-dom";
import organizerNavItems from "./organizerNavItems";

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

export default function OrganizerSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-muted/30 bg-background md:block">
      <nav className="sticky top-0 flex h-screen flex-col gap-0.5 overflow-y-auto px-3 py-6">
        <p className="mb-3 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          Organizer
        </p>

        {organizerNavItems.map((item) => (
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
