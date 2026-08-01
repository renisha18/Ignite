// Why this exists: both forms need a submit button that disables and
// shows a spinner while its request is in flight — one component
// instead of duplicating the disabled/spinner logic in both forms.
export default function Button({ children, loading, type = "submit", ...rest }) {
  return (
    <button
      type={type}
      disabled={loading || rest.disabled}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-maroon-dark disabled:cursor-not-allowed disabled:opacity-60"
      {...rest}
    >
      {loading && (
        <svg
          className="h-4 w-4 animate-spin text-white"
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
