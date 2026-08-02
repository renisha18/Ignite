// One issued certificate. Owns its own download call so the list page
// stays a list.
//
// The PDF is rendered server-side on every request and never stored, so
// there's no URL to link to — the download goes through the service,
// which fetches a blob and hands it to the browser. That's why this is
// a button and not an <a href>.
import { useState } from "react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { downloadCertificate } from "../../services/certificateService";
import { getErrorMessage } from "../../services/errorMessage";

const DATE = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : DATE.format(d);
}

export default function CertificateCard({ certificate, onError }) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadCertificate(certificate.certificateId);
    } catch (err) {
      onError?.(getErrorMessage(err, "Couldn't download that certificate."));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Card as="li" className="list-none">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            {certificate.orgName}
          </p>
          <h3 className="mt-1 font-display text-base font-semibold text-ink">
            {certificate.eventTitle}
          </h3>

          <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink/70">
            {formatDate(certificate.eventStart) && (
              <div className="flex gap-1.5">
                <dt className="text-muted">Event</dt>
                <dd>{formatDate(certificate.eventStart)}</dd>
              </div>
            )}
            <div className="flex gap-1.5">
              <dt className="text-muted">Hours</dt>
              <dd className="font-mono tabular-nums">{certificate.hoursCredited}</dd>
            </div>
            {formatDate(certificate.issuedAt) && (
              <div className="flex gap-1.5">
                <dt className="text-muted">Issued</dt>
                <dd>{formatDate(certificate.issuedAt)}</dd>
              </div>
            )}
          </dl>

          {/* Mono, and shown in full: this is the code someone reads off
              the printed certificate to verify it. */}
          <p className="mt-2 font-mono text-[11px] text-gold-dark">
            {certificate.certificateCode}
          </p>
        </div>

        <div className="shrink-0">
          <Button variant="secondary" onClick={handleDownload} loading={downloading}>
            {downloading ? "Preparing…" : "Download PDF"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
