// Why this exists: the apply form is the only interactive part of the
// Event Details page, and keeping it separate means that page stays
// about fetching and layout.
//
// Controlled by the parent through onApplied: this component owns the
// form fields and the in-flight state, the parent owns "have they
// applied" and swaps this out for the status view.
import { useState } from "react";
import Button from "../ui/Button";
import Alert from "../Alert";
import { applyToEvent } from "../../services/applicationService";
import { getErrorMessage } from "../../services/errorMessage";

const MAX_MOTIVATION = 2000;

export default function ApplyForm({ eventId, roles = [], onApplied }) {
  const [preferredRoleId, setPreferredRoleId] = useState("");
  const [motivation, setMotivation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const tooLong = motivation.length > MAX_MOTIVATION;

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting || tooLong) return;

    setSubmitting(true);
    setError(null);

    try {
      // Omit rather than send empty values — the backend treats an
      // absent preferredRoleId as "no preference", and "" would fail
      // its positive-integer check.
      const body = {};
      if (preferredRoleId !== "") body.preferredRoleId = Number(preferredRoleId);
      if (motivation.trim() !== "") body.motivation = motivation.trim();

      const application = await applyToEvent(eventId, body);
      onApplied?.(application);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't submit your application."));
    } finally {
      setSubmitting(false);
    }
  }

  // A role with no seats left is still selectable — the organizer may
  // reject someone, and a preference isn't a reservation. It's labelled
  // "full" so the choice is informed rather than blocked.
  function roleLabel(role) {
    const remaining = role.capacity - role.filledCount;
    const suffix = remaining > 0 ? `${remaining} of ${role.capacity} left` : "full";
    return `${role.title} — ${suffix}`;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {roles.length > 0 && (
        <div>
          <label
            htmlFor="apply-role"
            className="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted"
          >
            Preferred role
          </label>
          <select
            id="apply-role"
            value={preferredRoleId}
            onChange={(e) => setPreferredRoleId(e.target.value)}
            disabled={submitting}
            className="w-full rounded-lg border border-muted/40 bg-transparent px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none disabled:opacity-60"
          >
            <option value="">No preference</option>
            {roles.map((role) => (
              <option key={role.roleId} value={role.roleId}>
                {roleLabel(role)}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">
            A preference, not a reservation — the organizer assigns final roles.
          </p>
        </div>
      )}

      <div>
        <label
          htmlFor="apply-motivation"
          className="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted"
        >
          Why you&apos;d like to help
          <span className="ml-1 normal-case tracking-normal text-muted">(optional)</span>
        </label>
        <textarea
          id="apply-motivation"
          rows={4}
          value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
          disabled={submitting}
          placeholder="Anything the organizer should know — experience, availability, why this event."
          aria-invalid={tooLong}
          className={`w-full resize-y rounded-lg border bg-transparent px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none disabled:opacity-60 ${
            tooLong ? "border-primary" : "border-muted/40 focus:border-primary"
          }`}
        />
        {tooLong && (
          <p className="mt-1 text-xs text-primary">
            {MAX_MOTIVATION} characters max — currently {motivation.length}.
          </p>
        )}
      </div>

      {error && <Alert>{error}</Alert>}

      <Button type="submit" loading={submitting} disabled={tooLong}>
        {submitting ? "Submitting…" : "Apply to this event"}
      </Button>
    </form>
  );
}
