// Why this exists: every page opens the same way — a display title, an
// optional line of context under it, and optional actions on the right.
// Centralizing it means the pages stay declarative and the heading
// rhythm can't drift between screens.
//
// `actions` is a node, not a config array, so a page can drop in
// whatever it needs (a Button, a filter select, nothing).
//
// Neo-Brutalist hierarchy: the title carries weight 800 and tight
// tracking, and the rule beneath it is a 2px ink line rather than a
// hairline — the header should read as a hard edge at the top of the
// page, not a faint separator.
export default function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b-2 border-ink pb-5">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-ink">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 max-w-prose text-sm font-medium text-muted">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
