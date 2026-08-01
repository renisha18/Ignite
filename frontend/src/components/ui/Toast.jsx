// Why this exists: a save confirmation shouldn't push the form around
// or need the user to scroll to find it — it should appear, be read,
// and leave. Inline <Alert> is still the right call for errors that
// belong next to a field; this is for "did my click do anything".
//
// Deliberately dependency-free and unmanaged: the parent owns the
// message and clears it. No provider, no queue — one toast at a time is
// all this app needs.
import { useEffect } from "react";

const VARIANTS = {
  success: "border-success/50 bg-success/15 text-success",
  error: "border-primary/40 bg-primary/10 text-primary",
};

export default function Toast({ message, variant = "success", onDismiss, duration = 4000 }) {
  useEffect(() => {
    if (!message) return undefined;

    const timer = setTimeout(() => onDismiss?.(), duration);
    // Re-running on `message` means a second save restarts the clock
    // rather than inheriting the remainder of the first one's.
    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  if (!message) return null;

  return (
    <div
      // polite, not assertive: a save confirmation shouldn't interrupt
      // whatever a screen reader is currently saying.
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-md ${
        VARIANTS[variant] ?? VARIANTS.success
      }`}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="text-current opacity-60 transition hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}
