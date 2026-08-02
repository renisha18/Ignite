// Why this exists: a save confirmation shouldn't push the form around
// or need the user to scroll to find it — it should appear, be read,
// and leave. Inline <Alert> is still the right call for errors that
// belong next to a field; this is for "did my click do anything".
//
// Deliberately dependency-free and unmanaged: the parent owns the
// message and clears it. No provider, no queue — one toast at a time is
// all this app needs.
//
// Styled as a hard-edged slab so it reads as the same system as the
// cards behind it, with the largest shadow in the app because it floats
// above everything.
import { useEffect } from "react";

const VARIANTS = {
  success: "bg-success text-cream",
  error: "bg-error text-cream",
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
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border-2 border-ink px-4 py-3 text-sm font-bold shadow-brutal-lg ${
        VARIANTS[variant] ?? VARIANTS.success
      }`}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="text-current opacity-70 transition hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}
