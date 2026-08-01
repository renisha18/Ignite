// Why this exists separately from components/Button.jsx: that one is
// the auth-form submit button (always full-width, hardcoded primary,
// no variants) and Login/Register depend on its exact look. This is
// the go-forward button for the rest of the app.
//
// If the two ever get reconciled, fold that one into this and update
// the two auth pages — don't add a third.
//
// Variants map to the palette in tailwind.config.js:
//   primary   — oxblood fill, the one real call to action per view
//   secondary — outlined, for the safe/neutral choice next to a primary
//   ghost     — text only, for tertiary actions (Cancel, Back)
const VARIANTS = {
  primary:
    "bg-primary text-background border border-primary hover:bg-primary/90",
  secondary:
    "bg-transparent text-ink border border-muted hover:border-ink hover:bg-ink/5",
  ghost:
    "bg-transparent text-ink border border-transparent hover:bg-ink/5",
};

export default function Button({
  children,
  variant = "primary",
  fullWidth = false,
  loading = false,
  type = "button",
  className = "",
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={loading || rest.disabled}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5",
        "text-sm font-semibold transition",
        "disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTS[variant] ?? VARIANTS.primary,
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {loading && (
        <svg
          className="h-4 w-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
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
