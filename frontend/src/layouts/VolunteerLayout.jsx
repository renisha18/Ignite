// Why this exists: the persistent frame every volunteer screen sits
// in — sidebar on the left, top bar above, page content in <Outlet />.
// Because it's mounted as a parent route, the sidebar and top bar are
// not remounted on navigation, so scroll position and any future
// in-bar state survive moving between pages.
//
// Mounted by pages/volunteer/volunteerRoutes.jsx. Auth is NOT handled
// here — the ProtectedRoute wrapper in App.jsx stays the single place
// that decides who gets in.
import { Outlet } from "react-router-dom";
import VolunteerSidebar from "../components/volunteer/VolunteerSidebar";
import VolunteerTopBar from "../components/volunteer/VolunteerTopBar";

export default function VolunteerLayout() {
  return (
    <div className="flex min-h-screen bg-background text-ink antialiased">
      <VolunteerSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <VolunteerTopBar />
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
