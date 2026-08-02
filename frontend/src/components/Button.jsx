// Why this exists: both forms need a submit button that disables and
// shows a spinner while its request is in flight — one component
// instead of duplicating the disabled/spinner logic in both forms.
//
// Still separate from components/ui/Button.jsx (this one is always
// full-width with no variants, and Login/Register depend on that), but
// the two now share an identical Neo-Brutalist treatment — same border,
// shadow, radius and press — so they read as one control.
export default function Button({ children, loading, type = "submit", ...rest }) {
  return (
    <button
      type={type}
      disabled={loading || rest.disabled}
      className={[
        "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5",
        "border-2 border-ink bg-primary text-sm font-bold tracking-tight text-cream",
        "shadow-brutal transition-all duration-100 hover:bg-primary-dark",
        // Press: travel exactly the shadow offset, then drop the shadow.
        "active:translate-x-1 active:translate-y-1 active:shadow-none",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:active:shadow-brutal",
      ].join(" ")}
      {...rest}
    >
      {loading && (
        <svg
          className="h-4 w-4 animate-spin text-cream"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
