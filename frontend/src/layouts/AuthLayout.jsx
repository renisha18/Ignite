// Why this exists: Login and Register share the same branded shell
// (maroon header, centered card, footer tagline) — building it once
// here means the two pages only render their form, not a copy of the
// same page chrome.
export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="bg-maroon px-6 py-4">
        <h1 className="text-lg font-semibold tracking-wide text-white">Ignite</h1>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
          </div>
          {children}
        </div>
      </main>

      <footer className="px-6 py-4 text-center text-xs text-gray-400">
        Ignite — The event is temporary. The volunteer relationship isn&apos;t.
      </footer>
    </div>
  );
}
