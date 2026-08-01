// Why this exists: App.jsx is out of scope for this change, so the
// volunteer route tree lives here as a ready-to-mount element instead.
// Mounting it is a two-line edit to App.jsx whenever you want it live:
//
//   import volunteerRoutes from "./pages/volunteer/volunteerRoutes";
//
//   <Route element={<ProtectedRoute roles={["volunteer"]} />}>
//     {volunteerRoutes}
//   </Route>
//
// Note the existing `/volunteer/dashboard` route in App.jsx points at
// pages/VolunteerDashboard.jsx and would collide with the one below —
// remove that line (and the now-unused import) when you mount this.
//
// Auth is deliberately NOT handled here. ProtectedRoute in App.jsx
// stays the single place that decides who gets in; this module only
// describes structure.
import { Route, Navigate } from "react-router-dom";
import VolunteerLayout from "../../layouts/VolunteerLayout";
import Dashboard from "./Dashboard";
import BrowseEvents from "./BrowseEvents";
import EventDetails from "./EventDetails";
import MyApplications from "./MyApplications";
import MyTeam from "./MyTeam";
import Attendance from "./Attendance";
import Certificates from "./Certificates";
import Profile from "./Profile";
import History from "./History";

// Paths mirror volunteerNavItems.js — keep the two in step.
const volunteerRoutes = (
  <Route path="/volunteer" element={<VolunteerLayout />}>
    <Route index element={<Navigate to="dashboard" replace />} />
    <Route path="dashboard" element={<Dashboard />} />
    <Route path="events" element={<BrowseEvents />} />
    <Route path="events/:eventId" element={<EventDetails />} />
    <Route path="applications" element={<MyApplications />} />
    <Route path="team" element={<MyTeam />} />
    <Route path="attendance" element={<Attendance />} />
    <Route path="certificates" element={<Certificates />} />
    <Route path="profile" element={<Profile />} />
    <Route path="history" element={<History />} />
  </Route>
);

export default volunteerRoutes;
