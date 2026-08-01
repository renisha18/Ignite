// My Applications — every event this volunteer has applied to.
//
// Owns the fetch and the list; each row owns its own withdraw call and
// reports the updated application back up so the list re-renders
// without a refetch.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Toast from "../../components/ui/Toast";
import Alert from "../../components/Alert";
import ApplicationRow from "../../components/volunteer/ApplicationRow";
import { getMyApplications } from "../../services/applicationService";
import { getErrorMessage } from "../../services/errorMessage";

function LoadingList() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading applications">
      {[0, 1, 2].map((i) => (
        <Card key={i} className="h-28 animate-pulse">
          <div className="h-2 w-24 rounded bg-muted/25" />
          <div className="mt-3 h-4 w-2/3 rounded bg-muted/25" />
          <div className="mt-3 h-3 w-1/2 rounded bg-muted/20" />
        </Card>
      ))}
    </div>
  );
}

export default function MyApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let ignore = false;

    getMyApplications()
      .then((list) => {
        if (!ignore) setApplications(list);
      })
      .catch((err) => {
        if (!ignore) setError(getErrorMessage(err, "Couldn't load your applications."));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  // Replace in place rather than refetch: the row keeps its position in
  // the list and only its status chip changes, so the page doesn't jump
  // under the user's cursor right after they clicked something.
  function handleWithdrawn(updated) {
    setApplications((current) =>
      current.map((app) =>
        app.applicationId === updated.applicationId
          ? { ...app, status: updated.status, decidedAt: updated.decidedAt }
          : app
      )
    );
    setToast({ variant: "success", message: "Application withdrawn." });
  }

  return (
    <>
      <PageHeader
        title="My Applications"
        subtitle="Every event you've applied to, and where each one stands."
      />

      {loading && <LoadingList />}

      {!loading && error && <Alert>{error}</Alert>}

      {!loading && !error && applications.length === 0 && (
        <Card className="border-dashed py-10 text-center">
          <p className="font-display text-lg text-ink">
            You haven&apos;t applied to anything yet
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Once you apply, this is where you&apos;ll track whether you&apos;ve been
            selected — and pick up your certificate afterwards.
          </p>
          <Link
            to="/volunteer/events"
            className="mt-4 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Browse events
          </Link>
        </Card>
      )}

      {!loading && !error && applications.length > 0 && (
        <ul className="space-y-3">
          {applications.map((application) => (
            <ApplicationRow
              key={application.applicationId}
              application={application}
              onWithdrawn={handleWithdrawn}
            />
          ))}
        </ul>
      )}

      <Toast
        message={toast?.message}
        variant={toast?.variant}
        onDismiss={() => setToast(null)}
      />
    </>
  );
}
