import DashboardHeader from "../components/DashboardHeader";
import { useAuth } from "../context/AuthContext";

export default function AdminDashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader title="Admin Dashboard" />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h2 className="text-xl font-semibold text-gray-900">
          Welcome, {user?.fullName}
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Organization approvals, reports, and user management go here next.
        </p>
      </main>
    </div>
  );
}
