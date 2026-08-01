import PageHeader from "../../components/ui/PageHeader";
import ComingSoon from "./ComingSoon";

// Skeleton. Will call applicationService.getMyApplications() and
// withdrawApplication(id), rendering status via <StatusChip />.
export default function MyApplications() {
  return (
    <>
      <PageHeader
        title="My Applications"
        subtitle="Every event you've applied to, and where each one stands."
      />
      <ComingSoon note="Application list with status chips and a withdraw action on anything still open." />
    </>
  );
}
