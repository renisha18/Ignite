import DashboardHeader from "../components/DashboardHeader";
import { useAuth } from "../context/AuthContext";

// Placeholder — proves the auth flow (register/login -> role-based
// redirect -> protected route -> logout) works end to end. Real
// dashboard content (events, applications, etc.) is a later module.
export default function VolunteerDashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader title="Volunteer Dashboard" />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h2 className="text-xl font-semibold text-gray-900">
          Welcome, {user?.fullName}
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Your volunteer dashboard — event browsing and applications go here next.
        </p>
      </main>
    </div>
  );
}
