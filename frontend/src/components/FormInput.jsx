// Why this exists: Login and Register both need labeled inputs with
// consistent styling and an error line underneath — building that
// once here means neither form hand-rolls its own input markup, and
// a style change happens in one place. The organizer's event form
// reuses it too.
//
// `multiline` renders a <textarea> instead of an <input>, for fields
// like an event description. Added as an opt-in prop rather than a
// separate FormTextarea component so one place still owns the label,
// error and focus styling. It defaults to false, so every existing
// caller (Login, Register) behaves exactly as before.
export default function FormInput({
  label,
  name,
  type = "text",
  value,
  onChange,
  error,
  autoComplete,
  placeholder,
  multiline = false,
  rows = 3,
}) {
  // Hoisted out of the JSX so the input and textarea branches can't
  // drift apart visually.
  //
  // Same slab treatment as Card and Button — ink border, hard shadow,
  // 16px corners — so a form field reads as the same material as
  // everything around it. Focus lifts the control up and left into a
  // bigger shadow rather than drawing a glow ring; an outline this heavy
  // has no room for one. An errored field swaps the border to `error`,
  // which is the only case where the ink outline gives way.
  const controlClass = `rounded-lg border-2 bg-cream px-3 py-2 text-sm text-ink outline-none transition-all duration-100 placeholder:text-muted/70 focus:-translate-x-0.5 focus:-translate-y-0.5 focus:shadow-brutal ${
    error ? "border-error shadow-brutal-sm" : "border-ink shadow-brutal-sm"
  }`;

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={name}
        className="text-xs font-bold uppercase tracking-wide text-ink"
      >
        {label}
      </label>

      {multiline ? (
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          className={`${controlClass} resize-y`}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={controlClass}
        />
      )}

      {error && <span className="text-xs font-bold text-error">{error}</span>}
    </div>
  );
}
