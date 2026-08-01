// Why this exists: any page that shouldn't be visible to a logged-out
// visitor (or the wrong role) wraps its route in this instead of
// each page checking auth state itself — one place decides "can this
// person be here", reused via <Route element={<ProtectedRoute .../>}>.
//
// Depends on: context/AuthContext.jsx
// Usage: <Route element={<ProtectedRoute roles={["organizer"]} />}>
//          <Route path="/organizer/dashboard" element={<OrganizerDashboard />} />
//        </Route>
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ roles }) {
  const { isAuthenticated, initializing, user } = useAuth();
  const location = useLocation();

  // While the initial /me check (session persistence on reload) is
  // still running, render nothing rather than redirecting — redirecting
  // here would bounce a genuinely logged-in user to /login for a
  // split second on every page refresh.
  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-maroon" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // `state={{ from: location }}` lets Login redirect back to
    // wherever the user was trying to go, instead of always to a
    // fixed default page.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
