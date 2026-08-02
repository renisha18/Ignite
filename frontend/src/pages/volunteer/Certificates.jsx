// Certificates the volunteer has earned. Each card owns its own
// download; this page owns the fetch and the empty/loading states.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Alert from "../../components/Alert";
import CertificateCard from "../../components/volunteer/CertificateCard";
import { getMyCertificates } from "../../services/certificateService";
import { getErrorMessage } from "../../services/errorMessage";

function LoadingList() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading certificates">
      {[0, 1].map((i) => (
        <Card key={i} className="h-32 animate-pulse">
          <div className="h-2 w-24 rounded bg-muted/25" />
          <div className="mt-3 h-4 w-2/3 rounded bg-muted/25" />
          <div className="mt-3 h-3 w-1/2 rounded bg-muted/20" />
        </Card>
      ))}
    </div>
  );
}

export default function Certificates() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    getMyCertificates()
      .then((list) => {
        if (!ignore) setCertificates(list);
      })
      .catch((err) => {
        if (!ignore) setError(getErrorMessage(err, "Couldn't load your certificates."));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <>
      <PageHeader
        title="Certificates"
        subtitle="Certificates issued for events you've attended."
      />

      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {loading && <LoadingList />}

      {!loading && !error && certificates.length === 0 && (
        <Card className="border-dashed py-10 text-center">
          <p className="font-display text-lg text-ink">No certificates yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            They&apos;ll show up here once you&apos;ve completed a verified event —
            your organizer issues them after attendance is confirmed.
          </p>
          <Link
            to="/volunteer/events"
            className="mt-4 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Browse events
          </Link>
        </Card>
      )}

      {!loading && certificates.length > 0 && (
        <ul className="space-y-3">
          {certificates.map((certificate) => (
            <CertificateCard
              key={certificate.certificateId}
              certificate={certificate}
              onError={setError}
            />
          ))}
        </ul>
      )}
    </>
  );
}
