import PageHeader from "../../components/ui/PageHeader";
import ComingSoon from "./ComingSoon";

// Skeleton. Will call certificateService.getMyCertificates() and
// downloadCertificate(id). Certificate codes render in font-mono.
export default function Certificates() {
  return (
    <>
      <PageHeader
        title="Certificates"
        subtitle="Certificates issued for events you've attended."
      />
      <ComingSoon note="Certificate list with issue date, hours credited, certificate code and a PDF download." />
    </>
  );
}
