// Why this lives in components/ui/ rather than components/volunteer/:
// the organizer's event-role form needs the same control (POST
// /events/:eventId/roles takes skillIds). Putting it here means the
// organizer track imports it instead of building a second one.
// >>> Tell your teammate this exists before they write their own. <<<
//
// Chip-style toggles rather than a <select multiple>: multi-selects are
// notoriously bad on touch (ctrl-click to deselect doesn't exist), and
// chips show the full selection at a glance. Shares the gold-seal notch
// established by StatusChip so the visual language stays consistent.
//
// Controlled component: `value` is an array of skillIds, `onChange`
// gets the next array. It fetches its own options — the parent supplies
// the selection, not the catalogue.
//
// Depends on: services/skillService.js
import { useEffect, useState } from "react";
import { getSkills } from "../../services/skillService";
import { getErrorMessage } from "../../services/errorMessage";

export default function SkillMultiSelect({
  value = [],
  onChange,
  disabled = false,
  label = "Skills",
  hint = "Organizers match volunteers to roles using these.",
}) {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;

    getSkills()
      .then((list) => {
        if (!ignore) setSkills(list);
      })
      .catch((err) => {
        if (!ignore) setError(getErrorMessage(err, "Couldn't load the skills list."));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  // Compare as Numbers: skillIds can arrive as strings from a form or
  // as numbers from the API, and a mismatch would silently render every
  // chip unselected.
  const selected = new Set(value.map(Number));

  function toggle(skillId) {
    const next = new Set(selected);
    if (next.has(skillId)) {
      next.delete(skillId);
    } else {
      next.add(skillId);
    }
    onChange?.([...next]);
  }

  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
        {label}
      </legend>
      {hint && <p className="mb-2.5 text-xs text-muted">{hint}</p>}

      {loading && <p className="text-sm text-muted">Loading skills…</p>}

      {error && <p className="text-sm text-primary">{error}</p>}

      {!loading && !error && skills.length === 0 && (
        <p className="text-sm text-muted">
          No skills have been set up yet — an admin needs to add them before
          you can pick any.
        </p>
      )}

      {!loading && !error && skills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => {
            const isSelected = selected.has(Number(skill.skillId));

            return (
              <button
                key={skill.skillId}
                type="button"
                onClick={() => toggle(Number(skill.skillId))}
                aria-pressed={isSelected}
                className={`relative overflow-hidden rounded-full border py-1 pl-4 pr-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isSelected
                    ? "border-gold/60 bg-gold/15 text-gold-dark"
                    : "border-muted/40 bg-transparent text-ink/70 hover:border-muted hover:text-ink"
                }`}
              >
                {/* Gold-seal notch, same treatment as StatusChip. */}
                <span
                  aria-hidden="true"
                  className={`absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 ${
                    isSelected ? "bg-gold" : "bg-muted/50"
                  }`}
                />
                {skill.name}
              </button>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
