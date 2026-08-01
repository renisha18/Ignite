import PageHeader from "../../components/ui/PageHeader";
import ComingSoon from "../../components/organizer/ComingSoon";

// Skeleton. The organizer's half of QR attendance: display a
// short-lived QR for the event and watch scans arrive. No location or
// check-out anywhere — see docs/api-contract.md, "How the QR works".
export default function Attendance() {
  return (
    <>
      <PageHeader
        title="Attendance"
        subtitle="Display the event QR code and track who has checked in."
      />
      <ComingSoon note="Refreshing attendance QR code, plus the live list of volunteers who have scanned in." />
    </>
  );
}
