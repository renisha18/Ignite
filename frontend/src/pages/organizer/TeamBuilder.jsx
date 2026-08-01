import PageHeader from "../../components/ui/PageHeader";
import ComingSoon from "../../components/organizer/ComingSoon";

// Skeleton. This is the USP screen (PROJECT_SPEC.md): volunteers appear
// under every skill they hold, and the organizer drags them into roles.
// Only 'selected'/'confirmed' applicants are assignable, and each
// assignment writes through immediately.
export default function TeamBuilder() {
  return (
    <>
      <PageHeader
        title="Team Builder"
        subtitle="Group volunteers by skill and drag them into the roles your event needs."
      />
      <ComingSoon note="Skill-grouped candidates per role, drag-and-drop assignment, live capacity counts." />
    </>
  );
}
