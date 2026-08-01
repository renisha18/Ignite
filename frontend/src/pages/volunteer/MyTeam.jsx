import PageHeader from "../../components/ui/PageHeader";
import ComingSoon from "./ComingSoon";

// Skeleton. Assigned role and teammates come from the journey payload
// (journeyService.getMyJourney) — there's no dedicated team endpoint in
// the volunteer section of docs/api-contract.md.
export default function MyTeam() {
  return (
    <>
      <PageHeader
        title="My Team"
        subtitle="The role you've been assigned and who you're working alongside."
      />
      <ComingSoon note="Assigned role per event, plus teammates on the same event." />
    </>
  );
}
