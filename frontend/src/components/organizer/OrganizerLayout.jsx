// Why this exists: the persistent frame every organizer screen sits in
// — sidebar on the left, top bar above, page content in <Outlet />.
// Because it's mounted as a parent route, the sidebar and top bar are
// not remounted on navigation, so scroll position and any future in-bar
// state survive moving between pages.
//
// Structure is identical to layouts/VolunteerLayout.jsx — same flex
// frame, same max-width, same padding — so the two areas of the product
// share one spatial rhythm.
//
// Why it lives in components/organizer/ rather than next to
// VolunteerLayout in layouts/: layouts/ was outside the agreed scope
// for this change. Moving it there later is a one-line import update in
// organizerRoutes.jsx, and arguably where it belongs.
//
// Mounted by pages/organizer/organizerRoutes.jsx. Auth is NOT handled
// here — the ProtectedRoute wrapper in App.jsx stays the single place
// that decides who gets in.
import { Outlet } from "react-router-dom";
import OrganizerSidebar from "./OrganizerSidebar";
import OrganizerTopBar from "./OrganizerTopBar";

export default function OrganizerLayout() {
  return (
    <div className="flex min-h-screen bg-background text-ink antialiased">
      <OrganizerSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <OrganizerTopBar />
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
