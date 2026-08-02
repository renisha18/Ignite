// Why this exists: both forms need to show whatever message the
// backend actually returned (e.g. "Email already registered", "You
// don't have permission to do that") rather than a generic client
// message — this is what "display backend validation messages
// properly" means in practice. One component, two variants.
//
// On theme tokens now rather than raw Tailwind reds: `error` and `gold`
// are declared in index.css, so an alert can't drift from the rest of
// the palette. Semantics are unchanged — error stays red and visibly
// distinct from the maroon brand, info stays gold.
const VARIANTS = {
  error: "bg-error text-cream",
  info: "bg-gold text-ink",
};

export default function Alert({ variant = "error", children }) {
  if (!children) return null;

  return (
    <div
      className={`rounded-lg border-2 border-ink px-3 py-2 text-sm font-semibold shadow-brutal-sm ${
        VARIANTS[variant] ?? VARIANTS.error
      }`}
    >
      {children}
    </div>
  );
}
