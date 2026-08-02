// The organizer's half of QR attendance: display a short-lived QR for
// the event and watch scans arrive. No location or check-out anywhere —
// see docs/api-contract.md, "How the QR works".
//
// Same shape as MyEvents.jsx: pick an event, act on it. The QR and the
// list are separate components so the projector view and the roll can
// evolve independently.
//
// Depends on: services/eventService.js (event picker only),
// components/organizer/AttendanceQrDisplay, components/organizer/AttendanceList
import { useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Alert from "../../components/Alert";
import AttendanceQrDisplay from "../../components/organizer/AttendanceQrDisplay";
import AttendanceList from "../../components/organizer/AttendanceList";
import { getMyEvents } from "../../services/eventService";
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

export default function Attendance() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    getMyEvents()
      .then((list) => {
        if (ignore) return;
        setEvents(list);
        // A dropdown with one option is a click for nothing.
        if (list.length === 1) setSelectedEventId(String(list[0].eventId));
      })
      .catch((err) => {
        if (!ignore) setError(getErrorMessage(err, "Couldn't load your events."));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const selectedEvent = events.find((e) => String(e.eventId) === String(selectedEventId));

  return (
    <>
      <PageHeader
        title="Attendance"
        subtitle="Display the event QR code and track who has checked in."
      />

      {error && (
        <div className="mb-6">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading your events…</p>
      ) : events.length === 0 ? (
        <Card className="border-dashed text-center">
          <p className="font-display text-base font-semibold text-ink">No events yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Attendance is taken per event. Create an event and assign volunteers
            to it, then bring up its QR code here on the day.
          </p>
        </Card>
      ) : (
        <>
          <Card className="mb-4">
            <label
              htmlFor="attendance-event"
              className="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted"
            >
              Event
            </label>
            <select
              id="attendance-event"
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

          {selectedEventId ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {/* key forces a fresh token + fresh poll when the organizer
                  switches events, rather than leaving the previous
                  event's QR on screen mid-refresh. */}
              <AttendanceQrDisplay
                key={`qr-${selectedEventId}`}
                eventId={selectedEventId}
                eventTitle={selectedEvent?.title}
              />
              <AttendanceList key={`list-${selectedEventId}`} eventId={selectedEventId} />
            </div>
          ) : (
            <Card className="border-dashed text-center">
              <p className="text-sm text-muted">
                Choose an event to bring up its attendance QR code.
              </p>
            </Card>
          )}
        </>
      )}
    </>
  );
}
