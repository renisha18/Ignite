// Why this exists: both forms need to show whatever message the
// backend actually returned (e.g. "Email already registered", "You
// don't have permission to do that") rather than a generic client
// message — this is what "display backend validation messages
// properly" means in practice. One component, two variants.
export default function Alert({ variant = "error", children }) {
  if (!children) return null;

  const styles =
    variant === "error"
      ? "bg-red-50 border-red-200 text-red-700"
      : "bg-gold-light/40 border-gold text-maroon-dark";

  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${styles}`}>
      {children}
    </div>
  );
}
