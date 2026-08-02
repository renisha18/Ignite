// Why this exists: Login and Register share the same branded shell
// (maroon header, centered card, footer tagline) — building it once
// here means the two pages only render their form, not a copy of the
// same page chrome.
// Decorative shapes are confined to THIS layout. Login and Register are
// the only screens with enough empty space to carry them; every
// data-heavy screen stays plain. They're outlined blocks in the same ink
// as everything else — the same vocabulary as the UI, not a second
// visual language — and they sit behind the content with
// pointer-events-none so they can never intercept a click.
function BackdropShapes() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-16 top-24 h-40 w-40 rotate-12 rounded-xl border-2 border-ink bg-gold/30" />
      <div className="absolute -right-12 top-1/3 h-28 w-28 -rotate-6 rounded-full border-2 border-ink bg-primary/15" />
      <div className="absolute bottom-16 left-1/4 h-20 w-20 rotate-45 rounded-lg border-2 border-ink bg-gold-light/40" />
      <div className="absolute -bottom-10 right-1/4 h-36 w-36 rounded-xl border-2 border-ink bg-primary/10" />
    </div>
  );
}

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <BackdropShapes />

      <header className="relative border-b-2 border-ink bg-primary px-6 py-4">
        <h1 className="font-display text-xl font-extrabold uppercase tracking-tight text-cream">
          Ignite
        </h1>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-xl border-2 border-ink bg-cream p-8 shadow-brutal-lg">
          <div className="mb-6 text-center">
            <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight text-ink">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-2 text-sm font-medium text-muted">{subtitle}</p>
            )}
          </div>
          {children}
        </div>
      </main>

      <footer className="relative px-6 py-4 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
        Ignite — The event is temporary. The volunteer relationship isn&apos;t.
      </footer>
    </div>
  );
}
