// Why this exists: the search/skill/location controls for Browse
// Events, kept out of the page so the page stays about fetching and
// rendering rather than input handling.
//
// Debouncing lives here rather than in the page: the page should react
// to "the filters changed", not to every keystroke. 300ms is the usual
// sweet spot — long enough to skip most intermediate states, short
// enough that it doesn't feel laggy.
import { useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 300;

const EMPTY = { search: "", skillId: "", location: "" };

export default function EventFilters({ value = EMPTY, skills = [], onChange }) {
  // Local draft state so typing stays responsive; `value` is what the
  // page has actually committed to fetching with.
  const [draft, setDraft] = useState(value);

  // Why onChange goes through a ref: this effect depends on `draft`,
  // and if it also depended on `onChange` it would re-run (and re-fire
  // the debounce) on every parent render unless the parent remembered
  // to useCallback. The ref keeps the latest handler without making it
  // a dependency.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onChangeRef.current?.(draft);
    }, DEBOUNCE_MS);

    // Clearing on every keystroke is what makes this a debounce rather
    // than a throttle — only the last edit in a 300ms window fires.
    return () => clearTimeout(timer);
  }, [draft]);

  function update(field, fieldValue) {
    setDraft((current) => ({ ...current, [field]: fieldValue }));
  }

  const isDirty =
    draft.search !== "" || draft.skillId !== "" || draft.location !== "";

  return (
    <div className="mb-6 flex flex-wrap items-end gap-3">
      <div className="min-w-52 flex-1">
        <label
          htmlFor="event-search"
          className="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted"
        >
          Search
        </label>
        <input
          id="event-search"
          type="search"
          value={draft.search}
          onChange={(e) => update("search", e.target.value)}
          placeholder="Title or description…"
          className="w-full rounded-lg border border-muted/40 bg-transparent px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none"
        />
      </div>

      <div className="min-w-44">
        <label
          htmlFor="event-skill"
          className="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted"
        >
          Skill
        </label>
        <select
          id="event-skill"
          value={draft.skillId}
          onChange={(e) => update("skillId", e.target.value)}
          className="w-full rounded-lg border border-muted/40 bg-transparent px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
        >
          <option value="">Any skill</option>
          {skills.map((skill) => (
            <option key={skill.skillId} value={skill.skillId}>
              {skill.name}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-44 flex-1">
        <label
          htmlFor="event-location"
          className="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted"
        >
          Location
        </label>
        <input
          id="event-location"
          type="text"
          value={draft.location}
          onChange={(e) => update("location", e.target.value)}
          placeholder="Anywhere"
          className="w-full rounded-lg border border-muted/40 bg-transparent px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none"
        />
      </div>

      {isDirty && (
        <button
          type="button"
          onClick={() => setDraft(EMPTY)}
          className="rounded-lg border border-transparent px-3 py-2 text-sm text-muted underline-offset-4 transition hover:text-ink hover:underline"
        >
          Clear
        </button>
      )}
    </div>
  );
}

export { EMPTY as EMPTY_FILTERS };
