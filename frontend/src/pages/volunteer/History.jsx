// "My Journey" — everything this volunteer has been assigned to, newest
// first, with attendance and certificates folded in.
//
// This is the page the sidebar calls History; the API and the contract
// call the data a journey. One live join server-side, so an entry
// updates the moment an organizer verifies attendance or issues a
// certificate — nothing here is cached.
//
// Loading and empty states follow Certificates.jsx rather than
// inventing a second convention.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Alert from "../../components/Alert";
import JourneyEntry from "../../components/volunteer/JourneyEntry";
import { getMyJourney } from "../../services/journeyService";
import { getErrorMessage } from "../../services/errorMessage";

function LoadingList() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading your journey">
      {[0, 1, 2].map((i) => (
        <Card key={i} className="h-32 animate-pulse">
          <div className="h-2 w-24 rounded bg-muted/25" />
          <div className="mt-3 h-4 w-2/3 rounded bg-muted/25" />
          <div className="mt-3 h-3 w-1/2 rounded bg-muted/20" />
        </Card>
      ))}
    </div>
  );
}

export default function History() {
  const [journey, setJourney] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    getMyJourney()
      .then((list) => {
        if (!ignore) setJourney(list);
      })
      .catch((err) => {
        if (!ignore) setError(getErrorMessage(err, "Couldn't load your journey."));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  // Small enough to derive on render, and it gives the page a headline
  // worth reading before the list itself.
  const totalHours = journey.reduce((sum, e) => sum + (e.hoursCredited ?? 0), 0);
  const attendedCount = journey.filter((e) => e.attended).length;

  return (
    <>
      <PageHeader
        title="History"
        subtitle="Everything you've volunteered for, start to finish."
      />

      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {loading && <LoadingList />}

      {!loading && !error && journey.length === 0 && (
        <Card className="border-dashed py-10 text-center">
          <p className="font-display text-lg font-extrabold text-ink">
            Your journey starts with one event
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Once an organizer assigns you a role, it&apos;ll appear here — and
            stay here, along with the hours you put in and the certificate you
            earned.
          </p>
          <Link
            to="/volunteer/events"
            className="mt-4 inline-block text-sm font-bold text-primary underline-offset-4 hover:underline"
          >
            Browse events
          </Link>
        </Card>
      )}

      {!loading && journey.length > 0 && (
        <>
          <Card className="mb-5 flex flex-wrap items-center justify-around gap-4 text-center">
            <div>
              <p className="font-display text-2xl font-extrabold text-ink tabular-nums">
                {journey.length}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                {journey.length === 1 ? "Event" : "Events"}
              </p>
            </div>
            <div>
              <p className="font-display text-2xl font-extrabold text-ink tabular-nums">
                {attendedCount}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                Attended
              </p>
            </div>
            <div>
              <p className="font-display text-2xl font-extrabold text-ink tabular-nums">
                {/* Whole numbers stay whole — "12 hours", not "12.0". */}
                {Number.isInteger(totalHours) ? totalHours : totalHours.toFixed(1)}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                Hours credited
              </p>
            </div>
          </Card>

          <ul className="list-none">
            {journey.map((entry, index) => (
              <JourneyEntry
                key={entry.assignmentId}
                entry={entry}
                isLast={index === journey.length - 1}
              />
            ))}
          </ul>
        </>
      )}
    </>
  );
}
