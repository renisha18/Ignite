// Why this exists: Login and Register both need labeled inputs with
// consistent styling and an error line underneath — building that
// once here means neither form hand-rolls its own input markup, and
// a style change happens in one place.
export default function FormInput({
  label,
  name,
  type = "text",
  value,
  onChange,
  error,
  autoComplete,
  placeholder,
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={`rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2 ${
          error
            ? "border-red-400 focus:ring-red-200"
            : "border-gray-300 focus:border-maroon focus:ring-maroon-light/30"
        }`}
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
