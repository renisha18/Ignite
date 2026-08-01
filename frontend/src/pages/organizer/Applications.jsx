import PageHeader from "../../components/ui/PageHeader";
import ComingSoon from "../../components/organizer/ComingSoon";

// Skeleton. Reviewing an application means moving it from 'applied' to
// 'selected' or 'rejected' — the two statuses the contract allows on
// PATCH /applications/:id. Assignment to a role happens afterwards, in
// Team Builder.
export default function Applications() {
  return (
    <>
      <PageHeader
        title="Applications"
        subtitle="Review who applied to your events and accept or reject them."
      />
      <ComingSoon note="Per-event application list with volunteer details, motivation, and accept/reject actions." />
    </>
  );
}
