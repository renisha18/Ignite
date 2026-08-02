// One stop on the volunteer's timeline: an event they were assigned to,
// plus whatever has happened since — attendance, then a certificate.
//
// Built from the existing <Card /> and <StatusChip /> only; the marker
// and connector use tokens already in index.css (border-ink, bg-ink,
// bg-gold, shadow-brutal-sm). No new colour, shadow or weight.
//
// A note on the chip: StatusChip's families are keyed to the schema's
// real ENUMs and it explicitly warns against inventing values. "Assigned
// / attended / certified" is a journey stage, not a column, so passing
// one would hit the unknown-status fallback and render grey. This shows
// the event's own status instead — a real ENUM value — and expresses the
// stage through the row's content (hours, certificate) rather than by
// making up a chip.
//
// Depends on: components/ui/Card, components/ui/StatusChip,
// components/ui/Button, services/certificateService
import { useState } from "react";
import { Link } from "react-router-dom";
import Card from "../ui/Card";
import StatusChip from "../ui/StatusChip";
import Button from "../ui/Button";
import { downloadCertificate } from "../../services/certificateService";
import { getErrorMessage } from "../../services/errorMessage";

const DATE = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const TIME = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : DATE.format(d);
}

function formatTime(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : TIME.format(d);
}

// The plain-language version of where this entry stands. Deliberately a
// sentence rather than a second chip — one chip per row is enough, and
// the interesting part is the progression, not another badge.
function stageLine(entry) {
  if (entry.certified) {
    const when = formatDate(entry.certificateIssuedAt);
    return `Certificate issued${when ? ` on ${when}` : ""}`;
  }
  if (entry.attended) {
    const when = formatTime(entry.checkInTime);
    return `Attended${when ? ` — checked in at ${when}` : ""}`;
  }
  if (entry.eventStart && new Date(entry.eventStart) > new Date()) {
    return "Assigned — coming up";
  }
  return "Assigned — no attendance recorded";
}

export default function JourneyEntry({ entry, isLast = false }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  async function handleDownload() {
    setDownloading(true);
    setError("");
    try {
      await downloadCertificate(entry.certificateId);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't download that certificate."));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <li className="relative flex gap-4">
      {/* Marker + connector. Gold once the event produced a certificate,
          cream otherwise — the same two-state treatment the chips use,
          so the rail reads as progress without a third colour. */}
      <div className="flex shrink-0 flex-col items-center pt-5">
        <span
          aria-hidden="true"
          className={`h-4 w-4 rounded-full border-2 border-ink shadow-brutal-sm ${
            entry.certified ? "bg-gold" : "bg-cream"
          }`}
        />
        {/* Dropped on the final entry so the line terminates at the last
            marker instead of trailing into whitespace. */}
        {!isLast && <span aria-hidden="true" className="mt-1 w-0.5 flex-1 bg-ink" />}
      </div>

      <Card className="mb-4 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              {entry.orgName}
            </p>
            <h3 className="mt-1 font-display text-base font-extrabold text-ink">
              <Link
                to={`/volunteer/events/${entry.eventId}`}
                className="underline-offset-4 hover:underline"
              >
                {entry.eventTitle}
              </Link>
            </h3>
          </div>
          <StatusChip status={entry.eventStatus} type="event" />
        </div>

        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink/80">
          <div className="flex gap-1.5">
            <dt className="text-muted">Role</dt>
            <dd className="font-semibold">{entry.roleTitle}</dd>
          </div>
          {formatDate(entry.eventStart) && (
            <div className="flex gap-1.5">
              <dt className="text-muted">Date</dt>
              <dd>{formatDate(entry.eventStart)}</dd>
            </div>
          )}
          {/* Hours only exist once a certificate has been issued — the
              value is stored on the certificate, not derived here. */}
          {entry.hoursCredited !== null && (
            <div className="flex gap-1.5">
              <dt className="text-muted">Hours</dt>
              <dd className="font-mono font-semibold tabular-nums">
                {entry.hoursCredited}
              </dd>
            </div>
          )}
          {entry.eventLocation && (
            <div className="flex gap-1.5">
              <dt className="text-muted">Where</dt>
              <dd>{entry.eventLocation}</dd>
            </div>
          )}
        </dl>

        <p className="mt-3 border-t-2 border-ink/10 pt-3 text-sm text-muted">
          {stageLine(entry)}
        </p>

        {entry.certified && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={handleDownload} loading={downloading}>
              {downloading ? "Preparing…" : "Download certificate"}
            </Button>
            <span className="font-mono text-[11px] text-muted">
              {entry.certificateCode}
            </span>
          </div>
        )}

        {error && <p className="mt-2 text-sm text-error">{error}</p>}
      </Card>
    </li>
  );
}
