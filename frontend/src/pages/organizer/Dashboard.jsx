import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import ComingSoon from "../../components/organizer/ComingSoon";

// Skeleton. Real content (upcoming events, pending application count,
// basic analytics) is a later feature — see CLAUDE.md, one feature per
// session.
export default function Dashboard() {
  const { user } = useAuth();

  return (
    <>
      <PageHeader
        title={user?.fullName ? `Welcome, ${user.fullName}` : "Dashboard"}
        subtitle="Your events, applications and volunteer activity at a glance."
      />
      <ComingSoon note="Upcoming events, pending applications awaiting review, and basic analytics." />
    </>
  );
}
