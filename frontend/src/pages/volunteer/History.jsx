import PageHeader from "../../components/ui/PageHeader";
import ComingSoon from "./ComingSoon";

// Skeleton. Will call journeyService.getMyJourney() — the "My Journey"
// timeline from docs/api-contract.md.
export default function History() {
  return (
    <>
      <PageHeader
        title="History"
        subtitle="Everything you've volunteered for, start to finish."
      />
      <ComingSoon note="Timeline of past events with role, hours credited and certificate status." />
    </>
  );
}
