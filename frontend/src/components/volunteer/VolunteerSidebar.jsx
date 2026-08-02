// Why this exists: the persistent left rail for the whole volunteer
// area. It renders from volunteerNavItems.js so adding a screen is a
// one-line change in the config, not an edit here.
//
// Neo-Brutalist rail. The active item is a filled gold slab with an ink
// border and a hard shadow — in this style the outline does the work, so
// a thin accent line would read as an accident rather than a state.
//
// Icons sit in bordered square tiles. White on maroon for the active
// item, ink on gold otherwise: white on gold measures about 2.2:1, well
// under AA, so the icon colour flips with the tile rather than staying
// white throughout.
import { NavLink } from "react-router-dom";
import volunteerNavItems from "./volunteerNavItems";

function NavIcon({ paths, active }) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-ink transition-colors ${
        active ? "bg-primary text-cream" : "bg-gold text-ink"
      }`}
    >
      <svg
        className="h-[15px] w-[15px]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {paths.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    </span>
  );
}

export default function VolunteerSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r-2 border-ink bg-background md:block">
      <nav className="sticky top-0 flex h-screen flex-col gap-1.5 overflow-y-auto px-3 py-6">
        <p className="mb-3 inline-block self-start rounded-lg border-2 border-ink bg-ink px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-cream">
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
                "flex items-center gap-2.5 rounded-lg border-2 px-2 py-1.5 text-sm font-bold transition-all duration-100",
                isActive
                  ? "border-ink bg-gold text-ink shadow-brutal-sm"
                  : "border-transparent text-ink/70 hover:border-ink hover:bg-cream hover:shadow-brutal-sm",
              ].join(" ")
            }
          >
            {({ isActive }) => (
              <>
                <NavIcon paths={item.icon} active={isActive} />
                <span className="truncate">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
