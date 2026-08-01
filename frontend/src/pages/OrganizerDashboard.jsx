import DashboardHeader from "../components/DashboardHeader";
import { useAuth } from "../context/AuthContext";

// Placeholder — same role as VolunteerDashboard.jsx. Surfaces
// organization.status since a 'pending' org can't publish events yet
// (backend rule) — the organizer should see that immediately, not
// discover it when event creation silently fails later.
export default function OrganizerDashboard() {
  const { user, organization } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader title="Organizer Dashboard" />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h2 className="text-xl font-semibold text-gray-900">
          Welcome, {user?.fullName}
        </h2>

        {organization && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3">
            <span className="text-sm text-gray-600">{organization.name}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                organization.status === "approved"
                  ? "bg-green-100 text-green-700"
                  : organization.status === "rejected"
                    ? "bg-red-100 text-red-700"
                    : "bg-gold-light/50 text-maroon-dark"
              }`}
            >
              {organization.status}
            </span>
          </div>
        )}

        {organization?.status === "pending" && (
          <p className="mt-3 text-sm text-gray-500">
            Your organization is awaiting admin approval before you can publish events.
          </p>
        )}
      </main>
    </div>
  );
}
