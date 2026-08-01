import PageHeader from "../../components/ui/PageHeader";
import ComingSoon from "./ComingSoon";

// Skeleton. Note: there is no volunteer profile-update endpoint in
// docs/api-contract.md yet — read-only display comes from /auth/me.
// Editing skills would need a new endpoint, which means updating the
// contract first.
export default function Profile() {
  return (
    <>
      <PageHeader
        title="Profile"
        subtitle="Your details and the skills organizers match you on."
      />
      <ComingSoon note="Name, email and skills. Editing needs a new endpoint — add it to the API contract first." />
    </>
  );
}
