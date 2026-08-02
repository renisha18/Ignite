// Why this exists separately from components/Button.jsx: that one is
// the auth-form submit button (always full-width, no variants) and
// Login/Register depend on its exact look. This is the go-forward
// button for the rest of the app. Both now share the same
// Neo-Brutalist treatment, so they read as one control even though
// they're still two components.
//
// Variants differ only by FILL. Border, shadow, radius and the press
// behaviour are identical across all three — in this style the outline
// is the constant and colour is the variable:
//   primary   — maroon fill, the one real call to action per view
//   secondary — cream fill, for the safe/neutral choice beside a primary
//   ghost     — transparent, for tertiary actions (Cancel, Back)
//
// The press: on :active the button translates by exactly the shadow
// offset (4px) and drops its shadow, so it looks physically pushed into
// the page. Offset and translate distance must stay in sync — 4px
// shadow, translate-1.
const VARIANTS = {
  primary: "bg-primary text-cream hover:bg-primary-dark",
  secondary: "bg-cream text-ink hover:bg-gold-light/40",
  ghost: "bg-transparent text-ink hover:bg-gold-light/30",
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
        "border-2 border-ink text-sm font-bold tracking-tight",
        "shadow-brutal transition-all duration-100",
        "active:translate-x-1 active:translate-y-1 active:shadow-none",
        // A disabled control must not look pressable: it keeps the
        // outline but loses the lift, and the press is suppressed.
        "disabled:cursor-not-allowed disabled:opacity-60",
        "disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:active:shadow-brutal",
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
