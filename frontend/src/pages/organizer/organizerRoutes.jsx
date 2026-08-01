// Why this exists: App.jsx is outside the agreed scope for this change,
// so the organizer route tree lives here as a ready-to-mount element
// instead. Same pattern the volunteer track used
// (pages/volunteer/volunteerRoutes.jsx).
//
// Mounting it is a two-line edit to App.jsx whenever you want it live:
//
//   import organizerRoutes from "./pages/organizer/organizerRoutes";
//
//   <Route element={<ProtectedRoute roles={["organizer"]} />}>
//     {organizerRoutes}
//   </Route>
//
// IMPORTANT: the existing `/organizer/dashboard` route in App.jsx points
// at pages/OrganizerDashboard.jsx and would collide with the one below.
// Remove that line (and the now-unused import) when you mount this —
// exactly the same swap the volunteer track needed. Until then the nav
// renders but only /organizer/dashboard resolves, to the old page.
//
// Auth is deliberately NOT handled here. ProtectedRoute in App.jsx stays
// the single place that decides who gets in; this module only describes
// structure.
import { Route, Navigate } from "react-router-dom";
import OrganizerLayout from "../../components/organizer/OrganizerLayout";
import Dashboard from "./Dashboard";
import MyEvents from "./MyEvents";
import Applications from "./Applications";
import TeamBuilder from "./TeamBuilder";
import Attendance from "./Attendance";
import Certificates from "./Certificates";

// Paths mirror organizerNavItems.js — keep the two in step.
const organizerRoutes = (
  <Route path="/organizer" element={<OrganizerLayout />}>
    <Route index element={<Navigate to="dashboard" replace />} />
    <Route path="dashboard" element={<Dashboard />} />
    <Route path="events" element={<MyEvents />} />
    <Route path="applications" element={<Applications />} />
    <Route path="team-builder" element={<TeamBuilder />} />
    <Route path="attendance" element={<Attendance />} />
    <Route path="certificates" element={<Certificates />} />
  </Route>
);

export default organizerRoutes;
