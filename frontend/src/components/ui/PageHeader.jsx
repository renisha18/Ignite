// Why this exists: every volunteer page opens the same way — a
// Fraunces title, an optional line of context under it, and an
// optional action or two on the right. Centralizing it means the
// pages stay declarative and the heading rhythm can't drift between
// screens.
//
// `actions` is a node, not a config array, so a page can drop in
// whatever it needs (a Button, a filter select, nothing).
export default function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-muted/30 pb-5">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 max-w-prose text-sm text-muted">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
