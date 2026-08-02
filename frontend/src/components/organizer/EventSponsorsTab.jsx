// The Sponsors tab of the Edit Event modal. Four stacked sections:
//
//   1. Current Sponsors   — who's backing this event, and with what
//   2. Add Sponsor        — search the catalogue or create a new entry
//   3. Previous Sponsors  — informational: who backed past events of the
//                           same type
//   4. Recommended        — scored suggestions from that same history
//
// Two requests on open, not four: the event's own sponsor list, and one
// call that returns previous sponsors AND recommendations together
// (they're derived from the same scan of past same-type events). The
// catalogue is only queried while the organizer is actually typing a
// search.
//
// Sponsor vs link matters throughout: the catalogue entry is shared
// across events, the contribution belongs to this event alone. This tab
// only ever edits the contribution.
//
// Depends on: components/ui/*, components/FormInput.jsx,
// components/Alert.jsx, services/sponsorService.js,
// services/errorMessage.js
import { useCallback, useEffect, useState } from "react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Alert from "../Alert";
import FormInput from "../FormInput";
import SponsorRecommendationCard from "./SponsorRecommendationCard";
import {
  getSponsors,
  getEventSponsors,
  addEventSponsor,
  updateEventSponsor,
  removeEventSponsor,
  getSponsorRecommendations,
} from "../../services/sponsorService";
import { getErrorMessage } from "../../services/errorMessage";

const EMPTY_CONTRIBUTION = {
  sponsorshipType: "",
  sponsorshipAmount: "",
  remarks: "",
};

const EMPTY_SPONSOR = {
  sponsorName: "",
  website: "",
  industry: "",
  contactPerson: "",
  email: "",
  phone: "",
};

function formatAmount(value) {
  if (value === null || value === undefined) return null;
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function SectionHeading({ children, count }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-2 border-b-2 border-ink pb-1.5">
      <h3 className="font-display text-sm font-extrabold uppercase tracking-tight text-ink">
        {children}
      </h3>
      {count !== undefined && (
        <span className="font-mono text-[11px] tabular-nums text-muted">{count}</span>
      )}
    </div>
  );
}

export default function EventSponsorsTab({ event }) {
  const eventId = event?.eventId;

  const [current, setCurrent] = useState([]);
  const [recs, setRecs] = useState({
    eventType: null,
    previousSponsors: [],
    recommendations: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Add-form state. `selectedSponsor` non-null means "link this existing
  // catalogue entry"; `creating` means "make a new one". They're
  // mutually exclusive, which is what stops a duplicate being created
  // for a sponsor that already exists.
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [selectedSponsor, setSelectedSponsor] = useState(null);
  const [creating, setCreating] = useState(false);
  const [sponsorDraft, setSponsorDraft] = useState(EMPTY_SPONSOR);
  const [contribution, setContribution] = useState(EMPTY_CONTRIBUTION);

  // Editing an existing link's contribution, keyed by eventSponsorId.
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(EMPTY_CONTRIBUTION);

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      // Both in parallel — neither depends on the other.
      const [sponsors, recommendations] = await Promise.all([
        getEventSponsors(eventId),
        getSponsorRecommendations(eventId),
      ]);
      setCurrent(sponsors);
      setRecs(recommendations);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load sponsors for this event."));
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  // Catalogue search runs only while the organizer is typing, and only
  // past two characters — a one-letter query would return the whole
  // catalogue on every keystroke.
  useEffect(() => {
    if (search.trim().length < 2) {
      setResults([]);
      return undefined;
    }

    let ignore = false;
    getSponsors(search.trim())
      .then((list) => {
        if (!ignore) setResults(list);
      })
      .catch(() => {
        if (!ignore) setResults([]);
      });

    return () => {
      ignore = true;
    };
  }, [search]);

  function resetAddForm() {
    setSelectedSponsor(null);
    setCreating(false);
    setSponsorDraft(EMPTY_SPONSOR);
    setContribution(EMPTY_CONTRIBUTION);
    setSearch("");
    setResults([]);
  }

  async function handleAdd() {
    if (!contribution.sponsorshipType.trim()) {
      setError("Contribution type is required.");
      return;
    }
    if (!selectedSponsor && !sponsorDraft.sponsorName.trim()) {
      setError("Pick an existing sponsor or enter a new sponsor name.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const payload = {
        sponsorshipType: contribution.sponsorshipType.trim(),
        sponsorshipAmount: contribution.sponsorshipAmount,
        remarks: contribution.remarks,
        ...(selectedSponsor
          ? { sponsorId: selectedSponsor.sponsorId }
          : { sponsor: sponsorDraft }),
      };

      const { sponsors } = await addEventSponsor(eventId, payload);
      setCurrent(sponsors);
      resetAddForm();
      // A newly linked sponsor is no longer a candidate, so the
      // recommendation list has to be re-derived.
      const refreshed = await getSponsorRecommendations(eventId);
      setRecs(refreshed);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't add that sponsor."));
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveEdit(eventSponsorId) {
    if (!editDraft.sponsorshipType.trim()) {
      setError("Contribution type is required.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const { sponsors } = await updateEventSponsor(eventSponsorId, {
        sponsorshipType: editDraft.sponsorshipType.trim(),
        sponsorshipAmount: editDraft.sponsorshipAmount,
        remarks: editDraft.remarks,
      });
      setCurrent(sponsors);
      setEditingId(null);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't save that contribution."));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(link) {
    setBusy(true);
    setError("");
    try {
      await removeEventSponsor(link.eventSponsorId);
      setCurrent((prev) =>
        prev.filter((row) => row.eventSponsorId !== link.eventSponsorId)
      );
      // Unlinking puts the sponsor back in the candidate pool.
      const refreshed = await getSponsorRecommendations(eventId);
      setRecs(refreshed);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't remove that sponsor."));
    } finally {
      setBusy(false);
    }
  }

  // From a recommendation card: preselect the sponsor so the organizer
  // only has to say what they're contributing.
  function handleAddFromRecommendation(recommendation) {
    setCreating(false);
    setSelectedSponsor({
      sponsorId: recommendation.sponsorId,
      sponsorName: recommendation.name,
    });
    setSearch("");
    setResults([]);
    setContribution(EMPTY_CONTRIBUTION);
    setError("");
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading sponsors…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Alert variant="error">{error}</Alert>

      {/* 1 ------------------------------------------------ Current */}
      <section>
        <SectionHeading count={current.length}>Current Sponsors</SectionHeading>

        {current.length === 0 ? (
          <p className="text-sm text-muted">
            No sponsors linked to this event yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {current.map((link) => (
              <li key={link.eventSponsorId}>
                <Card className="p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h4 className="min-w-0 font-display text-sm font-extrabold uppercase tracking-tight text-ink">
                      {link.sponsorName}
                    </h4>
                    {link.sponsorshipAmount !== null && (
                      <span className="shrink-0 font-mono text-xs font-bold tabular-nums text-ink">
                        {formatAmount(link.sponsorshipAmount)}
                      </span>
                    )}
                  </div>

                  {editingId === link.eventSponsorId ? (
                    // Contribution only — the catalogue entry is shared
                    // with other events and isn't editable from here.
                    <div className="mt-3 flex flex-col gap-3">
                      <FormInput
                        label="Contribution type"
                        name={`edit-type-${link.eventSponsorId}`}
                        value={editDraft.sponsorshipType}
                        onChange={(e) =>
                          setEditDraft((d) => ({
                            ...d,
                            sponsorshipType: e.target.value,
                          }))
                        }
                      />
                      <FormInput
                        label="Contribution amount (optional)"
                        name={`edit-amount-${link.eventSponsorId}`}
                        type="number"
                        value={editDraft.sponsorshipAmount}
                        onChange={(e) =>
                          setEditDraft((d) => ({
                            ...d,
                            sponsorshipAmount: e.target.value,
                          }))
                        }
                      />
                      <FormInput
                        label="Remarks (optional)"
                        name={`edit-remarks-${link.eventSponsorId}`}
                        value={editDraft.remarks}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, remarks: e.target.value }))
                        }
                        multiline
                        rows={2}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                          disabled={busy}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => handleSaveEdit(link.eventSponsorId)}
                          loading={busy}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="mt-1 text-xs text-ink/80">
                        {link.sponsorshipType}
                      </p>
                      {link.remarks && (
                        <p className="mt-1 text-xs text-muted">{link.remarks}</p>
                      )}

                      <div className="mt-3 flex justify-end gap-2 border-t-2 border-ink pt-3">
                        <Button
                          variant="secondary"
                          disabled={busy}
                          onClick={() => {
                            setEditingId(link.eventSponsorId);
                            setEditDraft({
                              sponsorshipType: link.sponsorshipType ?? "",
                              sponsorshipAmount:
                                link.sponsorshipAmount === null
                                  ? ""
                                  : String(link.sponsorshipAmount),
                              remarks: link.remarks ?? "",
                            });
                          }}
                        >
                          Edit Contribution
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => handleRemove(link)}
                          disabled={busy}
                        >
                          Remove
                        </Button>
                      </div>
                    </>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 2 ---------------------------------------------------- Add */}
      <section>
        <SectionHeading>Add Sponsor</SectionHeading>

        <Card className="p-4">
          {selectedSponsor ? (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border-2 border-ink bg-gold px-3 py-2">
              <span className="text-sm font-bold text-ink">
                {selectedSponsor.sponsorName}
              </span>
              <Button variant="ghost" onClick={resetAddForm} disabled={busy}>
                Change
              </Button>
            </div>
          ) : creating ? (
            <div className="mb-3 flex flex-col gap-3">
              <FormInput
                label="Sponsor name"
                name="new-sponsor-name"
                value={sponsorDraft.sponsorName}
                onChange={(e) =>
                  setSponsorDraft((d) => ({ ...d, sponsorName: e.target.value }))
                }
                placeholder="Decathlon"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <FormInput
                  label="Website"
                  name="new-sponsor-website"
                  value={sponsorDraft.website}
                  onChange={(e) =>
                    setSponsorDraft((d) => ({ ...d, website: e.target.value }))
                  }
                />
                <FormInput
                  label="Industry"
                  name="new-sponsor-industry"
                  value={sponsorDraft.industry}
                  onChange={(e) =>
                    setSponsorDraft((d) => ({ ...d, industry: e.target.value }))
                  }
                />
                <FormInput
                  label="Contact person"
                  name="new-sponsor-contact"
                  value={sponsorDraft.contactPerson}
                  onChange={(e) =>
                    setSponsorDraft((d) => ({
                      ...d,
                      contactPerson: e.target.value,
                    }))
                  }
                />
                <FormInput
                  label="Email"
                  name="new-sponsor-email"
                  type="email"
                  value={sponsorDraft.email}
                  onChange={(e) =>
                    setSponsorDraft((d) => ({ ...d, email: e.target.value }))
                  }
                />
                <FormInput
                  label="Phone"
                  name="new-sponsor-phone"
                  value={sponsorDraft.phone}
                  onChange={(e) =>
                    setSponsorDraft((d) => ({ ...d, phone: e.target.value }))
                  }
                />
              </div>
              <div>
                <Button variant="ghost" onClick={resetAddForm} disabled={busy}>
                  Search existing instead
                </Button>
              </div>
            </div>
          ) : (
            <div className="mb-3 flex flex-col gap-2">
              <FormInput
                label="Search existing sponsors"
                name="sponsor-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or industry…"
              />

              {results.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {results.map((sponsor) => (
                    <li key={sponsor.sponsorId}>
                      <button
                        type="button"
                        onClick={() => setSelectedSponsor(sponsor)}
                        className="w-full rounded-lg border-2 border-ink bg-cream px-3 py-1.5 text-left text-sm font-semibold text-ink transition-all duration-100 hover:bg-gold-light/40 hover:shadow-brutal-sm"
                      >
                        {sponsor.sponsorName}
                        {sponsor.industry && (
                          <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                            {sponsor.industry}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {search.trim().length >= 2 && results.length === 0 && (
                <p className="text-xs text-muted">
                  Nothing in the catalogue matches — create a new sponsor below.
                </p>
              )}

              <div>
                <Button variant="secondary" onClick={() => setCreating(true)}>
                  Create new sponsor
                </Button>
              </div>
            </div>
          )}

          {(selectedSponsor || creating) && (
            <div className="flex flex-col gap-3 border-t-2 border-ink pt-3">
              <FormInput
                label="Contribution type"
                name="contribution-type"
                value={contribution.sponsorshipType}
                onChange={(e) =>
                  setContribution((c) => ({
                    ...c,
                    sponsorshipType: e.target.value,
                  }))
                }
                placeholder="Cash / Equipment / Refreshments"
              />
              <FormInput
                label="Contribution amount (optional)"
                name="contribution-amount"
                type="number"
                value={contribution.sponsorshipAmount}
                onChange={(e) =>
                  setContribution((c) => ({
                    ...c,
                    sponsorshipAmount: e.target.value,
                  }))
                }
              />
              <FormInput
                label="Remarks (optional)"
                name="contribution-remarks"
                value={contribution.remarks}
                onChange={(e) =>
                  setContribution((c) => ({ ...c, remarks: e.target.value }))
                }
                multiline
                rows={2}
              />
              <div className="flex justify-end">
                <Button onClick={handleAdd} loading={busy}>
                  Save sponsor
                </Button>
              </div>
            </div>
          )}
        </Card>
      </section>

      {/* 3 --------------------------------------------- Previous */}
      <section>
        <SectionHeading>Previous Sponsors</SectionHeading>

        {!recs.eventType ? (
          // Not an error: recommendations key on event type, so an
          // untyped event genuinely has nothing to compare against.
          <p className="text-sm text-muted">
            Set an <strong>Event Type</strong> on the General tab to see who
            sponsored similar events before.
          </p>
        ) : recs.previousSponsors.length === 0 ? (
          <p className="text-sm text-muted">
            No past {recs.eventType} events have sponsors recorded yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {recs.previousSponsors.map((past) => (
              <li key={past.eventId}>
                <Card className="p-3">
                  <p className="font-display text-sm font-extrabold uppercase tracking-tight text-ink">
                    {past.title}
                  </p>
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {past.sponsors.map((sponsor) => (
                      <li
                        key={sponsor.sponsorId}
                        className="rounded-full border-2 border-ink bg-cream px-2 py-0.5 text-[11px] font-bold text-ink"
                      >
                        {sponsor.sponsorName}
                      </li>
                    ))}
                  </ul>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 4 ------------------------------------------ Recommended */}
      <section>
        <SectionHeading count={recs.recommendations.length}>
          Recommended Sponsors
        </SectionHeading>

        {recs.recommendations.length === 0 ? (
          <p className="text-sm text-muted">
            {recs.eventType
              ? "No suggestions yet — they build up as past events of this type record their sponsors."
              : "Set an Event Type on the General tab to get suggestions."}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {recs.recommendations.map((recommendation) => (
              <SponsorRecommendationCard
                key={recommendation.sponsorId}
                recommendation={recommendation}
                onAdd={handleAddFromRecommendation}
                disabled={busy}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
