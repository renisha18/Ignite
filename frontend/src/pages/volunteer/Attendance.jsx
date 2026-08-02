// The volunteer's half of QR attendance: point the camera at the code
// the organizer has on screen.
//
// Per docs/api-contract.md: one scan per volunteer per event, no
// check-out, and the volunteer is identified by their own JWT — the
// client never sends an assignmentId.
//
// Two things this deliberately does:
//   1. Stops the camera INSIDE the decode callback, before awaiting the
//      network. html5-qrcode fires per decoded frame, so a QR held in
//      view produces several callbacks; without stopping first the same
//      token posts three or four times and the volunteer sees "already
//      checked in" for their own successful scan.
//   2. Offers a paste-the-code fallback. Camera permissions, http-only
//      origins and venue wifi are the likeliest demo-day failures, and
//      the endpoint only needs the token string.
import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { scanQr } from "../../services/attendanceService";
import { getErrorMessage } from "../../services/errorMessage";

const READER_ID = "ignite-qr-reader";

// Outcome styling reuses the gold-seal chip language rather than a raw
// error string — a volunteer standing in a queue needs to read the
// result at a glance.
const OUTCOME = {
  success: {
    chip: "border-success/50 bg-success/15 text-success",
    notch: "bg-success",
    label: "Checked in",
  },
  duplicate: {
    chip: "border-gold/60 bg-gold/15 text-gold-dark",
    notch: "bg-gold",
    label: "Already checked in",
  },
  notAssigned: {
    chip: "border-primary/40 bg-primary/10 text-primary",
    notch: "bg-primary",
    label: "Not assigned",
  },
  expired: {
    chip: "border-gold/60 bg-gold/15 text-gold-dark",
    notch: "bg-gold",
    label: "Code expired",
  },
  invalid: {
    chip: "border-primary/40 bg-primary/10 text-primary",
    notch: "bg-primary",
    label: "Not a valid code",
  },
};

// Map the server's status to an outcome. The messages themselves come
// from the server — it knows why, and its wording already distinguishes
// expired from invalid.
function outcomeFor(err) {
  const status = err?.response?.status;
  const message = getErrorMessage(err, "Couldn't check you in.");
  if (status === 409) return { kind: "duplicate", message };
  if (status === 403) return { kind: "notAssigned", message };
  if (status === 400) {
    return { kind: /expired/i.test(message) ? "expired" : "invalid", message };
  }
  return { kind: "invalid", message };
}

function OutcomeCard({ result, onScanAgain }) {
  const style = OUTCOME[result.kind] ?? OUTCOME.invalid;

  return (
    <Card className="text-center">
      <span
        className={`relative inline-flex items-center overflow-hidden rounded-full border py-1 pl-4 pr-3 text-xs font-medium ${style.chip}`}
      >
        <span
          aria-hidden="true"
          className={`absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 ${style.notch}`}
        />
        {style.label}
      </span>

      {result.kind === "success" ? (
        <>
          <h2 className="mt-4 font-display text-lg font-semibold text-ink">
            {result.attendance.eventTitle}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {result.attendance.roleTitle} · checked in at{" "}
            {new Date(result.attendance.checkInTime).toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
          <p className="mx-auto mt-3 max-w-sm text-sm text-ink/70">
            That&apos;s it — your organizer can issue your certificate once the
            event is done.
          </p>
        </>
      ) : (
        <p className="mx-auto mt-4 max-w-sm text-sm text-ink/80">{result.message}</p>
      )}

      {result.kind !== "success" && (
        <div className="mt-4">
          <Button variant="secondary" onClick={onScanAgain}>
            Try again
          </Button>
        </div>
      )}
    </Card>
  );
}

export default function Attendance() {
  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [result, setResult] = useState(null);
  const [manualToken, setManualToken] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const scannerRef = useRef(null);
  // Guards against html5-qrcode firing the decode callback again while
  // the first one is still awaiting the POST.
  const handledRef = useRef(false);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      await scanner.stop();
      scanner.clear();
    } catch {
      // Already stopped, or the element is gone — nothing to recover.
    }
  }, []);

  // Stop the camera if the volunteer navigates away mid-scan; otherwise
  // the stream stays live and the phone's camera light stays on.
  useEffect(() => () => { stopScanner(); }, [stopScanner]);

  const submitToken = useCallback(async (token) => {
    setSubmitting(true);
    try {
      const attendance = await scanQr(token);
      setResult({ kind: "success", attendance });
    } catch (err) {
      setResult(outcomeFor(err));
    } finally {
      setSubmitting(false);
    }
  }, []);

  async function startScanner() {
    setCameraError("");
    setResult(null);
    handledRef.current = false;
    setStarting(true);
    setScanning(true);

    try {
      // Constructed after the render that mounts #ignite-qr-reader —
      // html5-qrcode looks the element up by id at construction time.
      const scanner = new Html5Qrcode(READER_ID);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText) => {
          if (handledRef.current) return;
          handledRef.current = true;

          // Stop BEFORE awaiting — see the note at the top of this file.
          await stopScanner();
          setScanning(false);
          await submitToken(decodedText);
        },
        () => {
          // Per-frame "no QR in view" callback. Firing many times a
          // second is normal; surfacing it would be noise.
        }
      );
    } catch (err) {
      setScanning(false);
      scannerRef.current = null;
      setCameraError(
        err?.message?.includes("Permission") || err?.name === "NotAllowedError"
          ? "Camera access was blocked. Allow it in your browser settings, or paste the code below instead."
          : "Couldn't start the camera. Paste the code below instead."
      );
    } finally {
      setStarting(false);
    }
  }

  async function handleScanAgain() {
    setResult(null);
    setManualToken("");
    await startScanner();
  }

  async function handleManualSubmit(event) {
    event.preventDefault();
    if (!manualToken.trim() || submitting) return;
    await stopScanner();
    setScanning(false);
    await submitToken(manualToken.trim());
  }

  return (
    <>
      <PageHeader
        title="Attendance"
        subtitle="Scan the QR code shown by your organizer to mark attendance."
      />

      <div className="space-y-4">
        {result && <OutcomeCard result={result} onScanAgain={handleScanAgain} />}

        {!result && (
          <Card className="text-center">
            {/* Always mounted while scanning: html5-qrcode attaches its
                video element to this node by id. */}
            <div
              id={READER_ID}
              className={`mx-auto w-full max-w-sm overflow-hidden rounded-lg ${
                scanning ? "border border-muted/30" : "hidden"
              }`}
            />

            {!scanning && (
              <>
                <p className="mx-auto max-w-sm text-sm text-muted">
                  Your organizer will have a QR code on screen at the event.
                  Point your camera at it to check in.
                </p>
                <div className="mt-4">
                  <Button onClick={startScanner} loading={starting}>
                    {starting ? "Starting camera…" : "Scan QR code"}
                  </Button>
                </div>
              </>
            )}

            {scanning && (
              <div className="mt-4">
                <p className="text-sm text-muted">Point your camera at the code…</p>
                <button
                  type="button"
                  onClick={async () => {
                    await stopScanner();
                    setScanning(false);
                  }}
                  className="mt-2 text-sm text-muted underline-offset-4 transition hover:text-ink hover:underline"
                >
                  Cancel
                </button>
              </div>
            )}

            {cameraError && (
              <p className="mx-auto mt-4 max-w-sm text-sm text-primary">{cameraError}</p>
            )}
          </Card>
        )}

        {!result && (
          <Card>
            <h2 className="font-display text-base font-semibold text-ink">
              Camera not working?
            </h2>
            <p className="mt-1 text-sm text-muted">
              Ask your organizer to read out the code, or paste it here.
            </p>
            <form onSubmit={handleManualSubmit} className="mt-3 flex flex-wrap gap-2">
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Paste the attendance code"
                className="min-w-52 flex-1 rounded-lg border border-muted/40 bg-transparent px-3 py-2 font-mono text-xs text-ink placeholder:font-sans placeholder:text-muted focus:border-primary focus:outline-none"
              />
              <Button
                type="submit"
                variant="secondary"
                loading={submitting}
                disabled={!manualToken.trim()}
              >
                Check in
              </Button>
            </form>
          </Card>
        )}
      </div>
    </>
  );
}
