// Why this lives in components/ui/ rather than components/volunteer/:
// the organizer's event-role form needs the same control (POST
// /events/:eventId/roles takes skillIds). Putting it here means the
// organizer track imports it instead of building a second one.
// >>> Tell your teammate this exists before they write their own. <<<
//
// Chip-style toggles rather than a <select multiple>: multi-selects are
// notoriously bad on touch (ctrl-click to deselect doesn't exist), and
// chips show the full selection at a glance. Shares the seal notch
// established by StatusChip so the visual language stays consistent.
//
// Controlled component: `value` is an array of skillIds, `onChange`
// gets the next array. It fetches its own options — the parent supplies
// the selection, not the catalogue.
//
// Depends on: services/skillService.js
import { useEffect, useRef, useState } from "react";
import { getSkills, createSkill } from "../../services/skillService";
import { getErrorMessage } from "../../services/errorMessage";

const MAX_SKILL_NAME = 100; // skills.name is VARCHAR(100)

export default function SkillMultiSelect({
  value = [],
  onChange,
  disabled = false,
  label = "Skills",
  hint = "Organizers match volunteers to roles using these.",
  allowCreate = true,
}) {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [notice, setNotice] = useState("");

  const inputRef = useRef(null);

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

  function select(skillId) {
    if (selected.has(skillId)) return;
    onChange?.([...selected, skillId]);
  }

  // Adding and selecting are one action, not two: someone who types a
  // skill wants to claim it, so the new chip comes back already on.
  async function handleAdd(event) {
    event.preventDefault();

    const name = draft.trim().replace(/\s+/g, " ");
    if (!name || adding) return;

    if (name.length > MAX_SKILL_NAME) {
      setAddError(`Skill names are ${MAX_SKILL_NAME} characters or fewer.`);
      return;
    }

    setAdding(true);
    setAddError("");
    setNotice("");

    try {
      const { skill, created } = await createSkill(name);

      // The server matches case-insensitively, so this may be a skill
      // that already existed — which is a success, not an error. Just
      // select it and say what happened.
      setSkills((current) =>
        current.some((s) => Number(s.skillId) === Number(skill.skillId))
          ? current
          : [...current, skill].sort((a, b) => a.name.localeCompare(b.name))
      );
      select(Number(skill.skillId));
      setNotice(
        created ? `Added “${skill.name}”.` : `“${skill.name}” was already listed — selected it for you.`
      );
      setDraft("");
      inputRef.current?.focus();
    } catch (err) {
      setAddError(getErrorMessage(err, "Couldn't add that skill."));
    } finally {
      setAdding(false);
    }
  }

  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink">
        {label}
      </legend>
      {hint && <p className="mb-2.5 text-xs text-muted">{hint}</p>}

      {loading && <p className="text-sm text-muted">Loading skills…</p>}

      {error && <p className="text-sm font-semibold text-error">{error}</p>}

      {!loading && !error && skills.length === 0 && (
        <p className="text-sm text-muted">
          No skills listed yet — add the first one below.
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
                // Same chip anatomy as StatusChip — ink border, hard
                // shadow, seal notch — so a selectable skill and a
                // status read as the same family of object.
                //
                // Both states carry shadow-brutal-sm. An unselected chip
                // is cream on a cream Card, so without the shadow it sat
                // flat against the surface and read as a static label
                // rather than a button. Selection is now the gold fill
                // plus the notch going ink; the raised edge says
                // "pressable" in both states, and pressing sinks it into
                // its own shadow.
                className={`relative overflow-hidden rounded-full border-2 border-ink py-1 pl-4 pr-3 text-xs font-bold shadow-brutal-sm transition-all duration-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-60 ${
                  isSelected
                    ? "bg-gold text-ink"
                    : "bg-cream text-ink/70 hover:bg-gold-light/40 hover:text-ink"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 ${
                    isSelected ? "bg-ink" : "bg-muted/50"
                  }`}
                />
                {skill.name}
              </button>
            );
          })}
        </div>
      )}

      {allowCreate && !loading && !error && (
        <div className="mt-3">
          <label htmlFor="skill-add" className="mb-1 block text-xs text-muted">
            Not listed? Add it.
          </label>
          {/* A plain div, not a nested <form> — this control is rendered
              inside the profile's form and nesting forms is invalid HTML.
              Enter is handled explicitly instead. */}
          <div className="flex flex-wrap gap-2">
            <input
              id="skill-add"
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setAddError("");
                setNotice("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  // Otherwise Enter submits the surrounding profile form.
                  e.preventDefault();
                  handleAdd(e);
                }
              }}
              maxLength={MAX_SKILL_NAME}
              placeholder="e.g. First Aid"
              className="min-w-44 flex-1 rounded-lg border-2 border-ink bg-cream px-3 py-2 text-sm text-ink shadow-brutal-sm outline-none transition-all duration-100 placeholder:text-muted/70 focus:-translate-x-0.5 focus:-translate-y-0.5 focus:shadow-brutal disabled:opacity-60"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!draft.trim() || adding}
              className="rounded-lg border-2 border-ink bg-gold px-4 py-2 text-sm font-bold text-ink shadow-brutal-sm transition-all duration-100 hover:bg-gold-light active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              {adding ? "Adding…" : "Add"}
            </button>
          </div>

          {addError && <p className="mt-1.5 text-xs font-semibold text-error">{addError}</p>}
          {notice && <p className="mt-1.5 text-xs text-muted">{notice}</p>}
        </div>
      )}
    </fieldset>
  );
}
