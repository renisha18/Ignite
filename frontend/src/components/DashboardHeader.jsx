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
    <header className="flex items-center justify-between bg-maroon px-6 py-4">
      <div>
        <h1 className="text-lg font-semibold text-white">Ignite</h1>
        <p className="text-xs text-gold-light">{title}</p>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-white/90">{user?.fullName}</span>
        <button
          onClick={handleLogout}
          className="rounded-md bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/20"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
