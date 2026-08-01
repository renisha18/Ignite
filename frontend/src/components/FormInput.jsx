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
  const controlClass = `rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2 ${
    error
      ? "border-red-400 focus:ring-red-200"
      : "border-gray-300 focus:border-maroon focus:ring-maroon-light/30"
  }`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium text-gray-700">
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

      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
