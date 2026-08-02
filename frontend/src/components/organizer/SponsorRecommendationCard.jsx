// One suggested sponsor, with the arithmetic behind the suggestion
// shown rather than hidden.
//
// The score and the reasons both come from the server, computed from the
// same counters — this component never derives either, so what the
// organizer reads is exactly what the ranking used. That's the whole
// point of an explainable recommender: a suggestion you can argue with.
//
// History collapses because a sponsor with a long record would otherwise
// push every other card off the screen; the count stays visible so the
// depth of the record is legible while collapsed.
//
// Depends on: components/ui/Card.jsx, components/ui/Button.jsx
import { useState } from "react";
import Card from "../ui/Card";
import Button from "../ui/Button";

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

function ContactLine({ label, children }) {
  if (!children) return null;
  return (
    <div className="flex gap-2 text-xs">
      <span className="w-20 shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
        {label}
      </span>
      <span className="min-w-0 break-words text-ink/80">{children}</span>
    </div>
  );
}

export default function SponsorRecommendationCard({ recommendation, onAdd, disabled }) {
  const [showHistory, setShowHistory] = useState(false);
  const { name, score, reasons, contactPerson, email, phone, website, history } =
    recommendation;

  return (
    <Card as="li" className="list-none">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h4 className="min-w-0 font-display text-base font-extrabold uppercase tracking-tight text-ink">
          {name}
        </h4>
        {/* Score as a filled slab rather than a number in text: it's the
            sort key, so it should be the first thing scanned. */}
        <span className="shrink-0 rounded-lg border-2 border-ink bg-gold px-2 py-0.5 font-mono text-xs font-bold tabular-nums text-ink shadow-brutal-sm">
          {score}%
        </span>
      </div>

      <ul className="mt-3 flex flex-col gap-1">
        {reasons.map((reason) => (
          <li key={reason} className="flex gap-2 text-xs text-ink/80">
            <span aria-hidden="true" className="text-success">
              ✓
            </span>
            <span>{reason}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-col gap-1 border-t-2 border-ink pt-3">
        <ContactLine label="Contact">{contactPerson}</ContactLine>
        <ContactLine label="Email">{email}</ContactLine>
        <ContactLine label="Phone">{phone}</ContactLine>
        <ContactLine label="Website">{website}</ContactLine>
      </div>

      {history.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowHistory((open) => !open)}
            aria-expanded={showHistory}
            className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink underline-offset-4 hover:underline"
          >
            {showHistory ? "Hide" : "Show"} history ({history.length})
          </button>

          {showHistory && (
            <ul className="mt-2 flex flex-col gap-1">
              {history.map((item) => (
                <li key={item.eventId} className="flex justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate text-ink/80">{item.title}</span>
                  <span className="shrink-0 font-mono text-[10px] text-muted">
                    {formatDate(item.date)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        {/* Hands the sponsor up to the Add form preselected, so the
            organizer only fills in the contribution. */}
        <Button onClick={() => onAdd(recommendation)} disabled={disabled}>
          Add Sponsor
        </Button>
      </div>
    </Card>
  );
}
