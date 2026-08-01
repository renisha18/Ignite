// Why this file exists: the single place that wires routing to auth.
// BrowserRouter wraps AuthProvider (not the other way round) because
// AuthContext's logout uses useNavigate, which only works inside a
// Router. Every route below is either public (Login/Register) or
// wrapped in ProtectedRoute (dashboards).
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VolunteerDashboard from "./pages/VolunteerDashboard";
import OrganizerDashboard from "./pages/OrganizerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Unauthorized from "./pages/Unauthorized";
import "./index.css";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route element={<ProtectedRoute roles={["volunteer"]} />}>
            <Route path="/volunteer/dashboard" element={<VolunteerDashboard />} />
          </Route>

          <Route element={<ProtectedRoute roles={["organizer"]} />}>
            <Route path="/organizer/dashboard" element={<OrganizerDashboard />} />
          </Route>

          <Route element={<ProtectedRoute roles={["admin"]} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
