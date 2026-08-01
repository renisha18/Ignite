import PageHeader from "../../components/ui/PageHeader";
import ComingSoon from "./ComingSoon";

// Skeleton. Will call attendanceService.scanQr(qrToken) with the token
// read out of the organizer's on-screen QR code.
//
// Per docs/api-contract.md: one scan per volunteer per event, no
// check-out, and the volunteer is identified by their own JWT — the
// client never sends an assignmentId.
export default function Attendance() {
  return (
    <>
      <PageHeader
        title="Attendance"
        subtitle="Scan the QR code shown by your organizer to mark attendance."
      />
      <ComingSoon note="QR scanner, plus a paste-the-code fallback for when the camera won't cooperate." />
    </>
  );
}
