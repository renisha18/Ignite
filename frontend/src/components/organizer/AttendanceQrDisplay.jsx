// The QR the organizer puts on a projector, TV or laptop during the
// event. Volunteers scan it to check in.
//
// The token expires in ~5 minutes (utils/attendanceToken.js). This
// refetches at 80% of that window, so the code on screen is never the
// stale one — a volunteer who scans at the wrong moment would otherwise
// get "expired" through no fault of their own. That short life is also
// the security model: a photograph of this screen is useless minutes
// later.
//
// Depends on: qrcode.react, services/attendanceService.js
import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Alert from "../Alert";
import { getAttendanceQr } from "../../services/attendanceService";
import { getErrorMessage } from "../../services/errorMessage";

// Refresh with headroom rather than at the last second — a request in
// flight when the old token dies would leave a dead QR on screen.
const REFRESH_AT = 0.8;

export default function AttendanceQrDisplay({ eventId, eventTitle }) {
  const [qrToken, setQrToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(null);

  const timerRef = useRef(null);
  const tickRef = useRef(null);

  const load = useCallback(async () => {
    if (!eventId) return;
    try {
      const { qrToken: token, expiresIn } = await getAttendanceQr(eventId);
      setQrToken(token);
      setError("");
      setSecondsLeft(expiresIn);

      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(load, expiresIn * REFRESH_AT * 1000);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't generate the attendance QR code."));
      // Leave the old QR up rather than blanking the projector on a
      // transient failure — a slightly stale code is better than none,
      // and the next successful refresh replaces it.
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
    return () => clearTimeout(timerRef.current);
  }, [load]);

  // Visible countdown so the organizer can see the code is live and
  // rotating, rather than wondering whether the screen has frozen.
  useEffect(() => {
    clearInterval(tickRef.current);
    if (secondsLeft === null) return undefined;
    tickRef.current = setInterval(() => {
      setSecondsLeft((s) => (s === null || s <= 0 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [secondsLeft === null]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card className="text-center">
      <h2 className="font-display text-base font-semibold text-ink">
        Attendance QR code
      </h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">
        Put this on a screen volunteers can see. It refreshes itself every few
        minutes, so a photo of it won&apos;t work later.
      </p>

      {error && (
        <div className="mx-auto mt-4 max-w-md text-left">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <div className="mt-5 flex justify-center">
        {loading && !qrToken ? (
          <div className="h-64 w-64 animate-pulse rounded-lg bg-muted/20" />
        ) : qrToken ? (
          // White quiet-zone behind the code: scanners need the contrast,
          // and the cream page background alone is marginal.
          <div className="rounded-lg border border-muted/30 bg-white p-4">
            <QRCodeSVG value={qrToken} size={256} level="M" marginSize={2} />
          </div>
        ) : (
          <p className="text-sm text-muted">No code yet.</p>
        )}
      </div>

      {eventTitle && (
        <p className="mt-4 font-display text-sm text-ink">{eventTitle}</p>
      )}

      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
        {secondsLeft === null
          ? ""
          : secondsLeft > 0
            ? `refreshes in ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`
            : "refreshing…"}
      </p>

      <div className="mt-4">
        <Button variant="ghost" onClick={load}>
          Refresh now
        </Button>
      </div>
    </Card>
  );
}
