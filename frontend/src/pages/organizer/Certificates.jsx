// The organizer's certificate screen: pick one of your events, see
// every volunteer assigned to it, and issue certificates to the ones
// whose attendance is verified.
//
// Generation is gated on attendance being 'verified' and hours are
// computed server-side from the event's own start/end, so this screen
// never sends an hours figure. Volunteers who haven't scanned in still
// appear — greyed out with the reason — rather than being filtered away,
// so "where is X?" has an answer on the page.
//
// Depends on: services/eventService.js (event picker only),
// services/certificateService.js, components/ui/*, components/Alert
import { useCallback, useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Toast from "../../components/ui/Toast";
import Alert from "../../components/Alert";
import { getMyEvents } from "../../services/eventService";
import {
  getEventCertificateRows,
  generateCertificate,
} from "../../services/certificateService";
import { getErrorMessage } from "../../services/errorMessage";

const DATE = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : DATE.format(d);
}

// Why a volunteer can't be issued a certificate right now. Returns null
// when they can. Mirrors the server's rules so the organizer reads the
// reason instead of collecting a 400 per click — the server still
// re-checks, this is only the explanation.
function blockedReason(row, hasEndTime) {
  if (row.certificateId) return null;
  if (row.verificationStatus !== "verified") {
    return row.verificationStatus == null
      ? "Hasn't marked attendance yet"
      : `Attendance is ${row.verificationStatus}, not verified`;
  }
  if (!hasEndTime) return "Event has no end time, so hours can't be calculated";
  return null;
}

function VolunteerRow({ row, hasEndTime, onGenerate, generating }) {
  const issued = Boolean(row.certificateId);
  const blocked = blockedReason(row, hasEndTime);

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-b border-muted/25 py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{row.volunteerName}</p>
        <p className="mt-0.5 text-xs text-muted">
          {row.roleTitle}
          {row.volunteerEmail ? ` · ${row.volunteerEmail}` : ""}
        </p>
        {issued && (
          <p className="mt-1 font-mono text-[11px] text-gold-dark">
            {row.certificateCode} · {row.hoursCredited} hrs ·{" "}
            {formatDate(row.issuedAt)}
          </p>
        )}
        {!issued && blocked && (
          <p className="mt-1 text-xs text-muted">{blocked}</p>
        )}
      </div>

      <div className="shrink-0">
        {issued ? (
          <span className="relative inline-flex items-center overflow-hidden rounded-full border border-success/50 bg-success/15 py-1 pl-4 pr-3 text-xs font-medium text-success">
            <span
              aria-hidden="true"
              className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 bg-success"
            />
            Issued
          </span>
        ) : (
          <Button
            variant="secondary"
            onClick={() => onGenerate(row)}
            disabled={Boolean(blocked) || generating}
            loading={generating}
          >
            {generating ? "Generating…" : "Generate certificate"}
          </Button>
        )}
      </div>
    </li>
  );
}

export default function Certificates() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState("");

  const [detail, setDetail] = useState(null); // { event, rows }
  const [rowsLoading, setRowsLoading] = useState(false);
  const [rowsError, setRowsError] = useState("");

  // Which assignmentId is mid-request, so only that row spins.
  const [generatingId, setGeneratingId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let ignore = false;

    getMyEvents()
      .then((list) => {
        if (ignore) return;
        setEvents(list);
        // Auto-select when there's only one — a dropdown with a single
        // option is a click for nothing.
        if (list.length === 1) setSelectedEventId(String(list[0].eventId));
      })
      .catch((err) => {
        if (!ignore) setEventsError(getErrorMessage(err, "Couldn't load your events."));
      })
      .finally(() => {
        if (!ignore) setEventsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const loadRows = useCallback(async (eventId) => {
    if (!eventId) {
      setDetail(null);
      return;
    }
    setRowsLoading(true);
    setRowsError("");
    setActionError("");
    try {
      setDetail(await getEventCertificateRows(eventId));
    } catch (err) {
      setDetail(null);
      setRowsError(getErrorMessage(err, "Couldn't load volunteers for this event."));
    } finally {
      setRowsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRows(selectedEventId);
  }, [selectedEventId, loadRows]);

  async function handleGenerate(row) {
    setGeneratingId(row.assignmentId);
    setActionError("");
    try {
      const certificate = await generateCertificate(row.assignmentId);
      // Patch the single row rather than refetching: nothing else on the
      // page can have changed, and a refetch would rebuild the list
      // under the organizer's cursor mid-run.
      setDetail((current) =>
        current === null
          ? current
          : {
              ...current,
              rows: current.rows.map((r) =>
                r.assignmentId === row.assignmentId
                  ? {
                      ...r,
                      certificateId: certificate.certificateId,
                      certificateCode: certificate.certificateCode,
                      hoursCredited: certificate.hoursCredited,
                      issuedAt: certificate.issuedAt,
                      eligible: false,
                    }
                  : r
              ),
            }
      );
      setToast({
        variant: "success",
        message: `Certificate issued to ${row.volunteerName}.`,
      });
    } catch (err) {
      setActionError(getErrorMessage(err, "Couldn't issue that certificate."));
    } finally {
      setGeneratingId(null);
    }
  }

  const rows = detail?.rows ?? [];
  const issuedCount = rows.filter((r) => r.certificateId).length;
  const eligibleCount = rows.filter((r) => r.eligible).length;

  return (
    <>
      <PageHeader
        title="Certificates"
        subtitle="Issue certificates to volunteers who attended your events."
      />

      {eventsError && (
        <div className="mb-6">
          <Alert variant="error">{eventsError}</Alert>
        </div>
      )}

      {eventsLoading ? (
        <p className="text-sm text-muted">Loading your events…</p>
      ) : events.length === 0 ? (
        <Card className="border-dashed text-center">
          <p className="font-display text-base font-semibold text-ink">No events yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Certificates are issued per event. Create an event and assign
            volunteers to it, and they&apos;ll appear here once their attendance
            is verified.
          </p>
        </Card>
      ) : (
        <>
          <Card className="mb-4">
            <label
              htmlFor="cert-event"
              className="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted"
            >
              Event
            </label>
            <select
              id="cert-event"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full max-w-md rounded-lg border border-muted/40 bg-transparent px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
            >
              <option value="">Choose an event…</option>
              {events.map((event) => (
                <option key={event.eventId} value={event.eventId}>
                  {event.title}
                  {formatDate(event.eventStart) ? ` — ${formatDate(event.eventStart)}` : ""}
                </option>
              ))}
            </select>
          </Card>

          {/* Said once, up front — otherwise every Generate button is
              disabled with no visible explanation of the common cause. */}
          {detail && !detail.event.hasEndTime && (
            <div className="mb-4">
              <Alert variant="info">
                This event has no end time, so volunteer hours can&apos;t be
                calculated and no certificates can be issued. Add an end time on
                the event first.
              </Alert>
            </div>
          )}

          {rowsError && (
            <div className="mb-4">
              <Alert variant="error">{rowsError}</Alert>
            </div>
          )}

          {actionError && (
            <div className="mb-4">
              <Alert variant="error">{actionError}</Alert>
            </div>
          )}

          {rowsLoading && <p className="text-sm text-muted">Loading volunteers…</p>}

          {!rowsLoading && detail && rows.length === 0 && (
            <Card className="border-dashed text-center">
              <p className="font-display text-base font-semibold text-ink">
                No volunteers assigned yet
              </p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted">
                Certificates go to volunteers who were assigned a role and then
                attended. Assign volunteers in the Team Builder first.
              </p>
            </Card>
          )}

          {!rowsLoading && rows.length > 0 && (
            <Card>
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-base font-semibold text-ink">
                  Assigned volunteers
                </h2>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                  {issuedCount} issued · {eligibleCount} ready · {rows.length} total
                </p>
              </div>
              <ul className="mt-2">
                {rows.map((row) => (
                  <VolunteerRow
                    key={row.assignmentId}
                    row={row}
                    hasEndTime={detail.event.hasEndTime}
                    onGenerate={handleGenerate}
                    generating={generatingId === row.assignmentId}
                  />
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      <Toast
        message={toast?.message}
        variant={toast?.variant}
        onDismiss={() => setToast(null)}
      />
    </>
  );
}
