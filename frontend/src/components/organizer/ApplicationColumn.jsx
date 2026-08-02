// One column of the review board: a heading, a count, and either the
// application cards or an empty message.
//
// Purely presentational — it holds no state and makes no requests. It
// exists so Applications.jsx reads as three columns rather than three
// copies of the same heading-plus-list markup.
export default function ApplicationColumn({ title, count, empty, children }) {
  return (
    <section className="flex min-w-0 flex-col">
      <header className="mb-3 flex items-baseline justify-between gap-2 border-b border-muted/30 pb-2">
        <h2 className="font-display text-sm font-semibold tracking-tight text-ink">
          {title}
        </h2>
        <span className="font-mono text-[11px] tabular-nums text-muted">
          {count}
        </span>
      </header>

      {count === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">{children}</ul>
      )}
    </section>
  );
}
