// Why this exists: one row of the My Applications list. Owns its own
// withdraw call and confirm step so the list page stays a list.
//
// The confirm is an inline two-stage button rather than window.confirm:
// a native dialog can't be styled, reads as a browser warning rather
// than part of the app, and is awkward to test.
import { useState } from "react";
import { Link } from "react-router-dom";
import Card from "../ui/Card";
import StatusChip from "../ui/StatusChip";
import { withdrawApplication } from "../../services/applicationService";
import { getErrorMessage } from "../../services/errorMessage";

// Mirrors applicationModel.WITHDRAWABLE_STATUSES on the backend. The
// server is still the authority — this only decides whether to render
// the button, so a stale value can't do damage beyond a 400.
const WITHDRAWABLE = ["applied", "selected"];

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : DATE_FORMAT.format(date);
}

export default function ApplicationRow({ application, onWithdrawn }) {
  const [confirming, setConfirming] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState(null);

  const canWithdraw = WITHDRAWABLE.includes(application.status);
  const eventDate = formatDate(application.eventStart);
  const appliedDate = formatDate(application.appliedAt);

  async function handleWithdraw() {
    setWithdrawing(true);
    setError(null);

    try {
      const updated = await withdrawApplication(application.applicationId);
      onWithdrawn?.(updated);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't withdraw your application."));
      setConfirming(false);
    } finally {
      setWithdrawing(false);
    }
  }

  return (
    <Card as="li" className="list-none">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            {application.orgName}
          </p>
          <h3 className="mt-1 font-display text-base font-semibold text-ink">
            <Link
              to={`/volunteer/events/${application.eventId}`}
              className="underline-offset-4 hover:underline"
            >
              {application.eventTitle}
            </Link>
          </h3>

          <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink/70">
            {eventDate && (
              <div className="flex gap-1.5">
                <dt className="text-muted">Event</dt>
                <dd>{eventDate}</dd>
              </div>
            )}
            <div className="flex gap-1.5">
              <dt className="text-muted">Role</dt>
              {/* null when they applied without naming one. */}
              <dd>{application.roleTitle ?? "No preference"}</dd>
            </div>
            {appliedDate && (
              <div className="flex gap-1.5">
                <dt className="text-muted">Applied</dt>
                <dd>{appliedDate}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <StatusChip status={application.status} />

          {canWithdraw && !confirming && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="text-xs text-muted underline-offset-4 transition hover:text-primary hover:underline"
            >
              Withdraw
            </button>
          )}

          {canWithdraw && confirming && (
            <div className="flex flex-col items-end gap-1.5">
              {/* Says what's permanent about it — the unique constraint
                  means they can't apply to this event again. */}
              <p className="max-w-52 text-right text-xs text-muted">
                Withdraw for good? You won&apos;t be able to apply to this event again.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleWithdraw}
                  disabled={withdrawing}
                  className="rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary transition hover:bg-primary/20 disabled:opacity-60"
                >
                  {withdrawing ? "Withdrawing…" : "Yes, withdraw"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={withdrawing}
                  className="text-xs text-muted underline-offset-4 transition hover:text-ink hover:underline disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-primary">{error}</p>}
    </Card>
  );
}
