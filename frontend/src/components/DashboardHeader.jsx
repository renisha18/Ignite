// Why this exists: every dashboard (volunteer/organizer/admin) needs
// the same "who's logged in + logout" bar — one component instead of
// three copies. Dashboards render their own content below it.
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function DashboardHeader({ title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="flex items-center justify-between border-b-2 border-ink bg-primary px-6 py-4">
      <div>
        <h1 className="font-display text-lg font-extrabold uppercase tracking-tight text-cream">
          Ignite
        </h1>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold-light">
          {title}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-cream/90">{user?.fullName}</span>
        <button
          onClick={handleLogout}
          className="rounded-lg border-2 border-ink bg-gold px-3 py-1.5 text-sm font-bold text-ink shadow-brutal-sm transition-all duration-100 hover:bg-gold-light active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
