import PageHeader from "../../components/ui/PageHeader";
import ComingSoon from "../../components/organizer/ComingSoon";

// Skeleton. Generation is only allowed once a volunteer's attendance is
// 'verified'; hours are computed server-side from the event's own
// start/end, so this screen never sends an hours figure.
export default function Certificates() {
  return (
    <>
      <PageHeader
        title="Certificates"
        subtitle="Issue certificates to volunteers who attended your events."
      />
      <ComingSoon note="Attended-volunteer list per event with certificate generation, and what's already been issued." />
    </>
  );
}
