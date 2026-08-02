// The organizer's live view of who has scanned in. Polls while the
// event is running.
//
// Polling rather than sockets: this is a hackathon MVP and a 10s
// refresh is indistinguishable from live at the scale of one event.
// It pauses when the tab is hidden — this screen tends to be left open
// on a projector all day, and there's no reason to keep hitting the API
// while nobody's looking at it.
//
// Depends on: services/attendanceService.js
import { useCallback, useEffect, useRef, useState } from "react";
import Card from "../ui/Card";
import Alert from "../Alert";
import { getEventAttendance } from "../../services/attendanceService";
import { getErrorMessage } from "../../services/errorMessage";

const POLL_MS = 10000;

const TIME = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

function formatTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : TIME.format(d);
}

export default function AttendanceList({ eventId }) {
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({ checkedInCount: 0, assignedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const timerRef = useRef(null);

  const load = useCallback(async () => {
    if (!eventId) return;
    try {
      const data = await getEventAttendance(eventId);
      setRows(data.attendance);
      setCounts({ checkedInCount: data.checkedInCount, assignedCount: data.assignedCount });
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load the attendance list."));
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    let cancelled = false;

    function schedule() {
      clearTimeout(timerRef.current);
      // setTimeout chained after each completed load, not setInterval:
      // a slow response can't stack up a queue of overlapping requests.
      timerRef.current = setTimeout(async () => {
        if (cancelled) return;
        if (!document.hidden) await load();
        schedule();
      }, POLL_MS);
    }

    load().then(schedule);

    // Catch up immediately when the organizer comes back to the tab,
    // rather than showing stale data until the next tick.
    function onVisible() {
      if (!document.hidden) load();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearTimeout(timerRef.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  return (
    <Card>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-base font-semibold text-ink">Checked in</h2>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          {counts.checkedInCount} of {counts.assignedCount} assigned
        </p>
      </div>

      {error && (
        <div className="mt-3">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {loading && rows.length === 0 && (
        <p className="mt-3 text-sm text-muted">Loading…</p>
      )}

      {!loading && rows.length === 0 && !error && (
        <p className="mt-3 text-sm text-muted">
          Nobody has scanned yet. Volunteers check in by scanning the code above.
        </p>
      )}

      {rows.length > 0 && (
        <ul className="mt-2">
          {rows.map((row) => (
            <li
              key={row.volunteerId}
              className="flex items-center justify-between gap-3 border-b border-muted/25 py-2.5 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{row.name}</p>
                <p className="mt-0.5 text-xs text-muted">{row.roleTitle}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-mono text-xs tabular-nums text-ink/70">
                  {formatTime(row.checkInTime)}
                </span>
                <span className="relative inline-flex items-center overflow-hidden rounded-full border border-success/50 bg-success/15 py-0.5 pl-3.5 pr-2.5 text-xs font-medium text-success">
                  <span
                    aria-hidden="true"
                    className="absolute -left-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rotate-45 bg-success"
                  />
                  {row.verificationStatus}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
