import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import ComingSoon from "./ComingSoon";

// Skeleton. Real content (upcoming events, application summary, hours
// to date) is a later feature — see CLAUDE.md, one feature per session.
export default function Dashboard() {
  const { user } = useAuth();

  return (
    <>
      <PageHeader
        title={user?.fullName ? `Welcome, ${user.fullName}` : "Dashboard"}
        subtitle="Your events, applications and hours at a glance."
      />
      <ComingSoon note="Upcoming events, application status summary and total hours volunteered." />
    </>
  );
}
